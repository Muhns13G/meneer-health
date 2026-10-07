import { describe, expect, it, vi } from "vitest";

import { IdentityGovernanceRejectedError } from "@/application/identity/identity-governance-repository";
import { StaffPatientInvitationService } from "@/application/identity/staff-patient-invitation-service";

const input = {
  staffAccessToken: "synthetic-staff-token",
  tenantId: "10000000-0000-4000-8000-000000000001",
  email: " Patient@Example.invalid ",
  expiresAt: new Date("2030-01-01T00:30:00Z"),
  requestKey: "30000000-0000-4000-8000-000000000001",
};

function setup() {
  const provider = {
    verifyAccessToken: vi.fn().mockResolvedValue({
      providerSessionId: "20000000-0000-4000-8000-000000000001",
      assurance: "aal2",
    }),
    invitePatient: vi.fn().mockResolvedValue("provider-subject"),
  };
  const repository = {
    reservePatientInvitation: vi.fn().mockResolvedValue("40000000-0000-4000-8000-000000000001"),
    completePatientInvitationDelivery: vi.fn().mockResolvedValue(undefined),
  };
  const service = new StaffPatientInvitationService(
    provider,
    repository,
    "https://meneerhealth.co.za",
  );
  return { provider, repository, service };
}

describe("StaffPatientInvitationService", () => {
  it("reserves a normalized digest before provider delivery and then binds it", async () => {
    const { provider, repository, service } = setup();
    await expect(service.invite(input)).resolves.toBe("40000000-0000-4000-8000-000000000001");
    expect(repository.reservePatientInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: input.tenantId,
        providerSessionId: "20000000-0000-4000-8000-000000000001",
        requestKey: input.requestKey,
        contactDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(provider.invitePatient).toHaveBeenCalledWith(
      "patient@example.invalid",
      "https://meneerhealth.co.za/account/verify",
    );
    expect(repository.completePatientInvitationDelivery).toHaveBeenCalledWith(
      "40000000-0000-4000-8000-000000000001",
      "provider-subject",
      false,
    );
    expect(repository.reservePatientInvitation.mock.invocationCallOrder[0]).toBeLessThan(
      provider.invitePatient.mock.invocationCallOrder[0],
    );
  });

  it("never calls provider when reservation rejects", async () => {
    const { provider, repository, service } = setup();
    repository.reservePatientInvitation.mockRejectedValueOnce(
      new IdentityGovernanceRejectedError(),
    );
    await expect(service.invite(input)).rejects.toBeInstanceOf(IdentityGovernanceRejectedError);
    expect(provider.invitePatient).not.toHaveBeenCalled();
  });

  it("rejects an insufficiently assured staff token before reservation", async () => {
    const { provider, repository, service } = setup();
    provider.verifyAccessToken.mockResolvedValueOnce({
      providerSessionId: "20000000-0000-4000-8000-000000000001",
      assurance: "aal1",
    });
    await expect(service.invite(input)).rejects.toBeInstanceOf(IdentityGovernanceRejectedError);
    expect(repository.reservePatientInvitation).not.toHaveBeenCalled();
    expect(provider.invitePatient).not.toHaveBeenCalled();
  });

  it("closes the reservation and reports no success after provider failure", async () => {
    const { provider, repository, service } = setup();
    provider.invitePatient.mockRejectedValueOnce(new Error("private provider detail"));
    await expect(service.invite(input)).rejects.toBeInstanceOf(IdentityGovernanceRejectedError);
    expect(repository.completePatientInvitationDelivery).toHaveBeenCalledWith(
      "40000000-0000-4000-8000-000000000001",
      null,
      true,
    );
  });

  it("does not re-send or report success when provider binding fails", async () => {
    const { provider, repository, service } = setup();
    repository.completePatientInvitationDelivery.mockRejectedValueOnce(
      new IdentityGovernanceRejectedError(),
    );
    await expect(service.invite(input)).rejects.toBeInstanceOf(IdentityGovernanceRejectedError);
    expect(provider.invitePatient).toHaveBeenCalledOnce();
  });

  it("rejects malformed addresses and unsafe origins before reservation", async () => {
    const { provider, repository, service } = setup();
    await expect(service.invite({ ...input, email: "not-an-email" })).rejects.toBeInstanceOf(
      IdentityGovernanceRejectedError,
    );
    const unsafe = new StaffPatientInvitationService(
      provider,
      repository,
      "https://example.invalid",
    );
    await expect(unsafe.invite(input)).rejects.toBeInstanceOf(IdentityGovernanceRejectedError);
    expect(repository.reservePatientInvitation).not.toHaveBeenCalled();
  });
});
