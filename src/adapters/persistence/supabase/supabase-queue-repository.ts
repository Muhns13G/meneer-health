import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import {
  handoffEvidenceCommandSchema,
  type HandoffEvidenceCommand,
} from "@/application/operations/handoff-boundary";
import { z } from "zod";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import {
  queuePageSchema,
  queueDetailSchema,
  type QueueFilter,
} from "@/application/operations/queue-projection";
import {
  queueCommandSchema,
  queueCommandResultSchema,
  QueueConflictError,
  QueueReadinessError,
  type QueueCommand,
} from "@/application/operations/queue-command";
import {
  handoffCommandSchema,
  handoffResultSchema,
  type HandoffCommand,
} from "@/application/operations/handoff-command";

export class SupabaseQueueRepository {
  constructor(private readonly client: SupabaseClient) {}
  async verifyEvidence(
    identity: ProviderIdentity,
    proof: WorkforceProof,
    command: HandoffEvidenceCommand,
  ) {
    if (!proof.sessionId || identity.assurance !== "aal2") throw new IdentityRejectedError();
    const { data, error } = await this.client.rpc("verify_operations_handoff_evidence", {
      ...this.authority(identity, proof),
      p_command: handoffEvidenceCommandSchema.parse(command),
    });
    return this.referenceResult(data, error);
  }
  async approveDestination(
    identity: ProviderIdentity,
    proof: WorkforceProof,
    input: {
      destinationId: string;
      destinationVersion: number;
      digest: string;
      approvalReference: string;
      requestKey: string;
    },
  ) {
    if (!proof.sessionId || identity.assurance !== "aal2") throw new IdentityRejectedError();
    const { data, error } = await this.client.rpc("approve_portal_handoff_destination", {
      ...this.authority(identity, proof),
      p_destination_id: input.destinationId,
      p_version: input.destinationVersion,
      p_digest: input.digest,
      p_approval_reference: input.approvalReference,
      p_request_key: input.requestKey,
    });
    return this.referenceResult(data, error);
  }
  private authority(identity: ProviderIdentity, proof: WorkforceProof) {
    return {
      p_provider_subject: identity.providerSubject,
      p_provider_session_id: identity.providerSessionId,
      p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
      p_session_id: proof.sessionId,
      p_subject_id: proof.context.subjectId,
      p_tenant_id: proof.context.tenantId,
    };
  }
  private referenceResult(data: unknown, error: { code?: string } | null) {
    if (error?.code === "42501") throw new IdentityRejectedError();
    if (error?.code === "40001" || error?.code === "23505") throw new QueueConflictError();
    if (error?.code === "55000") throw new QueueReadinessError();
    if (error || !z.uuid().safeParse(data).success) throw new IdentityUnavailableError();
    return data as string;
  }
  async handoff(identity: ProviderIdentity, proof: WorkforceProof, command: HandoffCommand) {
    if (!proof.sessionId || identity.assurance !== "aal2") throw new IdentityRejectedError();
    const input = handoffCommandSchema.parse(command);
    const { data, error } = await this.client.rpc("command_operations_handoff", {
      p_provider_subject: identity.providerSubject,
      p_provider_session_id: identity.providerSessionId,
      p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
      p_session_id: proof.sessionId,
      p_subject_id: proof.context.subjectId,
      p_tenant_id: proof.context.tenantId,
      p_command: input,
    });
    if (error?.code === "42501") throw new IdentityRejectedError();
    if (error?.code === "40001") throw new QueueConflictError();
    if (error?.code === "55000") throw new QueueReadinessError();
    if (error) throw new IdentityUnavailableError();
    const parsed = handoffResultSchema.safeParse(data);
    if (!parsed.success || parsed.data.caseId !== input.caseId)
      throw new IdentityUnavailableError();
    return parsed.data;
  }
  async command(identity: ProviderIdentity, proof: WorkforceProof, command: QueueCommand) {
    if (!proof.sessionId || identity.assurance !== "aal2") throw new IdentityRejectedError();
    const input = queueCommandSchema.parse(command);
    const { data, error } = await this.client.rpc("command_operations_queue", {
      p_provider_subject: identity.providerSubject,
      p_provider_session_id: identity.providerSessionId,
      p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
      p_session_id: proof.sessionId,
      p_subject_id: proof.context.subjectId,
      p_tenant_id: proof.context.tenantId,
      p_command: input,
    });
    if (error?.code === "42501") throw new IdentityRejectedError();
    if (error?.code === "40001") throw new QueueConflictError();
    if (error?.code === "55000") throw new QueueReadinessError();
    if (error) throw new IdentityUnavailableError();
    const parsed = queueCommandResultSchema.safeParse(data);
    if (!parsed.success || parsed.data.caseId !== input.caseId)
      throw new IdentityUnavailableError();
    return parsed.data;
  }
  private async read(
    identity: ProviderIdentity,
    proof: WorkforceProof,
    input: Record<string, unknown>,
  ) {
    if (!proof.sessionId || identity.assurance !== "aal2") throw new IdentityRejectedError();
    const { data, error } = await this.client.rpc("read_operations_queue", {
      p_provider_subject: identity.providerSubject,
      p_provider_session_id: identity.providerSessionId,
      p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
      p_session_id: proof.sessionId,
      p_subject_id: proof.context.subjectId,
      p_tenant_id: proof.context.tenantId,
      ...input,
    });
    if (error?.code === "42501") throw new IdentityRejectedError();
    if (error) throw new IdentityUnavailableError();
    return data as unknown;
  }
  async list(identity: ProviderIdentity, proof: WorkforceProof, filter: QueueFilter) {
    const value = queuePageSchema.safeParse(
      await this.read(identity, proof, {
        p_state: filter.state,
        p_after_created_at: filter.cursor?.createdAt ?? null,
        p_after_id: filter.cursor?.id ?? null,
      }),
    );
    if (!value.success) throw new IdentityUnavailableError();
    return value.data;
  }
  async detail(identity: ProviderIdentity, proof: WorkforceProof, caseId: string) {
    const value = queueDetailSchema.safeParse(
      await this.read(identity, proof, { p_case_id: caseId }),
    );
    if (!value.success) throw new IdentityUnavailableError();
    return value.data;
  }
}
