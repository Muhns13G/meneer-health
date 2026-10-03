import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import {
  queuePageSchema,
  queueDetailSchema,
  type QueueFilter,
} from "@/application/operations/queue-projection";

export class SupabaseQueueRepository {
  constructor(private readonly client: SupabaseClient) {}
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
