import "@tanstack/react-start/server-only";

import type {
  ErrorContract,
  RequestRouteClass,
  RequestSecurityDecision,
  RequestSecurityReason,
  StableErrorCode,
} from "../../../contracts";

const encoder = new TextEncoder();
const correlationPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const idempotencyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
const directEndpointPrefixes = ["/api", "/.mcp"] as const;

export const requestSecurityLimits = Object.freeze({
  maxUrlBytes: 4_096,
  maxHeaderBytes: 32_768,
  maxProtectedJsonBytes: 32_768,
  handlerTimeoutMs: 15_000,
  retryAfterSeconds: 60,
});

export type RateLimitPort = Readonly<{
  limit(input: Readonly<{ key: string }>): Promise<Readonly<{ success: boolean }>>;
}>;

export type AntiAutomationPort = Readonly<{
  verify(
    input: Readonly<{
      token: string;
      expectedAction: string;
      expectedHostname: string;
      remoteAddress?: string;
    }>,
  ): Promise<Readonly<{ success: boolean; rateKey?: string }>>;
}>;

export type ProtectedJsonPolicy = Readonly<{
  action: string;
  routeClass: "protected-command";
  maxBodyBytes?: number;
  requireAntiAutomation: boolean;
  requireIdempotency: boolean;
}>;

type RequestSecurityFailure = Readonly<{
  allowed: false;
  decision: RequestSecurityDecision;
  response: Response;
}>;

type RequestSecurityAllowance<T = undefined> = Readonly<{
  allowed: true;
  decision: RequestSecurityDecision;
  value: T;
}>;

export type PublicRequestDecision = RequestSecurityFailure | RequestSecurityAllowance<undefined>;

export type ProtectedJsonDecision =
  | RequestSecurityFailure
  | RequestSecurityAllowance<Readonly<{ body: Record<string, unknown>; idempotencyKey?: string }>>;

function correlationId(request: Request): string {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && correlationPattern.test(supplied) ? supplied : crypto.randomUUID();
}

function routeClass(pathname: string): RequestRouteClass {
  return directEndpointPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
    ? "unknown"
    : "public-read";
}

function decision(
  request: Request,
  outcome: RequestSecurityDecision["outcome"],
  reason: RequestSecurityReason,
  classifiedRoute: RequestRouteClass,
): RequestSecurityDecision {
  return {
    contract: "security.request-decision",
    version: 1,
    correlationId: correlationId(request),
    outcome,
    reason,
    routeClass: classifiedRoute,
  };
}

function errorDetails(reason: RequestSecurityReason): Readonly<{
  code: StableErrorCode;
  message: string;
  retry: ErrorContract["error"]["retry"];
  status: number;
}> {
  switch (reason) {
    case "DIRECT_ENDPOINT_DENIED":
      return {
        code: "NOT_FOUND",
        message: "The resource was not found.",
        retry: "never",
        status: 404,
      };
    case "METHOD_NOT_ALLOWED":
      return {
        code: "VALIDATION_FAILED",
        message: "The request method is not allowed.",
        retry: "never",
        status: 405,
      };
    case "URL_LIMIT_EXCEEDED":
      return {
        code: "VALIDATION_FAILED",
        message: "The request is invalid.",
        retry: "never",
        status: 414,
      };
    case "HEADER_LIMIT_EXCEEDED":
      return {
        code: "VALIDATION_FAILED",
        message: "The request is invalid.",
        retry: "never",
        status: 431,
      };
    case "RATE_LIMITED":
      return {
        code: "RATE_LIMITED",
        message: "Please wait before trying again.",
        retry: "after-delay",
        status: 429,
      };
    case "DEPENDENCY_UNAVAILABLE":
    case "REQUEST_TIMEOUT":
      return {
        code: "DEPENDENCY_UNAVAILABLE",
        message: "The service is temporarily unavailable.",
        retry: "after-delay",
        status: 503,
      };
    case "ORIGIN_REJECTED":
    case "ANTI_AUTOMATION_FAILED":
      return {
        code: "FORBIDDEN",
        message: "The request is not permitted.",
        retry: "never",
        status: 403,
      };
    case "ALLOWED":
      return {
        code: "INTERNAL_FAILURE",
        message: "The request could not be completed.",
        retry: "safe",
        status: 500,
      };
    default:
      return {
        code: "VALIDATION_FAILED",
        message: "The request is invalid.",
        retry: "never",
        status: reason === "BODY_TOO_LARGE" ? 413 : 400,
      };
  }
}

function rejection(
  request: Request,
  reason: RequestSecurityReason,
  classifiedRoute: RequestRouteClass,
): RequestSecurityFailure {
  const denied = decision(request, "denied", reason, classifiedRoute);
  const details = errorDetails(reason);
  const error: ErrorContract = {
    contract: "error.response",
    version: 1,
    correlationId: denied.correlationId,
    error: { code: details.code, message: details.message, retry: details.retry },
  };
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-ID": denied.correlationId,
  });
  if (reason === "RATE_LIMITED") {
    headers.set("Retry-After", String(requestSecurityLimits.retryAfterSeconds));
  }
  if (reason === "METHOD_NOT_ALLOWED") headers.set("Allow", "GET, HEAD");

  return {
    allowed: false,
    decision: denied,
    response: new Response(JSON.stringify(error), { status: details.status, headers }),
  };
}

function headerBytes(headers: Headers): number {
  let total = 0;
  headers.forEach((value, name) => {
    total += encoder.encode(name).byteLength + encoder.encode(value).byteLength + 4;
  });
  return total;
}

function advertisedLength(request: Request): number | undefined | "invalid" {
  const value = request.headers.get("content-length");
  if (value === null) return undefined;
  if (!/^\d+$/.test(value)) return "invalid";
  const length = Number(value);
  return Number.isSafeInteger(length) ? length : "invalid";
}

function hasBodyFraming(request: Request): boolean {
  const length = advertisedLength(request);
  return request.headers.has("transfer-encoding") || length === "invalid" || (length ?? 0) > 0;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function coarseRateKey(request: Request): Promise<string> {
  const address = request.headers.get("cf-connecting-ip")?.trim() || "unattributed";
  return `unregistered-mutation:${await sha256(address)}`;
}

export async function inspectPublicRequest(
  request: Request,
  rateLimiter: RateLimitPort,
): Promise<PublicRequestDecision> {
  const url = new URL(request.url);
  const classifiedRoute = routeClass(url.pathname);

  if (encoder.encode(request.url).byteLength > requestSecurityLimits.maxUrlBytes) {
    return rejection(request, "URL_LIMIT_EXCEEDED", classifiedRoute);
  }
  if (headerBytes(request.headers) > requestSecurityLimits.maxHeaderBytes) {
    return rejection(request, "HEADER_LIMIT_EXCEEDED", classifiedRoute);
  }

  if (request.method === "GET" || request.method === "HEAD") {
    if (hasBodyFraming(request)) return rejection(request, "BODY_NOT_ALLOWED", classifiedRoute);
    return {
      allowed: true,
      decision: decision(request, "allowed", "ALLOWED", "public-read"),
      value: undefined,
    };
  }

  try {
    const limit = await rateLimiter.limit({ key: await coarseRateKey(request) });
    if (!limit.success) return rejection(request, "RATE_LIMITED", classifiedRoute);
  } catch {
    return rejection(request, "DEPENDENCY_UNAVAILABLE", classifiedRoute);
  }

  if (classifiedRoute === "unknown") {
    return rejection(request, "DIRECT_ENDPOINT_DENIED", classifiedRoute);
  }
  return rejection(request, "METHOD_NOT_ALLOWED", classifiedRoute);
}

function isSameOriginBrowserRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}

async function readBoundedJson(
  request: Request,
  maximumBytes: number,
): Promise<Record<string, unknown> | "too-large" | "malformed"> {
  const length = advertisedLength(request);
  if (length === "invalid") return "malformed";
  if (length !== undefined && length > maximumBytes) return "too-large";
  if (!request.body) return "malformed";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      return "too-large";
    }
    chunks.push(chunk.value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : "malformed";
  } catch {
    return "malformed";
  }
}

export async function inspectProtectedJsonRequest(
  request: Request,
  policy: ProtectedJsonPolicy,
  dependencies: Readonly<{
    rateLimiter: RateLimitPort;
    antiAutomation?: AntiAutomationPort;
    principalRateKey?: string;
  }>,
): Promise<ProtectedJsonDecision> {
  if (request.method !== "POST") return rejection(request, "METHOD_NOT_ALLOWED", policy.routeClass);
  if (!isSameOriginBrowserRequest(request)) {
    return rejection(request, "ORIGIN_REJECTED", policy.routeClass);
  }
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return rejection(request, "CONTENT_TYPE_REJECTED", policy.routeClass);
  }

  const maximumBytes = policy.maxBodyBytes ?? requestSecurityLimits.maxProtectedJsonBytes;
  const length = advertisedLength(request);
  if (length === "invalid" || (request.headers.has("transfer-encoding") && length !== undefined)) {
    return rejection(request, "MALFORMED_BODY", policy.routeClass);
  }
  if (length !== undefined && length > maximumBytes) {
    return rejection(request, "BODY_TOO_LARGE", policy.routeClass);
  }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (policy.requireIdempotency && (!idempotencyKey || !idempotencyPattern.test(idempotencyKey))) {
    return rejection(request, "DUPLICATE_CONTROL_REQUIRED", policy.routeClass);
  }

  let rateKey = dependencies.principalRateKey;
  if (policy.requireAntiAutomation) {
    const token = request.headers.get("x-meneer-challenge-token")?.trim();
    if (!token || !dependencies.antiAutomation) {
      return rejection(request, "ANTI_AUTOMATION_FAILED", policy.routeClass);
    }
    try {
      const proof = await dependencies.antiAutomation.verify({
        token,
        expectedAction: policy.action,
        expectedHostname: new URL(request.url).hostname,
        remoteAddress: request.headers.get("cf-connecting-ip")?.trim() || undefined,
      });
      if (!proof.success || !proof.rateKey) {
        return rejection(request, "ANTI_AUTOMATION_FAILED", policy.routeClass);
      }
      rateKey = proof.rateKey;
    } catch {
      return rejection(request, "DEPENDENCY_UNAVAILABLE", policy.routeClass);
    }
  }
  if (!rateKey) return rejection(request, "DEPENDENCY_UNAVAILABLE", policy.routeClass);

  try {
    const limited = await dependencies.rateLimiter.limit({
      key: `${policy.action}:${await sha256(rateKey)}`,
    });
    if (!limited.success) return rejection(request, "RATE_LIMITED", policy.routeClass);
  } catch {
    return rejection(request, "DEPENDENCY_UNAVAILABLE", policy.routeClass);
  }

  const body = await readBoundedJson(request, maximumBytes);
  if (body === "too-large") return rejection(request, "BODY_TOO_LARGE", policy.routeClass);
  if (body === "malformed") return rejection(request, "MALFORMED_BODY", policy.routeClass);

  return {
    allowed: true,
    decision: decision(request, "allowed", "ALLOWED", policy.routeClass),
    value: { body, ...(idempotencyKey ? { idempotencyKey } : {}) },
  };
}

export async function executeWithRequestTimeout(
  request: Request,
  operation: (boundedRequest: Request) => Promise<Response>,
  timeoutMs: number = requestSecurityLimits.handlerTimeoutMs,
): Promise<Response> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(request.signal.reason);
  request.signal.addEventListener("abort", abortFromCaller, { once: true });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Response>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort("request-timeout");
      resolve(
        rejection(request, "REQUEST_TIMEOUT", routeClass(new URL(request.url).pathname)).response,
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      operation(new Request(request, { signal: controller.signal })),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    request.signal.removeEventListener("abort", abortFromCaller);
  }
}

export function applyCorrelationHeader(
  response: Response,
  securityDecision: RequestSecurityDecision,
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Correlation-ID", securityDecision.correlationId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
