import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PatientRightsRepository } from "@/application/identity/patient-rights-service";
import type { PortalContext } from "@/application/identity/patient-portal-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import {
  PatientRightsConflictError,
  patientRightsResultSchema,
  type PatientRightsCommand,
} from "@/domain/identity/patient-rights";

export class SupabasePatientRightsRepository implements PatientRightsRepository {
  constructor(private readonly client: SupabaseClient) {}
  async execute(context: PortalContext, command: PatientRightsCommand) {
    try {
      const { data, error } = await this.client.rpc("execute_patient_account_command", {
        p_tenant_id: context.tenantId,
        p_subject_id: context.subjectId,
        p_session_id: context.sessionId,
        p_provider_subject: context.providerSubject,
        p_provider_session_id: context.providerSessionId,
        p_verified_email: context.verifiedEmail,
        p_purpose: context.purpose,
        p_command: command,
      });
      if (error?.code === "42501") throw new IdentityRejectedError();
      if (error?.code === "40001") throw new PatientRightsConflictError();
      if (error) throw new IdentityUnavailableError();
      const parsed = patientRightsResultSchema.safeParse(data);
      if (!parsed.success) throw new IdentityUnavailableError();
      return parsed.data;
    } catch (error) {
      if (error instanceof IdentityRejectedError || error instanceof PatientRightsConflictError)
        throw error;
      throw new IdentityUnavailableError();
    }
  }
}
