import { describe, expect, it, vi } from "vitest";

import {
  applyCorrelationHeader,
  executeWithRequestTimeout,
  inspectProtectedJsonRequest,
  inspectPublicRequest,
  requestSecurityLimits,
  type AntiAutomationPort,
  type RateLimitPort,
} from "./request-security";

const BASE_URL = "https://meneerhealth.co.za";
const allowRate: RateLimitPort = { limit: vi.fn(async () => ({ success: true })) };
const denyRate: RateLimitPort = { limit: vi.fn(async () => ({ success: false })) };

function request(pathname: string, init?: RequestInit): Request {
  return new Request(`${BASE_URL}${pathname}`, init);
}

function protectedRequest(body = '{"workflowId":"synthetic"}', headers?: HeadersInit): Request {
  return request("/api/workflows/transition", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "idem_synthetic_0001",
      Origin: BASE_URL,
      "Sec-Fetch-Site": "same-origin",
      "X-Meneer-Challenge-Token": "synthetic-proof",
      ...headers,
    },
  });
}

const protectedPolicy = {
  action: "workflow-transition",
  routeClass: "protected-command",
  requireAntiAutomation: true,
  requireIdempotency: true,
} as const;

const verifiedProof: AntiAutomationPort = {
  verify: vi.fn(async () => ({ success: true, rateKey: "verified-browser-proof" })),
};

describe("current public request boundary", () => {
  it.each(["GET", "HEAD"])("allows body-free %s requests", async (method) => {
    const result = await inspectPublicRequest(request("/start", { method }), allowRate);

    expect(result.allowed).toBe(true);
    expect(result.decision).toMatchObject({
      outcome: "allowed",
      reason: "ALLOWED",
      routeClass: "public-read",
    });
  });

  it("denies bodies on read requests before routing", async () => {
    const result = await inspectPublicRequest(
      request("/", { method: "GET", headers: { "Content-Length": "1" } }),
      allowRate,
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.response.status).toBe(400);
      expect(result.decision.reason).toBe("BODY_NOT_ALLOWED");
    }
  });

  it("rejects oversized URLs and headers without reading a body", async () => {
    const longUrl = await inspectPublicRequest(
      request(`/?value=${"a".repeat(requestSecurityLimits.maxUrlBytes)}`),
      allowRate,
    );
    const largeHeaders = await inspectPublicRequest(
      request("/", {
        headers: { "X-Synthetic": "a".repeat(requestSecurityLimits.maxHeaderBytes) },
      }),
      allowRate,
    );

    expect(longUrl.allowed && longUrl.decision.reason).toBe(false);
    expect(largeHeaders.allowed && largeHeaders.decision.reason).toBe(false);
    if (!longUrl.allowed) {
      expect(longUrl.decision.reason).toBe("URL_LIMIT_EXCEEDED");
      expect(longUrl.response.status).toBe(414);
    }
    if (!largeHeaders.allowed) {
      expect(largeHeaders.decision.reason).toBe("HEADER_LIMIT_EXCEEDED");
      expect(largeHeaders.response.status).toBe(431);
    }
  });

  it("rate-limits and hides direct endpoint probes without CORS", async () => {
    const limited = await inspectPublicRequest(
      request("/api/workflows/transition", { method: "POST" }),
      denyRate,
    );
    const denied = await inspectPublicRequest(
      request("/api/workflows/transition", { method: "POST" }),
      allowRate,
    );

    expect(limited.allowed).toBe(false);
    expect(denied.allowed).toBe(false);
    if (!limited.allowed) {
      expect(limited.response.status).toBe(429);
      expect(limited.response.headers.get("Retry-After")).toBe("60");
    }
    if (!denied.allowed) {
      expect(denied.response.status).toBe(404);
      expect(denied.response.headers.has("Access-Control-Allow-Origin")).toBe(false);
      expect(denied.decision.reason).toBe("DIRECT_ENDPOINT_DENIED");
    }
  });

  it("denies ordinary non-read methods and fails closed when the limiter is unavailable", async () => {
    const method = await inspectPublicRequest(request("/start", { method: "POST" }), allowRate);
    const dependency = await inspectPublicRequest(request("/start", { method: "POST" }), {
      limit: vi.fn(async () => {
        throw new Error("provider detail must remain hidden");
      }),
    });

    if (!method.allowed) {
      expect(method.response.status).toBe(405);
      expect(method.response.headers.get("Allow")).toBe("GET, HEAD");
    }
    if (!dependency.allowed) {
      expect(dependency.response.status).toBe(503);
      expect(await dependency.response.text()).not.toContain("provider detail");
    }
  });

  it("accepts only transport-safe caller correlation identifiers", async () => {
    const retained = await inspectPublicRequest(
      request("/", { headers: { "X-Correlation-ID": "trace_safe_01" } }),
      allowRate,
    );
    const replaced = await inspectPublicRequest(
      request("/", { headers: { "X-Correlation-ID": "unsafe trace" } }),
      allowRate,
    );

    expect(retained.decision.correlationId).toBe("trace_safe_01");
    expect(replaced.decision.correlationId).not.toBe("unsafe trace");
  });
});

describe("future protected JSON boundary", () => {
  it("accepts a same-origin, proof-verified, rate-allowed, idempotent bounded object", async () => {
    const result = await inspectProtectedJsonRequest(protectedRequest(), protectedPolicy, {
      rateLimiter: allowRate,
      antiAutomation: verifiedProof,
    });

    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.value).toEqual({
        body: { workflowId: "synthetic" },
        idempotencyKey: "idem_synthetic_0001",
      });
    }
  });

  it.each([
    ["missing origin", { Origin: "" }],
    ["cross origin", { Origin: "https://attacker.invalid" }],
    ["cross-site fetch", { "Sec-Fetch-Site": "cross-site" }],
  ])("rejects %s context", async (_label, headers) => {
    const result = await inspectProtectedJsonRequest(
      protectedRequest(undefined, headers),
      protectedPolicy,
      { rateLimiter: allowRate, antiAutomation: verifiedProof },
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.decision.reason).toBe("ORIGIN_REJECTED");
  });

  it("rejects missing duplicate control and unapproved media types", async () => {
    const duplicate = await inspectProtectedJsonRequest(
      protectedRequest(undefined, { "Idempotency-Key": "" }),
      protectedPolicy,
      { rateLimiter: allowRate, antiAutomation: verifiedProof },
    );
    const media = await inspectProtectedJsonRequest(
      protectedRequest(undefined, { "Content-Type": "text/plain" }),
      protectedPolicy,
      { rateLimiter: allowRate, antiAutomation: verifiedProof },
    );

    if (!duplicate.allowed) expect(duplicate.decision.reason).toBe("DUPLICATE_CONTROL_REQUIRED");
    if (!media.allowed) expect(media.decision.reason).toBe("CONTENT_TYPE_REJECTED");
  });

  it("rejects missing, invalid, and unavailable anti-automation evidence", async () => {
    const missing = await inspectProtectedJsonRequest(
      protectedRequest(undefined, { "X-Meneer-Challenge-Token": "" }),
      protectedPolicy,
      { rateLimiter: allowRate, antiAutomation: verifiedProof },
    );
    const invalid = await inspectProtectedJsonRequest(protectedRequest(), protectedPolicy, {
      rateLimiter: allowRate,
      antiAutomation: { verify: vi.fn(async () => ({ success: false })) },
    });
    const unavailable = await inspectProtectedJsonRequest(protectedRequest(), protectedPolicy, {
      rateLimiter: allowRate,
      antiAutomation: {
        verify: vi.fn(async () => {
          throw new Error("challenge outage");
        }),
      },
    });

    if (!missing.allowed) expect(missing.decision.reason).toBe("ANTI_AUTOMATION_FAILED");
    if (!invalid.allowed) expect(invalid.decision.reason).toBe("ANTI_AUTOMATION_FAILED");
    if (!unavailable.allowed) expect(unavailable.decision.reason).toBe("DEPENDENCY_UNAVAILABLE");
  });

  it("rejects rate excess before consuming the body", async () => {
    const result = await inspectProtectedJsonRequest(protectedRequest(), protectedPolicy, {
      rateLimiter: denyRate,
      antiAutomation: verifiedProof,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.decision.reason).toBe("RATE_LIMITED");
  });

  it("rejects advertised, streamed, malformed, empty, and non-object JSON bodies", async () => {
    const verifier = vi.fn(async () => ({ success: true, rateKey: "verified-browser-proof" }));
    const tooLargeAdvertised = protectedRequest("{}", {
      "Content-Length": String(requestSecurityLimits.maxProtectedJsonBytes + 1),
    });
    const oversizedStream = protectedRequest(
      JSON.stringify({ value: "a".repeat(requestSecurityLimits.maxProtectedJsonBytes) }),
    );
    const cases = [
      tooLargeAdvertised,
      oversizedStream,
      protectedRequest("{"),
      protectedRequest(""),
      protectedRequest("[]"),
    ];

    const results = await Promise.all(
      cases.map((candidate) =>
        inspectProtectedJsonRequest(candidate, protectedPolicy, {
          rateLimiter: allowRate,
          antiAutomation: { verify: verifier },
        }),
      ),
    );

    expect(results.map((result) => (result.allowed ? "ALLOWED" : result.decision.reason))).toEqual([
      "BODY_TOO_LARGE",
      "BODY_TOO_LARGE",
      "MALFORMED_BODY",
      "MALFORMED_BODY",
      "MALFORMED_BODY",
    ]);
    expect(verifier).toHaveBeenCalledTimes(4);
  });

  it("supports authenticated actor rate keys without an anti-automation token", async () => {
    const result = await inspectProtectedJsonRequest(
      protectedRequest(undefined, { "X-Meneer-Challenge-Token": "" }),
      { ...protectedPolicy, requireAntiAutomation: false },
      { rateLimiter: allowRate, principalRateKey: "server-resolved-subject" },
    );

    expect(result.allowed).toBe(true);
  });
});

describe("request timeout and response correlation", () => {
  it("aborts and returns a safe no-store-compatible timeout response", async () => {
    let observedSignal: AbortSignal | undefined;
    const response = await executeWithRequestTimeout(
      request("/start"),
      async (boundedRequest) => {
        observedSignal = boundedRequest.signal;
        await new Promise((resolve) => setTimeout(resolve, 25));
        return new Response("late");
      },
      1,
    );

    expect(response.status).toBe(503);
    expect(observedSignal?.aborted).toBe(true);
    expect(await response.text()).not.toContain("request-timeout");
  });

  it("adds the safe correlation identifier without replacing the response body", async () => {
    const inspected = await inspectPublicRequest(
      request("/", { headers: { "X-Correlation-ID": "trace_safe_02" } }),
      allowRate,
    );
    const response = applyCorrelationHeader(new Response("ok"), inspected.decision);

    expect(response.headers.get("X-Correlation-ID")).toBe("trace_safe_02");
    expect(await response.text()).toBe("ok");
  });
});
