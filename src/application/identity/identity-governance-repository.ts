import type {
  IdentityInvitation,
  IdentityRecoveryCase,
  ServiceIdentity,
  ServiceIdentityCredential,
  ServiceIdentityEnvironment,
  ServiceIdentityScope,
} from "@/domain/access/identity";
import type { SubjectId, TenantId } from "@/domain/access/models";

export type ReservePatientInvitation = Readonly<{
  tenantId: TenantId;
  contactDigest: string;
  expiresAt: Date;
  providerSessionId: string;
  requestKey: string;
}>;

export type CreateRecoveryCase = Readonly<{
  subjectId: SubjectId;
  recoveryClass: "patient" | "workforce";
  requestedAt: Date;
  expiresAt: Date;
}>;

export type CreateServiceIdentity = Readonly<{
  tenantId?: TenantId;
  name: string;
  environment: ServiceIdentityEnvironment;
  purpose: string;
  expiresAt: Date;
}>;

export type AddServiceIdentityScope = Readonly<{
  serviceIdentityId: string;
  resource: string;
  action: ServiceIdentityScope["action"];
}>;

export type AddServiceIdentityCredential = Readonly<{
  serviceIdentityId: string;
  secretDigest: Uint8Array;
  validFrom: Date;
  expiresAt: Date;
}>;

export interface IdentityGovernanceRepository {
  findDeliveredPatientInvitation(
    contactDigest: string,
    observedAt: Date,
  ): Promise<IdentityInvitation | null>;
  reservePatientInvitation(input: ReservePatientInvitation): Promise<string>;
  completePatientInvitationDelivery(
    invitationId: string,
    providerSubject: string | null,
    failed: boolean,
  ): Promise<void>;
  acceptPatientInvitation(
    invitationId: string,
    subjectId: SubjectId,
    acceptedAt: Date,
  ): Promise<IdentityInvitation>;
  createRecoveryCase(input: CreateRecoveryCase): Promise<IdentityRecoveryCase>;
  findActivePatientRecoveryCase(
    subjectId: SubjectId,
    now: Date,
  ): Promise<IdentityRecoveryCase | null>;
  approveWorkforceRecovery(
    recoveryCaseId: string,
    approverSubjectId: SubjectId,
    approvedAt: Date,
  ): Promise<IdentityRecoveryCase>;
  completeRecovery(recoveryCaseId: string, sessionsRevokedAt: Date): Promise<IdentityRecoveryCase>;
  createServiceIdentity(input: CreateServiceIdentity): Promise<ServiceIdentity>;
  addServiceIdentityScope(input: AddServiceIdentityScope): Promise<ServiceIdentityScope>;
  addServiceIdentityCredential(
    input: AddServiceIdentityCredential,
  ): Promise<ServiceIdentityCredential>;
  revokeServiceIdentityCredential(
    credentialId: string,
    revokedAt: Date,
  ): Promise<ServiceIdentityCredential>;
}

export class IdentityGovernanceRejectedError extends Error {
  readonly code = "IDENTITY_GOVERNANCE_REJECTED";

  constructor() {
    super("The identity governance request could not be accepted.");
    this.name = "IdentityGovernanceRejectedError";
  }
}

export class IdentityGovernanceUnavailableError extends Error {
  readonly code = "IDENTITY_GOVERNANCE_UNAVAILABLE";

  constructor() {
    super("Identity governance storage is temporarily unavailable.");
    this.name = "IdentityGovernanceUnavailableError";
  }
}
