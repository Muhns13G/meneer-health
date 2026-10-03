import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PatientPortalRepository,
  PortalContext,
} from "@/application/identity/patient-portal-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import { portalAccountSchema } from "@/domain/identity/patient-portal";

export class SupabasePatientPortalRepository implements PatientPortalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async readOwnAccount(context: PortalContext) {
    try {
      const { data, error } = await this.client.rpc("read_patient_portal", {
        p_tenant_id: context.tenantId,
        p_subject_id: context.subjectId,
        p_session_id: context.sessionId,
        p_provider_subject: context.providerSubject,
        p_provider_session_id: context.providerSessionId,
        p_verified_email: context.verifiedEmail,
        p_purpose: context.purpose,
      });
      if (error) {
        if (error.code === "42501") throw new IdentityRejectedError();
        throw new IdentityUnavailableError();
      }
      const parsed = portalAccountSchema.safeParse(data);
      if (!parsed.success) throw new IdentityUnavailableError();
      return parsed.data;
    } catch (error) {
      if (error instanceof IdentityRejectedError) throw error;
      throw new IdentityUnavailableError();
    }
  }
}
