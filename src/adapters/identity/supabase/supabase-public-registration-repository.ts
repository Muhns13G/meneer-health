import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { PublicRegistrationRepository } from "@/application/identity/public-registration-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
export class SupabasePublicRegistrationRepository implements PublicRegistrationRepository {
  constructor(private readonly client: SupabaseClient) {}
  async available(tenantId: string) {
    return z
      .boolean()
      .parse(await this.call("public_registration_available", { p_tenant_id: tenantId }));
  }
  async reserveSend(tenantId: string, digest: string) {
    return z.boolean().parse(
      await this.call("reserve_public_registration_send", {
        p_tenant_id: tenantId,
        p_contact_digest: digest,
      }),
    );
  }
  async prepare(tenantId: string, providerSubject: string, providerSessionId: string) {
    return z
      .object({ alreadyActive: z.boolean(), invitationId: z.uuid().nullable() })
      .strict()
      .parse(
        await this.call("prepare_public_registration", {
          p_tenant_id: tenantId,
          p_provider_subject: providerSubject,
          p_provider_session_id: providerSessionId,
        }),
      );
  }
  private async call(name: string, args: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) {
      if (["42501", "22023"].includes(error.code)) throw new IdentityRejectedError();
      throw new IdentityUnavailableError();
    }
    return data;
  }
}
