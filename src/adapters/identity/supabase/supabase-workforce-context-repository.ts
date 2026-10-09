import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  workforceContextSchema,
  type WorkforceContextRepository,
  type WorkforceProof,
} from "@/application/identity/workforce-session-service";
import type { ProviderIdentity } from "@/domain/access/identity";
import { z } from "zod";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";

export class SupabaseWorkforceContextRepository implements WorkforceContextRepository {
  constructor(private readonly client: SupabaseClient) {}
  async resolveCodeTarget(email: string): Promise<string> {
    const target = await this.rpc("resolve_workforce_code_target", { p_email: email });
    if (!z.uuid().safeParse(target).success) throw new IdentityRejectedError();
    return target as string;
  }
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
    if (proof?.contextChoiceRequired && !proof.sessionId) {
      const context = (await this.listContexts(identity)).find(
        (item) =>
          item.subjectId === proof.context.subjectId &&
          item.tenantId === proof.context.tenantId &&
          item.role === proof.context.role &&
          item.purpose === proof.context.purpose,
      );
      if (!context) throw new IdentityRejectedError();
      return context;
    }
    const parsed = workforceContextSchema.safeParse(
      await this.rpc("resolve_workforce_context", this.parameters(identity, proof)),
    );
    if (!parsed.success) throw new IdentityUnavailableError();
    return parsed.data;
  }
  async listContexts(identity: ProviderIdentity) {
    const parsed = z
      .array(workforceContextSchema)
      .min(1)
      .max(32)
      .safeParse(
        await this.rpc("list_workforce_contexts", {
          p_provider_subject: identity.providerSubject,
          p_provider_session_id: identity.providerSessionId,
          p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
        }),
      );
    if (
      !parsed.success ||
      new Set(parsed.data.map((item) => `${item.tenantId}:${item.role}`)).size !==
        parsed.data.length ||
      parsed.data.some((item) => item.subjectId !== parsed.data[0]!.subjectId)
    )
      throw new IdentityUnavailableError();
    return parsed.data;
  }
  async selectContext(identity: ProviderIdentity, tenantId: string, role: string) {
    const parsed = workforceContextSchema.safeParse(
      await this.rpc("select_workforce_context", {
        p_provider_subject: identity.providerSubject,
        p_provider_session_id: identity.providerSessionId,
        p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
        p_tenant_id: tenantId,
        p_role: role,
      }),
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
