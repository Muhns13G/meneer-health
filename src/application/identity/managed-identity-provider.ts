import type { ManagedSession, ProviderIdentity } from "@/domain/access/identity";

export type SessionRevocationScope = "global" | "local" | "others";

export type TotpEnrollment = Readonly<{
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}>;

export interface ManagedIdentityProvider {
  verifyAccessToken(accessToken: string): Promise<ProviderIdentity>;
  invitePatient(email: string, redirectTo: string): Promise<string>;
  requestPatientSignIn(email: string, redirectTo: string): Promise<void>;
  requestRecovery(email: string, redirectTo: string): Promise<void>;
  verifyEmailOtp(email: string, token: string): Promise<ManagedSession>;
  revokeSessions(accessToken: string, scope: SessionRevocationScope): Promise<void>;
  enrollWorkforceTotp(session: ManagedSession, friendlyName: string): Promise<TotpEnrollment>;
  challengeWorkforceTotp(session: ManagedSession, factorId: string): Promise<string>;
  verifyWorkforceTotp(
    session: ManagedSession,
    factorId: string,
    challengeId: string,
    code: string,
  ): Promise<ManagedSession>;
}

export class IdentityRejectedError extends Error {
  readonly code = "IDENTITY_REJECTED";

  constructor() {
    super("The identity request could not be accepted.");
    this.name = "IdentityRejectedError";
  }
}

export class IdentityUnavailableError extends Error {
  readonly code = "IDENTITY_UNAVAILABLE";

  constructor() {
    super("Identity service is temporarily unavailable.");
    this.name = "IdentityUnavailableError";
  }
}
