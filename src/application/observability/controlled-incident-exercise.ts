import { telemetryEventSchema, type TelemetryEvent } from "../../../contracts";
import { evaluateMonitoringWindow } from "./monitoring-policy";

export type IncidentExerciseReport = Readonly<{
  contract: "incident.exercise-report";
  version: 1;
  scenario: "dependency-and-break-glass";
  detectedAlertCodes: readonly string[];
  redactionRejected: boolean;
  steps: readonly ["detect", "triage", "contain", "recover", "review"];
  outcome: "passed" | "failed";
}>;

export function runControlledIncidentExercise(): IncidentExerciseReport {
  const base = {
    contract: "telemetry.event",
    version: 1,
    occurredAt: "2030-01-01T00:00:00.000Z",
    environment: "local",
    routeClass: "protected-command",
    durationBucket: "under-250ms",
  } as const;
  const events: TelemetryEvent[] = [
    telemetryEventSchema.parse({
      ...base,
      event: "request.denied",
      severity: "error",
      outcome: "failed",
      correlationId: "exercise_dependency_trace",
      reasonCode: "DEPENDENCY_UNAVAILABLE",
      statusClass: "5xx",
    }),
    telemetryEventSchema.parse({
      ...base,
      event: "break_glass.denied",
      severity: "critical",
      outcome: "denied",
      correlationId: "exercise_break_glass_trace",
      statusClass: "4xx",
    }),
  ];
  const alerts = evaluateMonitoringWindow(events);
  const redactionRejected = !telemetryEventSchema.safeParse({
    ...events[0],
    email: "synthetic@example.invalid",
    questionnaire: "must-not-enter-telemetry",
  }).success;
  const expected = ["BREAK_GLASS_ATTEMPT", "DEPENDENCY_FAILURE"] as const;
  const detectedAlertCodes = alerts.map((alert) => alert.code);
  const passed = expected.every((code) => detectedAlertCodes.includes(code)) && redactionRejected;

  return {
    contract: "incident.exercise-report",
    version: 1,
    scenario: "dependency-and-break-glass",
    detectedAlertCodes,
    redactionRejected,
    steps: ["detect", "triage", "contain", "recover", "review"],
    outcome: passed ? "passed" : "failed",
  };
}
