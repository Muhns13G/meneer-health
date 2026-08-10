import { describe, expect, it } from "vitest";

import { runControlledIncidentExercise } from "./controlled-incident-exercise";

describe("controlled incident exercise", () => {
  it("detects, escalates, contains, recovers, and reviews without sensitive diagnostics", () => {
    expect(runControlledIncidentExercise()).toEqual({
      contract: "incident.exercise-report",
      version: 1,
      scenario: "dependency-and-break-glass",
      detectedAlertCodes: ["BREAK_GLASS_ATTEMPT", "DEPENDENCY_FAILURE"],
      redactionRejected: true,
      steps: ["detect", "triage", "contain", "recover", "review"],
      outcome: "passed",
    });
  });
});
