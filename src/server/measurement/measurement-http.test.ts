import { describe, expect, it, vi } from "vitest";

import {
  createMeasurementConsentHttpHandler,
  createMeasurementEventHttpHandler,
  measurementFlowCookieName,
} from "./measurement-http";

const origin = "https://meneerhealth.co.za";
const flowId = "10000000-0000-4000-8000-000000000002";
const receiptId = "10000000-0000-4000-8000-000000000003";
const allowRate = { limit: async () => ({ success: true }) };

function post(path: string, body: unknown, headers?: HeadersInit) {
  return new Request(`${origin}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "measurement_request_0001",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      ...headers,
    },
  });
}

function measurement() {
  return {
    grant: vi.fn(async () => ({
      flowId,
      consentReceiptId: receiptId,
      status: "granted" as const,
      expiresAt: new Date("2030-01-01T00:30:00.000Z"),
    })),
    withdraw: vi.fn(async () => ({
      flowId,
      consentReceiptId: receiptId,
      status: "withdrawn" as const,
      expiresAt: new Date("2030-01-01T00:30:00.000Z"),
      deleteAfter: new Date("2030-01-08T00:00:00.000Z"),
    })),
    record: vi.fn(async () => ({ eventId: crypto.randomUUID(), replayed: false })),
  };
}

describe("measurement HTTP boundary", () => {
  it("grants distinct consent and issues only a secure short-lived HttpOnly cookie", async () => {
    const service = measurement();
    const response = await createMeasurementConsentHttpHandler({
      measurement: service,
      rateLimiter: allowRate,
      now: () => new Date("2030-01-01T00:00:00.000Z"),
    })(post("/api/measurement/consent", { decision: "granted" }));

    expect(response.status).toBe(204);
    expect(response.headers.get("Set-Cookie")).toBe(
      `${measurementFlowCookieName}=${flowId}.${receiptId}; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Strict`,
    );
    expect(service.grant).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "granted", synthetic: false }),
    );
  });

  it("withdraws with the active flow, clears the cookie, and safely clears absent state", async () => {
    const service = measurement();
    const handler = createMeasurementConsentHttpHandler({
      measurement: service,
      rateLimiter: allowRate,
    });
    const withdrawn = await handler(
      post(
        "/api/measurement/consent",
        { decision: "withdrawn" },
        { Cookie: `${measurementFlowCookieName}=${flowId}.${receiptId}` },
      ),
    );
    const absent = await handler(post("/api/measurement/consent", { decision: "withdrawn" }));

    expect(withdrawn.status).toBe(204);
    expect(withdrawn.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(service.withdraw).toHaveBeenCalledWith(expect.anything(), flowId);
    expect(absent.status).toBe(204);
    expect(service.withdraw).toHaveBeenCalledTimes(1);
  });

  it("accepts only strict events with an active cookie and never echoes payload data", async () => {
    const service = measurement();
    const handler = createMeasurementEventHttpHandler({
      measurement: service,
      rateLimiter: allowRate,
    });
    const accepted = await handler(
      post(
        "/api/measurement/events",
        { name: "journey_step_completed", step: 2 },
        { Cookie: `${measurementFlowCookieName}=${flowId}.${receiptId}` },
      ),
    );
    const prohibited = await handler(
      post(
        "/api/measurement/events",
        { name: "journey_started", treatment: "peptides" },
        { Cookie: `${measurementFlowCookieName}=${flowId}.${receiptId}` },
      ),
    );
    const cookieless = await handler(post("/api/measurement/events", { name: "journey_started" }));

    expect(accepted.status).toBe(204);
    expect(await accepted.text()).toBe("");
    expect(prohibited.status).toBe(422);
    expect(cookieless.status).toBe(422);
    expect(service.record).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-origin requests before consent or event handling", async () => {
    const service = measurement();
    const response = await createMeasurementConsentHttpHandler({
      measurement: service,
      rateLimiter: allowRate,
    })(
      post(
        "/api/measurement/consent",
        { decision: "granted" },
        {
          Origin: "https://example.invalid",
          "Sec-Fetch-Site": "cross-site",
        },
      ),
    );

    expect(response.status).toBe(403);
    expect(service.grant).not.toHaveBeenCalled();
  });

  it("does not persist, echo, or log URL, referrer, replay, identity, or health canaries", async () => {
    const canary = "synthetic-prohibited-canary.invalid";
    const service = measurement();
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const handler = createMeasurementEventHttpHandler({
      measurement: service,
      rateLimiter: allowRate,
    });
    const response = await handler(
      post(
        "/api/measurement/events",
        {
          name: "journey_started",
          email: `patient@${canary}`,
          treatment: "synthetic-health-canary",
          url: `https://${canary}/start?answer=private`,
          referrer: `https://${canary}/referrer`,
          sessionReplay: "synthetic-replay-canary",
        },
        {
          Cookie: `${measurementFlowCookieName}=${flowId}.${receiptId}`,
          Referer: `https://${canary}/transport-referrer`,
        },
      ),
    );
    const responseText = await response.text();

    expect([413, 422]).toContain(response.status);
    expect(service.record).not.toHaveBeenCalled();
    expect(responseText).not.toContain(canary);
    expect(responseText).not.toContain("synthetic-health-canary");
    expect(responseText).not.toContain("synthetic-replay-canary");
    expect(consoleLog).not.toHaveBeenCalled();
    consoleLog.mockRestore();
  });
});
