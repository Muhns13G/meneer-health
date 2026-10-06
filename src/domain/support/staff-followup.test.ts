import { expect, it } from "vitest";
import { staffFollowupCommandSchema, staffFollowupViewSchema } from "./staff-followup";
const id = "f1400000-0000-4000-8000-000000000001";
it("permits only audited fixed-reason commands, never addresses or free text", () => {
  expect(staffFollowupCommandSchema.safeParse({ action: "read" }).success).toBe(true);
  const resend = {
    action: "resend",
    reference: id,
    requestKey: id,
    reason: "confirmed_non_acceptance",
  };
  expect(staffFollowupCommandSchema.safeParse(resend).success).toBe(true);
  for (const extra of [
    { reason: "timeout" },
    { recipient: "private@example.invalid" },
    { tenantId: id },
    { clinicalAnswers: [] },
  ])
    expect(staffFollowupCommandSchema.safeParse({ ...resend, ...extra }).success).toBe(false);
});
it("rejects oversized or sensitive queue projections", () => {
  const view = { cases: [], notifications: [], coverage: [] };
  expect(staffFollowupViewSchema.safeParse(view).success).toBe(true);
  expect(staffFollowupViewSchema.safeParse({ ...view, subjectId: id }).success).toBe(false);
  expect(
    staffFollowupViewSchema.safeParse({
      ...view,
      coverage: Array.from({ length: 21 }, () => ({
        reference: id,
        purpose: "privacy",
        reason: "coverage_unavailable",
      })),
    }).success,
  ).toBe(false);
});
