import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivationContext,
  PatientActivationRepository,
} from "@/application/identity/patient-activation-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import { activationViewSchema, type ActivationCommand } from "@/domain/identity/pilot-activation";

function parameters(context: ActivationContext) {
  return {
    p_invitation_id: context.invitationId,
    p_tenant_id: context.tenantId,
    p_provider_subject: context.providerSubject,
    p_provider_session_id: context.providerSessionId,
  };
}
export class SupabasePatientActivationRepository implements PatientActivationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async prepare(context: ActivationContext) {
    const data = await this.call("prepare_pilot_account", parameters(context));
    const parsed = activationViewSchema.safeParse(data);
    if (!parsed.success) throw new IdentityUnavailableError();
    return parsed.data;
  }

  async activate(context: ActivationContext, command: ActivationCommand): Promise<string> {
    const data = await this.call("activate_pilot_account", {
      ...parameters(context),
      p_command: command,
    });
    if (typeof data !== "string" || !/^[a-f0-9-]{36}$/.test(data))
      throw new IdentityUnavailableError();
    return data;
  }

  private async call(name: string, args: Record<string, unknown>): Promise<unknown> {
    try {
      const { data, error } = await this.client.rpc(name, args);
      if (error) {
        if (["22023", "42501"].includes(error.code)) throw new IdentityRejectedError();
        throw new IdentityUnavailableError();
      }
      return data;
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }
}
