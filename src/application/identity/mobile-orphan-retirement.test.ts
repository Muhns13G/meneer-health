import { describe, expect, it } from "vitest";
import {
  evaluateMobileOrphanRetirement,
  providerRetirementReconciled,
  type MobileOrphanSnapshot,
} from "./mobile-orphan-retirement";

const id = "a1470000-0000-4000-8000-000000000001";
const other = "a1470000-0000-4000-8000-000000000002";
const now = new Date("2026-10-09T10:00:00Z");
function snapshot(): MobileOrphanSnapshot {
  return {
    tenantId: id,
    invitationId: id,
    invitationVersion: 1,
    currentVersion: 1,
    claimId: id,
    emailInvitationId: id,
    subjectId: id,
    providerSubjectId: id,
    contactDigest: "a".repeat(64),
    terminalState: "expired",
    terminalAt: "2026-09-09T10:00:00Z",
    observedAt: now.toISOString(),
    creationProvenance: "mobile-created",
    linkedTenantId: id,
    linkedInvitationId: id,
    linkedClaimId: id,
    linkedEmailInvitationId: id,
    linkedSubjectId: id,
    linkedProviderSubjectId: id,
    linkedContactDigest: "a".repeat(64),
    converted: false,
    emailAccepted: false,
    liveClaim: false,
    liveProviderSession: false,
    activeMembership: false,
    anotherInvitation: false,
    crossTenantAssociation: false,
    profileExists: false,
    domainRecordsExist: false,
    held: false,
    providerOutcomeUncertain: false,
  };
}

describe("mobile orphan retirement candidate policy", () => {
  it.each(["expired", "revoked", "declined"] as const)(
    "permits only a due, proven, unprotected %s candidate",
    (terminalState) => {
      expect(evaluateMobileOrphanRetirement({ ...snapshot(), terminalState }, now)).toEqual({
        status: "candidate",
        dueAt: now.toISOString(),
      });
    },
  );
  it("keeps the entire thirty-day interval, without rounding or extending deadlines", () => {
    expect(evaluateMobileOrphanRetirement(snapshot(), new Date(now.getTime() - 1))).toMatchObject({
      status: "held",
    });
    expect(evaluateMobileOrphanRetirement(snapshot(), new Date(now.getTime() + 1))).toMatchObject({
      status: "candidate",
      dueAt: now.toISOString(),
    });
  });
  it.each([
    "converted",
    "emailAccepted",
    "liveClaim",
    "liveProviderSession",
    "activeMembership",
    "anotherInvitation",
    "crossTenantAssociation",
    "profileExists",
    "domainRecordsExist",
    "held",
    "providerOutcomeUncertain",
  ])("honours the %s veto", (field) => {
    expect(evaluateMobileOrphanRetirement({ ...snapshot(), [field]: true }, now)).toEqual({
      status: "held",
      reason: "protected",
    });
  });
  it.each(["converted", "active"])("never retires an invitation in state %s", (terminalState) => {
    expect(evaluateMobileOrphanRetirement({ ...snapshot(), terminalState }, now)).toMatchObject({
      status: "held",
    });
  });
  it.each(["unknown", "pre-existing"])("requires creation proof, not %s", (creationProvenance) => {
    expect(
      evaluateMobileOrphanRetirement({ ...snapshot(), creationProvenance }, now),
    ).toMatchObject({ status: "held", reason: "provenance" });
  });
  it.each([
    "linkedTenantId",
    "linkedInvitationId",
    "linkedClaimId",
    "linkedEmailInvitationId",
    "linkedSubjectId",
    "linkedProviderSubjectId",
  ])("rejects a mismatched %s", (field) => {
    expect(evaluateMobileOrphanRetirement({ ...snapshot(), [field]: other }, now)).toMatchObject({
      status: "held",
      reason: "provenance",
    });
  });
  it("rejects a changed email digest or invitation version", () => {
    expect(
      evaluateMobileOrphanRetirement({ ...snapshot(), linkedContactDigest: "b".repeat(64) }, now),
    ).toMatchObject({ status: "held", reason: "provenance" });
    expect(evaluateMobileOrphanRetirement({ ...snapshot(), currentVersion: 2 }, now)).toMatchObject(
      { status: "held", reason: "version" },
    );
  });
  it.each([null, "invalid", "2026-10-10T10:00:00Z"])(
    "does not invent or accept a terminal timestamp %s",
    (terminalAt) => {
      expect(evaluateMobileOrphanRetirement({ ...snapshot(), terminalAt }, now)).toMatchObject({
        status: "held",
      });
    },
  );
  it("rejects missing checks, contact payloads, coerced booleans and invalid clock", () => {
    const { held: omitted, ...incomplete } = snapshot();
    void omitted;
    for (const value of [
      incomplete,
      { ...snapshot(), email: "synthetic@example.invalid" },
      { ...snapshot(), liveProviderSession: "false" },
      { ...snapshot(), observedAt: "2026-10-10T10:00:00Z" },
    ])
      expect(evaluateMobileOrphanRetirement(value, now)).toEqual({
        status: "held",
        reason: "invalid",
      });
    expect(evaluateMobileOrphanRetirement(snapshot(), new Date(NaN))).toMatchObject({
      status: "held",
    });
  });
  it("returns no identity/contact identifiers and does not mutate the authoritative snapshot", () => {
    const value = Object.freeze(snapshot());
    expect(Object.keys(evaluateMobileOrphanRetirement(value, now))).toEqual(["status", "dueAt"]);
    expect(value.terminalState).toBe("expired");
  });
});

describe("independent provider retirement reconciliation", () => {
  it("requires observed absence of the exact provider subject", () => {
    expect(providerRetirementReconciled(id, { status: "absent", providerSubjectId: id })).toBe(
      true,
    );
  });
  it.each([
    { status: "present", providerSubjectId: id },
    { status: "unknown" },
    { status: "absent", providerSubjectId: other },
    { status: "deleted", providerSubjectId: id },
    { success: true },
    { status: "absent", providerSubjectId: id, email: "synthetic@example.invalid" },
    null,
  ])("does not treat an ambiguous/wrong observation as erasure: %j", (value) => {
    expect(providerRetirementReconciled(id, value)).toBe(false);
  });
  it("rejects an invalid target rather than matching arbitrary strings", () => {
    expect(providerRetirementReconciled("not-an-id", { status: "unknown" })).toBe(false);
  });
});
