import type { IdentityGovernanceRepository } from "@/application/identity/identity-governance-repository";
import type { IdentitySessionRepository } from "@/application/identity/identity-session-repository";
import {
  IdentityRejectedError,
  type ManagedIdentityProvider,
} from "@/application/identity/managed-identity-provider";
import type { AccessRepository } from "@/application/persistence/access-repository";
import type { IdentitySession, ManagedSession, ProviderIdentity } from "@/domain/access/identity";
import type { Subject, TenantMembership } from "@/domain/access/models";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PatientSession = Readonly<{
  session: IdentitySession;
  providerSession: ManagedSession;
  providerIdentity: ProviderIdentity;
  tenantId: string;
}>;

export type PatientSessionProof = Readonly<{
  sessionId: string;
  subjectId: string;
  tenantId: string;
  providerSessionId: string;
  accessToken: string;
  refreshToken: string;
  providerExpiresAt: number;
}>;

function normalizedEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) throw new IdentityRejectedError();
  return email;
}

export class PatientSessionService {
  constructor(
    private readonly provider: Pick<
      ManagedIdentityProvider,
      | "requestPatientSignIn"
      | "requestRecovery"
      | "verifyEmailOtp"
      | "verifyRecoveryOtp"
      | "verifyAccessToken"
      | "refreshSession"
      | "revokeSessions"
    >,
    private readonly access: AccessRepository,
    private readonly sessions: IdentitySessionRepository,
    private readonly governance: Pick<
      IdentityGovernanceRepository,
      "createRecoveryCase" | "findActivePatientRecoveryCase" | "completeRecovery"
    >,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async requestSignIn(emailInput: string, redirectTo: string): Promise<void> {
    await this.provider.requestPatientSignIn(normalizedEmail(emailInput), redirectTo);
  }

  async signIn(emailInput: string, code: string): Promise<PatientSession> {
    const email = normalizedEmail(emailInput);
    if (!/^\d{6}$/.test(code)) throw new IdentityRejectedError();
    const providerSession = await this.provider.verifyEmailOtp(email, code);
    try {
      const identity = await this.provider.verifyAccessToken(providerSession.accessToken);
      const { subject, membership } = await this.resolveActivePatient(identity, email);
      const session = await this.sessions.start({
        subjectId: subject.id,
        providerIdentity: identity,
        sessionClass: "patient",
        observedAt: this.now(),
      });
      return {
        session,
        providerSession,
        providerIdentity: identity,
        tenantId: membership.tenantId,
      };
    } catch (error) {
      await this.revokeProviderQuietly(providerSession.accessToken);
      throw error;
    }
  }

  async renew(proof: PatientSessionProof): Promise<PatientSession> {
    const now = this.now();
    const current = await this.sessions.findActive(proof.providerSessionId, now);
    if (!current || current.id !== proof.sessionId || current.subjectId !== proof.subjectId) {
      throw new IdentityRejectedError();
    }
    try {
      // Refresh token rotation stays exclusively on the server; the old cookie is never sufficient.
      const providerSession = await this.provider.refreshSession(proof.refreshToken);
      const identity = await this.provider.verifyAccessToken(providerSession.accessToken);
      if (identity.providerSessionId !== proof.providerSessionId) throw new IdentityRejectedError();
      const email = normalizedEmail(identity.verifiedContact.value);
      const { subject, membership } = await this.resolveActivePatient(identity, email);
      if (subject.id !== proof.subjectId || membership.tenantId !== proof.tenantId) {
        throw new IdentityRejectedError();
      }
      const session = await this.sessions.touch(current, now);
      return {
        session,
        providerSession,
        providerIdentity: identity,
        tenantId: membership.tenantId,
      };
    } catch (error) {
      // Suspension, contact changes and failed provider renewal invalidate application access.
      try {
        await this.sessions.revoke(current.id, now, "patient_session_revalidation_failed");
      } catch {
        // The caller still fails closed and clears the browser cookie.
      }
      throw error;
    }
  }

  async signOut(proof: PatientSessionProof): Promise<void> {
    // Deny application access first, even if the provider is temporarily unavailable.
    const active = await this.sessions.findActive(proof.providerSessionId, this.now());
    if (active && active.id === proof.sessionId && active.subjectId === proof.subjectId) {
      await this.sessions.revoke(active.id, this.now(), "patient_sign_out");
    }
    await this.provider.revokeSessions(proof.accessToken, "local");
  }

  async requestRecovery(emailInput: string, redirectTo: string): Promise<void> {
    const email = normalizedEmail(emailInput);
    const subject = await this.access.findSubjectByVerifiedEmail(email);
    if (!subject || subject.status !== "active") return;
    const membership = await this.activePatientMembership(subject);
    if (!membership) return;
    const now = this.now();
    await this.governance.createRecoveryCase({
      subjectId: subject.id,
      recoveryClass: "patient",
      requestedAt: now,
      expiresAt: new Date(now.getTime() + 15 * 60_000),
    });
    await this.provider.requestRecovery(email, redirectTo);
  }

  async completeRecovery(emailInput: string, code: string): Promise<void> {
    const email = normalizedEmail(emailInput);
    if (!/^\d{6}$/.test(code)) throw new IdentityRejectedError();
    const subject = await this.access.findSubjectByVerifiedEmail(email);
    if (!subject || subject.status !== "active" || !(await this.activePatientMembership(subject))) {
      throw new IdentityRejectedError();
    }
    const recovery = await this.governance.findActivePatientRecoveryCase(subject.id, this.now());
    if (!recovery) throw new IdentityRejectedError();
    const providerSession = await this.provider.verifyRecoveryOtp(email, code);
    try {
      const identity = await this.provider.verifyAccessToken(providerSession.accessToken);
      const mapped = await this.access.findSubjectByExternalIdentity(
        identity.provider,
        identity.providerSubject,
      );
      if (
        mapped?.id !== subject.id ||
        identity.verifiedContact.kind !== "email" ||
        normalizedEmail(identity.verifiedContact.value) !== email
      ) {
        throw new IdentityRejectedError();
      }
      await this.sessions.revokeAllForSubject(subject.id, this.now(), "patient_recovery");
      await this.provider.revokeSessions(providerSession.accessToken, "global");
      await this.governance.completeRecovery(recovery.id, this.now());
    } catch (error) {
      await this.revokeProviderQuietly(providerSession.accessToken);
      throw error;
    }
  }

  private async resolveActivePatient(identity: ProviderIdentity, email: string) {
    if (
      identity.verifiedContact.kind !== "email" ||
      normalizedEmail(identity.verifiedContact.value) !== email
    ) {
      throw new IdentityRejectedError();
    }
    const subject = await this.access.findSubjectByExternalIdentity(
      identity.provider,
      identity.providerSubject,
    );
    if (!subject || subject.status !== "active") throw new IdentityRejectedError();
    const verifiedContactSubject = await this.access.findSubjectByVerifiedEmail(email);
    if (verifiedContactSubject?.id !== subject.id) throw new IdentityRejectedError();
    const membership = await this.activePatientMembership(subject);
    if (!membership) throw new IdentityRejectedError();
    if (!(await this.access.hasPilotAccountEvidence(membership.tenantId, subject.id))) {
      throw new IdentityRejectedError();
    }
    return { subject, membership };
  }

  private async activePatientMembership(subject: Subject): Promise<TenantMembership | null> {
    const now = this.now();
    const memberships = (await this.access.listMemberships(subject.id)).filter(
      (membership) =>
        membership.role === "patient" &&
        membership.status === "active" &&
        membership.validFrom <= now &&
        (!membership.expiresAt || membership.expiresAt > now),
    );
    if (memberships.length !== 1) return null;
    const tenant = await this.access.findTenantById(memberships[0].tenantId);
    return tenant?.status === "active" ? memberships[0] : null;
  }

  private async revokeProviderQuietly(accessToken: string): Promise<void> {
    try {
      await this.provider.revokeSessions(accessToken, "local");
    } catch {
      // The application still rejects the session; never reveal provider detail.
    }
  }
}
