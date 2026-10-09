import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import type {
  MobileOrphanRetirementCommand,
  MobileOrphanRetirementRepository,
} from "@/application/identity/mobile-orphan-retirement-service";
import { mobileOrphanRetirementCommandSchema } from "@/application/identity/mobile-orphan-retirement-service";
import {
  mobileInvitationCommandSchema,
  mobileInvitationResultSchema,
  type MobileInvitationCommand,
} from "@/application/identity/mobile-invitation";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";

/** Native reservation adapter; still private until complete retirement/copy/reissue acceptance.
 * Every RPC rechecks the same genuine session and assigned operations context in SQL.
 */
export class SupabaseMobileOrphanRetirementRepository implements MobileOrphanRetirementRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly identity: ProviderIdentity,
    private readonly proof: WorkforceProof,
  ) {}
  private authority() {
    if (
      !this.proof.sessionId ||
      ![
        this.proof.sessionId,
        this.identity.providerSubject,
        this.identity.providerSessionId,
        this.proof.context.subjectId,
        this.proof.context.tenantId,
      ].every((id) => z.uuid().safeParse(id).success) ||
      this.identity.assurance !== "aal2" ||
      this.identity.verifiedContact.kind !== "email" ||
      !z.email().safeParse(this.identity.verifiedContact.value.trim()).success ||
      !(this.identity.expiresAt.getTime() > Date.now()) ||
      !(this.proof.providerSession.expiresAt.getTime() > Date.now()) ||
      this.identity.providerSessionId !== this.proof.providerSessionId ||
      this.proof.context.role !== "operations" ||
      this.proof.context.purpose !== "operations"
    )
      throw new IdentityRejectedError();
    return {
      p_provider_subject: this.identity.providerSubject,
      p_provider_session_id: this.identity.providerSessionId,
      p_verified_email: this.identity.verifiedContact.value.trim().toLowerCase(),
      p_session_id: this.proof.sessionId,
      p_subject_id: this.proof.context.subjectId,
      p_tenant_id: this.proof.context.tenantId,
    };
  }
  private async rpc(name: string, fields: Record<string, unknown>) {
    const { data, error } = await this.client.rpc(name, { ...this.authority(), ...fields });
    if (error?.code === "42501") throw new IdentityRejectedError();
    if (error) throw new IdentityUnavailableError();
    return data;
  }
  async reserve(command: MobileOrphanRetirementCommand) {
    if (
      !mobileOrphanRetirementCommandSchema.safeParse(command).success ||
      command.tenantId !== this.proof.context.tenantId
    )
      throw new IdentityRejectedError();
    return this.rpc("reserve_mobile_orphan_retirement", {
      p_email_invitation_id: command.emailInvitationId,
      p_request_key: command.requestKey,
    });
  }
  async markUncertain(operationId: string) {
    if (!z.uuid().safeParse(operationId).success) throw new IdentityRejectedError();
    const state = await this.rpc("advance_mobile_orphan_retirement", {
      p_operation_id: operationId,
      p_action: "uncertain",
    });
    if (state !== "uncertain") throw new IdentityUnavailableError();
  }
  async prepareReviewedReissue(
    operationId: string,
    reviewReference: string,
    command: MobileInvitationCommand,
  ) {
    if (
      !z.uuid().safeParse(operationId).success ||
      !z.uuid().safeParse(reviewReference).success ||
      command.action !== "create" ||
      !mobileInvitationCommandSchema.safeParse(command).success
    )
      throw new IdentityRejectedError();
    const result = mobileInvitationResultSchema.safeParse(
      await this.rpc("prepare_mobile_orphan_reissue", {
        p_operation_id: operationId,
        p_review_reference: reviewReference,
        p_command: command,
      }),
    );
    if (!result.success || result.data.action !== "create" || result.data.status !== "draft")
      throw new IdentityUnavailableError();
    return result.data;
  }
  async markProtected(operationId: string) {
    if (!z.uuid().safeParse(operationId).success) throw new IdentityRejectedError();
    const state = await this.rpc("advance_mobile_orphan_retirement", {
      p_operation_id: operationId,
      p_action: "held",
    });
    if (state !== "held") throw new IdentityUnavailableError();
  }
  async finishProviderAbsence(
    operationId: string,
    providerSubjectId: string,
  ): Promise<"copies_pending"> {
    if (!z.uuid().safeParse(operationId).success || !z.uuid().safeParse(providerSubjectId).success)
      throw new IdentityRejectedError();
    const state = await this.rpc("advance_mobile_orphan_retirement", {
      p_operation_id: operationId,
      p_action: "provider_absent",
      p_target_provider_subject: providerSubjectId,
    });
    if (state !== "copies_pending") throw new IdentityUnavailableError();
    return state;
  }
}
