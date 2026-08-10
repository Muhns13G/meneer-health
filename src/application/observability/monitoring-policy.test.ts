import { describe, expect, it } from "vitest";

import type { TelemetryEvent } from "../../../contracts";
import { evaluateMonitoringWindow, serviceObjectives } from "./monitoring-policy";

function event(overrides: Partial<TelemetryEvent> = {}): TelemetryEvent {
  return {
    contract: "telemetry.event",
    version: 1,
    occurredAt: "2030-01-01T00:00:00.000Z",
    environment: "local",
    event: "request.completed",
    severity: "info",
    outcome: "succeeded",
    correlationId: crypto.randomUUID(),
    routeClass: "public-read",
    statusClass: "2xx",
    durationBucket: "under-250ms",
    ...overrides,
  };
}

describe("operational monitoring policy", () => {
  it("keeps the controlled-pilot objectives explicit", () => {
    expect(serviceObjectives).toEqual({
      publicAvailability: { targetPercent: 99.5, windowDays: 30 },
      uptimeCheck: { intervalMinutes: 3, confirmationFailures: 2 },
      incidentAcknowledgement: { criticalMinutes: 15, warningMinutes: 60 },
    });
  });

  it("raises immediate dependency and break-glass alerts with safe correlation only", () => {
    const alerts = evaluateMonitoringWindow([
      event({
        event: "request.denied",
        severity: "error",
        outcome: "failed",
        reasonCode: "DEPENDENCY_UNAVAILABLE",
        statusClass: "5xx",
        correlationId: "dependency_trace",
      }),
      event({
        event: "break_glass.denied",
        severity: "critical",
        outcome: "denied",
        correlationId: "break_glass_trace",
      }),
    ]);

    expect(alerts).toEqual([
      {
        code: "BREAK_GLASS_ATTEMPT",
        severity: "critical",
        owner: "security",
        correlationIds: ["break_glass_trace"],
      },
      {
        code: "DEPENDENCY_FAILURE",
        severity: "critical",
        owner: "technology-operations",
        correlationIds: ["dependency_trace"],
      },
    ]);
  });

  it("raises threshold alerts and leaves normal traffic quiet", () => {
    expect(evaluateMonitoringWindow([event()])).toEqual([]);
    expect(
      evaluateMonitoringWindow(
        Array.from({ length: 10 }, (_, index) =>
          event({
            event: "request.denied",
            severity: "warning",
            outcome: "denied",
            reasonCode: "RATE_LIMITED",
            statusClass: "4xx",
            correlationId: `rate_${index}`,
          }),
        ),
      ).map((alert) => alert.code),
    ).toContain("ABUSE_DENIAL_BURST");
  });
});
