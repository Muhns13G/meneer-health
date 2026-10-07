import "@tanstack/react-start/server-only";

import { z } from "zod";

import { measurementEventInputSchema } from "../../../contracts/measurement";
import type { MeasurementService } from "@/application/measurement/measurement-service";
import {
  inspectProtectedJsonRequest,
  type RateLimitPort,
} from "@/server/security/request-security";

export const measurementFlowCookieName = "__Host-meneer_measurement_flow";
export const measurementFlowCookieMaxAgeSeconds = 30 * 60;

const consentBodySchema = z.object({ decision: z.enum(["granted", "withdrawn"]) }).strict();
const cookieValueSchema = z
  .string()
  .regex(/^[a-f0-9-]{36}\.[a-f0-9-]{36}$/)
  .transform((value) => {
    const [flowId, consentReceiptId] = value.split(".");
    return { flowId: z.uuid().parse(flowId), consentReceiptId: z.uuid().parse(consentReceiptId) };
  });

function safeJson(body: unknown, status: number, correlationId?: string): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
  });
  if (correlationId) headers.set("X-Correlation-ID", correlationId);
  return new Response(JSON.stringify(body), { status, headers });
}

function invalid(correlationId: string): Response {
  return safeJson(
    {
      contract: "error.response",
      version: 1,
      correlationId,
      error: {
        code: "VALIDATION_FAILED",
        message: "The request is invalid.",
        retry: "never",
      },
    },
    422,
    correlationId,
  );
}

function unavailable(correlationId: string = crypto.randomUUID()): Response {
  return safeJson(
    {
      contract: "error.response",
      version: 1,
      correlationId,
      error: {
        code: "DEPENDENCY_UNAVAILABLE",
        message: "The service is temporarily unavailable.",
        retry: "after-delay",
      },
    },
    503,
    correlationId,
  );
}

function readCookie(request: Request): { flowId: string; consentReceiptId: string } | undefined {
  const cookie = request.headers.get("cookie");
  if (!cookie) return undefined;
  const values = cookie.split(";").map((part) => part.trim().split("=", 2));
  const value = values.find(([name]) => name === measurementFlowCookieName)?.[1];
  const parsed = cookieValueSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function setFlowCookie(flowId: string, consentReceiptId: string): string {
  return `${measurementFlowCookieName}=${flowId}.${consentReceiptId}; Path=/; Max-Age=${measurementFlowCookieMaxAgeSeconds}; HttpOnly; Secure; SameSite=Strict`;
}

function clearFlowCookie(): string {
  return `${measurementFlowCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

type MeasurementPort = Pick<MeasurementService, "grant" | "withdraw" | "record">;

export function createMeasurementConsentHttpHandler(
  dependencies: Readonly<{
    measurement: MeasurementPort;
    rateLimiter: RateLimitPort;
    now?: () => Date;
  }>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const inspected = await inspectProtectedJsonRequest(
      request,
      {
        action: "measurement-consent",
        routeClass: "protected-command",
        requireAntiAutomation: false,
        requireIdempotency: true,
        maxBodyBytes: 128,
      },
      {
        rateLimiter: dependencies.rateLimiter,
        principalRateKey: request.headers.get("cf-connecting-ip")?.trim() || "unattributed",
      },
    );
    if (!inspected.allowed) return inspected.response;

    const body = consentBodySchema.safeParse(inspected.value.body);
    if (!body.success || !inspected.value.idempotencyKey) {
      return invalid(inspected.decision.correlationId);
    }
    const existing = readCookie(request);
    if (body.data.decision === "withdrawn" && !existing) {
      const response = new Response(null, { status: 204 });
      response.headers.set("Set-Cookie", clearFlowCookie());
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      return response;
    }

    try {
      const command = {
        contract: "measurement.consent" as const,
        version: 1 as const,
        requestId: crypto.randomUUID(),
        idempotencyKey: inspected.value.idempotencyKey,
        correlationId: inspected.decision.correlationId,
        decision: body.data.decision,
        requestedAt: (dependencies.now?.() ?? new Date()).toISOString(),
        synthetic: false,
      };
      const receipt =
        body.data.decision === "granted"
          ? await dependencies.measurement.grant(command)
          : await dependencies.measurement.withdraw(command, existing!.flowId);
      const response = new Response(null, { status: 204 });
      response.headers.set(
        "Set-Cookie",
        receipt.status === "granted"
          ? setFlowCookie(receipt.flowId, receipt.consentReceiptId)
          : clearFlowCookie(),
      );
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      response.headers.set("X-Correlation-ID", inspected.decision.correlationId);
      return response;
    } catch {
      return unavailable(inspected.decision.correlationId);
    }
  };
}

export function createMeasurementEventHttpHandler(
  dependencies: Readonly<{
    measurement: MeasurementPort;
    rateLimiter: RateLimitPort;
  }>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const inspected = await inspectProtectedJsonRequest(
      request,
      {
        action: "measurement-event",
        routeClass: "protected-command",
        requireAntiAutomation: false,
        requireIdempotency: true,
        maxBodyBytes: 256,
      },
      {
        rateLimiter: dependencies.rateLimiter,
        principalRateKey: request.headers.get("cf-connecting-ip")?.trim() || "unattributed",
      },
    );
    if (!inspected.allowed) return inspected.response;
    const flow = readCookie(request);
    const input = measurementEventInputSchema.safeParse(inspected.value.body);
    if (!flow || !input.success || !inspected.value.idempotencyKey) {
      return invalid(inspected.decision.correlationId);
    }

    try {
      await dependencies.measurement.record(input.data, {
        ...flow,
        idempotencyKey: inspected.value.idempotencyKey,
        correlationId: inspected.decision.correlationId,
        synthetic: false,
      });
      return new Response(null, {
        status: 204,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Correlation-ID": inspected.decision.correlationId,
        },
      });
    } catch {
      return unavailable(inspected.decision.correlationId);
    }
  };
}
