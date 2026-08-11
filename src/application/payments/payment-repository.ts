import type {
  ChargeScenario,
  PaymentOrder,
  PaymentProviderEventResult,
  VerifiedPaymentProviderEvent,
} from "../../../contracts/payments";

export type PreparePaymentCheckout = Readonly<{
  tenantId: string;
  workflowId: string;
  subjectId: string;
  scenario: ChargeScenario;
  requestId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  expectedVersion: number;
  occurredAt: Date;
  actorSubjectId: string;
  actorRole: "patient";
  assurance: "aal1" | "aal2";
  policyVersion: string;
  correlationId: string;
}>;

export type AttachCheckoutSession = Readonly<{
  tenantId: string;
  orderId: string;
  checkoutSessionId: string;
  occurredAt: Date;
}>;

export type ApplyPaymentProviderEvent = Readonly<{
  serviceIdentityId: string;
  event: VerifiedPaymentProviderEvent;
}>;

export interface PaymentRepository {
  prepareCheckout(input: PreparePaymentCheckout): Promise<PaymentOrder>;
  attachCheckoutSession(input: AttachCheckoutSession): Promise<PaymentOrder>;
  applyProviderEvent(input: ApplyPaymentProviderEvent): Promise<PaymentProviderEventResult>;
}

export type PaymentRepositoryFailure =
  | "NOT_FOUND"
  | "CONFLICT"
  | "PRICE_NOT_APPROVED"
  | "PENDING_RECONCILIATION"
  | "DEPENDENCY_UNAVAILABLE";

export class PaymentRepositoryError extends Error {
  constructor(readonly failure: PaymentRepositoryFailure) {
    super("The payment operation could not be completed.");
    this.name = "PaymentRepositoryError";
  }
}
