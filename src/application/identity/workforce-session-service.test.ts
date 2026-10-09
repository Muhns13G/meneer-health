import { describe, expect, it, vi } from "vitest";
import { WorkforceSessionService, type WorkforceProof } from "./workforce-session-service";
import type { ManagedIdentityProvider } from "./managed-identity-provider";
import type { ProviderIdentity, IdentitySession } from "@/domain/access/identity";
const id = "a1000000-0000-4000-8000-000000000001";
const other = "a1000000-0000-4000-8000-000000000002";
const now = new Date("2030-01-01T00:00:00Z");
const managed = {
  accessToken: "synthetic-access",
  refreshToken: "synthetic-refresh",
  expiresAt: new Date("2030-01-01T01:00:00Z"),
};
const context = {
  subjectId: id,
  tenantId: id,
  role: "operations" as const,
  purpose: "operations" as const,
};
const identity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: id,
  providerSessionId: id,
  assurance: "aal2",
  authenticatedAt: now,
  expiresAt: managed.expiresAt,
  verifiedContact: { kind: "email", value: "staff@example.invalid", verifiedAt: now },
};
const session: IdentitySession = {
  id,
  subjectId: id,
  providerSessionId: id,
  sessionClass: "workforce",
  assurance: "aal2",
  status: "active",
  issuedAt: now,
  lastSeenAt: now,
  idleExpiresAt: new Date(now.getTime() + 900_000),
  absoluteExpiresAt: new Date(now.getTime() + 28_800_000),
};
const proof: WorkforceProof = {
  providerSession: managed,
  providerSessionId: id,
  context,
  sessionId: id,
};
function setup() {
  const provider = {
    verifyAccessToken: vi.fn().mockResolvedValue(identity),
    requestPatientSignIn: vi.fn(),
    requestWorkforceSignIn: vi.fn(),
    verifyEmailOtp: vi.fn().mockResolvedValue(managed),
    verifyInvitationOtp: vi.fn().mockResolvedValue(managed),
    listWorkforceTotp: vi.fn().mockResolvedValue([id]),
    enrollWorkforceTotp: vi.fn().mockResolvedValue({
      factorId: id,
      secret: "SYNTHETIC",
      qrCode: "synthetic",
      uri: "synthetic",
    }),
    challengeWorkforceTotp: vi.fn().mockResolvedValue(id),
    verifyWorkforceTotp: vi.fn().mockResolvedValue(managed),
    refreshSession: vi.fn().mockResolvedValue(managed),
    revokeSessions: vi.fn(),
    invitePatient: vi.fn().mockResolvedValue(other),
  } as unknown as ManagedIdentityProvider;
  const repository = {
    resolveCodeTarget: vi.fn().mockResolvedValue(id),
    resolve: vi.fn().mockResolvedValue(context),
    reserveInvitation: vi.fn().mockResolvedValue(other),
    finishInvitation: vi.fn(),
  };
  const sessions = {
    start: vi.fn().mockResolvedValue(session),
    findActive: vi.fn().mockResolvedValue(session),
    touch: vi.fn().mockResolvedValue(session),
    revoke: vi.fn(),
    revokeAllForSubject: vi.fn(),
  };
  return {
    provider,
    repository,
    sessions,
    service: new WorkforceSessionService(provider, repository, sessions, () => now),
  };
}
describe("workforce session service", () => {
  it("checks reviewed staff eligibility before requesting the appropriate provider code", async () => {
    const s = setup();
    await s.service.requestCode("STAFF@example.invalid");
    expect(s.repository.resolveCodeTarget).toHaveBeenCalledWith("staff@example.invalid");
    expect(s.provider.requestWorkforceSignIn).toHaveBeenCalledWith(
      "staff@example.invalid",
      id,
      "https://meneerhealth.co.za/staff/sign-in",
    );
    expect(s.provider.requestPatientSignIn).not.toHaveBeenCalled();
  });
  it("does not send for an ineligible account or unavailable eligibility lookup", async () => {
    const s = setup();
    s.repository.resolveCodeTarget.mockRejectedValue(new Error("WORKFORCE_REJECTED"));
    await expect(s.service.requestCode("staff@example.invalid")).rejects.toThrow();
    expect(s.provider.requestWorkforceSignIn).not.toHaveBeenCalled();
    expect(s.provider.invitePatient).not.toHaveBeenCalled();
  });
  it("multiple reviewed roles issue no application session before MFA/context selection", async () => {
    const s = setup();
    const repository = {
      ...s.repository,
      listContexts: vi
        .fn()
        .mockResolvedValue([context, { ...context, role: "auditor", purpose: "privacy_review" }]),
    };
    const service = new WorkforceSessionService(s.provider, repository, s.sessions, () => now);
    const pending = await service.verifyCode("staff@example.invalid", "123456");
    expect(pending.proof.contextChoiceRequired).toBe(true);
    expect(s.sessions.start).not.toHaveBeenCalled();
    await expect(service.completeMfa(pending.proof, "123456")).rejects.toThrow();
    const ready = await service.completeMfaForContextChoice(pending.proof, "123456");
    expect(ready.contexts).toHaveLength(2);
    expect(ready.proof.contextChoiceReady).toBe(true);
    expect(ready.proof.sessionId).toBeUndefined();
    expect(s.sessions.start).not.toHaveBeenCalled();
    await expect(service.authorise(ready.proof)).rejects.toThrow();
  });
  it("only native selection followed by exact session checks can activate a context", async () => {
    const s = setup();
    const auditor = { ...context, role: "auditor" as const, purpose: "privacy_review" as const };
    const repository = { ...s.repository, selectContext: vi.fn().mockResolvedValue(auditor) };
    repository.resolve.mockResolvedValue(auditor);
    const service = new WorkforceSessionService(s.provider, repository, s.sessions, () => now);
    const selected = await service.selectContext(
      {
        ...proof,
        context: auditor,
        sessionId: undefined,
        contextChoiceRequired: true,
        contextChoiceReady: true,
      },
      id,
      "auditor",
    );
    expect(repository.selectContext).toHaveBeenCalledWith(identity, id, "auditor");
    expect(selected.proof.contextChoiceRequired).toBeUndefined();
    expect(selected.proof.contextChoiceReady).toBeUndefined();
    expect(selected.proof.sessionId).toBe(id);
  });
  it.each([
    {},
    { contextChoiceRequired: true },
    { contextChoiceRequired: true, contextChoiceReady: true, sessionId: id },
  ])("context selection requires a fresh post-MFA pending proof %j", async (flags) => {
    const s = setup();
    const selectContext = vi.fn();
    const service = new WorkforceSessionService(
      s.provider,
      { ...s.repository, selectContext },
      s.sessions,
      () => now,
    );
    await expect(
      service.selectContext({ ...proof, sessionId: undefined, ...flags }, id, "admin"),
    ).rejects.toThrow();
    expect(selectContext).not.toHaveBeenCalled();
  });
  it("AAL1 cannot select even with sealed pending flags", async () => {
    const s = setup();
    vi.mocked(s.provider.verifyAccessToken).mockResolvedValue({ ...identity, assurance: "aal1" });
    const selectContext = vi.fn();
    const service = new WorkforceSessionService(
      s.provider,
      { ...s.repository, selectContext },
      s.sessions,
      () => now,
    );
    await expect(
      service.selectContext(
        { ...proof, sessionId: undefined, contextChoiceRequired: true, contextChoiceReady: true },
        id,
        "auditor",
      ),
    ).rejects.toThrow();
    expect(selectContext).not.toHaveBeenCalled();
  });
  it("email verification grants only a pending proof and preserves existing MFA", async () => {
    const s = setup();
    const result = await s.service.verifyCode("staff@example.invalid", "123456");
    expect(result.proof.sessionId).toBeUndefined();
    expect(s.sessions.start).not.toHaveBeenCalled();
    expect(s.provider.enrollWorkforceTotp).not.toHaveBeenCalled();
  });
  it("enrolls only when no verified TOTP exists", async () => {
    const s = setup();
    vi.mocked(s.provider.listWorkforceTotp).mockResolvedValue([]);
    const result = await s.service.verifyCode("staff@example.invalid", "123456", true);
    expect(result.enrollment?.factorId).toBe(id);
    expect(s.provider.verifyInvitationOtp).toHaveBeenCalled();
  });
  it("role lookup failure prevents enrollment and revokes the provider session", async () => {
    const s = setup();
    s.repository.resolve.mockRejectedValue(new Error("denied"));
    await expect(s.service.verifyCode("staff@example.invalid", "123456")).rejects.toThrow();
    expect(s.provider.listWorkforceTotp).not.toHaveBeenCalled();
    expect(s.provider.revokeSessions).toHaveBeenCalledWith(managed.accessToken, "local");
  });
  it.each(["bad", "12345", "1234567"])("rejects malformed OTP %s", async (code) => {
    await expect(setup().service.verifyCode("staff@example.invalid", code)).rejects.toThrow();
  });
  it("rejects provider contact mismatch", async () => {
    const s = setup();
    await expect(s.service.verifyCode("other@example.invalid", "123456")).rejects.toThrow();
    expect(s.repository.resolve).not.toHaveBeenCalled();
  });
  it("verifies TOTP then starts the bounded workforce application session", async () => {
    const s = setup();
    const result = await s.service.completeMfa(
      { ...proof, sessionId: undefined, factorId: id },
      "123456",
    );
    expect(result.proof.sessionId).toBe(id);
    expect(s.sessions.start).toHaveBeenCalledWith(
      expect.objectContaining({ sessionClass: "workforce", subjectId: id }),
    );
  });
  it("AAL1 cannot cross the MFA boundary even after provider verify", async () => {
    const s = setup();
    vi.mocked(s.provider.verifyAccessToken).mockResolvedValue({ ...identity, assurance: "aal1" });
    await expect(
      s.service.completeMfa({ ...proof, sessionId: undefined, factorId: id }, "123456"),
    ).rejects.toThrow();
    expect(s.sessions.start).not.toHaveBeenCalled();
  });
  it.each([
    { sessionId: undefined },
    { context: { ...context, tenantId: other } },
    { context: { ...context, purpose: "care_delivery" as const } },
    { providerSessionId: other },
  ])("rejects a forged/incomplete context %j", async (override) => {
    await expect(setup().service.authorise({ ...proof, ...override })).rejects.toThrow();
  });
  it("requires live AAL2 and the exact application session class", async () => {
    const s = setup();
    s.sessions.findActive.mockResolvedValue({ ...session, sessionClass: "patient" });
    await expect(s.service.authorise(proof)).rejects.toThrow();
  });
  it("revoked application session is not refreshed", async () => {
    const s = setup();
    s.sessions.findActive.mockResolvedValue(null);
    await expect(s.service.renew(proof)).rejects.toThrow();
    expect(s.provider.refreshSession).not.toHaveBeenCalled();
  });
  it("renewal rechecks live provider and context before touch", async () => {
    const s = setup();
    await s.service.renew(proof);
    expect(s.repository.resolve).toHaveBeenCalledTimes(2);
    expect(s.sessions.touch).toHaveBeenCalledWith(session, now);
  });
  it("operations cannot invite workforce or grant roles", async () => {
    const s = setup();
    await expect(s.service.invite(proof, "new@example.invalid", other)).rejects.toThrow();
    expect(s.repository.reserveInvitation).not.toHaveBeenCalled();
  });
  it("admin invitation reserves before provider delivery and records ambiguous failure", async () => {
    const s = setup();
    const admin = {
      ...context,
      role: "admin" as const,
      purpose: "security_administration" as const,
    };
    s.repository.resolve.mockResolvedValue(admin);
    s.sessions.findActive.mockResolvedValue({ ...session, sessionClass: "privileged" });
    vi.mocked(s.provider.invitePatient).mockRejectedValue(new Error("timeout"));
    await expect(
      s.service.invite({ ...proof, context: admin }, "new@example.invalid", other),
    ).rejects.toThrow();
    expect(s.repository.finishInvitation).toHaveBeenCalledWith(other, null);
  });
  it("a rejected/replayed reservation does not send", async () => {
    const s = setup();
    const admin = {
      ...context,
      role: "admin" as const,
      purpose: "security_administration" as const,
    };
    s.repository.resolve.mockResolvedValue(admin);
    s.sessions.findActive.mockResolvedValue({ ...session, sessionClass: "privileged" });
    s.repository.reserveInvitation.mockRejectedValue(new Error("replay"));
    await expect(
      s.service.invite({ ...proof, context: admin }, "new@example.invalid", other),
    ).rejects.toThrow();
    expect(s.provider.invitePatient).not.toHaveBeenCalled();
  });
  it("sign-out revokes application access before contacting provider", async () => {
    const s = setup();
    await s.service.signOut(proof);
    expect(s.sessions.revoke.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(s.provider.revokeSessions).mock.invocationCallOrder[0]!,
    );
  });
});
