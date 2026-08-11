import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { paymentOrderSchema } from "../../../../contracts/payments";
import { PaymentProviderError } from "@/application/payments/payment-provider";
import { StripePaymentProvider } from "./stripe-payment-provider";

const restrictedKey = `rk_test_${"A".repeat(24)}`;
const signingSecret = `whsec_${"B".repeat(24)}`;
const order = paymentOrderSchema.parse({
  orderId: "b0000000-0000-4000-8000-000000000014",
  tenantId: "10000000-0000-4000-8000-000000000001",
  workflowId: "a0000000-0000-4000-8000-000000000001",
  subjectId: "20000000-0000-4000-8000-000000000001",
  scenario: "consultation_only",
  status: "prepared",
  refundState: "not_required",
  disputeState: "none",
  currency: "zar",
  amountTotalMinor: 10000,
  termsVersion: "synthetic_terms_v1",
  priceVersion: "synthetic_prices_v1",
  lines: [
    {
      lineId: "b0000000-0000-4000-8000-000000000015",
      lineType: "consultation",
      description: "Consultation",
      quantity: 1,
      unitAmountMinor: 10000,
      totalAmountMinor: 10000,
      currency: "zar",
      taxTreatment: "synthetic_tax_treatment",
      priceVersion: "synthetic_prices_v1",
      providerPriceId: "price_test_synthetic_consultation_01",
    },
  ],
  replayed: false,
});

describe("StripePaymentProvider", () => {
  it("creates one-time Checkout with server snapshots and opaque metadata only", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "cs_test_synthetic_0001",
      url: "https://checkout.stripe.com/c/pay/synthetic",
      livemode: false,
    });
    const stripe = { checkout: { sessions: { create } } } as unknown as Stripe;
    const provider = new StripePaymentProvider(restrictedKey, signingSecret, "local", stripe);

    await expect(
      provider.createCheckoutSession({
        order,
        idempotencyKey: "payment_retry_01",
        successUrl: "https://example.invalid/payment-return",
        cancelUrl: "https://example.invalid/payment-cancelled",
      }),
    ).resolves.toEqual({
      id: "cs_test_synthetic_0001",
      url: "https://checkout.stripe.com/c/pay/synthetic",
    });

    const [parameters, options] = create.mock.calls[0] as [Record<string, unknown>, unknown];
    expect(parameters).toMatchObject({
      mode: "payment",
      client_reference_id: order.orderId,
      line_items: [{ price: "price_test_synthetic_consultation_01", quantity: 1 }],
      metadata: { orderId: order.orderId, tenantId: order.tenantId },
    });
    expect(parameters).not.toHaveProperty("payment_method_types");
    expect(JSON.stringify(parameters)).not.toMatch(/diagnosis|symptom|questionnaire|prescription/i);
    expect(options).toEqual({ idempotencyKey: "payment_retry_01" });
  });

  it("verifies the unmodified body and normalises only allowlisted event fields", async () => {
    const stripe = new Stripe(restrictedKey);
    const provider = new StripePaymentProvider(restrictedKey, signingSecret, "local", stripe);
    const payload = JSON.stringify({
      id: "evt_synthetic_0001",
      object: "event",
      api_version: "2026-07-29.dahlia",
      created: 1893456600,
      data: {
        object: {
          id: "cs_test_synthetic_0001",
          object: "checkout.session",
          client_reference_id: order.orderId,
          livemode: false,
          metadata: { orderId: order.orderId },
          payment_intent: "pi_synthetic_0001",
          payment_status: "paid",
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: "checkout.session.completed",
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: signingSecret,
      timestamp: 1893456600,
    });

    await expect(provider.verifyWebhook(payload, signature)).resolves.toMatchObject({
      externalEventId: "evt_synthetic_0001",
      eventType: "checkout.session.completed",
      orderId: order.orderId,
      paymentStatus: "paid",
    });
    await expect(provider.verifyWebhook(`${payload} `, signature)).rejects.toBeInstanceOf(
      PaymentProviderError,
    );
  });

  it("rejects live keys and live provider responses", async () => {
    expect(
      () => new StripePaymentProvider(`rk_live_${"A".repeat(24)}`, signingSecret, "production"),
    ).toThrow(PaymentProviderError);

    const stripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_live_synthetic_0001",
            url: "https://checkout.stripe.com/c/pay/live",
            livemode: true,
          }),
        },
      },
    } as unknown as Stripe;
    const provider = new StripePaymentProvider(restrictedKey, signingSecret, "production", stripe);
    await expect(
      provider.createCheckoutSession({
        order,
        idempotencyKey: "payment_retry_01",
        successUrl: "https://example.invalid/payment-return",
        cancelUrl: "https://example.invalid/payment-cancelled",
      }),
    ).rejects.toBeInstanceOf(PaymentProviderError);
  });
});
