import { expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { PilotRefundProvider, dispatchRefund } from "./pilot-refund";
const input = {
  refundId: "a4700000-0000-4000-8000-000000000001",
  accountId: "acct_synthetic12345",
  paymentIntentId: "pi_synthetic12345",
  amountMinor: 19900,
  currency: "zar",
};
function setup() {
  const payment = {
    id: input.paymentIntentId,
    livemode: false,
    currency: "zar",
    status: "succeeded",
    amount_received: 99900,
  };
  const refund = {
    id: "re_synthetic12345",
    payment_intent: input.paymentIntentId,
    amount: input.amountMinor,
    currency: "zar",
    status: "succeeded",
  };
  const create = vi.fn(async () => refund);
  const client = {
    accounts: { retrieveCurrent: vi.fn(async () => ({ id: input.accountId })) },
    paymentIntents: { retrieve: vi.fn(async () => payment) },
    refunds: { create },
  };
  return {
    client,
    payment,
    refund,
    create,
    provider: new PilotRefundProvider(
      "rk_test_synthetic_not_a_secret",
      input.accountId,
      client as unknown as Stripe,
    ),
  };
}
it("uses the original PaymentIntent and a durable idempotency key without customer/clinical metadata", async () => {
  const h = setup();
  expect(await h.provider.submit(input)).toEqual({ providerId: h.refund.id, state: "submitted" });
  expect(h.create).toHaveBeenCalledWith(
    {
      payment_intent: input.paymentIntentId,
      amount: 19900,
      metadata: { refund_reference: input.refundId },
    },
    { idempotencyKey: `pilot-refund:${input.refundId}` },
  );
});
it("rejects live keys, account mismatch, live/unsettled captures and changed provider amounts", async () => {
  expect(() => new PilotRefundProvider("rk_live_invalid", input.accountId)).toThrow();
  const h = setup();
  await expect(h.provider.submit({ ...input, accountId: "acct_wrong12345678" })).rejects.toThrow();
  h.payment.livemode = true;
  await expect(h.provider.submit(input)).rejects.toThrow();
  expect(h.create).not.toHaveBeenCalled();
  h.payment.livemode = false;
  h.refund.amount = 1;
  await expect(h.provider.submit(input)).rejects.toThrow();
});
it("records timeout as uncertain, never as a refund or released reservation", async () => {
  const claim = vi.fn(async () => input),
    submit = vi.fn(async () => {
      throw new Error("synthetic timeout");
    }),
    record = vi.fn(async () => {});
  await dispatchRefund(claim, { submit }, record);
  expect(record).toHaveBeenCalledWith({ providerId: null, state: "uncertain" });
  expect(submit).toHaveBeenCalledOnce();
});
it("never calls Stripe if claim fails, and preserves uncertainty when result persistence fails", async () => {
  const h = setup(),
    record = vi.fn(async () => {
      throw new Error("synthetic persistence failure");
    });
  await expect(
    dispatchRefund(
      async () => {
        throw new Error("denied");
      },
      h.provider,
      record,
    ),
  ).rejects.toThrow();
  expect(h.create).not.toHaveBeenCalled();
  await expect(dispatchRefund(async () => input, h.provider, record)).rejects.toThrow();
  expect(h.create).toHaveBeenCalledOnce();
  expect(record).toHaveBeenCalledOnce();
});
it("releases no credit unless the current exact test Session and PaymentIntent are terminal and unpaid", async () => {
  const plan = {
    intentId: input.refundId,
    tenantId: input.refundId,
    accountId: input.accountId,
    sessionId: "cs_test_synthetic12345",
    paymentIntentId: input.paymentIntentId,
    amountMinor: 60100,
  };
  const session = {
    id: plan.sessionId,
    livemode: false,
    mode: "payment",
    currency: "zar",
    amount_total: 60100,
    client_reference_id: plan.intentId,
    metadata: { orderId: plan.intentId, tenantId: plan.tenantId },
    status: "expired",
    payment_status: "unpaid",
    payment_intent: plan.paymentIntentId,
  };
  const payment = {
    id: plan.paymentIntentId,
    livemode: false,
    currency: "zar",
    status: "requires_payment_method",
    amount_received: 0,
  };
  const client = {
    accounts: { retrieveCurrent: vi.fn(async () => ({ id: plan.accountId })) },
    checkout: { sessions: { retrieve: vi.fn(async () => session) } },
    paymentIntents: { retrieve: vi.fn(async () => payment) },
  };
  const provider = new PilotRefundProvider(
    "rk_test_synthetic_only",
    plan.accountId,
    client as unknown as Stripe,
  );
  expect(await provider.inspectTerminal(plan)).toEqual({
    intentId: plan.intentId,
    sessionId: plan.sessionId,
    status: "expired",
  });
  for (const status of ["processing", "requires_action", "succeeded"]) {
    payment.status = status;
    await expect(provider.inspectTerminal(plan)).rejects.toThrow();
  }
  payment.status = "canceled";
  payment.amount_received = 1;
  await expect(provider.inspectTerminal(plan)).rejects.toThrow();
  payment.amount_received = 0;
  session.payment_status = "paid";
  await expect(provider.inspectTerminal(plan)).rejects.toThrow();
  session.payment_status = "unpaid";
  session.status = "open";
  await expect(provider.inspectTerminal(plan)).rejects.toThrow();
  session.status = "expired";
  session.metadata.orderId = crypto.randomUUID();
  await expect(provider.inspectTerminal(plan)).rejects.toThrow();
});
