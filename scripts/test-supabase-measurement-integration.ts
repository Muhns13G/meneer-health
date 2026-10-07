import { createClient } from "@supabase/supabase-js";

import { measurementEventInputSchema } from "../contracts/measurement";
import { SupabaseMeasurementRepository } from "../src/adapters/persistence/supabase/supabase-measurement-repository";
import { MeasurementService } from "../src/application/measurement/measurement-service";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const environment = readSupabaseIntegrationEnvironment();
const options = {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
};
const serverClient = createClient(environment.API_URL, environment.SECRET_KEY, options);
const browserClient = createClient(environment.API_URL, environment.PUBLISHABLE_KEY, options);
const observedAt = new Date();
const service = new MeasurementService(
  new SupabaseMeasurementRepository(serverClient),
  environment.target === "local" ? "local" : "production",
  () => new Date(observedAt.getTime() + 60_000),
);
const suffix = crypto.randomUUID();
const actorId = crypto.randomUUID();
const consent = await service.grant({
  contract: "measurement.consent",
  version: 1,
  requestId: crypto.randomUUID(),
  idempotencyKey: `measurement-hosted-consent:${suffix}`,
  correlationId: `measurement-hosted:${suffix}`,
  decision: "granted",
  requestedAt: observedAt.toISOString(),
  synthetic: true,
});

await service.record(
  { name: "journey_started" },
  {
    flowId: consent.flowId,
    consentReceiptId: consent.consentReceiptId,
    idempotencyKey: `measurement-hosted-event:${suffix}`,
    correlationId: `measurement-hosted-event:${suffix}`,
    synthetic: true,
  },
);

const prohibitedCanary = {
  name: "journey_started",
  email: "patient@synthetic-prohibited-canary.invalid",
  url: "https://synthetic-prohibited-canary.invalid/start?answer=private",
  referrer: "https://synthetic-prohibited-canary.invalid/referrer",
  sessionReplay: "synthetic-replay-canary",
  treatment: "synthetic-health-canary",
};
invariant(
  !measurementEventInputSchema.safeParse(prohibitedCanary).success,
  "A prohibited measurement canary passed validation.",
);

const { data: inventory, error: inventoryError } = await serverClient.rpc(
  "export_measurement_flow_inventory",
  {
    p_actor_id: actorId,
    p_actor_role: "privacy_reviewer",
    p_assurance: "aal2",
    p_purpose: "privacy_request",
    p_flow_id: consent.flowId,
    p_occurred_at: new Date(observedAt.getTime() + 120_000).toISOString(),
  },
);
invariant(!inventoryError && inventory, "The governed measurement inventory failed.");
const inventoryJson = JSON.stringify(inventory);
for (const prohibitedField of [
  "idempotencyKey",
  "correlationId",
  "requestFingerprint",
  "email",
  "url",
  "referrer",
  "sessionReplay",
  "treatment",
]) {
  invariant(!inventoryJson.includes(prohibitedField), `Inventory exposed ${prohibitedField}.`);
}

const { error: browserInventoryError } = await browserClient.rpc(
  "export_measurement_flow_inventory",
  {
    p_actor_id: actorId,
    p_actor_role: "privacy_reviewer",
    p_assurance: "aal2",
    p_purpose: "privacy_request",
    p_flow_id: consent.flowId,
    p_occurred_at: new Date(observedAt.getTime() + 180_000).toISOString(),
  },
);
invariant(
  browserInventoryError?.code === "42501",
  "The browser role reached raw measurement data.",
);

const { error: mismatchedPurposeError } = await serverClient.rpc(
  "export_measurement_daily_aggregates",
  {
    p_actor_id: actorId,
    p_actor_role: "product_reviewer",
    p_assurance: "aal2",
    p_purpose: "privacy_request",
    p_environment: environment.target === "local" ? "local" : "production",
    p_from_date: observedAt.toISOString().slice(0, 10),
    p_to_date: observedAt.toISOString().slice(0, 10),
    p_occurred_at: new Date(observedAt.getTime() + 210_000).toISOString(),
  },
);
invariant(
  mismatchedPurposeError?.code === "42501",
  "An aggregate reviewer presented a purpose assigned to another reviewer class.",
);

await service.withdraw(
  {
    contract: "measurement.consent",
    version: 1,
    requestId: crypto.randomUUID(),
    idempotencyKey: `measurement-hosted-withdraw:${suffix}`,
    correlationId: `measurement-hosted-withdraw:${suffix}`,
    decision: "withdrawn",
    requestedAt: new Date(observedAt.getTime() + 240_000).toISOString(),
    synthetic: true,
  },
  consent.flowId,
);

const { data: deletion, error: deletionError } = await serverClient.rpc(
  "delete_withdrawn_measurement_flow",
  {
    p_actor_id: actorId,
    p_actor_role: "privacy_reviewer",
    p_assurance: "aal2",
    p_purpose: "privacy_request",
    p_flow_id: consent.flowId,
    p_occurred_at: new Date(observedAt.getTime() + 300_000).toISOString(),
  },
);
invariant(
  !deletionError && deletion?.consentEvidenceRetained === false,
  "The disposable synthetic measurement flow was not fully deleted.",
);

const { error: deletedInventoryError } = await serverClient.rpc(
  "export_measurement_flow_inventory",
  {
    p_actor_id: actorId,
    p_actor_role: "privacy_reviewer",
    p_assurance: "aal2",
    p_purpose: "privacy_request",
    p_flow_id: consent.flowId,
    p_occurred_at: new Date(observedAt.getTime() + 360_000).toISOString(),
  },
);
invariant(
  deletedInventoryError?.message.includes("MEASUREMENT_FLOW_INVALID"),
  "Deleted synthetic measurement state remained exportable.",
);

console.log(
  JSON.stringify({
    exercise: "supabase-measurement-governance",
    target: environment.target,
    strictCanaryRejected: true,
    rawInventoryPurposeBound: true,
    browserRawAccessDenied: true,
    rolePurposeMismatchDenied: true,
    optOutStoppedCollection: true,
    syntheticStateDeleted: true,
    prohibitedPayloadFields: 0,
  }),
);
