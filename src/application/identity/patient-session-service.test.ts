import { describe, expect, it, vi } from "vitest";

import type { IdentityGovernanceRepository } from "@/application/identity/identity-governance-repository";
import type { IdentitySessionRepository } from "@/application/identity/identity-session-repository";
import {
  IdentityRejectedError,
  type ManagedIdentityProvider,
} from "@/application/identity/managed-identity-provider";
import type { AccessRepository } from "@/application/persistence/access-repository";
import type { IdentitySession, ManagedSession, ProviderIdentity } from "@/domain/access/identity";
import { PatientSessionService } from "./patient-session-service";

const now = new Date("2030-01-01T00:05:00.000Z");
const subjectId = "20000000-0000-4000-8000-000000000001";
const tenantId = "10000000-0000-4000-8000-000000000001";
const providerSessionId = "50000000-0000-4000-8000-000000000001";
const email = "patient@example.invalid";
const providerSession: ManagedSession = {
  accessToken: "synthetic-access",
  refreshToken: "synthetic-refresh",
  expiresAt: new Date("2030-01-01T00:20:00.000Z"),
};
const identity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: "30000000-0000-4000-8000-000000000001",
  providerSessionId,
  assurance: "aal1",
  authenticatedAt: new Date("2030-01-01T00:00:00.000Z"),
  expiresAt: providerSession.expiresAt,
  verifiedContact: { kind: "email", value: email, verifiedAt: now },
};
const session: IdentitySession = {
  id: "40000000-0000-4000-8000-000000000001",
  subjectId,
  providerSessionId,
  sessionClass: "patient",
  assurance: "aal1",
  status: "active",
  issuedAt: identity.authenticatedAt,
  lastSeenAt: now,
  idleExpiresAt: new Date("2030-01-01T00:35:00.000Z"),
  absoluteExpiresAt: new Date("2030-01-01T12:00:00.000Z"),
};

function harness() {
  const provider = {
    requestPatientSignIn: vi.fn(async () => undefined),
    requestRecovery: vi.fn(async () => undefined),
    verifyEmailOtp: vi.fn(async () => providerSession),
    verifyRecoveryOtp: vi.fn(async () => providerSession),
    verifyAccessToken: vi.fn(async () => identity),
    refreshSession: vi.fn(async () => providerSession),
    revokeSessions: vi.fn(async () => undefined),
  } as unknown as ManagedIdentityProvider;
  const access = {
    findSubjectByExternalIdentity: vi.fn(async () => ({ id: subjectId, status: "active" })),
    findSubjectByVerifiedEmail: vi.fn(async () => ({ id: subjectId, status: "active" })),
    listMemberships: vi.fn(async () => [
      {
        tenantId,
        subjectId,
        role: "patient",
        status: "active",
        validFrom: identity.authenticatedAt,
      },
    ]),
    findTenantById: vi.fn(async () => ({
      id: tenantId,
      slug: "synthetic",
      displayName: "Synthetic",
      status: "active",
    })),
    hasPilotAccountEvidence: vi.fn(async () => true),
  } as unknown as AccessRepository;
  const sessions = {
    start: vi.fn(async () => session),
    findActive: vi.fn(async () => session),
    touch: vi.fn(async () => session),
    revoke: vi.fn(async () => undefined),
    revokeAllForSubject: vi.fn(async () => undefined),
  } as unknown as IdentitySessionRepository;
  const governance = {
    createRecoveryCase: vi.fn(async () => ({ id: "60000000-0000-4000-8000-000000000001" })),
    findActivePatientRecoveryCase: vi.fn(async () => ({
      id: "60000000-0000-4000-8000-000000000001",
    })),
    completeRecovery: vi.fn(async () => ({ id: "60000000-0000-4000-8000-000000000001" })),
  } as unknown as IdentityGovernanceRepository;
  return {
    provider,
    access,
    sessions,
    governance,
    service: new PatientSessionService(provider, access, sessions, governance, () => now),
  };
}

const proof = {
  sessionId: session.id,
  subjectId,
  tenantId,
  providerSessionId,
  accessToken: providerSession.accessToken,
  refreshToken: providerSession.refreshToken,
  providerExpiresAt: providerSession.expiresAt.getTime(),
};

describe("patient session lifecycle", () => {
  it("starts only a mapped active patient with committed profile and account receipts", async () => {
    const { service, sessions, access } = harness();
    await expect(service.signIn(email, "123456")).resolves.toMatchObject({ session, tenantId });
    expect(sessions.start).toHaveBeenCalledWith({
      subjectId,
      providerIdentity: identity,
      sessionClass: "patient",
      observedAt: now,
    });
    expect(access.hasPilotAccountEvidence).toHaveBeenCalledWith(tenantId, subjectId);
  });

  it("rejects a provider code without account evidence and revokes its provider session", async () => {
    const { service, access, provider, sessions } = harness();
    vi.mocked(access.hasPilotAccountEvidence).mockResolvedValue(false);
    await expect(service.signIn(email, "123456")).rejects.toEqual(new IdentityRejectedError());
    expect(provider.revokeSessions).toHaveBeenCalledWith(providerSession.accessToken, "local");
    expect(sessions.start).not.toHaveBeenCalled();
  });

  it("rejects a changed verified contact even when the provider subject still maps", async () => {
    const { service, access, provider, sessions } = harness();
    vi.mocked(access.findSubjectByVerifiedEmail).mockResolvedValue(null);
    await expect(service.signIn(email, "123456")).rejects.toEqual(new IdentityRejectedError());
    expect(provider.revokeSessions).toHaveBeenCalledWith(providerSession.accessToken, "local");
    expect(sessions.start).not.toHaveBeenCalled();
  });

  it("rejects a suspended tenant on sign-in and renewal", async () => {
    const { service, access, sessions } = harness();
    vi.mocked(access.findTenantById).mockResolvedValue({
      id: tenantId,
      slug: "synthetic",
      displayName: "Synthetic",
      status: "suspended",
    });
    await expect(service.signIn(email, "123456")).rejects.toEqual(new IdentityRejectedError());
    await expect(service.renew(proof)).rejects.toEqual(new IdentityRejectedError());
    expect(sessions.touch).not.toHaveBeenCalled();
    expect(sessions.revoke).toHaveBeenCalledWith(
      session.id,
      now,
      "patient_session_revalidation_failed",
    );
  });

  it("refuses a revoked or expired server-side session before rotating tokens", async () => {
    const { service, sessions, provider } = harness();
    vi.mocked(sessions.findActive).mockResolvedValue(null);
    await expect(service.renew(proof)).rejects.toEqual(new IdentityRejectedError());
    expect(provider.refreshSession).not.toHaveBeenCalled();
  });

  it("renews by provider refresh and a fresh tenant/membership/evidence check", async () => {
    const { service, sessions, provider } = harness();
    await expect(service.renew(proof)).resolves.toMatchObject({ session, providerSession });
    expect(provider.refreshSession).toHaveBeenCalledWith(providerSession.refreshToken);
    expect(sessions.touch).toHaveBeenCalledWith(session, now);
  });

  it("revokes the local session before provider sign-out", async () => {
    const { service, sessions, provider } = harness();
    await service.signOut(proof);
    expect(sessions.revoke).toHaveBeenCalledWith(session.id, now, "patient_sign_out");
    expect(provider.revokeSessions).toHaveBeenCalledWith(providerSession.accessToken, "local");
  });

  it("uses a recovery case, revokes all sessions and never returns a new session", async () => {
    const { service, governance, sessions, provider } = harness();
    await service.requestRecovery(email, "https://meneerhealth.co.za/account/recover");
    expect(governance.createRecoveryCase).toHaveBeenCalledWith(
      expect.objectContaining({ subjectId, recoveryClass: "patient" }),
    );
    expect(provider.requestRecovery).toHaveBeenCalledWith(
      email,
      "https://meneerhealth.co.za/account/recover",
    );
    await expect(service.completeRecovery(email, "654321")).resolves.toBeUndefined();
    expect(sessions.revokeAllForSubject).toHaveBeenCalledWith(subjectId, now, "patient_recovery");
    expect(provider.revokeSessions).toHaveBeenCalledWith(providerSession.accessToken, "global");
    expect(governance.completeRecovery).toHaveBeenCalledOnce();
    expect(sessions.start).not.toHaveBeenCalled();
  });

  it("does not send recovery for an unknown email or accept a missing case", async () => {
    const { service, access, provider, governance } = harness();
    vi.mocked(access.findSubjectByVerifiedEmail).mockResolvedValue(null);
    await service.requestRecovery(
      "unknown@example.invalid",
      "https://meneerhealth.co.za/account/recover",
    );
    expect(provider.requestRecovery).not.toHaveBeenCalled();
    vi.mocked(access.findSubjectByVerifiedEmail).mockResolvedValue({
      id: subjectId,
      status: "active",
    });
    vi.mocked(governance.findActivePatientRecoveryCase).mockResolvedValue(null);
    await expect(service.completeRecovery(email, "654321")).rejects.toEqual(
      new IdentityRejectedError(),
    );
    expect(provider.verifyRecoveryOtp).not.toHaveBeenCalled();
  });
});
