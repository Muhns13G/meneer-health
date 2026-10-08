import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import {
  mobileDeliveryClaimSchema,
  mobileDeliveryRequestSchema,
  type MobileDeliveryRequest,
  type MobileSendOutcome,
} from "@/application/identity/mobile-invitation-delivery";
import type { MobileDeliveryConfiguration } from "@/server/identity/mobile-invitation-delivery-config";
import type { MobileDeliveryRepository } from "@/server/identity/mobile-invitation-delivery-service";
import { SupabaseMobileInvitationRepository } from "./supabase-mobile-invitation-repository";

export class SupabaseMobileDeliveryRepository
  extends SupabaseMobileInvitationRepository
  implements MobileDeliveryRepository
{
  constructor(
    client: SupabaseClient,
    private readonly identity: ProviderIdentity,
    private readonly proof: WorkforceProof,
  ) {
    super(client);
  }
  async prepare(
    request: MobileDeliveryRequest,
    digest: string,
    configuration: MobileDeliveryConfiguration,
  ) {
    const input = mobileDeliveryRequestSchema.parse(request);
    if (
      configuration.MOBILE_INVITATIONS_TENANT_ID !== this.proof.context.tenantId ||
      !/^[a-f0-9]{64}$/.test(digest)
    )
      throw new IdentityRejectedError();
    const data = await this.rpc("prepare_mobile_invitation_delivery", {
      ...this.authority(this.identity, this.proof),
      p_invitation_id: input.invitationId,
      p_expected_version: input.expectedVersion,
      p_reservation_request_key: input.reservationRequestKey,
      p_token_digest: digest,
      p_profile_id: configuration.TELNYX_MESSAGING_PROFILE_ID,
      p_from_phone: configuration.TELNYX_FROM_NUMBER,
    });
    if (data === null) return null;
    const parsed = mobileDeliveryClaimSchema.safeParse(data);
    if (!parsed.success) throw new IdentityUnavailableError();
    return parsed.data;
  }
  async finish(attemptId: string, outcome: MobileSendOutcome) {
    const data = await this.rpc("finish_mobile_invitation_delivery", {
      ...this.authority(this.identity, this.proof),
      p_attempt_id: attemptId,
      p_outcome: outcome.outcome,
      p_provider_message_id: outcome.providerMessageId,
    });
    if (data !== true) throw new IdentityUnavailableError();
  }
}
