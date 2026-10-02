import "@tanstack/react-start/server-only";

import type { IdentityGovernanceRepository } from "@/application/identity/identity-governance-repository";
import {
  IdentityRejectedError,
  type ManagedIdentityProvider,
} from "@/application/identity/managed-identity-provider";
import type { IdentityInvitation, ManagedSession } from "@/domain/access/identity";

export type VerifiedPatientInvitation = Readonly<{
  invitation: IdentityInvitation;
  session: ManagedSession;
}>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function contactDigest(email: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email)),
  );
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class PatientInvitationVerificationService {
  constructor(
    private readonly provider: Pick<
      ManagedIdentityProvider,
      "verifyInvitationOtp" | "verifyAccessToken" | "revokeSessions"
    >,
    private readonly repository: Pick<
      IdentityGovernanceRepository,
      "findDeliveredPatientInvitation"
    >,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async verify(emailInput: string, code: string): Promise<VerifiedPatientInvitation> {
    const email = emailInput.trim().toLowerCase();
    if (!emailPattern.test(email) || email.length > 254 || !/^\d{6}$/.test(code)) {
      throw new IdentityRejectedError();
    }
    const digest = await contactDigest(email);
    const invitation = await this.repository.findDeliveredPatientInvitation(digest, this.now());
    if (!invitation?.providerSubject) throw new IdentityRejectedError();

    const session = await this.provider.verifyInvitationOtp(email, code);
    try {
      const identity = await this.provider.verifyAccessToken(session.accessToken);
      const current = await this.repository.findDeliveredPatientInvitation(digest, this.now());
      if (
        !current ||
        current.id !== invitation.id ||
        current.tenantId !== invitation.tenantId ||
        current.providerSubject !== invitation.providerSubject ||
        identity.providerSubject !== invitation.providerSubject ||
        identity.verifiedContact.kind !== "email" ||
        identity.verifiedContact.value.trim().toLowerCase() !== email
      ) {
        throw new IdentityRejectedError();
      }
      return { invitation: current, session };
    } catch (error) {
      // A valid provider code alone never establishes application authority.
      try {
        await this.provider.revokeSessions(session.accessToken, "local");
      } catch {
        // Do not replace the rejection with provider detail.
      }
      throw error;
    }
  }
}
