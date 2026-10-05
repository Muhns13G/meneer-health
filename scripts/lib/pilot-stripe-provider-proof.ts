import { z } from "zod";
import type { CheckoutIntent } from "../../src/server/payments/pilot-checkout";

const configurationSchema = z.object({
  PILOT_STRIPE_EXERCISE_CONFIRM: z.literal("uncompleted-test-checkouts-only"),
  STRIPE_RESTRICTED_KEY: z.string().regex(/^rk_test_[A-Za-z0-9_]+$/),
  STRIPE_CHECKOUT_ACCOUNT_ID: z.string().regex(/^acct_[A-Za-z0-9]{8,64}$/),
});

export function readPilotStripeProofConfiguration(environment: Record<string, unknown>) {
  const parsed = configurationSchema.safeParse(environment);
  if (!parsed.success) throw new Error("PILOT_STRIPE_PROOF_CONFIGURATION_REJECTED");
  return parsed.data;
}

type Session = {
  id: string;
  livemode: boolean;
  mode: string | null;
  status: string | null;
  payment_status: string;
  payment_intent: unknown;
  amount_total: number | null;
  currency: string | null;
  expires_at: number;
  client_reference_id: string | null;
  metadata: Record<string, string> | null;
  success_url: string | null;
  cancel_url: string | null;
};
type Line = {
  description: string | null;
  quantity: number | null;
  amount_total: number;
  currency: string;
};
export type PilotStripeProofPort = {
  account(): Promise<string>;
  create(intent: CheckoutIntent): Promise<{ id: string; url: string }>;
  retrieve(id: string): Promise<Session>;
  lines(id: string): Promise<{ data: Line[]; has_more: boolean }>;
  expire(id: string): Promise<Session>;
  inspectTerminal(input: {
    intentId: string;
    tenantId: string;
    accountId: string;
    sessionId: string;
    amountMinor: number;
    paymentIntentId: null;
  }): Promise<{ intentId: string; sessionId: string; status: "expired" | "complete" }>;
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

// No confirm/pay/refund/dispute operation exists in this bounded port. Those require
// a separately approved provider + authenticated hosted journey, not fabricated receipts.
export async function provePilotStripeUncompletedCheckouts(
  accountId: string,
  port: PilotStripeProofPort,
) {
  invariant(
    /^acct_[A-Za-z0-9]{8,64}$/.test(accountId) && (await port.account()) === accountId,
    "PILOT_STRIPE_PROOF_ACCOUNT_REJECTED",
  );
  const tenantId = crypto.randomUUID();
  const cases = [
    { scenario: "review_deposit", product: 0, delivery: 0, total: 99900 },
    { scenario: "approved_product_order", product: 75100, delivery: 10000, total: 85100 },
    { scenario: "approved_product_order", product: 0, delivery: 0, total: 0 },
  ] as const;
  const created = new Set<string>();
  let cleanupFailed = false;
  let proofFailed = false;
  let failure: unknown;
  try {
    for (const entry of cases) {
      const intent: CheckoutIntent = {
        intentId: crypto.randomUUID(),
        tenantId,
        accountId,
        scenario: entry.scenario,
        currency: "zar",
        amountTotalMinor: entry.total,
        productBalanceMinor: entry.product,
        deliveryMinor: entry.delivery,
        expiresEpoch: Math.floor(Date.now() / 1000) + 3600,
        sessionId: null,
        checkoutUrl: null,
      };
      const first = await port.create(intent);
      invariant(/^cs_test_[A-Za-z0-9_]{8,120}$/.test(first.id), "PILOT_STRIPE_PROOF_ID_INVALID");
      created.add(first.id);
      const replay = await port.create(intent);
      invariant(/^cs_test_[A-Za-z0-9_]{8,120}$/.test(replay.id), "PILOT_STRIPE_PROOF_ID_INVALID");
      created.add(replay.id);
      invariant(replay.id === first.id, "PILOT_STRIPE_PROOF_REPLAY_FAILED");
      const remote = await port.retrieve(first.id);
      invariant(
        remote.id === first.id &&
          remote.livemode === false &&
          remote.mode === "payment" &&
          remote.status === "open" &&
          remote.payment_status === "unpaid" &&
          remote.payment_intent === null &&
          remote.amount_total === entry.total &&
          remote.currency === "zar" &&
          remote.expires_at === intent.expiresEpoch &&
          remote.client_reference_id === intent.intentId &&
          remote.metadata?.orderId === intent.intentId &&
          remote.metadata?.tenantId === tenantId &&
          Object.keys(remote.metadata).sort().join(",") === "orderId,tenantId" &&
          remote.success_url === "https://meneerhealth.co.za/portal/order" &&
          remote.cancel_url === remote.success_url,
        "PILOT_STRIPE_PROOF_SESSION_FAILED",
      );
      const lines = await port.lines(first.id);
      const expected =
        entry.scenario === "review_deposit"
          ? [{ name: "Review deposit", amount: 99900 }]
          : [
              {
                name: "Approved product order balance after deposit credit",
                amount: entry.product,
              },
              ...(entry.delivery ? [{ name: "Delivery", amount: entry.delivery }] : []),
            ];
      invariant(
        !lines.has_more &&
          lines.data.length === expected.length &&
          expected.every((line, index) => {
            const actual = lines.data[index];
            return (
              actual?.description === line.name &&
              actual.quantity === 1 &&
              actual.amount_total === line.amount &&
              actual.currency === "zar"
            );
          }),
        "PILOT_STRIPE_PROOF_LINES_FAILED",
      );
      const expired = await port.expire(first.id);
      invariant(
        expired.id === first.id &&
          !expired.livemode &&
          expired.status === "expired" &&
          expired.payment_status === "unpaid" &&
          expired.payment_intent === null,
        "PILOT_STRIPE_PROOF_EXPIRY_FAILED",
      );
      const observation = await port.inspectTerminal({
        intentId: intent.intentId,
        tenantId,
        accountId,
        sessionId: first.id,
        amountMinor: entry.total,
        paymentIntentId: null,
      });
      invariant(
        observation.intentId === intent.intentId &&
          observation.sessionId === first.id &&
          observation.status === "expired",
        "PILOT_STRIPE_PROOF_TERMINAL_FAILED",
      );
    }
  } catch (error) {
    proofFailed = true;
    failure = error;
  } finally {
    // Only this run's exact returned test Sessions; never list/expire unrelated resources.
    for (const id of created) {
      try {
        const session = await port.retrieve(id);
        invariant(session.id === id && !session.livemode, "PILOT_STRIPE_PROOF_CLEANUP_FAILED");
        if (session.status === "open") await port.expire(id);
        const terminal = await port.retrieve(id);
        invariant(
          terminal.id === id &&
            !terminal.livemode &&
            terminal.status === "expired" &&
            terminal.payment_status === "unpaid" &&
            terminal.payment_intent === null,
          "PILOT_STRIPE_PROOF_CLEANUP_FAILED",
        );
      } catch {
        cleanupFailed = true;
      }
    }
  }
  if (cleanupFailed) throw new Error("PILOT_STRIPE_PROOF_CLEANUP_FAILED");
  if (proofFailed) throw failure;
  return {
    exercise: "pilot-stripe-uncompleted-checkouts",
    scenarios: cases.length,
    stableRetries: true,
    opaqueMetadata: true,
    exactLineItems: true,
    terminalUnpaidInspection: true,
    testSessionsExpired: created.size,
    realMoneyMoved: false,
    completedPaymentsProved: false,
    hostedJourneyProved: false,
    identifiersLogged: false,
  } as const;
}
