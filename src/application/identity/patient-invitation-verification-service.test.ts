import { describe, expect, it, vi } from "vitest";

import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import type {
  IdentityInvitation,
  ManagedSession,
  ProviderIdentity,
} from "@/domain/access/identity";
import { PatientInvitationVerificationService } from "./patient-invitation-verification-service";

const email = "patient@example.invalid";
const invitation: IdentityInvitation = {
  id: "60000000-0000-4000-8000-000000000002",
  tenantId: "10000000-0000-4000-8000-000000000001",
  contactDigest: "ignored-in-test",
  intendedRole: "patient",
  providerSubject: "20000000-0000-4000-8000-000000000001",
  status: "pending",
  expiresAt: new Date("2030-01-02T00:00:00.000Z"),
};
const session: ManagedSession = {
  accessToken: "synthetic-access",
  refreshToken: "synthetic-refresh",
  expiresAt: new Date("2030-01-01T01:00:00.000Z"),
};
const identity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: invitation.providerSubject!,
  providerSessionId: "50000000-0000-4000-8000-000000000001",
  assurance: "aal1",
  authenticatedAt: new Date("2030-01-01T00:00:00.000Z"),
  expiresAt: session.expiresAt,
  verifiedContact: { kind: "email", value: email, verifiedAt: new Date("2030-01-01") },
};

function harness() {
  const provider = {
    verifyInvitationOtp: vi.fn(async () => session),
    verifyAccessToken: vi.fn(async () => identity),
    revokeSessions: vi.fn(async () => undefined),
  };
  const repository = {
    findDeliveredPatientInvitation: vi.fn(async (digest: string, observedAt: Date) => {
      void digest;
      void observedAt;
      return invitation as IdentityInvitation | null;
    }),
  };
  const service = new PatientInvitationVerificationService(
    provider,
    repository,
    () => new Date("2030-01-01T00:00:00.000Z"),
  );
  return { service, provider, repository };
}

describe("patient invitation code boundary", () => {
  it("binds a valid code to the same delivered invitation, verified contact and provider subject", async () => {
    const { service, provider, repository } = harness();
    await expect(service.verify(" PATIENT@example.invalid ", "123456")).resolves.toEqual({
      invitation,
      session,
    });
    expect(repository.findDeliveredPatientInvitation).toHaveBeenCalledTimes(2);
    expect(repository.findDeliveredPatientInvitation.mock.calls[0]?.[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(provider.verifyInvitationOtp).toHaveBeenCalledWith(email, "123456");
  });

  it("does not submit malformed contacts or codes to Auth", async () => {
    const { service, provider } = harness();
    await expect(service.verify(email, "12345x")).rejects.toEqual(new IdentityRejectedError());
    await expect(service.verify("bad", "123456")).rejects.toEqual(new IdentityRejectedError());
    expect(provider.verifyInvitationOtp).not.toHaveBeenCalled();
  });

  it("rejects absent and expired invitations before consuming a code", async () => {
    const { service, provider, repository } = harness();
    repository.findDeliveredPatientInvitation.mockResolvedValueOnce(null);
    await expect(service.verify(email, "123456")).rejects.toEqual(new IdentityRejectedError());
    expect(provider.verifyInvitationOtp).not.toHaveBeenCalled();
  });

  it.each([
    ["provider subject", { ...identity, providerSubject: "other-subject" }],
    [
      "verified email",
      {
        ...identity,
        verifiedContact: { ...identity.verifiedContact, value: "other@example.invalid" },
      },
    ],
  ])("rejects a mismatched %s and revokes the issued provider session", async (_, mismatch) => {
    const { service, provider } = harness();
    provider.verifyAccessToken.mockResolvedValueOnce(mismatch);
    await expect(service.verify(email, "123456")).rejects.toEqual(new IdentityRejectedError());
    expect(provider.revokeSessions).toHaveBeenCalledWith(session.accessToken, "local");
  });

  it("rejects a revoked or superseded invitation after OTP consumption", async () => {
    const { service, provider, repository } = harness();
    repository.findDeliveredPatientInvitation
      .mockResolvedValueOnce(invitation)
      .mockResolvedValueOnce(null);
    await expect(service.verify(email, "123456")).rejects.toEqual(new IdentityRejectedError());
    expect(provider.revokeSessions).toHaveBeenCalledOnce();
  });
});
