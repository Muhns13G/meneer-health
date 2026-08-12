export type SecurityEvidenceAction = "authorisation.denied" | "breakglass.denied";

export type RecordSecurityEvidence = Readonly<{
  tenantId: string;
  actorType: "patient" | "workforce" | "service";
  actorId: string;
  actorRole: string;
  assurance: "aal1" | "aal2" | "service";
  action: SecurityEvidenceAction;
  subjectId?: string;
  resourceType: string;
  resourceId: string;
  purpose: string;
  policyVersion: string;
  reasonCode: string;
  correlationId: string;
  occurredAt: Date;
}>;

export type SecurityEvidenceReceipt = Readonly<{
  factId: string;
  sequence: number;
  eventHash: string;
}>;

export interface SecurityEvidenceRepository {
  record(event: RecordSecurityEvidence): Promise<SecurityEvidenceReceipt>;
}

export class SecurityEvidenceRepositoryError extends Error {
  constructor() {
    super("Security evidence could not be recorded.");
    this.name = "SecurityEvidenceRepositoryError";
  }
}
