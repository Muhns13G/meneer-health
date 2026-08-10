import { describe, expect, it, vi } from "vitest";

import {
  classifyTelemetryEnvironment,
  durationBucket,
  emitTelemetry,
  statusClass,
} from "./telemetry";

const safeEvent = {
  contract: "telemetry.event",
  version: 1,
  occurredAt: "2030-01-01T00:00:00.000Z",
  environment: "local",
  event: "request.denied",
  severity: "warning",
  outcome: "denied",
  correlationId: "synthetic_trace_01",
  routeClass: "protected-command",
  reasonCode: "RATE_LIMITED",
  statusClass: "4xx",
  durationBucket: "under-250ms",
} as const;

describe("privacy-safe telemetry", () => {
  it("emits one allowlisted structured object", () => {
    const log = vi.fn();

    expect(emitTelemetry(safeEvent, { log })).toBe(true);
    expect(log).toHaveBeenCalledWith(safeEvent);
  });

  it.each([
    ["email", "patient@example.invalid"],
    ["url", "https://meneerhealth.co.za/start?answer=private"],
    ["header", "Bearer secret"],
    ["payload", { symptom: "private" }],
    ["actorId", "20000000-0000-4000-8000-000000000001"],
  ])("rejects unapproved %s data before logging", (field, value) => {
    const log = vi.fn();

    expect(emitTelemetry({ ...safeEvent, [field]: value }, { log })).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it("does not make request handling depend on the telemetry sink", () => {
    expect(
      emitTelemetry(safeEvent, {
        log() {
          throw new Error("sink unavailable");
        },
      }),
    ).toBe(false);
  });

  it("classifies environment, status, and duration without logging raw transport data", () => {
    expect(classifyTelemetryEnvironment("127.0.0.1")).toBe("local");
    expect(classifyTelemetryEnvironment("meneerhealth.co.za")).toBe("production");
    expect(classifyTelemetryEnvironment("branch.workers.dev")).toBe("preview");
    expect([0, 249, 250, 999, 1_000, 4_999, 5_000, 14_999, 15_000].map(durationBucket)).toEqual([
      "under-250ms",
      "under-250ms",
      "250-999ms",
      "250-999ms",
      "1-4s",
      "1-4s",
      "5-14s",
      "5-14s",
      "15s-plus",
    ]);
    expect([204, 302, 404, 503, 999].map(statusClass)).toEqual([
      "2xx",
      "3xx",
      "4xx",
      "5xx",
      "unavailable",
    ]);
  });
});
