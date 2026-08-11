import "@tanstack/react-start/server-only";

import { z } from "zod";

import type { ErrorContract, StableErrorCode } from "../../../contracts/errors";
import { chargeScenarioSchema } from "../../../contracts/payments";
import type {
  PaymentCheckoutService,
  ServerPaymentActor,
} from "@/application/payments/payment-checkout-service";
import type { PaymentWebhookService } from "@/application/payments/payment-webhook-service";
import {
  inspectProtectedJsonRequest,
  readBoundedTextRequest,
  type RateLimitPort,
} from "@/server/security/request-security";

const checkoutBodySchema = z
  .object({
    workflowId: z.uuid(),
    scenario: chargeScenarioSchema,
    expectedVersion: z.int().nonnegative(),
  })
  .strict();

export type ResolvedPaymentRequestActor = Readonly<{
  actor: ServerPaymentActor;
  subjectId: string;
}>;

export type PaymentRequestActorResolver = (
  request: Request,
  observedAt: Date,
) => Promise<ResolvedPaymentRequestActor | null>;

type CheckoutPort = Pick<PaymentCheckoutService, "create">;
type WebhookPort = Pick<PaymentWebhookService, "handle">;

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

function jsonResponse(body: unknown, status: number, correlationId?: string): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
  });
  if (correlationId) headers.set("X-Correlation-ID", correlationId);
  return new Response(JSON.stringify(body), { status, headers });
}

function checkoutErrorStatus(code: StableErrorCode): number {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
    case "PENDING_RECONCILIATION":
      return 409;
    case "VALIDATION_FAILED":
      return 422;
    case "RATE_LIMITED":
      return 429;
    case "DEPENDENCY_UNAVAILABLE":
      return 503;
    default:
      return 500;
  }
}

export function createPaymentCheckoutHttpHandler(
  dependencies: Readonly<{
    resolveActor: PaymentRequestActorResolver;
    checkout: CheckoutPort;
    rateLimiter: RateLimitPort;
    now?: () => Date;
  }>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const observedAt = dependencies.now?.() ?? new Date();
    let resolved: ResolvedPaymentRequestActor | null;
    try {
      resolved = await dependencies.resolveActor(request, observedAt);
    } catch {
      return jsonResponse(
        safeError(
          crypto.randomUUID(),
          "DEPENDENCY_UNAVAILABLE",
          "The service is temporarily unavailable.",
          "after-delay",
        ),
        503,
      );
    }
    if (!resolved) {
      const correlationId = crypto.randomUUID();
      return jsonResponse(
        safeError(correlationId, "UNAUTHENTICATED", "Authentication is required.", "never"),
        401,
        correlationId,
      );
    }

    const inspected = await inspectProtectedJsonRequest(
      request,
      {
        action: "payment-checkout",
        routeClass: "protected-command",
        requireAntiAutomation: false,
        requireIdempotency: true,
      },
      { rateLimiter: dependencies.rateLimiter, principalRateKey: resolved.subjectId },
    );
    if (!inspected.allowed) return inspected.response;

    const body = checkoutBodySchema.safeParse(inspected.value.body);
    if (!body.success || !inspected.value.idempotencyKey) {
      const error = safeError(
        inspected.decision.correlationId,
        "VALIDATION_FAILED",
        "The checkout request is invalid.",
        "never",
      );
      return jsonResponse(error, 422, inspected.decision.correlationId);
    }

    const outcome = await dependencies.checkout.create(resolved.actor, {
      contract: "payment.checkout",
      version: 1,
      requestId: crypto.randomUUID(),
      idempotencyKey: inspected.value.idempotencyKey,
      correlationId: inspected.decision.correlationId,
      actor: { type: "patient", id: resolved.subjectId },
      subjectId: resolved.subjectId,
      expectedVersion: body.data.expectedVersion,
      requestedAt: observedAt.toISOString(),
      payload: { workflowId: body.data.workflowId, scenario: body.data.scenario },
    });

    if (!outcome.ok) {
      return jsonResponse(
        outcome.error,
        checkoutErrorStatus(outcome.error.error.code),
        outcome.error.correlationId,
      );
    }
    return jsonResponse(outcome.result, 201, inspected.decision.correlationId);
  };
}

export function createStripeWebhookHttpHandler(
  dependencies: Readonly<{
    webhook: WebhookPort;
  }>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const correlationId = crypto.randomUUID();
    const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (request.method !== "POST" || mediaType !== "application/json") {
      return jsonResponse(
        safeError(correlationId, "VALIDATION_FAILED", "The request is invalid.", "never"),
        400,
        correlationId,
      );
    }

    const rawBody = await readBoundedTextRequest(request, 256_000);
    if (rawBody === "too-large" || rawBody === "malformed") {
      return jsonResponse(
        safeError(correlationId, "VALIDATION_FAILED", "The request is invalid.", "never"),
        400,
        correlationId,
      );
    }
    const outcome = await dependencies.webhook.handle(
      rawBody,
      request.headers.get("stripe-signature"),
    );
    if (!outcome.accepted) {
      const unavailable = outcome.status === 503;
      return jsonResponse(
        safeError(
          correlationId,
          unavailable ? "DEPENDENCY_UNAVAILABLE" : "VALIDATION_FAILED",
          unavailable ? "The service is temporarily unavailable." : "The request is invalid.",
          unavailable ? "after-delay" : "never",
        ),
        outcome.status,
        correlationId,
      );
    }

    return jsonResponse({ received: true, replayed: outcome.result.replayed }, 200, correlationId);
  };
}
