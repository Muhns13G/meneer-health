import { expect, it, vi } from "vitest";
import {
  PilotCheckoutProvider,
  createPilotCheckoutCommands,
  checkoutIntentSchema,
  type CheckoutIntent,
} from "./pilot-checkout";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
const id = "a3100000-0000-4000-8000-000000000001";
it.each(["PT409", "40001", "23505"])(
  "does not create a provider Checkout after database conflict %s",
  async (code) => {
    const rpc = vi.fn(async () => ({ data: null, error: { code } }));
    const create = vi.fn();
    const commands = createPilotCheckoutCommands(
      { rpc } as unknown as SupabaseClient,
      "acct_synthetic12345",
      { create } as unknown as PilotCheckoutProvider,
    );
    await expect(
      commands.checkout(
        {
          tenantId: id,
          subjectId: id,
          sessionId: id,
          providerSubject: id,
          providerSessionId: id,
          verifiedEmail: "checkout@example.invalid",
          purpose: "account",
        },
        id,
        id,
      ),
    ).rejects.toThrow("COMMERCE_CONFLICT");
    expect(rpc).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  },
);
const intent: CheckoutIntent = {
  intentId: id,
  tenantId: id,
  accountId: "acct_synthetic12345",
  scenario: "review_deposit",
  currency: "zar",
  amountTotalMinor: 99900,
  productBalanceMinor: 0,
  deliveryMinor: 0,
  expiresEpoch: Math.floor(Date.now() / 1000) + 3600,
  sessionId: null,
  checkoutUrl: null,
};
const validSession = {
  id: "cs_test_synthetic12345",
  url: "https://checkout.stripe.com/c/pay/synthetic",
  livemode: false,
  currency: "zar",
  amount_total: 99900,
  client_reference_id: id,
  mode: "payment",
  expires_at: intent.expiresEpoch,
};
function harness() {
  const create = vi.fn(async () => ({ ...validSession }));
  const retrieve = vi.fn(async () => ({ id: intent.accountId }));
  return {
    create,
    retrieve,
    provider: new PilotCheckoutProvider("rk_test_synthetic_only", intent.accountId, {
      accounts: { retrieveCurrent: retrieve },
      checkout: { sessions: { create } },
    } as unknown as Stripe),
  };
}
it("uses immutable server amounts, normal account, stable provider key and opaque metadata", async () => {
  const h = harness();
  await h.provider.create(intent);
  await h.provider.create(intent);
  const [params, options] = h.create.mock.calls[0] as unknown as [
    Record<string, unknown>,
    Record<string, unknown>,
  ];
  expect(options.idempotencyKey).toBe(`pilot-checkout:${id}`);
  expect(h.create.mock.calls[1]).toEqual(h.create.mock.calls[0]);
  expect(params.metadata).toEqual({ orderId: id, tenantId: id });
  expect(params.expires_at).toBe(intent.expiresEpoch);
  expect(params.success_url).toBe("https://meneerhealth.co.za/portal/order");
  for (const name of [
    "payment_method_types",
    "allow_promotion_codes",
    "customer_email",
    "automatic_tax",
    "transfer_data",
  ])
    expect(params).not.toHaveProperty(name);
  expect(params.line_items).toEqual([
    {
      price_data: { currency: "zar", unit_amount: 99900, product_data: { name: "Review deposit" } },
      quantity: 1,
    },
  ]);
});
it("supports capped-credit net balance, separate delivery and zero without negative prices", async () => {
  const h = harness();
  h.create.mockResolvedValue({ ...validSession, amount_total: 10000 });
  await h.provider.create({
    ...intent,
    scenario: "approved_product_order",
    amountTotalMinor: 10000,
    productBalanceMinor: 0,
    deliveryMinor: 10000,
  });
  expect(
    (h.create.mock.calls.at(-1) as unknown as [Record<string, unknown>])[0].line_items,
  ).toEqual([
    {
      price_data: {
        currency: "zar",
        unit_amount: 0,
        product_data: { name: "Approved product order balance after deposit credit" },
      },
      quantity: 1,
    },
    {
      price_data: { currency: "zar", unit_amount: 10000, product_data: { name: "Delivery" } },
      quantity: 1,
    },
  ]);
  h.create.mockResolvedValue({ ...validSession, amount_total: 0 });
  await h.provider.create({ ...intent, scenario: "approved_product_order", amountTotalMinor: 0 });
  expect(
    (h.create.mock.calls.at(-1) as unknown as [Record<string, unknown>])[0],
  ).not.toHaveProperty("payment_intent_data");
});
it("denies wrong account, live response, wrong amount/currency and untrusted redirect", async () => {
  const h = harness();
  h.retrieve.mockResolvedValueOnce({ id: "acct_wrong12345" });
  await expect(h.provider.create(intent)).rejects.toThrow();
  expect(h.create).not.toHaveBeenCalled();
  for (const patch of [
    { livemode: true },
    { amount_total: 1 },
    { currency: "usd" },
    { expires_at: intent.expiresEpoch + 1 },
    { url: "https://checkout.stripe.com.evil.invalid/" },
  ]) {
    h.create.mockResolvedValue({ ...validSession, ...patch });
    await expect(h.provider.create(intent)).rejects.toThrow();
  }
  expect(() => new PilotCheckoutProvider("sk_live_synthetic_only", intent.accountId)).toThrow();
  expect(checkoutIntentSchema.safeParse({ ...intent, amountTotalMinor: -1 }).success).toBe(false);
});
it("leaves uncertain provider creation un-attached and repeats one stable intent", async () => {
  const rpc = vi.fn(async (name: string) => ({
    data: name === "patient_prepare_checkout" ? intent : null,
    error: null,
  }));
  const provider = {
    create: vi.fn(async () => {
      throw new Error("synthetic provider timeout");
    }),
  };
  const commands = createPilotCheckoutCommands(
    { rpc } as unknown as SupabaseClient,
    intent.accountId,
    provider as unknown as PilotCheckoutProvider,
  );
  const context = {
    tenantId: id,
    subjectId: id,
    sessionId: id,
    providerSubject: id,
    providerSessionId: id,
    verifiedEmail: "checkout@example.invalid",
    purpose: "account" as const,
  };
  await expect(commands.checkout(context, id, id)).rejects.toThrow();
  expect(rpc.mock.calls.map((v) => v[0])).toEqual(["patient_prepare_checkout"]);
});
