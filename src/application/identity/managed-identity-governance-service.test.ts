import { describe, expect, it, vi } from "vitest";

import type { IdentityGovernanceRepository } from "@/application/identity/identity-governance-repository";
import type { ManagedIdentityProvider } from "@/application/identity/managed-identity-provider";
import { ManagedIdentityGovernanceService } from "@/application/identity/managed-identity-governance-service";

const invitation = {
  id: "60000000-0000-4000-8000-000000000002",
  tenantId: "10000000-0000-4000-8000-000000000001",
  contactDigest: "a".repeat(64),
  intendedRole: "patient" as const,
  status: "pending" as const,
  expiresAt: new Date("2030-01-02T00:00:00.000Z"),
};

const recoveryCase = {
  id: "72000000-0000-4000-8000-000000000002",
  subjectId: "20000000-0000-4000-8000-000000000001",
  recoveryClass: "patient" as const,
  status: "requested" as const,
  requestedAt: new Date("2030-01-01T00:00:00.000Z"),
  expiresAt: new Date("2030-01-01T00:15:00.000Z"),
};

function dependencies() {
  const provider = {
    invitePatient: vi.fn().mockResolvedValue("provider-subject"),
    requestRecovery: vi.fn().mockResolvedValue(undefined),
  } as unknown as ManagedIdentityProvider;
  const repository = {
    createPatientInvitation: vi.fn().mockResolvedValue(invitation),
    bindInvitationProviderSubject: vi
      .fn()
      .mockResolvedValue({ ...invitation, providerSubject: "provider-subject" }),
    createRecoveryCase: vi.fn().mockResolvedValue(recoveryCase),
  } as unknown as IdentityGovernanceRepository;
  return { provider, repository };
}

describe("ManagedIdentityGovernanceService", () => {
  it("persists and binds a cohort invitation around provider issuance", async () => {
    const { provider, repository } = dependencies();
    const service = new ManagedIdentityGovernanceService(provider, repository);
    const observedAt = new Date("2030-01-01T00:00:00.000Z");

    await expect(
      service.invitePatient({
        tenantId: invitation.tenantId,
        contactDigest: invitation.contactDigest,
        expiresAt: invitation.expiresAt,
        email: "patient@example.invalid",
        redirectTo: "https://example.invalid/auth/confirm",
        observedAt,
      }),
    ).resolves.toMatchObject({ providerSubject: "provider-subject" });
    expect(repository.createPatientInvitation).toHaveBeenCalledOnce();
    expect(provider.invitePatient).toHaveBeenCalledWith(
      "patient@example.invalid",
      "https://example.invalid/auth/confirm",
    );
    expect(repository.bindInvitationProviderSubject).toHaveBeenCalledWith(
      invitation.id,
      "provider-subject",
      observedAt,
    );
  });

  it("records a bounded recovery case before requesting provider recovery", async () => {
    const { provider, repository } = dependencies();
    const service = new ManagedIdentityGovernanceService(provider, repository);

    await expect(
      service.requestPatientRecovery({
        subjectId: recoveryCase.subjectId,
        requestedAt: recoveryCase.requestedAt,
        expiresAt: recoveryCase.expiresAt,
        email: "patient@example.invalid",
        redirectTo: "https://example.invalid/auth/confirm",
      }),
    ).resolves.toEqual(recoveryCase);
    expect(repository.createRecoveryCase).toHaveBeenCalledOnce();
    expect(provider.requestRecovery).toHaveBeenCalledWith(
      "patient@example.invalid",
      "https://example.invalid/auth/confirm",
    );
  });
});
