import { describe, expect, it, vi } from "vitest";

import { paymentOrderSchema } from "../../../contracts/payments";
import type { AuthorisationService } from "@/application/authorisation/authorisation-service";
import type { PaymentProvider } from "./payment-provider";
import { PaymentProviderError } from "./payment-provider";
import type { PaymentRepository } from "./payment-repository";
import { PaymentCheckoutService, resolveServerPaymentActor } from "./payment-checkout-service";
import type { WorkflowCommandRepository } from "@/application/workflows/workflow-command-repository";

const tenantId = "10000000-0000-4000-8000-000000000001";
const subjectId = "20000000-0000-4000-8000-000000000001";
const workflowId = "a0000000-0000-4000-8000-000000000001";
const observedAt = new Date("2030-01-01T00:10:00Z");
const command = {
  contract: "payment.checkout",
  version: 1,
  requestId: "payment_request_01",
  idempotencyKey: "payment_retry_01",
  correlationId: "payment_trace_01",
  actor: { type: "patient", id: subjectId },
  subjectId,
  expectedVersion: 0,
  requestedAt: observedAt.toISOString(),
  payload: { workflowId, scenario: "consultation_only" },
} as const;
const preparedOrder = paymentOrderSchema.parse({
  orderId: "b0000000-0000-4000-8000-000000000014",
  tenantId,
  workflowId,
  subjectId,
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

function fixture(allowed = true) {
  const payments = {
    prepareCheckout: vi.fn().mockResolvedValue(preparedOrder),
    attachCheckoutSession: vi.fn().mockResolvedValue({
      ...preparedOrder,
      status: "checkout_open",
      checkoutSessionId: "cs_test_synthetic_0001",
    }),
    applyProviderEvent: vi.fn(),
  } satisfies PaymentRepository;
  const workflows = {
    findWorkflow: vi.fn().mockResolvedValue({
      workflowId,
      tenantId,
      subjectId,
      version: 0,
      clinicalState: "not_started",
      paymentState: "not_started",
      supplyState: "not_started",
      hubReceiptState: "not_started",
      dispatchState: "not_ready",
      deliveryState: "not_started",
      cancellationState: "active",
      refundState: "not_required",
    }),
    executeTransition: vi.fn(),
  } satisfies WorkflowCommandRepository;
  const authorisation = {
    authoriseHuman: vi.fn().mockResolvedValue({
      allowed,
      reason: allowed ? "ALLOWED" : "ROLE_ACTION_DENIED",
      policyVersion: "2026-08-10.1",
      ...(allowed ? { projection: "own", assurance: "aal1" } : {}),
    }),
  } as unknown as AuthorisationService;
  const provider = {
    createCheckoutSession: vi.fn().mockResolvedValue({
      id: "cs_test_synthetic_0001",
      url: "https://checkout.stripe.com/c/pay/synthetic",
    }),
    verifyWebhook: vi.fn(),
  } satisfies PaymentProvider;
  const service = new PaymentCheckoutService(payments, workflows, authorisation, provider, {
    successUrl: "https://example.invalid/payment-return",
    cancelUrl: "https://example.invalid/payment-cancelled",
  });
  const actor = resolveServerPaymentActor({
    providerSessionId: "71000000-0000-4000-8000-000000000001",
    subjectId,
    tenantId,
    assurance: "aal1",
    observedAt,
  });
  return { service, actor, payments, provider };
}

describe("PaymentCheckoutService", () => {
  it("authorises, server-prices, creates and durably attaches Checkout", async () => {
    const { service, actor, payments, provider } = fixture();
    await expect(service.create(actor, command)).resolves.toMatchObject({
      ok: true,
      result: {
        checkoutUrl: "https://checkout.stripe.com/c/pay/synthetic",
        order: { status: "checkout_open" },
      },
    });
    expect(payments.prepareCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ scenario: "consultation_only", expectedVersion: 0 }),
    );
    expect(provider.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "payment_retry_01" }),
    );
    expect(payments.attachCheckoutSession).toHaveBeenCalledAfter(
      provider.createCheckoutSession as ReturnType<typeof vi.fn>,
    );
  });

  it("rejects browser amounts, actor substitution and denied policy", async () => {
    const { service, actor, payments } = fixture();
    const withAmount = {
      ...command,
      payload: { ...command.payload, amount: 10000 },
    };
    await expect(service.create(actor, withAmount)).resolves.toMatchObject({
      ok: false,
      error: { error: { code: "VALIDATION_FAILED" } },
    });
    await expect(service.create({}, command)).resolves.toMatchObject({
      ok: false,
      error: { error: { code: "UNAUTHENTICATED" } },
    });
    const denied = fixture(false);
    await expect(denied.service.create(denied.actor, command)).resolves.toMatchObject({
      ok: false,
      error: { error: { code: "FORBIDDEN" } },
    });
    expect(payments.prepareCheckout).not.toHaveBeenCalled();
    expect(denied.payments.prepareCheckout).not.toHaveBeenCalled();
  });

  it("does not report success when Stripe or the durable attach fails", async () => {
    const providerFailure = fixture();
    providerFailure.provider.createCheckoutSession.mockRejectedValue(new PaymentProviderError());
    await expect(
      providerFailure.service.create(providerFailure.actor, command),
    ).resolves.toMatchObject({
      ok: false,
      error: { error: { code: "DEPENDENCY_UNAVAILABLE" } },
    });
    expect(providerFailure.payments.attachCheckoutSession).not.toHaveBeenCalled();

    const attachFailure = fixture();
    attachFailure.payments.attachCheckoutSession.mockRejectedValue(new Error("synthetic"));
    await expect(attachFailure.service.create(attachFailure.actor, command)).resolves.toMatchObject(
      {
        ok: false,
        error: { error: { code: "INTERNAL_FAILURE", retry: "reconcile" } },
      },
    );
  });
});
