import "@tanstack/react-start/server-only";

import type { IdentityGovernanceRepository } from "@/application/identity/identity-governance-repository";
import { IdentityGovernanceRejectedError } from "@/application/identity/identity-governance-repository";
import type { ManagedIdentityProvider } from "@/application/identity/managed-identity-provider";
import type { TenantId } from "@/domain/access/models";

export type StaffPatientInvitationCommand = Readonly<{
  staffAccessToken: string;
  tenantId: TenantId;
  email: string;
  expiresAt: Date;
  requestKey: string;
}>;

// Server-only orchestration. No route calls this until the first-party OTP flow is approved.
export class StaffPatientInvitationService {
  constructor(
    private readonly provider: Pick<ManagedIdentityProvider, "verifyAccessToken" | "invitePatient">,
    private readonly repository: Pick<
      IdentityGovernanceRepository,
      "reservePatientInvitation" | "completePatientInvitationDelivery"
    >,
    private readonly firstPartyOrigin: string,
  ) {}

  async invite(input: StaffPatientInvitationCommand): Promise<string> {
    const email = input.email.trim().toLowerCase();
    let origin: URL;
    try {
      origin = new URL(this.firstPartyOrigin);
    } catch {
      throw new IdentityGovernanceRejectedError();
    }
    if (
      origin.protocol !== "https:" ||
      (origin.hostname !== "meneerhealth.co.za" &&
        !origin.hostname.endsWith(".meneerhealth.co.za")) ||
      origin.port !== "" ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !input.staffAccessToken.trim() ||
      !/^[0-9a-f-]{36}$/.test(input.requestKey) ||
      !Number.isFinite(input.expiresAt.getTime())
    ) {
      throw new IdentityGovernanceRejectedError();
    }

    const staffIdentity = await this.provider.verifyAccessToken(input.staffAccessToken);
    if (staffIdentity.assurance !== "aal2") throw new IdentityGovernanceRejectedError();

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
    const contactDigest = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const invitationId = await this.repository.reservePatientInvitation({
      tenantId: input.tenantId,
      providerSessionId: staffIdentity.providerSessionId,
      contactDigest,
      expiresAt: input.expiresAt,
      requestKey: input.requestKey,
    });

    let providerSubject: string;
    try {
      providerSubject = await this.provider.invitePatient(
        email,
        new URL("/account/verify", origin).toString(),
      );
    } catch {
      // A failed provider call closes the reservation; it must never be retried
      // with the same key or represented as a successful invitation.
      await this.repository.completePatientInvitationDelivery(invitationId, null, true);
      throw new IdentityGovernanceRejectedError();
    }

    // If binding fails, leave the reservation non-authorising for reconciliation.
    // Never send the provider invitation a second time on a replayed request.
    await this.repository.completePatientInvitationDelivery(invitationId, providerSubject, false);
    return invitationId;
  }
}
