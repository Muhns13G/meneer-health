import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { auditReviewResultSchema, type AuditReviewResult } from "../../../../contracts/audit";
import {
  AuditEvidenceRepositoryError,
  type AuditEvidenceRepository,
  type ReviewAuditEvidence,
} from "@/application/audit/audit-evidence-repository";

export class SupabaseAuditEvidenceRepository implements AuditEvidenceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async reviewEvidence(request: ReviewAuditEvidence): Promise<AuditReviewResult> {
    const { data, error } = await this.client.rpc("review_audit_evidence", {
      p_tenant_id: request.tenantId,
      p_aggregate_id: request.aggregateId,
      p_actor_subject_id: request.actorSubjectId,
      p_actor_role: request.actorRole,
      p_assurance: request.assurance,
      p_purpose: request.purpose,
      p_policy_version: request.policyVersion,
      p_correlation_id: request.correlationId,
      p_occurred_at: request.occurredAt.toISOString(),
      p_limit: request.limit,
    });
    if (error) throw new AuditEvidenceRepositoryError();
    const parsed = auditReviewResultSchema.safeParse(data);
    if (!parsed.success) throw new AuditEvidenceRepositoryError();
    return parsed.data;
  }
}
