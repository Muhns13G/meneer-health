import "@tanstack/react-start/server-only";

import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { initialiseServerEnvironment } from "./server/config/environment.server";
import {
  classifyTelemetryEnvironment,
  durationBucket,
  emitTelemetry,
  statusClass,
} from "./server/observability/telemetry";
import { applyResponsePolicy } from "./server/security/response-policy";
import {
  applyCorrelationHeader,
  executeWithRequestTimeout,
  inspectPublicRequest,
  safeInternalFailureResponse,
} from "./server/security/request-security";

const serverEnvironment = initialiseServerEnvironment();
const handleRequest = createStartHandler(async (context) => {
  const nonce = crypto.randomUUID().replaceAll("-", "");

  context.router.update({ ssr: { nonce } });

  const response = await defaultStreamHandler(context);

  return applyResponsePolicy(context.request, response, nonce);
});

export type ServerEntry = { fetch: RequestHandler<Register> };

export function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
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
          (boundedRequest) => Promise.resolve(entry.fetch(boundedRequest, args[1])),
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
