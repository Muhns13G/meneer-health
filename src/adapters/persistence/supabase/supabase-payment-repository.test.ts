import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { PaymentRepositoryError } from "@/application/payments/payment-repository";
import { SupabasePaymentRepository } from "./supabase-payment-repository";

const order = {
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
      providerPriceId: "price_syntheticconsultation01",
    },
  ],
  replayed: false,
};

describe("SupabasePaymentRepository", () => {
  it("prepares server-priced checkout without accepting browser amounts", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: order, error: null });
    const repository = new SupabasePaymentRepository({ rpc } as unknown as SupabaseClient, "local");

    await expect(
      repository.prepareCheckout({
        tenantId: order.tenantId,
        workflowId: order.workflowId,
        subjectId: order.subjectId,
        scenario: "consultation_only",
        requestId: "payment_request_01",
        idempotencyKey: "payment_retry_01",
        requestFingerprint: "a".repeat(64),
        expectedVersion: 0,
        occurredAt: new Date("2030-01-01T00:10:00Z"),
        actorSubjectId: order.subjectId,
        actorRole: "patient",
        assurance: "aal1",
        policyVersion: "2026-08-10.1",
        correlationId: "payment_trace_01",
      }),
    ).resolves.toEqual(order);
    expect(rpc).toHaveBeenCalledWith(
      "prepare_payment_checkout",
      expect.not.objectContaining({ p_amount: expect.anything(), p_price_id: expect.anything() }),
    );
  });

  it("passes only normalised signed-event fields and fails closed", async () => {
    const result = {
      order: { ...order, status: "paid", paymentIntentId: "pi_synthetic_0001" },
      eventId: "b0000000-0000-4000-8000-000000000016",
      replayed: false,
      reconciliationRequired: false,
    };
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    const repository = new SupabasePaymentRepository({ rpc } as unknown as SupabaseClient, "local");
    await expect(
      repository.applyProviderEvent({
        serviceIdentityId: "80000000-0000-4000-8000-000000000002",
        event: {
          contract: "payment.provider",
          version: 1,
          provider: "stripe",
          environment: "local",
          externalEventId: "evt_synthetic_0001",
          eventType: "checkout.session.completed",
          orderId: order.orderId,
          checkoutSessionId: "cs_test_synthetic_0001",
          paymentIntentId: "pi_synthetic_0001",
          paymentStatus: "paid",
          occurredAt: "2030-01-01T00:10:00Z",
          payloadFingerprint: "b".repeat(64),
        },
      }),
    ).resolves.toEqual(result);
    expect(rpc).toHaveBeenCalledWith(
      "apply_payment_provider_event",
      expect.objectContaining({ p_refund_complete: null, p_dispute_outcome: null }),
    );
    expect(JSON.stringify(rpc.mock.calls)).not.toMatch(/raw_body|questionnaire|diagnosis/i);

    const failed = new SupabasePaymentRepository(
      {
        rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } }),
      } as unknown as SupabaseClient,
      "local",
    );
    await expect(
      failed.attachCheckoutSession({
        tenantId: order.tenantId,
        orderId: order.orderId,
        checkoutSessionId: "cs_test_synthetic_0001",
        occurredAt: new Date("2030-01-01T00:10:00Z"),
      }),
    ).rejects.toBeInstanceOf(PaymentRepositoryError);
  });
});
