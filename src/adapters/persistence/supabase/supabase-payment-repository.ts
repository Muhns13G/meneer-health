import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  paymentOrderSchema,
  paymentProviderEventResultSchema,
  type PaymentOrder,
  type PaymentProviderEventResult,
} from "../../../../contracts/payments";
import {
  PaymentRepositoryError,
  type ApplyPaymentProviderEvent,
  type AttachCheckoutSession,
  type PaymentRepository,
  type PaymentRepositoryFailure,
  type PreparePaymentCheckout,
} from "@/application/payments/payment-repository";

type ProviderError = Readonly<{ code?: string; message?: string }>;
type PaymentEnvironment = "local" | "production";

function providerFailure(error: ProviderError): PaymentRepositoryFailure {
  if (error.message?.includes("NOT_FOUND") || error.code === "P0002") return "NOT_FOUND";
  if (error.message?.includes("PRICE_NOT_APPROVED")) return "PRICE_NOT_APPROVED";
  if (error.message?.includes("RETRY_REQUIRED")) return "PENDING_RECONCILIATION";
  if (
    error.code === "42501" ||
    ["22023", "23505", "23514", "40001"].includes(error.code ?? "") ||
    error.message?.startsWith("PAYMENT_")
  ) {
    return "CONFLICT";
  }
  return "DEPENDENCY_UNAVAILABLE";
}

export class SupabasePaymentRepository implements PaymentRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly environment: PaymentEnvironment,
  ) {}

  async prepareCheckout(input: PreparePaymentCheckout): Promise<PaymentOrder> {
    const { data, error } = await this.client.rpc("prepare_payment_checkout", {
      p_tenant_id: input.tenantId,
      p_workflow_id: input.workflowId,
      p_subject_id: input.subjectId,
      p_scenario: input.scenario,
      p_environment: this.environment,
      p_request_id: input.requestId,
      p_idempotency_key: input.idempotencyKey,
      p_request_fingerprint: input.requestFingerprint,
      p_expected_version: input.expectedVersion,
      p_occurred_at: input.occurredAt.toISOString(),
      p_actor_subject_id: input.actorSubjectId,
      p_actor_role: input.actorRole,
      p_assurance: input.assurance,
      p_policy_version: input.policyVersion,
      p_correlation_id: input.correlationId,
    });
    if (error) throw new PaymentRepositoryError(providerFailure(error));
    const parsed = paymentOrderSchema.safeParse(data);
    if (!parsed.success) throw new PaymentRepositoryError("DEPENDENCY_UNAVAILABLE");
    return parsed.data;
  }

  async attachCheckoutSession(input: AttachCheckoutSession): Promise<PaymentOrder> {
    const { data, error } = await this.client.rpc("attach_payment_checkout_session", {
      p_tenant_id: input.tenantId,
      p_order_id: input.orderId,
      p_checkout_session_id: input.checkoutSessionId,
      p_occurred_at: input.occurredAt.toISOString(),
    });
    if (error) throw new PaymentRepositoryError(providerFailure(error));
    const parsed = paymentOrderSchema.safeParse(data);
    if (!parsed.success) throw new PaymentRepositoryError("DEPENDENCY_UNAVAILABLE");
    return parsed.data;
  }

  async applyProviderEvent(input: ApplyPaymentProviderEvent): Promise<PaymentProviderEventResult> {
    const event = input.event;
    const { data, error } = await this.client.rpc("apply_payment_provider_event", {
      p_service_identity_id: input.serviceIdentityId,
      p_environment: event.environment,
      p_external_event_id: event.externalEventId,
      p_event_type: event.eventType,
      p_order_id: event.orderId ?? null,
      p_checkout_session_id: event.checkoutSessionId ?? null,
      p_payment_intent_id: event.paymentIntentId ?? null,
      p_payment_status: event.paymentStatus ?? null,
      p_refund_complete: event.refundComplete ?? null,
      p_dispute_outcome: event.disputeOutcome ?? null,
      p_payload_fingerprint: event.payloadFingerprint,
      p_occurred_at: event.occurredAt,
    });
    if (error) throw new PaymentRepositoryError(providerFailure(error));
    const parsed = paymentProviderEventResultSchema.safeParse(data);
    if (!parsed.success) throw new PaymentRepositoryError("DEPENDENCY_UNAVAILABLE");
    return parsed.data;
  }
}
