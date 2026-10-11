import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { PilotEmailInvitationRequest } from "@/application/identity/pilot-email-invitation";
import type { PilotEmailInvitationRepository } from "@/server/identity/pilot-email-invitation-service";
import { IdentityUnavailableError } from "@/application/identity/managed-identity-provider";
import { SupabaseMobileInvitationRepository } from "./supabase-mobile-invitation-repository";
import type { SupabaseClient } from "@supabase/supabase-js";

export class SupabasePilotEmailInvitationRepository
  extends SupabaseMobileInvitationRepository
  implements PilotEmailInvitationRepository
{
  constructor(
    client: SupabaseClient,
    private readonly identity: ProviderIdentity,
    private readonly proof: WorkforceProof,
  ) {
    super(client);
  }
  async prepare(input: PilotEmailInvitationRequest, digest: string) {
    const data = await this.rpc("prepare_pilot_email_invitation", {
      ...this.authority(this.identity, this.proof),
      p_invitation_id: input.invitationId,
      p_expected_version: input.expectedVersion,
      p_request_key: input.requestKey,
      p_email: input.email,
      p_token_digest: digest,
    });
    if (data === null) return null;
    const parsed = z
      .object({ attemptId: z.uuid(), dispatchUntil: z.iso.datetime({ offset: true }) })
      .strict()
      .safeParse(data);
    if (!parsed.success) throw new IdentityUnavailableError();
    return parsed.data;
  }
  async finish(attemptId: string, outcome: "accepted" | "failed" | "uncertain") {
    const data = await this.rpc("finish_pilot_email_invitation", {
      ...this.authority(this.identity, this.proof),
      p_attempt_id: attemptId,
      p_outcome: outcome,
    });
    if (data !== true) throw new IdentityUnavailableError();
  }
}
