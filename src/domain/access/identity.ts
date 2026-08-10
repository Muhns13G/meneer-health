import type { SubjectId, TenantId } from "./models";

export type AuthenticationAssurance = "aal1" | "aal2";
export type SessionClass = "patient" | "workforce" | "privileged";
export type SessionStatus = "active" | "revoked" | "expired";
export type ServiceIdentityEnvironment = "local" | "preview" | "production";

export type VerifiedContact = Readonly<{
  kind: "email" | "phone";
  value: string;
  verifiedAt: Date;
}>;

export type ProviderIdentity = Readonly<{
  provider: "supabase";
  providerSubject: string;
  providerSessionId: string;
  assurance: AuthenticationAssurance;
  authenticatedAt: Date;
  expiresAt: Date;
  verifiedContact: VerifiedContact;
}>;

export type ManagedSession = Readonly<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}>;

export type IdentitySession = Readonly<{
  id: string;
  subjectId: SubjectId;
  providerSessionId: string;
  sessionClass: SessionClass;
  assurance: AuthenticationAssurance;
  status: SessionStatus;
  issuedAt: Date;
  lastSeenAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt?: Date;
}>;

export type IdentityInvitation = Readonly<{
  id: string;
  tenantId: TenantId;
  contactDigest: string;
  intendedRole: "patient";
  providerSubject?: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: Date;
  acceptedBySubjectId?: SubjectId;
  acceptedAt?: Date;
}>;

export type IdentityRecoveryCase = Readonly<{
  id: string;
  subjectId: SubjectId;
  recoveryClass: "patient" | "workforce";
  status: "requested" | "approved" | "completed" | "rejected" | "expired";
  requestedAt: Date;
  expiresAt: Date;
  approvedBySubjectId?: SubjectId;
  sessionsRevokedAt?: Date;
}>;

export type ServiceIdentity = Readonly<{
  id: string;
  tenantId?: TenantId;
  name: string;
  environment: ServiceIdentityEnvironment;
  purpose: string;
  status: "active" | "suspended" | "revoked";
  expiresAt: Date;
}>;

export type ServiceIdentityScope = Readonly<{
  serviceIdentityId: string;
  resource: string;
  action: "create" | "read" | "update" | "transition" | "append";
}>;

export type ServiceIdentityCredential = Readonly<{
  id: string;
  serviceIdentityId: string;
  validFrom: Date;
  expiresAt: Date;
  revokedAt?: Date;
}>;
