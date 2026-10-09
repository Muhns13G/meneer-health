import Stripe from "stripe";
import { expect, it, vi } from "vitest";
import { PilotCheckoutProvider, type CheckoutIntent } from "./pilot-checkout";
import { PilotRefundProvider } from "./pilot-refund";
import { verifyPilotReceipt } from "./pilot-webhook";
import {
  assertStripeCredential,
  stripeObjectMatchesEnvironment,
  stripeSessionSchema,
} from "./stripe-payment-environment";

const id = "a3100000-0000-4000-8000-000000000001";
const accountId = "acct_synthetic12345";
const intent: CheckoutIntent = {
  intentId: id,
  tenantId: id,
  accountId,
  scenario: "review_deposit",
  currency: "zar",
  amountTotalMinor: 99900,
  productBalanceMinor: 0,
  deliveryMinor: 0,
  expiresEpoch: Math.floor(Date.now() / 1000) + 3600,
  sessionId: null,
  checkoutUrl: null,
};
it("requires an explicit mode and never permits credential/session environment crossover", () => {
  for (const mode of ["sandbox", "live"] as const) {
    const prefix = mode === "live" ? "live" : "test";
    expect(() =>
      assertStripeCredential(`rk_${prefix}_synthetic_only`, accountId, mode, "INVALID"),
    ).not.toThrow();
    expect(() =>
      assertStripeCredential(
        `rk_${prefix === "live" ? "test" : "live"}_synthetic_only`,
        accountId,
        mode,
        "INVALID",
      ),
    ).toThrow("INVALID");
    expect(() =>
      assertStripeCredential(`sk_${prefix}_synthetic_only`, accountId, mode, "INVALID"),
    ).toThrow("INVALID");
    expect(stripeSessionSchema(mode).safeParse(`cs_${prefix}_synthetic12345`).success).toBe(true);
    expect(
      stripeSessionSchema(mode).safeParse(
        `cs_${prefix === "live" ? "test" : "live"}_synthetic12345`,
      ).success,
    ).toBe(false);
    expect(stripeObjectMatchesEnvironment({}, mode)).toBe(false);
    expect(stripeObjectMatchesEnvironment({ livemode: "true" }, mode)).toBe(false);
  }
  expect(() => new PilotCheckoutProvider("rk_live_synthetic_only", accountId)).toThrow();
  expect(() => new PilotRefundProvider("rk_live_synthetic_only", accountId)).toThrow();
});
it("supports explicitly selected live Checkout but rejects sandbox objects/account drift", async () => {
  const liveIntent: CheckoutIntent = { ...intent, paymentEnvironment: "live" };
  const session = {
    id: "cs_live_synthetic12345",
    livemode: true,
    mode: "payment",
    currency: "zar",
    amount_total: 99900,
    expires_at: intent.expiresEpoch,
    client_reference_id: id,
    url: "https://checkout.stripe.com/c/pay/synthetic",
  };
  const create = vi.fn(async () => ({ ...session }));
  const retrieveCurrent = vi.fn(async () => ({ id: accountId }));
  const provider = new PilotCheckoutProvider(
    "rk_live_synthetic_only",
    accountId,
    { accounts: { retrieveCurrent }, checkout: { sessions: { create } } } as unknown as Stripe,
    "live",
  );
  await expect(provider.create(intent)).rejects.toThrow();
  expect(create).not.toHaveBeenCalled();
  expect(await provider.create(liveIntent)).toEqual({ id: session.id, url: session.url });
  for (const patch of [
    { livemode: false },
    { id: "cs_test_synthetic12345" },
    { amount_total: 1 },
    { currency: "usd" },
  ]) {
    create.mockResolvedValueOnce({ ...session, ...patch });
    await expect(provider.create(liveIntent)).rejects.toThrow("CHECKOUT_PROVIDER_INVALID");
  }
  retrieveCurrent.mockResolvedValueOnce({ id: "acct_other12345" });
  const count = create.mock.calls.length;
  await expect(provider.create(liveIntent)).rejects.toThrow("CHECKOUT_ACCOUNT_MISMATCH");
  expect(create).toHaveBeenCalledTimes(count);
});
it("verifies live SDK signatures and rejects test events, nested mode mismatch and wrong secrets", async () => {
  const client = new Stripe("rk_live_synthetic_only", { apiVersion: "2026-07-29.dahlia" });
  const secret = "whsec_synthetic_live_not_a_secret";
  const object = {
    id: "cs_live_synthetic12345",
    livemode: true,
    client_reference_id: id,
    metadata: { orderId: id, tenantId: id },
    payment_status: "paid",
    payment_intent: "pi_synthetic12345",
    amount_total: 99900,
    currency: "zar",
  };
  const event = {
    id: "evt_synthetic12345",
    type: "checkout.session.completed",
    livemode: true,
    created: Math.floor(Date.now() / 1000),
    data: { object },
  };
  const verify = (value: unknown, signingSecret = secret) => {
    const raw = JSON.stringify(value);
    return verifyPilotReceipt(
      raw,
      client.webhooks.generateTestHeaderString({ payload: raw, secret }),
      signingSecret,
      accountId,
      client,
      "live",
    );
  };
  expect(await verify(event)).toMatchObject({ sessionId: object.id, amountMinor: 99900 });
  await expect(verify({ ...event, livemode: false })).rejects.toThrow();
  await expect(
    verify({ ...event, data: { object: { ...object, livemode: false } } }),
  ).rejects.toThrow();
  await expect(
    verify({ ...event, data: { object: { ...object, id: "cs_test_synthetic12345" } } }),
  ).rejects.toThrow();
  await expect(verify({ ...event, account: "acct_other12345" })).rejects.toThrow();
  await expect(verify(event, "whsec_wrong_synthetic_only")).rejects.toThrow();
});
it("permits an exact live refund only after live capture/account proof, retaining uncertain failures", async () => {
  const payment = {
    id: "pi_synthetic12345",
    livemode: true,
    currency: "zar",
    status: "succeeded",
    amount_received: 99900,
  };
  const retrieve = vi.fn(async () => ({ ...payment }));
  const create = vi.fn(async () => ({
    id: "re_synthetic12345",
    payment_intent: payment.id,
    amount: 99900,
    currency: "zar",
    status: "succeeded",
  }));
  const provider = new PilotRefundProvider(
    "rk_live_synthetic_only",
    accountId,
    {
      accounts: { retrieveCurrent: vi.fn(async () => ({ id: accountId })) },
      paymentIntents: { retrieve },
      refunds: { create },
    } as unknown as Stripe,
    "live",
  );
  const input = {
    refundId: id,
    accountId,
    paymentIntentId: payment.id,
    amountMinor: 99900,
    currency: "zar",
  };
  expect(await provider.submit(input)).toEqual({
    providerId: "re_synthetic12345",
    state: "submitted",
  });
  retrieve.mockResolvedValueOnce({ ...payment, livemode: false });
  await expect(provider.submit(input)).rejects.toThrow("REFUND_CAPTURE_INVALID");
  expect(create).toHaveBeenCalledOnce();
  await expect(provider.submit({ ...input, amountMinor: 100000 })).rejects.toThrow(
    "REFUND_CAPTURE_INVALID",
  );
  expect(create).toHaveBeenCalledOnce();
});
