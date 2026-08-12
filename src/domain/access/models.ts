export type TenantId = string;
export type SubjectId = string;

export type TenantStatus = "active" | "suspended" | "closed";
export type SubjectStatus = "active" | "suspended" | "erasure_pending" | "erased";
export type MembershipRole =
  | "patient"
  | "clinician"
  | "pharmacy"
  | "operations"
  | "support"
  | "auditor"
  | "admin"
  | "release";
export type MembershipStatus = "invited" | "active" | "suspended" | "revoked";

export type Tenant = Readonly<{
  id: TenantId;
  slug: string;
  displayName: string;
  status: TenantStatus;
}>;

export type Subject = Readonly<{
  id: SubjectId;
  status: SubjectStatus;
}>;

export type TenantMembership = Readonly<{
  tenantId: TenantId;
  subjectId: SubjectId;
  role: MembershipRole;
  status: MembershipStatus;
  validFrom: Date;
  expiresAt?: Date;
  approvedBySubjectId?: SubjectId;
}>;
