import { describe, expect, it, vi } from "vitest";
import { MobileOrphanRetirementService } from "./mobile-orphan-retirement-service";

const id = "a1470000-0000-4000-8000-000000000001";
const other = "a1470000-0000-4000-8000-000000000002";
const now = new Date("2026-10-09T10:00:00Z");
const command = { tenantId: id, emailInvitationId: id, requestKey: id };
function fixture() {
  const snapshot = {
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
  const reservation = {
    ...command,
    operationId: id,
    providerSubjectId: id,
    contactDigest: "a".repeat(64),
    dispatch: true,
    state: "reserved",
    snapshot,
  };
  const repository = {
    reserve: vi.fn().mockImplementation(async () => reservation),
    markUncertain: vi.fn().mockResolvedValue(undefined),
    markProtected: vi.fn().mockResolvedValue(undefined),
    finishProviderAbsence: vi.fn().mockResolvedValue("copies_pending"),
  };
  const provider = {
    removeUnconfirmed: vi.fn().mockResolvedValue("attempted"),
    observe: vi.fn().mockResolvedValue({ status: "absent", providerSubjectId: id }),
  };
  return {
    snapshot,
    reservation,
    repository,
    provider,
    service: new MobileOrphanRetirementService(repository, provider, () => now),
  };
}

describe("private orphan retirement coordinator (mock ports, not native race acceptance)", () => {
  it("persists uncertainty before deleting and keeps copy reconciliation pending", async () => {
    const f = fixture();
    expect(await f.service.retire(command)).toBe("copies_pending");
    expect(f.repository.markUncertain.mock.invocationCallOrder[0]).toBeLessThan(
      f.provider.removeUnconfirmed.mock.invocationCallOrder[0]!,
    );
    expect(f.provider.removeUnconfirmed).toHaveBeenCalledWith(id, "a".repeat(64));
    expect(f.repository.finishProviderAbsence).toHaveBeenCalledWith(id, id);
  });
  it("reconciles lost acknowledgement without dispatching again", async () => {
    const f = fixture();
    f.provider.removeUnconfirmed.mockRejectedValueOnce(new Error("timeout"));
    expect(await f.service.retire(command)).toBe("uncertain");
    expect(f.provider.observe).not.toHaveBeenCalled();
    f.reservation.dispatch = false;
    f.reservation.state = "uncertain";
    expect(await f.service.retire(command)).toBe("copies_pending");
    expect(f.provider.removeUnconfirmed).toHaveBeenCalledTimes(1);
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
  ])("never deletes protected %s", async (field) => {
    const f = fixture();
    Object.assign(f.snapshot, { [field]: true });
    expect(await f.service.retire(command)).toBe("held");
    expect(f.provider.removeUnconfirmed).not.toHaveBeenCalled();
    expect(f.repository.finishProviderAbsence).not.toHaveBeenCalled();
  });
  it.each([
    { creationProvenance: "pre-existing" },
    { currentVersion: 2 },
    { linkedProviderSubjectId: other },
    { terminalAt: now.toISOString() },
    { observedAt: "2026-10-09T09:59:29Z" },
    { observedAt: "2026-10-09T10:00:01Z" },
  ])("rejects invalid, not-due or stale observations %j", async (patch) => {
    const f = fixture();
    Object.assign(f.snapshot, patch);
    expect(await f.service.retire(command)).toBe("held");
    expect(f.provider.removeUnconfirmed).not.toHaveBeenCalled();
  });
  it.each([
    { status: "unknown" },
    { status: "present", providerSubjectId: id },
    { status: "absent", providerSubjectId: other },
    { success: true },
  ])("never treats %j as exact absence", async (observation) => {
    const f = fixture();
    f.provider.observe.mockResolvedValue(observation);
    expect(await f.service.retire(command)).toBe("uncertain");
    expect(f.repository.finishProviderAbsence).not.toHaveBeenCalled();
  });
  it("does not delete if the durable uncertainty transition fails", async () => {
    const f = fixture();
    f.repository.markUncertain.mockRejectedValue(new Error("journal"));
    await expect(f.service.retire(command)).rejects.toThrow();
    expect(f.provider.removeUnconfirmed).not.toHaveBeenCalled();
  });
  it("does not finish if provider independently protects the identity", async () => {
    const f = fixture();
    f.provider.removeUnconfirmed.mockResolvedValue("protected");
    expect(await f.service.retire(command)).toBe("held");
    expect(f.provider.observe).not.toHaveBeenCalled();
  });
  it("fails closed on revalidation failure after provider absence", async () => {
    const f = fixture();
    f.repository.finishProviderAbsence.mockRejectedValue(new Error("changed"));
    await expect(f.service.retire(command)).rejects.toThrow("changed");
  });
  it("rejects contact payloads before repository invocation", async () => {
    const f = fixture();
    await expect(
      f.service.retire({ ...command, email: "synthetic@example.invalid" }),
    ).rejects.toThrow();
    expect(f.repository.reserve).not.toHaveBeenCalled();
  });
  it("rejects a reservation for another command", async () => {
    const f = fixture();
    f.reservation.requestKey = other;
    await expect(f.service.retire(command)).rejects.toThrow();
    expect(f.provider.removeUnconfirmed).not.toHaveBeenCalled();
  });
  it("replays only the authoritative copy-complete journal without provider calls", async () => {
    const f = fixture();
    f.reservation.dispatch = false;
    f.reservation.state = "completed";
    expect(await f.service.retire(command)).toBe("completed");
    expect(f.provider.observe).not.toHaveBeenCalled();
    expect(f.provider.removeUnconfirmed).not.toHaveBeenCalled();
  });
});
