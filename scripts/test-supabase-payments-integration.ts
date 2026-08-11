import { execFileSync } from "node:child_process";

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
import type { PaymentProvider } from "../src/application/payments/payment-provider";
import { PaymentWebhookService } from "../src/application/payments/payment-webhook-service";

type LocalStatus = Readonly<{
  API_URL: string;
  PUBLISHABLE_KEY: string;
  SECRET_KEY: string;
}>;

const tenantId = "10000000-0000-4000-8000-000000000001";
const subjectId = "20000000-0000-4000-8000-000000000001";
const workflowId = "a0000000-0000-4000-8000-000000000001";
const providerSessionId = "71000000-0000-4000-8000-000000000001";
const serviceIdentityId = "80000000-0000-4000-8000-000000000002";
const signingSecret = `whsec_${"B".repeat(24)}`;

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
    "Local payment services are not running.",
  );
  return status as LocalStatus;
}

async function run(): Promise<void> {
  const status = localStatus();
  const options = {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  };
  const serverClient = createClient(status.API_URL, status.SECRET_KEY, options);
  const browserClient = createClient(status.API_URL, status.PUBLISHABLE_KEY, options);
  const payments = new SupabasePaymentRepository(serverClient, "local");
  const stripe = new Stripe(`rk_test_${"A".repeat(24)}`);
  const verifier = new StripePaymentProvider(
    `rk_test_${"A".repeat(24)}`,
    signingSecret,
    "local",
    stripe,
  );
  const provider: PaymentProvider = {
    createCheckoutSession: async () => ({
      id: "cs_test_synthetic_integration_01",
      url: "https://checkout.stripe.com/c/pay/synthetic-integration",
    }),
    verifyWebhook: (rawBody, signature) => verifier.verifyWebhook(rawBody, signature),
  };
  const checkout = new PaymentCheckoutService(
    payments,
    new SupabaseWorkflowCommandRepository(serverClient),
    new AuthorisationService(new SupabaseAuthorisationContextRepository(serverClient)),
    provider,
    {
      successUrl: "https://example.invalid/payment-return",
      cancelUrl: "https://example.invalid/payment-cancelled",
    },
  );
  const actor = resolveServerPaymentActor({
    providerSessionId,
    subjectId,
    tenantId,
    assurance: "aal1",
    observedAt: new Date("2030-01-01T00:10:00Z"),
  });
  const command = {
    contract: "payment.checkout",
    version: 1,
    requestId: "payment_integration_request_01",
    idempotencyKey: "payment_integration_retry_01",
    correlationId: "payment_integration_trace_01",
    actor: { type: "patient", id: subjectId },
    subjectId,
    expectedVersion: 0,
    requestedAt: "2030-01-01T00:10:00Z",
    payload: { workflowId, scenario: "consultation_only" },
  } as const;

  const created = await checkout.create(actor, command);
  invariant(created.ok, "Synthetic Checkout Session was not created.");
  invariant(
    created.result.order.status === "checkout_open" &&
      created.result.checkoutUrl.startsWith("https://checkout.stripe.com/"),
    "Checkout did not persist before returning its provider URL.",
  );

  const { data: browserOrders, error: browserReadError } = await browserClient
    .from("payment_orders")
    .select("id")
    .limit(1);
  invariant(
    browserReadError?.code === "42501" || browserOrders?.length === 0,
    "Browser role read the private payment ledger.",
  );
  const { error: browserMutationError } = await browserClient.rpc("prepare_payment_checkout", {
    p_tenant_id: tenantId,
    p_workflow_id: workflowId,
    p_subject_id: subjectId,
    p_scenario: "consultation_only",
    p_environment: "local",
    p_request_id: "browser_payment_request",
    p_idempotency_key: "browser_payment_retry",
    p_request_fingerprint: "a".repeat(64),
    p_expected_version: 0,
    p_occurred_at: "2030-01-01T00:10:00Z",
    p_actor_subject_id: subjectId,
    p_actor_role: "patient",
    p_assurance: "aal1",
    p_policy_version: "authorisation.v1",
    p_correlation_id: "browser_payment_trace",
  });
  invariant(browserMutationError?.code === "42501", "Browser role invoked payment checkout RPC.");

  const payload = JSON.stringify({
    id: "evt_synthetic_integration_01",
    object: "event",
    api_version: "2026-07-29.dahlia",
    created: 1893456720,
    data: {
      object: {
        id: "cs_test_synthetic_integration_01",
        object: "checkout.session",
        client_reference_id: created.result.order.orderId,
        livemode: false,
        metadata: { orderId: created.result.order.orderId, tenantId },
        payment_intent: "pi_synthetic_integration_01",
        payment_status: "paid",
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
  });
  const signature = await stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: signingSecret,
    timestamp: 1893456720,
  });
  const webhooks = new PaymentWebhookService(provider, payments, serviceIdentityId);
  const paid = await webhooks.handle(payload, signature);
  invariant(
    paid.accepted && paid.result.order.status === "paid" && !paid.result.replayed,
    `Signed provider event did not become durable payment evidence: ${JSON.stringify(paid)}`,
  );
  const duplicate = await webhooks.handle(payload, signature);
  invariant(
    duplicate.accepted && duplicate.result.replayed,
    "Duplicate signed provider event was not deduplicated.",
  );
  const invalidSignature = await webhooks.handle(`${payload} `, signature);
  invariant(
    !invalidSignature.accepted && invalidSignature.status === 400,
    "Modified webhook body was not rejected.",
  );

  const { data: workflow, error: workflowError } = await serverClient
    .from("workflow_instances")
    .select("clinical_state, payment_state, supply_state, dispatch_state")
    .eq("id", workflowId)
    .single();
  invariant(!workflowError, "Synthetic payment projection could not be read.");
  invariant(
    workflow.payment_state === "paid" &&
      workflow.clinical_state === "not_started" &&
      workflow.supply_state === "not_started" &&
      workflow.dispatch_state === "not_ready",
    "Payment evidence incorrectly implied a clinical or fulfilment decision.",
  );
}

await run();
console.log("Synthetic Supabase and signed Stripe payment integration passed.");
