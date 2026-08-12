import { execFileSync, spawn, type ChildProcess } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { SupabaseAuthorisationContextRepository } from "../src/adapters/identity/supabase/supabase-authorisation-context-repository";
import { StripePaymentProvider } from "../src/adapters/payments/stripe/stripe-payment-provider";
import { SupabasePaymentRepository } from "../src/adapters/persistence/supabase/supabase-payment-repository";
import { SupabaseWorkflowCommandRepository } from "../src/adapters/persistence/supabase/supabase-workflow-command-repository";
import { AuthorisationService } from "../src/application/authorisation/authorisation-service";
import {
  PaymentCheckoutService,
  resolveServerPaymentActor,
} from "../src/application/payments/payment-checkout-service";
import type { ChargeScenario } from "../contracts/payments";

type LocalStatus = Readonly<{
  API_URL: string;
  SECRET_KEY: string;
}>;

const tenantId = "10000000-0000-4000-8000-000000000001";
const subjectId = "20000000-0000-4000-8000-000000000001";
const workflowId = "a0000000-0000-4000-8000-000000000001";
const providerSessionId = "71000000-0000-4000-8000-000000000001";
const serviceIdentityId = "80000000-0000-4000-8000-000000000002";
const observedAt = new Date("2030-01-01T00:10:00Z");

const scenarios = [
  { name: "consultation_only", total: 10_000, lines: 1 },
  { name: "medication_delivery", total: 23_000, lines: 2 },
  { name: "bundle", total: 33_000, lines: 3 },
] as const satisfies readonly Readonly<{
  name: ChargeScenario;
  total: number;
  lines: number;
}>[];

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
  invariant(status.API_URL && status.SECRET_KEY, "Local payment services are not running.");
  return status as LocalStatus;
}

function resetDatabase(): void {
  execFileSync("bunx", ["supabase", "db", "reset", "--local"], { stdio: "ignore" });
}

async function waitForServer(process: ChildProcess, url: string): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    invariant(process.exitCode === null, "The local payment server stopped before becoming ready.");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The local payment server did not become ready.");
}

async function stopServer(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => process.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);
}

function requiredStripeConfiguration(): Readonly<{
  restrictedKey: string;
  webhookSigningSecret: string;
}> {
  const restrictedKey = process.env.STRIPE_RESTRICTED_KEY;
  const webhookSigningSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
  invariant(
    typeof restrictedKey === "string" && restrictedKey.startsWith("rk_test_"),
    "A Stripe sandbox restricted key is required.",
  );
  invariant(
    typeof webhookSigningSecret === "string" && webhookSigningSecret.startsWith("whsec_"),
    "A Stripe sandbox webhook signing secret is required.",
  );
  return { restrictedKey, webhookSigningSecret };
}

async function run(): Promise<void> {
  const configuration = requiredStripeConfiguration();
  const stripeClient = new Stripe(configuration.restrictedKey, {
    apiVersion: "2026-07-29.dahlia",
    maxNetworkRetries: 2,
    timeout: 10_000,
    telemetry: false,
  });
  let finalCheckout:
    | Readonly<{ orderId: string; checkoutSessionId: string; paymentIntentId?: string }>
    | undefined;

  for (const [index, scenario] of scenarios.entries()) {
    resetDatabase();
    const status = localStatus();
    const client = createClient(status.API_URL, status.SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const provider = new StripePaymentProvider(
      configuration.restrictedKey,
      configuration.webhookSigningSecret,
      "local",
      stripeClient,
    );
    const payments = new SupabasePaymentRepository(client, "local");
    const checkout = new PaymentCheckoutService(
      payments,
      new SupabaseWorkflowCommandRepository(client),
      new AuthorisationService(new SupabaseAuthorisationContextRepository(client)),
      provider,
      {
        successUrl: "https://meneerhealth.co.za/start?payment=success",
        cancelUrl: "https://meneerhealth.co.za/start?payment=cancelled",
      },
    );
    const actor = resolveServerPaymentActor({
      providerSessionId,
      subjectId,
      tenantId,
      assurance: "aal1",
      observedAt,
    });
    const suffix = `${index + 1}_${crypto.randomUUID()}`;
    const outcome = await checkout.create(actor, {
      contract: "payment.checkout",
      version: 1,
      requestId: `provider_request_${suffix}`,
      idempotencyKey: `provider_retry_${suffix}`,
      correlationId: `provider_trace_${suffix}`,
      actor: { type: "patient", id: subjectId },
      subjectId,
      expectedVersion: 0,
      requestedAt: observedAt.toISOString(),
      payload: { workflowId, scenario: scenario.name },
    });
    invariant(outcome.ok, `Stripe sandbox Checkout failed for ${scenario.name}.`);
    invariant(
      outcome.result.order.amountTotalMinor === scenario.total &&
        outcome.result.order.lines.length === scenario.lines,
      `The governed catalogue did not produce the expected ${scenario.name} order.`,
    );
    const checkoutSessionId = outcome.result.order.checkoutSessionId;
    invariant(checkoutSessionId, "The durable order is missing its Checkout Session reference.");

    const remote = await stripeClient.checkout.sessions.retrieve(checkoutSessionId);
    invariant(!remote.livemode, "A live-mode Checkout Session was unexpectedly created.");
    invariant(remote.mode === "payment", "The Checkout Session is not one-time payment mode.");
    invariant(
      remote.amount_total === scenario.total && remote.currency === "zar",
      `Stripe received an incorrect amount for ${scenario.name}.`,
    );
    invariant(
      remote.client_reference_id === outcome.result.order.orderId &&
        remote.metadata?.orderId === outcome.result.order.orderId &&
        remote.metadata?.tenantId === tenantId &&
        Object.keys(remote.metadata).sort().join(",") === "orderId,tenantId",
      "Stripe metadata did not remain within the opaque-reference allowlist.",
    );
    finalCheckout = {
      orderId: outcome.result.order.orderId,
      checkoutSessionId,
    };
  }

  invariant(finalCheckout, "No Stripe sandbox Checkout Session was created.");
  const status = localStatus();
  const client = createClient(status.API_URL, status.SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const payload = JSON.stringify({
    id: `evt_provider_${crypto.randomUUID().replaceAll("-", "")}`,
    object: "event",
    api_version: "2026-07-29.dahlia",
    created: Math.floor(observedAt.getTime() / 1000),
    data: {
      object: {
        id: finalCheckout.checkoutSessionId,
        object: "checkout.session",
        client_reference_id: finalCheckout.orderId,
        livemode: false,
        metadata: { orderId: finalCheckout.orderId, tenantId },
        payment_intent: null,
        payment_status: "paid",
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
  });
  const signature = await stripeClient.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: configuration.webhookSigningSecret,
    timestamp: Math.floor(observedAt.getTime() / 1000),
  });
  const port = "8086";
  const server = spawn("bun", ["run", "dev", "--", "--host", "127.0.0.1", "--port", port], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
      SUPABASE_URL: status.API_URL,
      SUPABASE_SECRET_KEY: status.SECRET_KEY,
      STRIPE_RESTRICTED_KEY: configuration.restrictedKey,
      STRIPE_WEBHOOK_SIGNING_SECRET: configuration.webhookSigningSecret,
      STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: serviceIdentityId,
    },
    stdio: "ignore",
  });
  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(server, baseUrl);
    const sendWebhook = () =>
      fetch(`${baseUrl}/api/payments/stripe/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Stripe-Signature": signature,
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });
    const applied = await sendWebhook();
    invariant(
      applied.status === 200,
      `The signed webhook route returned HTTP ${applied.status} instead of acknowledging apply.`,
    );
    const appliedBody = (await applied.json()) as { received?: unknown; replayed?: unknown };
    invariant(
      appliedBody.received === true && appliedBody.replayed === false,
      "The signed webhook route returned incorrect apply evidence.",
    );
    const duplicate = await sendWebhook();
    invariant(duplicate.status === 200, "The replayed webhook route was not acknowledged.");
    const duplicateBody = (await duplicate.json()) as { replayed?: unknown };
    invariant(duplicateBody.replayed === true, "The webhook route was not replay-safe.");
  } finally {
    await stopServer(server);
  }

  const { data: durableOrder, error: durableOrderError } = await client
    .from("payment_orders")
    .select("status")
    .eq("id", finalCheckout.orderId)
    .single<{ status: string }>();
  invariant(
    !durableOrderError && durableOrder.status === "paid",
    "Payment evidence was not durable.",
  );
}

await run();
console.log("Stripe sandbox Checkout scenarios and signed webhook integration passed.");
