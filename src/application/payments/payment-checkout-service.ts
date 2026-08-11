import type { ErrorContract, StableErrorCode } from "../../../contracts/errors";
import {
  paymentCheckoutCommandSchema,
  paymentCheckoutResultSchema,
  type PaymentCheckoutCommand,
  type PaymentCheckoutResult,
} from "../../../contracts/payments";
import type { AuthorisationService } from "@/application/authorisation/authorisation-service";
import {
  PaymentProviderError,
  type PaymentProvider,
} from "@/application/payments/payment-provider";
import {
  PaymentRepositoryError,
  type PaymentRepository,
} from "@/application/payments/payment-repository";
import type { WorkflowCommandRepository } from "@/application/workflows/workflow-command-repository";
import { resolveServerAuthorisationResource } from "@/domain/access/authorisation";
import type { AuthenticationAssurance } from "@/domain/access/identity";

const serverPaymentActorMarker = Symbol("server-payment-actor");

export type ServerPaymentActor = Readonly<{
  providerSessionId: string;
  subjectId: string;
  tenantId: string;
  assurance: AuthenticationAssurance;
  observedAtEpochMs: number;
  [serverPaymentActorMarker]: true;
}>;

export function resolveServerPaymentActor(input: {
  providerSessionId: string;
  subjectId: string;
  tenantId: string;
  assurance: AuthenticationAssurance;
  observedAt: Date;
}): ServerPaymentActor {
  return Object.freeze({
    providerSessionId: input.providerSessionId,
    subjectId: input.subjectId,
    tenantId: input.tenantId,
    assurance: input.assurance,
    observedAtEpochMs: input.observedAt.getTime(),
    [serverPaymentActorMarker]: true as const,
  });
}

function isServerPaymentActor(value: unknown): value is ServerPaymentActor {
  return Boolean(
    value &&
    typeof value === "object" &&
    serverPaymentActorMarker in value &&
    value[serverPaymentActorMarker],
  );
}

function safeError(
  correlationId: string,
  code: StableErrorCode,
  message: string,
  retry: ErrorContract["error"]["retry"],
): ErrorContract {
  return {
    contract: "error.response",
    version: 1,
    correlationId,
    error: { code, message, retry },
  };
}

async function fingerprint(command: PaymentCheckoutCommand): Promise<string> {
  const canonical = JSON.stringify({
    contract: command.contract,
    version: command.version,
    actor: command.actor,
    subjectId: command.subjectId,
    expectedVersion: command.expectedVersion,
    payload: command.payload,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function checkedReturnUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error("Payment return URLs must be credential-free HTTPS URLs.");
  }
  return url.toString();
}

export type PaymentCheckoutOutcome =
  | Readonly<{ ok: true; result: PaymentCheckoutResult }>
  | Readonly<{ ok: false; error: ErrorContract }>;

export class PaymentCheckoutService {
  private readonly successUrl: string;
  private readonly cancelUrl: string;

  constructor(
    private readonly payments: PaymentRepository,
    private readonly workflows: WorkflowCommandRepository,
    private readonly authorisation: AuthorisationService,
    private readonly provider: PaymentProvider,
    returnUrls: Readonly<{ successUrl: string; cancelUrl: string }>,
  ) {
    this.successUrl = checkedReturnUrl(returnUrls.successUrl);
    this.cancelUrl = checkedReturnUrl(returnUrls.cancelUrl);
  }

  async create(actor: unknown, input: unknown): Promise<PaymentCheckoutOutcome> {
    const parsed = paymentCheckoutCommandSchema.safeParse(input);
    const correlationId = parsed.success ? parsed.data.correlationId : "correlation_unknown";
    if (!parsed.success) {
      return {
        ok: false,
        error: safeError(
          correlationId,
          "VALIDATION_FAILED",
          "The checkout request is invalid.",
          "never",
        ),
      };
    }

    if (
      !isServerPaymentActor(actor) ||
      !Number.isFinite(actor.observedAtEpochMs) ||
      parsed.data.actor.id !== actor.subjectId ||
      parsed.data.subjectId !== actor.subjectId
    ) {
      return {
        ok: false,
        error: safeError(correlationId, "UNAUTHENTICATED", "Authentication is required.", "never"),
      };
    }

    try {
      const workflow = await this.workflows.findWorkflow(
        actor.tenantId,
        parsed.data.payload.workflowId,
      );
      if (!workflow || workflow.subjectId !== actor.subjectId) {
        return {
          ok: false,
          error: safeError(correlationId, "NOT_FOUND", "The resource was not found.", "never"),
        };
      }

      const observedAt = new Date(actor.observedAtEpochMs);
      const decision = await this.authorisation.authoriseHuman(actor.providerSessionId, "patient", {
        action: "create",
        purpose: "self_service",
        observedAt,
        resource: resolveServerAuthorisationResource({
          tenantId: workflow.tenantId,
          type: "payment",
          id: workflow.workflowId,
          ownerSubjectId: workflow.subjectId,
          workflowState: "draft",
          restriction: "none",
          allowedPurposes: ["self_service"],
        }),
      });
      if (!decision.allowed) {
        return {
          ok: false,
          error: safeError(correlationId, "FORBIDDEN", "The action is not permitted.", "never"),
        };
      }

      const order = await this.payments.prepareCheckout({
        tenantId: actor.tenantId,
        workflowId: workflow.workflowId,
        subjectId: actor.subjectId,
        scenario: parsed.data.payload.scenario,
        requestId: parsed.data.requestId,
        idempotencyKey: parsed.data.idempotencyKey,
        requestFingerprint: await fingerprint(parsed.data),
        expectedVersion: parsed.data.expectedVersion,
        occurredAt: observedAt,
        actorSubjectId: actor.subjectId,
        actorRole: "patient",
        assurance: actor.assurance,
        policyVersion: decision.policyVersion,
        correlationId,
      });
      const session = await this.provider.createCheckoutSession({
        order,
        idempotencyKey: parsed.data.idempotencyKey,
        successUrl: this.successUrl,
        cancelUrl: this.cancelUrl,
      });
      const attached = await this.payments.attachCheckoutSession({
        tenantId: actor.tenantId,
        orderId: order.orderId,
        checkoutSessionId: session.id,
        occurredAt: observedAt,
      });
      return {
        ok: true,
        result: paymentCheckoutResultSchema.parse({ order: attached, checkoutUrl: session.url }),
      };
    } catch (error) {
      if (error instanceof PaymentRepositoryError) {
        const mapping: Record<
          PaymentRepositoryError["failure"],
          readonly [StableErrorCode, string, ErrorContract["error"]["retry"]]
        > = {
          NOT_FOUND: ["NOT_FOUND", "The resource was not found.", "never"],
          CONFLICT: ["CONFLICT", "The checkout conflicts with current state.", "safe"],
          PRICE_NOT_APPROVED: [
            "FORBIDDEN",
            "Checkout is not available for this scenario.",
            "never",
          ],
          PENDING_RECONCILIATION: [
            "PENDING_RECONCILIATION",
            "The checkout requires reconciliation.",
            "reconcile",
          ],
          DEPENDENCY_UNAVAILABLE: [
            "DEPENDENCY_UNAVAILABLE",
            "The payment service is temporarily unavailable.",
            "after-delay",
          ],
        };
        const [code, message, retry] = mapping[error.failure];
        return { ok: false, error: safeError(correlationId, code, message, retry) };
      }
      if (error instanceof PaymentProviderError) {
        return {
          ok: false,
          error: safeError(
            correlationId,
            "DEPENDENCY_UNAVAILABLE",
            "The payment service is temporarily unavailable.",
            "after-delay",
          ),
        };
      }
      return {
        ok: false,
        error: safeError(
          correlationId,
          "INTERNAL_FAILURE",
          "The request could not be completed.",
          "reconcile",
        ),
      };
    }
  }
}
