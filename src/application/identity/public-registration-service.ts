import { z } from "zod";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
  type ManagedIdentityProvider,
} from "./managed-identity-provider";
import type { PatientSessionService, PatientSession } from "./patient-session-service";
import type { ManagedSession } from "@/domain/access/identity";

export interface PublicRegistrationRepository {
  available(tenantId: string): Promise<boolean>;
  reserveSend(tenantId: string, digest: string): Promise<boolean>;
  prepare(
    tenantId: string,
    providerSubject: string,
    providerSessionId: string,
  ): Promise<{ alreadyActive: boolean; invitationId: string | null }>;
}
const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
export class PublicRegistrationService {
  constructor(
    private readonly tenantId: string,
    private readonly provider: Pick<
      ManagedIdentityProvider,
      | "requestPublicRegistration"
      | "publicRegistrationAvailable"
      | "verifyEmailOtp"
      | "verifyAccessToken"
      | "revokeSessions"
    >,
    private readonly repository: PublicRegistrationRepository,
    private readonly sessions: Pick<PatientSessionService, "continueAfterActivation" | "signOut">,
    private readonly now = () => new Date(),
  ) {}
  async available() {
    return (await this.readiness()) === "AVAILABLE";
  }
  async readiness() {
    if (!(await this.repository.available(this.tenantId)))
      return "PUBLIC_SIGNUP_NATIVE_POLICY_CLOSED" as const;
    if ((await this.provider.publicRegistrationAvailable?.()) !== true)
      return "PUBLIC_SIGNUP_AUTH_POLICY_CLOSED" as const;
    return "AVAILABLE" as const;
  }
  async discard(providerSession: ManagedSession, active?: PatientSession) {
    try {
      if (active)
        await this.sessions.signOut({
          sessionId: active.session.id,
          subjectId: active.session.subjectId,
          tenantId: active.tenantId,
          providerSessionId: active.session.providerSessionId,
          accessToken: providerSession.accessToken,
          refreshToken: providerSession.refreshToken,
          providerExpiresAt: providerSession.expiresAt.getTime(),
        });
      else await this.provider.revokeSessions(providerSession.accessToken, "local");
    } catch {
      /* Preserve denial; never expose provider detail. */
    }
  }
  async request(emailInput: string, redirectTo: string) {
    const email = emailSchema.parse(emailInput);
    if (!(await this.available())) return;
    if (!this.provider.requestPublicRegistration) throw new IdentityUnavailableError();
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email))),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    if (!(await this.repository.reserveSend(this.tenantId, digest))) return;
    await this.provider.requestPublicRegistration(email, redirectTo);
  }
  async verify(emailInput: string, code: string) {
    const email = emailSchema.parse(emailInput);
    if (!/^\d{6}$/.test(code) || !(await this.available())) throw new IdentityRejectedError();
    const session = await this.provider.verifyEmailOtp(email, code);
    try {
      const identity = await this.provider.verifyAccessToken(session.accessToken);
      if (
        identity.verifiedContact.kind !== "email" ||
        identity.verifiedContact.value.trim().toLowerCase() !== email ||
        identity.expiresAt <= this.now()
      )
        throw new IdentityRejectedError();
      const prepared = await this.repository.prepare(
        this.tenantId,
        identity.providerSubject,
        identity.providerSessionId,
      );
      if (prepared.alreadyActive)
        return {
          kind: "session" as const,
          session: await this.sessions.continueAfterActivation({
            tenantId: this.tenantId,
            providerSubject: identity.providerSubject,
            ...session,
          }),
        };
      if (!prepared.invitationId) throw new IdentityRejectedError();
      const verified = {
        session,
        invitation: {
          id: prepared.invitationId,
          tenantId: this.tenantId,
          providerSubject: identity.providerSubject,
        },
      };
      return { kind: "activation" as const, verified };
    } catch (error) {
      try {
        await this.provider.revokeSessions(session.accessToken, "local");
      } catch {
        /* No provider detail or global revocation. */
      }
      throw error;
    }
  }
}
