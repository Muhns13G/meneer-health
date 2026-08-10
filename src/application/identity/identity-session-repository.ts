import type {
  AuthenticationAssurance,
  IdentitySession,
  ProviderIdentity,
  SessionClass,
} from "@/domain/access/identity";
import type { SubjectId } from "@/domain/access/models";

export type StartIdentitySession = Readonly<{
  subjectId: SubjectId;
  providerIdentity: ProviderIdentity;
  sessionClass: SessionClass;
  observedAt: Date;
}>;

export interface IdentitySessionRepository {
  start(input: StartIdentitySession): Promise<IdentitySession>;
  findActive(providerSessionId: string, now: Date): Promise<IdentitySession | null>;
  touch(session: IdentitySession, now: Date): Promise<IdentitySession>;
  revoke(sessionId: string, revokedAt: Date, reason: string): Promise<void>;
}

const sessionLimits: Record<
  SessionClass,
  Readonly<{ idleMinutes: number; absoluteHours: number }>
> = {
  patient: { idleMinutes: 30, absoluteHours: 12 },
  workforce: { idleMinutes: 15, absoluteHours: 8 },
  privileged: { idleMinutes: 10, absoluteHours: 4 },
};

export function sessionDeadlines(sessionClass: SessionClass, issuedAt: Date, lastSeenAt: Date) {
  const limits = sessionLimits[sessionClass];
  const absoluteExpiresAt = new Date(issuedAt.getTime() + limits.absoluteHours * 60 * 60 * 1_000);
  const idleCandidate = new Date(lastSeenAt.getTime() + limits.idleMinutes * 60 * 1_000);

  return {
    idleExpiresAt:
      idleCandidate.getTime() < absoluteExpiresAt.getTime() ? idleCandidate : absoluteExpiresAt,
    absoluteExpiresAt,
  };
}

export function requiredAssurance(sessionClass: SessionClass): AuthenticationAssurance {
  return sessionClass === "patient" ? "aal1" : "aal2";
}

export class IdentitySessionRejectedError extends Error {
  readonly code = "IDENTITY_SESSION_REJECTED";

  constructor() {
    super("The identity session could not be accepted.");
    this.name = "IdentitySessionRejectedError";
  }
}

export class IdentitySessionUnavailableError extends Error {
  readonly code = "IDENTITY_SESSION_UNAVAILABLE";

  constructor() {
    super("Identity session storage is temporarily unavailable.");
    this.name = "IdentitySessionUnavailableError";
  }
}
