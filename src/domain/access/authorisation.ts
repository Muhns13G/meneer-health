import type {
  AuthenticationAssurance,
  IdentitySession,
  ServiceIdentityEnvironment,
  ServiceIdentityScope,
} from "./identity";
import type {
  MembershipRole,
  MembershipStatus,
  SubjectId,
  SubjectStatus,
  TenantId,
  TenantStatus,
} from "./models";

export const authorisationPolicyVersion = "2026-08-10.1";

export type AuthorisationAction =
  | "create"
  | "read"
  | "update"
  | "transition"
  | "assign"
  | "export"
  | "approve"
  | "administer"
  | "append";

export type AuthorisationResourceType =
  | "identity_contact"
  | "consent"
  | "intake"
  | "clinical_decision"
  | "prescription"
  | "payment"
  | "fulfilment"
  | "support_case"
  | "audit_evidence"
  | "role_permission"
  | "privileged_asset";

export type AuthorisationPurpose =
  | "self_service"
  | "care_delivery"
  | "dispensing"
  | "operations"
  | "support"
  | "privacy_review"
  | "security_administration"
  | "release_management";

export type ResourceWorkflowState =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "active"
  | "closed";

export type ResourceRestriction = "none" | "suspended" | "hold" | "separation";
export type AuthorisationProjection =
  | "own"
  | "status"
  | "clinical"
  | "dispensing"
  | "operations"
  | "support"
  | "evidence"
  | "configuration";

export type HumanAuthorisationPrincipal = Readonly<{
  kind: "human";
  subjectId: SubjectId;
  subjectStatus: SubjectStatus;
  tenantId: TenantId;
  tenantStatus: TenantStatus;
  role: MembershipRole;
  membershipStatus: MembershipStatus;
  membershipValidFrom: Date;
  membershipExpiresAt?: Date;
  session: IdentitySession;
}>;

export type ServiceAuthorisationPrincipal = Readonly<{
  kind: "service";
  id: string;
  tenantId?: TenantId;
  environment: ServiceIdentityEnvironment;
  purpose: string;
  status: "active" | "suspended" | "revoked";
  expiresAt: Date;
  scopes: readonly ServiceIdentityScope[];
}>;

const serverResolvedResource = Symbol("server-resolved-authorisation-resource");

export type AuthorisationResourceInput = Readonly<{
  tenantId: TenantId;
  type: AuthorisationResourceType;
  id: string;
  ownerSubjectId?: SubjectId;
  workflowState: ResourceWorkflowState;
  restriction: ResourceRestriction;
  allowedPurposes: readonly AuthorisationPurpose[];
}>;

export type AuthorisationResource = AuthorisationResourceInput &
  Readonly<{ [serverResolvedResource]: true }>;

export function resolveServerAuthorisationResource(
  input: AuthorisationResourceInput,
): AuthorisationResource {
  return Object.freeze({ ...input, [serverResolvedResource]: true as const });
}

export function isServerResolvedAuthorisationResource(resource: AuthorisationResource): boolean {
  return resource[serverResolvedResource] === true;
}

export type AccessAssignment = Readonly<{
  id: string;
  tenantId: TenantId;
  subjectId: SubjectId;
  resourceType: AuthorisationResourceType;
  resourceId: string;
  purpose: AuthorisationPurpose;
  status: "active" | "suspended" | "revoked";
  validFrom: Date;
  expiresAt: Date;
}>;

export type AuthorisationRequest = Readonly<{
  action: AuthorisationAction;
  purpose: AuthorisationPurpose;
  resource: AuthorisationResource;
  observedAt: Date;
}>;

export type AuthorisationReason =
  | "ALLOWED"
  | "NO_PRINCIPAL"
  | "SUBJECT_INACTIVE"
  | "TENANT_INACTIVE"
  | "TENANT_MISMATCH"
  | "MEMBERSHIP_INACTIVE"
  | "MEMBERSHIP_NOT_YET_ACTIVE"
  | "MEMBERSHIP_EXPIRED"
  | "SESSION_INACTIVE"
  | "SESSION_EXPIRED"
  | "ASSURANCE_INSUFFICIENT"
  | "RESOURCE_UNRESOLVED"
  | "RESOURCE_RESTRICTED"
  | "ROLE_ACTION_DENIED"
  | "PURPOSE_DENIED"
  | "WORKFLOW_STATE_DENIED"
  | "RELATIONSHIP_REQUIRED"
  | "SERVICE_INACTIVE"
  | "SERVICE_EXPIRED"
  | "SERVICE_ENVIRONMENT_MISMATCH"
  | "SERVICE_SCOPE_DENIED";

export type AuthorisationDecision = Readonly<{
  allowed: boolean;
  reason: AuthorisationReason;
  policyVersion: typeof authorisationPolicyVersion;
  projection?: AuthorisationProjection;
  assurance?: AuthenticationAssurance;
}>;
