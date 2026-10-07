import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  workforceContextSchema,
  type WorkforceContextRepository,
  type WorkforceProof,
} from "@/application/identity/workforce-session-service";
import type { ProviderIdentity } from "@/domain/access/identity";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";

export class SupabaseWorkforceContextRepository implements WorkforceContextRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async rpc(name: string, input: Record<string, unknown>) {
    const { data, error } = await this.client.rpc(name, input);
    if (error) {
      if (error.code === "42501" || error.code === "23505") throw new IdentityRejectedError();
      throw new IdentityUnavailableError();
    }
    return data;
  }
  private parameters(identity: ProviderIdentity, proof?: WorkforceProof) {
    return {
      p_provider_subject: identity.providerSubject,
      p_provider_session_id: identity.providerSessionId,
      p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
      p_session_id: proof?.sessionId ?? null,
      p_subject_id: proof?.context.subjectId ?? null,
      p_tenant_id: proof?.context.tenantId ?? null,
    };
  }
  async resolve(identity: ProviderIdentity, proof?: WorkforceProof) {
    const parsed = workforceContextSchema.safeParse(
      await this.rpc("resolve_workforce_context", this.parameters(identity, proof)),
    );
    if (!parsed.success) throw new IdentityUnavailableError();
    return parsed.data;
  }
  async reserveInvitation(
    identity: ProviderIdentity,
    proof: WorkforceProof,
    email: string,
    requestKey: string,
  ) {
    const id: unknown = await this.rpc("reserve_workforce_invitation", {
      ...this.parameters(identity, proof),
      p_target_email: email,
      p_request_key: requestKey,
    });
    if (typeof id !== "string") throw new IdentityUnavailableError();
    return id;
  }
  async finishInvitation(id: string, providerSubject: string | null) {
    await this.rpc("finish_workforce_invitation", {
      p_id: id,
      p_provider_subject: providerSubject,
    });
  }
}
