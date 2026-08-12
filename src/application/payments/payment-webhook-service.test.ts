import { describe, expect, it, vi } from "vitest";

import { PaymentProviderError, type PaymentProvider } from "./payment-provider";
import { PaymentRepositoryError, type PaymentRepository } from "./payment-repository";
import { PaymentWebhookService } from "./payment-webhook-service";

const event = {
  contract: "payment.provider",
  version: 1,
  provider: "stripe",
  environment: "local",
  externalEventId: "evt_synthetic_0001",
  eventType: "checkout.session.completed",
  orderId: "b0000000-0000-4000-8000-000000000014",
  checkoutSessionId: "cs_test_synthetic_0001",
  paymentIntentId: "pi_synthetic_0001",
  paymentStatus: "paid",
  occurredAt: "2030-01-01T00:10:00Z",
  payloadFingerprint: "a".repeat(64),
} as const;

function fixture() {
  const provider = {
    createCheckoutSession: vi.fn(),
    verifyWebhook: vi.fn().mockResolvedValue(event),
  } satisfies PaymentProvider;
  const repository = {
    prepareCheckout: vi.fn(),
    attachCheckoutSession: vi.fn(),
    applyProviderEvent: vi.fn().mockResolvedValue({
      order: {
        orderId: event.orderId,
        tenantId: "10000000-0000-4000-8000-000000000001",
        workflowId: "a0000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        scenario: "consultation_only",
        status: "paid",
        refundState: "not_required",
        disputeState: "none",
        currency: "zar",
        amountTotalMinor: 10000,
        termsVersion: "synthetic_terms_v1",
        priceVersion: "synthetic_prices_v1",
        checkoutSessionId: event.checkoutSessionId,
        paymentIntentId: event.paymentIntentId,
        lines: [],
        replayed: false,
      },
      eventId: "b0000000-0000-4000-8000-000000000016",
      replayed: false,
      reconciliationRequired: false,
    }),
  } satisfies PaymentRepository;
  return {
    provider,
    repository,
    service: new PaymentWebhookService(
      provider,
      repository,
      "80000000-0000-4000-8000-000000000002",
    ),
  };
}

describe("PaymentWebhookService", () => {
  it("verifies before the idempotent durable apply", async () => {
    const { service, provider, repository } = fixture();
    await expect(
      service.handle("synthetic-raw-body", "synthetic-signature"),
    ).resolves.toMatchObject({
      accepted: true,
      result: { replayed: false, reconciliationRequired: false },
    });
    expect(repository.applyProviderEvent).toHaveBeenCalledAfter(
      provider.verifyWebhook as ReturnType<typeof vi.fn>,
    );
  });

  it("rejects missing, invalid and oversized signatures without durable writes", async () => {
    const missing = fixture();
    await expect(missing.service.handle("body", null)).resolves.toEqual({
      accepted: false,
      status: 400,
      code: "SIGNATURE_INVALID",
    });
    expect(missing.provider.verifyWebhook).not.toHaveBeenCalled();

    const invalid = fixture();
    invalid.provider.verifyWebhook.mockRejectedValue(new PaymentProviderError());
    await expect(invalid.service.handle("body", "bad")).resolves.toMatchObject({
      accepted: false,
      status: 400,
    });
    expect(invalid.repository.applyProviderEvent).not.toHaveBeenCalled();

    const oversized = fixture();
    await expect(oversized.service.handle("x".repeat(256_001), "signature")).resolves.toMatchObject(
      {
        accepted: false,
        status: 400,
      },
    );
    expect(oversized.provider.verifyWebhook).not.toHaveBeenCalled();
  });

  it("returns retryable failure when the durable transaction fails", async () => {
    const { service, repository } = fixture();
    repository.applyProviderEvent.mockRejectedValue(
      new PaymentRepositoryError("DEPENDENCY_UNAVAILABLE"),
    );
    await expect(service.handle("body", "signature")).resolves.toEqual({
      accepted: false,
      status: 503,
      code: "PROCESSING_FAILED",
    });
  });
});
