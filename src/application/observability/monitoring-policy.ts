import type { TelemetryEvent } from "../../../contracts";

export const serviceObjectives = Object.freeze({
  publicAvailability: Object.freeze({ targetPercent: 99.5, windowDays: 30 }),
  uptimeCheck: Object.freeze({ intervalMinutes: 3, confirmationFailures: 2 }),
  incidentAcknowledgement: Object.freeze({ criticalMinutes: 15, warningMinutes: 60 }),
});

export type OperationalAlert = Readonly<{
  code:
    | "BREAK_GLASS_ATTEMPT"
    | "DEPENDENCY_FAILURE"
    | "REQUEST_FAILURE_BURST"
    | "ABUSE_DENIAL_BURST";
  severity: "warning" | "critical";
  owner: "security" | "technology-operations";
  correlationIds: readonly string[];
}>;

export function evaluateMonitoringWindow(
  events: readonly TelemetryEvent[],
): readonly OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const correlations = (selected: readonly TelemetryEvent[]) =>
    [...new Set(selected.map((event) => event.correlationId))].slice(0, 10);
  const breakGlass = events.filter((event) => event.event === "break_glass.denied");
  const dependency = events.filter(
    (event) =>
      event.reasonCode === "DEPENDENCY_UNAVAILABLE" || event.reasonCode === "REQUEST_TIMEOUT",
  );
  const failures = events.filter(
    (event) => event.statusClass === "5xx" || event.statusClass === "unavailable",
  );
  const abuse = events.filter(
    (event) => event.reasonCode === "RATE_LIMITED" || event.reasonCode === "ANTI_AUTOMATION_FAILED",
  );

  if (breakGlass.length > 0) {
    alerts.push({
      code: "BREAK_GLASS_ATTEMPT",
      severity: "critical",
      owner: "security",
      correlationIds: correlations(breakGlass),
    });
  }
  if (dependency.length > 0) {
    alerts.push({
      code: "DEPENDENCY_FAILURE",
      severity: "critical",
      owner: "technology-operations",
      correlationIds: correlations(dependency),
    });
  }
  if (failures.length >= 5) {
    alerts.push({
      code: "REQUEST_FAILURE_BURST",
      severity: "critical",
      owner: "technology-operations",
      correlationIds: correlations(failures),
    });
  }
  if (abuse.length >= 10) {
    alerts.push({
      code: "ABUSE_DENIAL_BURST",
      severity: "warning",
      owner: "security",
      correlationIds: correlations(abuse),
    });
  }
  return alerts;
}
