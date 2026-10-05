import { expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { PilotRefundProvider, dispatchRefund } from "./pilot-refund";
import { describe } from "vitest";
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

describe("independent reconciliation observations", () => {
  function observation() {
    const plan = {
      kind: "duplicate" as const,
      reference: input.refundId,
      eventId: "evt_duplicate12345",
      intentId: input.refundId,
      tenantId: input.refundId,
      accountId: input.accountId,
      sessionId: "cs_test_duplicate12345",
      paymentIntentId: "pi_duplicate12345",
      retainedPaymentIntentId: "pi_retained12345",
      amountMinor: 99900,
    };
    const session = {
      id: plan.sessionId,
      livemode: false,
      status: "complete",
      payment_status: "paid",
      mode: "payment",
      currency: "zar",
      amount_total: 99900,
      payment_intent: plan.paymentIntentId,
      client_reference_id: plan.intentId,
      metadata: { orderId: plan.intentId, tenantId: plan.tenantId },
    };
    const payment = {
      livemode: false,
      status: "succeeded",
      currency: "zar",
      amount_received: 99900,
    };
    const dispute = {
      id: "dp_synthetic12345",
      livemode: false,
      payment_intent: plan.paymentIntentId,
      currency: "zar",
      amount: 99900,
      status: "won",
    };
    const client = {
      accounts: { retrieveCurrent: vi.fn(async () => ({ id: input.accountId })) },
      checkout: { sessions: { retrieve: vi.fn(async () => session) } },
      paymentIntents: { retrieve: vi.fn(async (id: string) => ({ id, ...payment })) },
      disputes: { retrieve: vi.fn(async () => dispute) },
    };
    return {
      plan,
      session,
      payment,
      dispute,
      client,
      provider: new PilotRefundProvider(
        "rk_test_synthetic_only",
        input.accountId,
        client as unknown as Stripe,
      ),
    };
  }
  it("proves two separate captures and returns only an opaque observation", async () => {
    const h = observation();
    expect(await h.provider.inspectException(h.plan)).toEqual({
      reference: h.plan.reference,
      kind: "duplicate",
      eventId: h.plan.eventId,
    });
    expect(h.client.paymentIntents.retrieve.mock.calls.map(([id]) => id)).toEqual([
      h.plan.paymentIntentId,
      h.plan.retainedPaymentIntentId,
    ]);
    await expect(
      h.provider.inspectException({ ...h.plan, retainedPaymentIntentId: h.plan.paymentIntentId }),
    ).rejects.toThrow();
    await expect(
      h.provider.inspectException({ ...h.plan, accountId: "acct_foreign12345" }),
    ).rejects.toThrow();
  });
  it("rejects live, unbound, unpaid, changed-amount and unsettled duplicates", async () => {
    for (const patch of [
      { livemode: true },
      { payment_status: "unpaid" },
      { amount_total: 1 },
      { payment_intent: "pi_foreign12345" },
      { metadata: { orderId: crypto.randomUUID(), tenantId: input.refundId } },
    ]) {
      const h = observation();
      Object.assign(h.session, patch);
      await expect(h.provider.inspectException(h.plan)).rejects.toThrow();
    }
    for (const patch of [
      { livemode: true },
      { status: "processing" },
      { amount_received: 0 },
      { currency: "usd" },
    ]) {
      const h = observation();
      Object.assign(h.payment, patch);
      await expect(h.provider.inspectException(h.plan)).rejects.toThrow();
    }
  });
  it("requires the exact independently observed terminal dispute, not an ownership claim", async () => {
    for (const status of ["won", "lost", "warning_closed"] as const) {
      const h = observation();
      h.dispute.status = status;
      const plan = {
        kind: "dispute",
        reference: h.plan.reference,
        eventId: h.plan.eventId,
        accountId: input.accountId,
        disputeId: h.dispute.id,
        paymentIntentId: h.plan.paymentIntentId,
        amountMinor: 99900,
        status,
      };
      expect(await h.provider.inspectException(plan)).toEqual({
        reference: h.plan.reference,
        kind: "dispute",
        eventId: h.plan.eventId,
      });
      for (const patch of [
        { status: "under_review" },
        { livemode: true },
        { amount: 1 },
        { payment_intent: "pi_foreign12345" },
      ]) {
        Object.assign(h.dispute, patch);
        await expect(h.provider.inspectException(plan)).rejects.toThrow();
        Object.assign(h.dispute, {
          status,
          livemode: false,
          amount: 99900,
          payment_intent: h.plan.paymentIntentId,
        });
      }
    }
  });
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
