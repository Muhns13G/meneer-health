import { describe, expect, it } from "vitest";
import { mobileInvitationCommandSchema, mobileInvitationPageSchema } from "./mobile-invitation";
const id = "a1430000-0000-4000-8000-000000000001";
const create = {
  action: "create",
  requestKey: id,
  givenName: "Synthetic",
  familyName: "Participant",
  phone: "+999000000001",
  provenanceReference: id,
  contactAuthorityReference: id,
};
describe("mobile invitation staff contract", () => {
  it("accepts only minimal contacts and opaque evidence", () => {
    expect(
      mobileInvitationCommandSchema.parse({ ...create, givenName: " Synthetic " }),
    ).toMatchObject({ action: "create", givenName: "Synthetic" });
    for (const field of [
      "email",
      "role",
      "tenantId",
      "token",
      "notes",
      "healthAnswers",
      "paid",
      "smsSent",
    ])
      expect(
        mobileInvitationCommandSchema.safeParse({ ...create, [field]: "forbidden" }).success,
      ).toBe(false);
  });
  it.each(["0821234567", "+27 821234567", "+0123456789", "+999000000001x"])(
    "rejects unnormalised phone %s",
    (phone) => {
      expect(mobileInvitationCommandSchema.safeParse({ ...create, phone }).success).toBe(false);
    },
  );
  it.each(["review", "send", "resend", "revoke"])(
    "requires version and request key for %s",
    (action) => {
      const value = { action, invitationId: id, requestKey: id, expectedVersion: 1 };
      expect(mobileInvitationCommandSchema.safeParse(value).success).toBe(true);
      expect(
        mobileInvitationCommandSchema.safeParse({ ...value, expectedVersion: 0 }).success,
      ).toBe(false);
      expect(
        mobileInvitationCommandSchema.safeParse({ ...value, expectedVersion: "1" }).success,
      ).toBe(false);
    },
  );
  it("accepts a server readiness flag but rejects overbroad projections", () => {
    const page = {
      invitations: [],
      nextId: null,
      reservationEnabled: false,
      sendingEnabled: false,
    };
    expect(mobileInvitationPageSchema.safeParse(page).success).toBe(true);
    expect(mobileInvitationPageSchema.safeParse({ ...page, sendingEnabled: true }).success).toBe(
      true,
    );
    expect(mobileInvitationPageSchema.safeParse({ ...page, token: "private" }).success).toBe(false);
  });
});
