import { expect, it, vi } from "vitest";
import {
  provePilotStripeUncompletedCheckouts,
  readPilotStripeProofConfiguration,
  type PilotStripeProofPort,
} from "./pilot-stripe-provider-proof";
import type { CheckoutIntent } from "../../src/server/payments/pilot-checkout";

const account = "acct_synthetic12345";
function harness() {
  const intents = new Map<string, CheckoutIntent>();
  const expired = new Set<string>();
  const create = vi.fn(async (intent: CheckoutIntent) => {
    const id = `cs_test_${intent.intentId.replaceAll("-", "")}`;
    intents.set(id, intent);
    return { id, url: "https://checkout.stripe.com/c/pay/synthetic" };
  });
  const retrieve = vi.fn(async (id: string) => {
    const intent = intents.get(id)!;
    return {
      id,
      livemode: false,
      mode: "payment",
      status: expired.has(id) ? "expired" : "open",
      payment_status: "unpaid",
      payment_intent: null,
      amount_total: intent.amountTotalMinor,
      currency: "zar",
      expires_at: intent.expiresEpoch,
      client_reference_id: intent.intentId,
      metadata: { orderId: intent.intentId, tenantId: intent.tenantId },
      success_url: "https://meneerhealth.co.za/portal/order",
      cancel_url: "https://meneerhealth.co.za/portal/order",
    };
  });
  const port: PilotStripeProofPort = {
    account: vi.fn(async () => account),
    create,
    retrieve,
    lines: vi.fn(async (id: string) => {
      const intent = intents.get(id)!;
      const line = (description: string, amount_total: number) => ({
        description,
        quantity: 1,
        currency: "zar",
        amount_total,
      });
      return {
        has_more: false,
        data:
          intent.scenario === "review_deposit"
            ? [line("Review deposit", 99900)]
            : [
                line(
                  "Approved product order balance after deposit credit",
                  intent.productBalanceMinor,
                ),
                ...(intent.deliveryMinor ? [line("Delivery", intent.deliveryMinor)] : []),
              ],
      };
    }),
    expire: vi.fn(async (id: string) => {
      expired.add(id);
      return retrieve(id);
    }),
    inspectTerminal: vi.fn(async (input) => ({
      intentId: input.intentId,
      sessionId: input.sessionId,
      status: "expired" as const,
    })),
  };
  return { port, create, expired };
}

it("requires explicit no-completion consent, a restricted test key and exact account", () => {
  const valid = {
    PILOT_STRIPE_EXERCISE_CONFIRM: "uncompleted-test-checkouts-only",
    STRIPE_RESTRICTED_KEY: "rk_test_synthetic_only",
    STRIPE_CHECKOUT_ACCOUNT_ID: account,
  };
  expect(readPilotStripeProofConfiguration(valid)).toEqual(valid);
  for (const patch of [
    { PILOT_STRIPE_EXERCISE_CONFIRM: undefined },
    { STRIPE_RESTRICTED_KEY: "rk_live_synthetic_only" },
    { STRIPE_RESTRICTED_KEY: "sk_test_synthetic_only" },
    { STRIPE_CHECKOUT_ACCOUNT_ID: "not-an-account" },
  ])
    expect(() => readPilotStripeProofConfiguration({ ...valid, ...patch })).toThrow(
      "PILOT_STRIPE_PROOF_CONFIGURATION_REJECTED",
    );
});
it("covers current deposit, credited product/delivery and zero balance without claiming payment", async () => {
  const h = harness();
  const result = await provePilotStripeUncompletedCheckouts(account, h.port);
  expect(result).toMatchObject({
    scenarios: 3,
    testSessionsExpired: 3,
    completedPaymentsProved: false,
    hostedJourneyProved: false,
    identifiersLogged: false,
  });
  expect(h.create).toHaveBeenCalledTimes(6);
  expect(h.expired.size).toBe(3);
  expect(h.create.mock.calls.map(([intent]) => intent.amountTotalMinor)).toEqual([
    99900, 99900, 85100, 85100, 0, 0,
  ]);
  expect(JSON.stringify(result)).not.toMatch(/cs_test_|acct_|checkout\.stripe/);
});
it("denies a foreign account before creating resources", async () => {
  const h = harness();
  h.port.account = async () => "acct_foreign12345";
  await expect(provePilotStripeUncompletedCheckouts(account, h.port)).rejects.toThrow(
    "PILOT_STRIPE_PROOF_ACCOUNT_REJECTED",
  );
  expect(h.create).not.toHaveBeenCalled();
});
it("expires only this run's Session on prohibited metadata", async () => {
  const h = harness();
  const original = h.port.retrieve;
  h.port.retrieve = async (id) => ({ ...(await original(id)), metadata: { health: "synthetic" } });
  await expect(provePilotStripeUncompletedCheckouts(account, h.port)).rejects.toThrow(
    "PILOT_STRIPE_PROOF_SESSION_FAILED",
  );
  expect(h.expired.size).toBe(1);
  expect(h.create).toHaveBeenCalledTimes(2);
});
it("rejects extra or altered provider line items and still expires the Session", async () => {
  const h = harness();
  h.port.lines = async () => ({ has_more: false, data: [] });
  await expect(provePilotStripeUncompletedCheckouts(account, h.port)).rejects.toThrow(
    "PILOT_STRIPE_PROOF_LINES_FAILED",
  );
  expect(h.expired.size).toBe(1);
});
it("fails on a provider dependency error while cleaning the known Session", async () => {
  const h = harness();
  h.port.lines = async () => {
    throw new Error("synthetic dependency unavailable");
  };
  await expect(provePilotStripeUncompletedCheckouts(account, h.port)).rejects.toThrow();
  expect(h.expired.size).toBe(1);
});
it("never reports success when cleanup fails", async () => {
  const h = harness();
  h.port.expire = async () => {
    throw new Error("synthetic expiry failure");
  };
  await expect(provePilotStripeUncompletedCheckouts(account, h.port)).rejects.toThrow(
    "PILOT_STRIPE_PROOF_CLEANUP_FAILED",
  );
});
it("rejects a wrong independently inspected terminal binding", async () => {
  const h = harness();
  h.port.inspectTerminal = async (input) => ({ ...input, status: "complete" });
  await expect(provePilotStripeUncompletedCheckouts(account, h.port)).rejects.toThrow(
    "PILOT_STRIPE_PROOF_TERMINAL_FAILED",
  );
  expect(h.expired.size).toBe(1);
});
