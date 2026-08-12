import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

import { SupabaseFulfilmentRepository } from "../src/adapters/persistence/supabase/supabase-fulfilment-repository";
import { FulfilmentPartnerEventService } from "../src/application/fulfilment/fulfilment-partner-event-service";

type LocalStatus = Readonly<{
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SECRET_KEY: string;
}>;

const workflowId = "a0000000-0000-4000-8000-000000000009";
const serviceIdentityId = "80000000-0000-4000-8000-000000000001";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function localStatus(): LocalStatus {
  const stdout = execFileSync("bunx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
  });
  const jsonStart = stdout.indexOf("{");
  invariant(jsonStart >= 0, "Local Supabase status did not return JSON.");
  const status = JSON.parse(stdout.slice(jsonStart)) as Partial<LocalStatus>;
  invariant(
    status.API_URL && status.PUBLISHABLE_KEY && status.SECRET_KEY,
    "Local fulfilment services are not running.",
  );
  return status as LocalStatus;
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function run(): Promise<void> {
  const status = localStatus();
  const options = {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  };
  const serverClient = createClient(status.API_URL, status.SECRET_KEY, options);
  const browserClient = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);
  const repository = new SupabaseFulfilmentRepository(serverClient);
  const service = new FulfilmentPartnerEventService(repository, serviceIdentityId);

  const apply = async (
    provider: "precise_wellness" | "dispensing_pharmacy" | "meneer_hub" | "courier",
    eventType:
      | "pathway.handoff.accepted"
      | "pharmacy.release.confirmed"
      | "hub.receipt.confirmed"
      | "courier.dispatch.confirmed"
      | "courier.delivery.confirmed",
    suffix: string,
  ) => {
    const externalEventId = `synthetic_provider_${suffix}`;
    return service.handle({
      contract: "fulfilment.partner",
      version: 1,
      provider,
      environment: "local",
      externalEventId,
      eventType,
      workflowId,
      providerReferenceDigest: await digest(`reference:${suffix}`),
      payloadFingerprint: await digest(`payload:${suffix}`),
      occurredAt: "2030-01-01T00:10:00Z",
    });
  };

  const pathway = await apply("precise_wellness", "pathway.handoff.accepted", "pathway_01");
  invariant(pathway.ok && pathway.result.applied, "Pathway hand-off was not accepted.");
  invariant(
    pathway.result.fulfilment.pharmacyReleaseState === "not_started",
    "Pathway hand-off incorrectly implied pharmacy release.",
  );

  const pharmacy = await apply("dispensing_pharmacy", "pharmacy.release.confirmed", "pharmacy_01");
  invariant(pharmacy.ok && pharmacy.result.applied, "Pharmacy release was not recorded.");
  invariant(
    pharmacy.result.fulfilment.hubCustodyState === "not_started",
    "Pharmacy release incorrectly implied hub custody.",
  );

  const hub = await apply("meneer_hub", "hub.receipt.confirmed", "hub_01");
  invariant(
    hub.ok &&
      hub.result.applied &&
      hub.result.fulfilment.reconciliationState === "matched" &&
      Boolean(hub.result.fulfilment.eligibleForFulfilmentAt),
    "Hub evidence did not establish independently reconciled fulfilment eligibility.",
  );

  const dispatch = await apply("courier", "courier.dispatch.confirmed", "dispatch_01");
  invariant(
    dispatch.ok && dispatch.result.fulfilment.courierState === "dispatched",
    "Courier dispatch was not reconciled.",
  );
  const delivery = await apply("courier", "courier.delivery.confirmed", "delivery_01");
  invariant(
    delivery.ok && delivery.result.fulfilment.courierState === "delivered",
    "Courier delivery was not reconciled.",
  );
  const duplicate = await apply("courier", "courier.delivery.confirmed", "delivery_01");
  invariant(
    duplicate.ok && duplicate.result.replayed,
    "Duplicate courier evidence was not replay-safe.",
  );

  const { data: browserCases, error: browserReadError } = await browserClient
    .from("fulfilment_cases")
    .select("id")
    .limit(1);
  invariant(
    browserReadError?.code === "42501" || browserCases?.length === 0,
    "Browser role read the private fulfilment ledger.",
  );

  const previewAttempt = await service.handle({
    contract: "fulfilment.partner",
    version: 1,
    provider: "courier",
    environment: "preview",
    externalEventId: "synthetic_preview_delivery_01",
    eventType: "courier.delivery.confirmed",
    workflowId,
    providerReferenceDigest: await digest("preview-reference"),
    payloadFingerprint: await digest("preview-payload"),
    occurredAt: "2030-01-01T00:10:00Z",
  });
  invariant(
    !previewAttempt.ok && previewAttempt.error.error.code === "FORBIDDEN",
    "Preview provider integration did not fail closed.",
  );
}

await run();
console.log("Synthetic minimum-data fulfilment integration passed.");
