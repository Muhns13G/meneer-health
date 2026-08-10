import type { AuditReviewResult } from "../../../contracts/audit";

export type ReviewAuditEvidence = Readonly<{
  tenantId: string;
  aggregateId: string;
  actorSubjectId: string;
  actorRole: "auditor";
  assurance: "aal2";
  purpose: "privacy_review";
  policyVersion: string;
  correlationId: string;
  occurredAt: Date;
  limit: number;
}>;

export interface AuditEvidenceRepository {
  reviewEvidence(request: ReviewAuditEvidence): Promise<AuditReviewResult>;
}

export class AuditEvidenceRepositoryError extends Error {
  constructor() {
    super("Audit evidence could not be reviewed.");
    this.name = "AuditEvidenceRepositoryError";
  }
}
