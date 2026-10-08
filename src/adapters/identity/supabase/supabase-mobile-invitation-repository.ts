import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import type { ProviderIdentity } from "@/domain/access/identity";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import {
  mobileInvitationCommandSchema,
  mobileInvitationPageSchema,
  mobileInvitationResultSchema,
  MobileInvitationConflictError,
  MobileInvitationBudgetError,
  type MobileInvitationCommand,
} from "@/application/identity/mobile-invitation";

export class SupabaseMobileInvitationRepository {
  constructor(private readonly client: SupabaseClient) {}
  private authority(identity: ProviderIdentity, proof: WorkforceProof) {
    if (
      !proof.sessionId ||
      identity.assurance !== "aal2" ||
      proof.context.role !== "operations" ||
      proof.context.purpose !== "operations" ||
      identity.providerSessionId !== proof.providerSessionId
    )
      throw new IdentityRejectedError();
    return {
      p_provider_subject: identity.providerSubject,
      p_provider_session_id: identity.providerSessionId,
      p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
      p_session_id: proof.sessionId,
      p_subject_id: proof.context.subjectId,
      p_tenant_id: proof.context.tenantId,
    };
  }
  private async rpc(name: string, parameters: Record<string, unknown>) {
    const { data, error } = await this.client.rpc(name, parameters);
    if (error?.code === "42501") throw new IdentityRejectedError();
    if (["PT409", "23505"].includes(error?.code ?? "")) throw new MobileInvitationConflictError();
    if (error?.code === "PT429") throw new MobileInvitationBudgetError();
    if (error) throw new IdentityUnavailableError();
    return data;
  }
  async read(identity: ProviderIdentity, proof: WorkforceProof, afterId: string | null) {
    if (afterId !== null && !z.uuid().safeParse(afterId).success) throw new IdentityRejectedError();
    const parsed = mobileInvitationPageSchema.safeParse(
      await this.rpc("read_mobile_invitation_register", {
        ...this.authority(identity, proof),
        p_after_id: afterId,
      }),
    );
    if (!parsed.success) throw new IdentityUnavailableError();
    return parsed.data;
  }
  async command(
    identity: ProviderIdentity,
    proof: WorkforceProof,
    command: MobileInvitationCommand,
  ) {
    const input = mobileInvitationCommandSchema.parse(command);
    const parsed = mobileInvitationResultSchema.safeParse(
      await this.rpc("command_mobile_invitation_register", {
        ...this.authority(identity, proof),
        p_command: input,
      }),
    );
    if (
      !parsed.success ||
      parsed.data.action !== input.action ||
      (input.action !== "create" && parsed.data.invitationId !== input.invitationId)
    )
      throw new IdentityUnavailableError();
    return parsed.data;
  }
}
