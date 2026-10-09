import { z } from "zod";
import type { ManagedIdentityProvider, TotpEnrollment } from "./managed-identity-provider";
import { IdentityRejectedError } from "./managed-identity-provider";
import type { IdentitySessionRepository } from "./identity-session-repository";
import type { IdentitySession, ManagedSession, ProviderIdentity } from "@/domain/access/identity";

export const workforceContextSchema = z
  .object({
    subjectId: z.uuid(),
    tenantId: z.uuid(),
    role: z.enum(["operations", "support", "auditor", "admin", "release", "clinician", "pharmacy"]),
    purpose: z.enum([
      "operations",
      "support",
      "privacy_review",
      "security_administration",
      "release_management",
      "care_delivery",
      "dispensing",
    ]),
  })
  .strict();
export type WorkforceContext = z.infer<typeof workforceContextSchema>;
export type WorkforceProof = Readonly<{
  providerSession: ManagedSession;
  context: WorkforceContext;
  providerSessionId: string;
  sessionId?: string;
  factorId?: string;
  contextChoiceRequired?: boolean;
  contextChoiceReady?: boolean;
}>;
export interface WorkforceContextRepository {
  listContexts?(identity: ProviderIdentity): Promise<WorkforceContext[]>;
  selectContext?(
    identity: ProviderIdentity,
    tenantId: string,
    role: string,
  ): Promise<WorkforceContext>;
  resolve(identity: ProviderIdentity, proof?: WorkforceProof): Promise<WorkforceContext>;
  reserveInvitation(
    identity: ProviderIdentity,
    proof: WorkforceProof,
    email: string,
    requestKey: string,
  ): Promise<string>;
  finishInvitation(id: string, providerSubject: string | null): Promise<void>;
}
export type WorkforceSession = Readonly<{ proof: WorkforceProof; session: IdentitySession }>;

export class WorkforceSessionService {
  constructor(
    private readonly provider: ManagedIdentityProvider,
    private readonly repository: WorkforceContextRepository,
    private readonly sessions: IdentitySessionRepository,
    private readonly now = () => new Date(),
  ) {}

  async requestCode(email: string) {
    if (!z.email().safeParse(email).success || email.length > 254)
      throw new IdentityRejectedError();
    await this.provider.requestPatientSignIn(
      email.trim().toLowerCase(),
      "https://meneerhealth.co.za/staff/sign-in",
    );
  }

  async verifyCode(
    email: string,
    code: string,
    invitation = false,
  ): Promise<{
    proof: WorkforceProof;
    enrollment?: TotpEnrollment;
  }> {
    if (!z.email().safeParse(email).success || !/^\d{6}$/.test(code))
      throw new IdentityRejectedError();
    const normalized = email.trim().toLowerCase();
    const providerSession = await (invitation
      ? this.provider.verifyInvitationOtp(normalized, code)
      : this.provider.verifyEmailOtp(normalized, code));
    try {
      const identity = await this.provider.verifyAccessToken(providerSession.accessToken);
      if (
        identity.expiresAt <= this.now() ||
        identity.verifiedContact.kind !== "email" ||
        identity.verifiedContact.value.trim().toLowerCase() !== normalized
      )
        throw new IdentityRejectedError();
      const choices = this.repository.listContexts
        ? await this.repository.listContexts(identity)
        : [await this.repository.resolve(identity)];
      if (!choices.length) throw new IdentityRejectedError();
      const context = choices[0]!;
      const factors = await this.provider.listWorkforceTotp(providerSession);
      // Existing MFA is never reset or replaced through the email-code flow.
      const enrollment =
        factors.length === 0
          ? await this.provider.enrollWorkforceTotp(
              providerSession,
              `Meneer workforce ${crypto.randomUUID()}`,
            )
          : undefined;
      return {
        proof: {
          providerSession,
          context,
          providerSessionId: identity.providerSessionId,
          factorId: enrollment?.factorId ?? factors[0],
          ...(choices.length > 1 ? { contextChoiceRequired: true } : {}),
        },
        ...(enrollment ? { enrollment } : {}),
      };
    } catch (error) {
      await this.revokeQuietly(providerSession);
      throw error;
    }
  }

  private async identity(proof: WorkforceProof) {
    if (proof.providerSession.expiresAt <= this.now()) throw new IdentityRejectedError();
    const identity = await this.provider.verifyAccessToken(proof.providerSession.accessToken);
    if (identity.providerSessionId !== proof.providerSessionId || identity.expiresAt <= this.now())
      throw new IdentityRejectedError();
    const context = await this.repository.resolve(identity, proof);
    if (
      context.subjectId !== proof.context.subjectId ||
      context.tenantId !== proof.context.tenantId ||
      context.role !== proof.context.role ||
      context.purpose !== proof.context.purpose
    )
      throw new IdentityRejectedError();
    return { identity, context };
  }

  async completeMfa(proof: WorkforceProof, code: string): Promise<WorkforceSession> {
    if (proof.contextChoiceRequired || proof.sessionId || !proof.factorId || !/^\d{6}$/.test(code))
      throw new IdentityRejectedError();
    await this.identity(proof);
    const challenge = await this.provider.challengeWorkforceTotp(
      proof.providerSession,
      proof.factorId,
    );
    const providerSession = await this.provider.verifyWorkforceTotp(
      proof.providerSession,
      proof.factorId,
      challenge,
      code,
    );
    try {
      const identity = await this.provider.verifyAccessToken(providerSession.accessToken);
      if (identity.assurance !== "aal2" || identity.providerSessionId !== proof.providerSessionId)
        throw new IdentityRejectedError();
      const context = await this.repository.resolve(identity, { ...proof, providerSession });
      const session = await this.sessions.start({
        subjectId: context.subjectId,
        providerIdentity: identity,
        sessionClass:
          context.role === "admin" || context.role === "release" ? "privileged" : "workforce",
        observedAt: this.now(),
      });
      const result = {
        proof: {
          providerSession,
          context,
          providerSessionId: identity.providerSessionId,
          sessionId: session.id,
        },
        session,
      };
      await this.authorise(result.proof);
      return result;
    } catch (error) {
      await this.revokeQuietly(providerSession);
      throw error;
    }
  }

  async completeMfaForContextChoice(proof: WorkforceProof, code: string) {
    if (
      !proof.contextChoiceRequired ||
      proof.contextChoiceReady ||
      proof.sessionId ||
      !proof.factorId ||
      !/^\d{6}$/.test(code) ||
      !this.repository.listContexts
    )
      throw new IdentityRejectedError();
    await this.identity(proof);
    const challenge = await this.provider.challengeWorkforceTotp(
      proof.providerSession,
      proof.factorId,
    );
    const providerSession = await this.provider.verifyWorkforceTotp(
      proof.providerSession,
      proof.factorId,
      challenge,
      code,
    );
    try {
      const identity = await this.provider.verifyAccessToken(providerSession.accessToken);
      if (
        identity.assurance !== "aal2" ||
        identity.providerSessionId !== proof.providerSessionId ||
        identity.expiresAt <= this.now()
      )
        throw new IdentityRejectedError();
      const contexts = await this.repository.listContexts(identity);
      if (
        !contexts.length ||
        contexts.some((context) => context.subjectId !== proof.context.subjectId)
      )
        throw new IdentityRejectedError();
      return {
        proof: { ...proof, providerSession, factorId: undefined, contextChoiceReady: true },
        contexts,
      };
    } catch (error) {
      await this.revokeQuietly(providerSession);
      throw error;
    }
  }

  async selectContext(
    proof: WorkforceProof,
    tenantId: string,
    role: string,
  ): Promise<WorkforceSession> {
    if (
      !proof.contextChoiceRequired ||
      !proof.contextChoiceReady ||
      proof.sessionId ||
      !z.uuid().safeParse(tenantId).success ||
      !this.repository.selectContext ||
      !workforceContextSchema.shape.role.safeParse(role).success
    )
      throw new IdentityRejectedError();
    const { identity } = await this.identity(proof);
    if (identity.assurance !== "aal2") throw new IdentityRejectedError();
    const context = await this.repository.selectContext(identity, tenantId, role);
    if (
      context.subjectId !== proof.context.subjectId ||
      context.tenantId !== tenantId ||
      context.role !== role
    )
      throw new IdentityRejectedError();
    try {
      const session = await this.sessions.start({
        subjectId: context.subjectId,
        providerIdentity: identity,
        sessionClass:
          context.role === "admin" || context.role === "release" ? "privileged" : "workforce",
        observedAt: this.now(),
      });
      const next: WorkforceProof = {
        providerSession: proof.providerSession,
        context,
        providerSessionId: identity.providerSessionId,
        sessionId: session.id,
      };
      await this.authorise(next);
      return { proof: next, session };
    } catch (error) {
      await this.revokeQuietly(proof.providerSession);
      throw error;
    }
  }

  async authorise(proof: WorkforceProof) {
    if (!proof.sessionId) throw new IdentityRejectedError();
    const { identity, context } = await this.identity(proof);
    const session = await this.sessions.findActive(identity.providerSessionId, this.now());
    if (
      identity.assurance !== "aal2" ||
      !session ||
      session.id !== proof.sessionId ||
      session.subjectId !== context.subjectId ||
      session.assurance !== "aal2" ||
      session.status !== "active" ||
      session.idleExpiresAt <= this.now() ||
      session.absoluteExpiresAt <= this.now() ||
      session.sessionClass !==
        (context.role === "admin" || context.role === "release" ? "privileged" : "workforce")
    )
      throw new IdentityRejectedError();
    return { identity, context, session };
  }

  async renew(proof: WorkforceProof): Promise<WorkforceSession> {
    const { session } = await this.authorise(proof);
    const providerSession = await this.provider.refreshSession(proof.providerSession.refreshToken);
    const next = { ...proof, providerSession };
    await this.authorise(next);
    return { proof: next, session: await this.sessions.touch(session, this.now()) };
  }

  async invite(proof: WorkforceProof, email: string, requestKey: string): Promise<void> {
    if (!z.email().safeParse(email).success || !z.uuid().safeParse(requestKey).success)
      throw new IdentityRejectedError();
    const { identity, context } = await this.authorise(proof);
    if (context.role !== "admin") throw new IdentityRejectedError();
    const normalized = email.trim().toLowerCase();
    const id = await this.repository.reserveInvitation(identity, proof, normalized, requestKey);
    let providerSubject: string;
    try {
      providerSubject = await this.provider.invitePatient(
        normalized,
        "https://meneerhealth.co.za/staff/sign-in",
      );
    } catch {
      await this.repository.finishInvitation(id, null);
      throw new IdentityRejectedError();
    }
    await this.repository.finishInvitation(id, providerSubject);
  }

  async signOut(proof: WorkforceProof) {
    const session = await this.sessions.findActive(proof.providerSessionId, this.now());
    if (session && session.id === proof.sessionId && session.subjectId === proof.context.subjectId)
      await this.sessions.revoke(session.id, this.now(), "workforce_sign_out");
    await this.provider.revokeSessions(proof.providerSession.accessToken, "local");
  }

  private async revokeQuietly(session: ManagedSession) {
    try {
      await this.provider.revokeSessions(session.accessToken, "local");
    } catch {
      /* No application access was issued. */
    }
  }
}
