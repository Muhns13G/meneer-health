import "@tanstack/react-start/server-only";

import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import {
  createPilotWebhookHandler,
  type PilotWebhookBindings,
} from "./server/payments/pilot-webhook";
import {
  createOrderReviewHttpHandler,
  type CommerceReviewBindings,
} from "./server/payments/order-review-http";
import { createPatientActivationHttpHandler } from "./server/identity/patient-activation-http";
import { createPaymentStatusHttpHandler } from "./server/payments/payment-status-http";
import { createRefundHttpHandler } from "./server/payments/refund-http";
import { runScheduledRefunds } from "./server/payments/refund-dispatch";
import { createPatientPortalHttpHandler } from "./server/identity/patient-portal-http";
import { createPatientRightsHttpHandler } from "./server/identity/patient-rights-http";
import { createSupportHttpHandler } from "./server/support/support-http";
import { createWorkforceHttpHandler } from "./server/identity/workforce-http";
import { createMobileInvitationHttpHandler } from "./server/identity/mobile-invitation-http";
import { createQueueHttpHandler } from "./server/operations/queue-http";
import { createAlertHttpHandler } from "./server/operations/alert-http";
import { runScheduledOperationsAlerts } from "./server/operations/alert-dispatch";
import { runScheduledTransactionalNotifications } from "./server/notifications/notification-dispatch";
import { createNotificationReceiptHandler } from "./server/notifications/notification-receipts";
import { runMedicalSafetyDispatch } from "./server/intake/safety-dispatch";
import { createStaffIntakeHttpHandler } from "./server/intake/staff-intake-http";
import {
  createPatientIntakeHttpHandler,
  type IntakeBindings,
} from "./server/intake/patient-intake-http";
import { createPortalHandoffHttpHandler } from "./server/operations/portal-handoff-http";

import { initialiseServerEnvironment } from "./server/config/environment.server";
import {
  createPatientVerificationHttpHandler,
  type PatientVerificationBindings,
} from "./server/identity/patient-verification-http";
import {
  createPatientSessionHttpHandler,
  type PatientSessionBindings,
} from "./server/identity/patient-session-http";
import {
  classifyTelemetryEnvironment,
  durationBucket,
  emitTelemetry,
  statusClass,
} from "./server/observability/telemetry";
import { applyResponsePolicy } from "./server/security/response-policy";
import { applySsrResponsePolicy } from "./server/security/ssr-response-policy";
import {
  applyCorrelationHeader,
  executeWithRequestTimeout,
  inspectPublicRequest,
  safeInternalFailureResponse,
} from "./server/security/request-security";

const serverEnvironment = initialiseServerEnvironment();
const handleRequest = createStartHandler(async (context) => {
  const nonce = context.router.options.ssr?.nonce;
  if (!nonce) throw new Error("SSR nonce is missing.");

  const result = await defaultStreamHandler(context);

  return applySsrResponsePolicy(context.request, result, nonce);
});

export type ServerEntry = {
  fetch: RequestHandler<Register>;
  scheduled?: (
    controller: ScheduledController,
    bindings: Env,
    context: ExecutionContext,
  ) => Promise<void>;
};

export function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async scheduled(_controller, bindings) {
      try {
        const outcomes = await Promise.allSettled([
          runScheduledOperationsAlerts(bindings as unknown as Record<string, unknown>),
          runMedicalSafetyDispatch(bindings as unknown as Record<string, unknown>),
          runScheduledTransactionalNotifications(bindings as unknown as Record<string, unknown>),
          runScheduledRefunds(bindings as unknown as Record<string, unknown>),
        ]);
        if (outcomes.some((result) => result.status === "rejected"))
          throw new Error("SCHEDULED_DEPENDENCY_FAILED");
      } catch {
        emitTelemetry({
          contract: "telemetry.event",
          version: 1,
          occurredAt: new Date().toISOString(),
          environment: "production",
          event: "request.denied",
          severity: "critical",
          outcome: "failed",
          correlationId: crypto.randomUUID(),
          reasonCode: "INTERNAL_FAILURE",
          statusClass: "5xx",
        });
        throw new Error("OPERATIONS_ALERT_JOB_FAILED");
      }
    },
    async fetch(...args) {
      if (serverEnvironment.bundleCanary.length === 0) {
        throw new Error("Server configuration is invalid.");
      }

      const startedAt = performance.now();
      const request = args[0];
      const environment = classifyTelemetryEnvironment(new URL(request.url).hostname);
      const requestDecision = await inspectPublicRequest(request, env.REQUEST_RATE_LIMITER);
      if (!requestDecision.allowed) {
        emitTelemetry({
          contract: "telemetry.event",
          version: 1,
          occurredAt: new Date().toISOString(),
          environment,
          event: "request.denied",
          severity:
            requestDecision.decision.reason === "DEPENDENCY_UNAVAILABLE" ? "error" : "warning",
          outcome:
            requestDecision.decision.reason === "DEPENDENCY_UNAVAILABLE" ? "failed" : "denied",
          correlationId: requestDecision.decision.correlationId,
          routeClass: requestDecision.decision.routeClass,
          reasonCode: requestDecision.decision.reason,
          statusClass: statusClass(requestDecision.response.status),
          durationBucket: durationBucket(performance.now() - startedAt),
        });
        return applyResponsePolicy(request, requestDecision.response);
      }

      let timedOut = false;
      let internalFailure = false;
      let response: Response;
      try {
        response = await executeWithRequestTimeout(
          request,
          (boundedRequest) => {
            const pathname = new URL(boundedRequest.url).pathname;
            if (pathname === "/api/notifications/brevo/webhook")
              return createNotificationReceiptHandler(env as unknown as Record<string, unknown>)(
                boundedRequest,
              );
            if (
              pathname === "/api/payments/stripe/webhook" &&
              (env as unknown as PilotWebhookBindings).COMMERCE_WEBHOOK_MODE === "sandbox"
            )
              return createPilotWebhookHandler(env as unknown as PilotWebhookBindings)(
                boundedRequest,
              );
            if (pathname === "/portal/order/command")
              return createOrderReviewHttpHandler(env as unknown as CommerceReviewBindings)(
                boundedRequest,
              );
            if (["/portal/payments/refund", "/staff/payments/refund"].includes(pathname))
              return createRefundHttpHandler(env as unknown as CommerceReviewBindings)(
                boundedRequest,
              );
            if (["/portal/payments/read", "/staff/payments/read"].includes(pathname))
              return createPaymentStatusHttpHandler(env as unknown as CommerceReviewBindings)(
                boundedRequest,
              );
            if (pathname === "/staff/intake/command")
              return createStaffIntakeHttpHandler(env as unknown as IntakeBindings)(boundedRequest);
            if (
              ["/staff/mobile-invitations/read", "/staff/mobile-invitations/command"].includes(
                pathname,
              )
            )
              return createMobileInvitationHttpHandler(env as unknown as PatientSessionBindings)(
                boundedRequest,
              );
            if (pathname === "/portal/intake/command")
              return createPatientIntakeHttpHandler(env as unknown as IntakeBindings)(
                boundedRequest,
              );
            if (["/staff/alerts/read", "/staff/alerts/respond"].includes(pathname)) {
              return createAlertHttpHandler(env as unknown as PatientSessionBindings)(
                boundedRequest,
              );
            }
            if (
              [
                "/staff/queue/read",
                "/staff/queue/detail",
                "/staff/queue/command",
                "/staff/queue/handoff",
                "/staff/queue/evidence",
                "/staff/queue/destination",
              ].includes(pathname)
            ) {
              return createQueueHttpHandler(env as unknown as PatientSessionBindings)(
                boundedRequest,
              );
            }
            if (
              [
                "/portal/support/command",
                "/staff/support/command",
                "/staff/support/followup",
              ].includes(pathname)
            ) {
              return createSupportHttpHandler(env as unknown as PatientSessionBindings)(
                boundedRequest,
              );
            }
            if (
              (boundedRequest.method === "POST" && pathname.startsWith("/staff/")) ||
              pathname === "/staff/session"
            ) {
              return createWorkforceHttpHandler(env as unknown as PatientSessionBindings)(
                boundedRequest,
              );
            }
            if (pathname === "/portal/handoff/open") {
              return createPortalHandoffHttpHandler(env as unknown as PatientSessionBindings)(
                boundedRequest,
              );
            }
            if (pathname === "/portal/rights/command") {
              return createPatientRightsHttpHandler(env as unknown as PatientSessionBindings)(
                boundedRequest,
              );
            }
            if (pathname === "/portal/account") {
              return createPatientPortalHttpHandler(env as unknown as PatientSessionBindings)(
                boundedRequest,
              );
            }
            if (
              (boundedRequest.method === "POST" && pathname === "/account/activate") ||
              pathname === "/account/activate/instruments"
            ) {
              return createPatientActivationHttpHandler(
                env as unknown as PatientVerificationBindings,
              )(boundedRequest);
            }
            if (boundedRequest.method === "POST" && pathname === "/account/verify") {
              return createPatientVerificationHttpHandler(
                env as unknown as PatientVerificationBindings,
              )(boundedRequest);
            }
            if (
              boundedRequest.method === "POST" &&
              [
                "/account/sign-in",
                "/account/recover",
                "/account/sign-out",
                "/account/session/renew",
              ].includes(pathname)
            ) {
              return createPatientSessionHttpHandler(env as unknown as PatientSessionBindings)(
                boundedRequest,
              );
            }
            return Promise.resolve(entry.fetch(boundedRequest, args[1]));
          },
          undefined,
          () => {
            timedOut = true;
          },
        );
      } catch {
        internalFailure = true;
        response = safeInternalFailureResponse(requestDecision.decision.correlationId);
      }
      emitTelemetry({
        contract: "telemetry.event",
        version: 1,
        occurredAt: new Date().toISOString(),
        environment,
        event: "request.completed",
        severity: response.status >= 500 ? "error" : "info",
        outcome: response.status >= 500 ? "failed" : "succeeded",
        correlationId: requestDecision.decision.correlationId,
        routeClass: requestDecision.decision.routeClass,
        ...(timedOut
          ? { reasonCode: "REQUEST_TIMEOUT" as const }
          : internalFailure
            ? { reasonCode: "INTERNAL_FAILURE" as const }
            : {}),
        statusClass: statusClass(response.status),
        durationBucket: durationBucket(performance.now() - startedAt),
      });

      return applyResponsePolicy(
        request,
        applyCorrelationHeader(response, requestDecision.decision),
      );
    },
  };
}

export default createServerEntry({ fetch: handleRequest });
