import { describe, expect, it } from "vitest";
import { queueDetailSchema, queueFilterSchema, queuePageSchema } from "./queue-projection";
const id = "a3000000-0000-4000-8000-000000000010";
const readiness = {
  profileActive: true,
  accountActive: true,
  emailVerified: true,
  instrumentsCurrent: false,
  authorisationCurrent: false,
  paymentReadiness: "integration_pending",
  recipientReadiness: "integration_pending",
  ready: false,
};
const row = {
  caseId: id,
  assignedOwner: id,
  state: "onboarding_pending",
  version: 1,
  createdAt: "2026-10-03T12:00:00+00:00",
  updatedAt: "2026-10-03T12:00:00+00:00",
  profileActive: true,
  emailVerified: true,
  exceptionCode: null,
  handoffReadiness: "not_evaluated",
  paymentReadiness: "not_evaluated",
};
describe("minimum queue projection contracts", () => {
  it("rejects unbounded pages, scope claims and partial cursors", () => {
    expect(
      queuePageSchema.safeParse({ cases: Array.from({ length: 26 }, () => row), nextCursor: null })
        .success,
    ).toBe(false);
    expect(queueFilterSchema.safeParse({ state: null, cursor: { id } }).success).toBe(false);
    expect(queueFilterSchema.safeParse({ state: null, cursor: null, tenantId: id }).success).toBe(
      false,
    );
  });
  it("accepts only server-masked contacts and no inferred readiness", () => {
    const profile = {
      givenName: "Synthetic",
      familyName: "Client",
      status: "active",
      maskedEmail: "***@***",
      maskedMobile: "***12",
      contactPreference: "email",
      mobileVerificationStatus: "pending",
    };
    expect(
      queueDetailSchema.safeParse({ ...row, profile, claim: "unclaimed", readiness }).success,
    ).toBe(true);
    for (const extra of [
      { maskedEmail: "raw@example.invalid" },
      { maskedMobile: "+27820000012" },
      { clinicalNote: "excluded" },
    ])
      expect(
        queueDetailSchema.safeParse({ ...row, profile: { ...profile, ...extra } }).success,
      ).toBe(false);
    expect(
      queueDetailSchema.safeParse({ ...row, profile, paymentReadiness: "ready" }).success,
    ).toBe(false);
  });
});
