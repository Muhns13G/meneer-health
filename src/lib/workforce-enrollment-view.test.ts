import { describe, expect, it } from "vitest";
import { workforceEnrollmentView } from "./workforce-enrollment-view";

describe("workforce enrolment response", () => {
  it("accepts provider-sized SVGs and existing-factor responses", () => {
    expect(
      workforceEnrollmentView.safeParse({
        enrollment: { qrCode: "x".repeat(452_113), secret: "SYNTHETIC" },
      }).success,
    ).toBe(true);
    expect(workforceEnrollmentView.safeParse({ enrollment: null }).success).toBe(true);
  });

  it("retains size, shape and secret bounds", () => {
    for (const response of [
      { enrollment: { qrCode: "x".repeat(1_000_001), secret: "SYNTHETIC" } },
      { enrollment: { qrCode: "synthetic", secret: "x".repeat(129) } },
      { enrollment: { qrCode: "synthetic", secret: "SYNTHETIC", role: "admin" } },
      { enrollment: null, role: "admin" },
    ]) {
      expect(workforceEnrollmentView.safeParse(response).success).toBe(false);
    }
  });
});
