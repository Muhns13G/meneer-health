import "@tanstack/react-start/server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortalContext } from "@/application/identity/patient-portal-service";
import type { IntakeRepository } from "@/application/intake/medical-intake-service";
import { IntakeConflictError } from "@/application/intake/medical-intake-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
export class SupabaseIntakeRepository implements IntakeRepository {
  constructor(private readonly client: SupabaseClient) {}
  async call(name: string, args: Record<string, unknown>) {
    const { data, error } = await this.client.rpc(name, args);
    if (error) {
      if (error.code === "42501") throw new IdentityRejectedError();
      if (error.code === "40001" || error.code === "23505") throw new IntakeConflictError();
      throw new IdentityUnavailableError();
    }
    return data as unknown;
  }
  read(context: PortalContext, id: string | null) {
    return this.call("patient_intake_read", { p_context: context, p_intake_id: id });
  }
  exportView(context: PortalContext, id: string) {
    return this.call("patient_intake_export_view", { p_context: context, p_intake_id: id });
  }
  rightsRecord(context: PortalContext) {
    return this.call("patient_intake_rights_record", { p_context: context });
  }
  write(context: PortalContext, value: Record<string, unknown>) {
    return this.call("patient_intake_write", { p_context: context, p_command: value });
  }
  restrict(context: PortalContext, id: string, version: number, key: string) {
    return this.call("patient_intake_restrict", {
      p_context: context,
      p_intake_id: id,
      p_expected_version: version,
      p_request_key: key,
    });
  }
  history(context: PortalContext, id: string) {
    return this.call("patient_intake_history", { p_context: context, p_intake_id: id });
  }
  authoriseTransfer(
    context: PortalContext,
    command: { intakeId: string; snapshotId: string; publicationId: string; requestKey: string },
  ) {
    return this.call("authorise_medical_transfer", {
      p_context: context,
      p_intake_id: command.intakeId,
      p_snapshot_id: command.snapshotId,
      p_publication_id: command.publicationId,
      p_request_key: command.requestKey,
    });
  }
}
