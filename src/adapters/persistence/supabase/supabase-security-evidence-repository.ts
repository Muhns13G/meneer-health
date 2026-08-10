import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  SecurityEvidenceRepositoryError,
  type RecordSecurityEvidence,
  type SecurityEvidenceRepository,
  type SecurityEvidenceReceipt,
} from "@/application/observability/security-evidence-repository";

const receiptSchema = z
  .object({
    factId: z.uuid(),
    sequence: z.number().int().positive(),
    eventHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export class SupabaseSecurityEvidenceRepository implements SecurityEvidenceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async record(event: RecordSecurityEvidence): Promise<SecurityEvidenceReceipt> {
    const { data, error } = await this.client.rpc("record_security_audit_event", {
      p_tenant_id: event.tenantId,
      p_actor_type: event.actorType,
      p_actor_id: event.actorId,
      p_actor_role: event.actorRole,
      p_assurance: event.assurance,
      p_action: event.action,
      p_subject_id: event.subjectId ?? null,
      p_resource_type: event.resourceType,
      p_resource_id: event.resourceId,
      p_purpose: event.purpose,
      p_policy_version: event.policyVersion,
      p_reason_code: event.reasonCode,
      p_correlation_id: event.correlationId,
      p_occurred_at: event.occurredAt.toISOString(),
    });
    if (error) throw new SecurityEvidenceRepositoryError();
    const parsed = receiptSchema.safeParse(data);
    if (!parsed.success) throw new SecurityEvidenceRepositoryError();
    return parsed.data;
  }
}
