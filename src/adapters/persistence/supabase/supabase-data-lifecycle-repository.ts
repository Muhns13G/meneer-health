import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { dataSubjectRequestResultSchema } from "../../../../contracts/lifecycle";
import {
  DataLifecycleRepositoryError,
  type DataLifecycleRepository,
  type DataSubjectRequestContext,
} from "@/application/lifecycle/data-lifecycle-repository";

export class SupabaseDataLifecycleRepository implements DataLifecycleRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async invoke(
    functionName: string,
    context: DataSubjectRequestContext,
    parameters: Record<string, unknown>,
  ) {
    const { data, error } = await this.client.rpc(functionName, {
      p_tenant_id: context.tenantId,
      p_subject_id: context.subjectId,
      p_actor_subject_id: context.actorSubjectId,
      p_actor_role: context.actorRole,
      p_assurance: context.assurance,
      p_purpose: context.purpose,
      p_correlation_id: context.correlationId,
      p_occurred_at: context.occurredAt.toISOString(),
      ...parameters,
    });
    if (error) throw new DataLifecycleRepositoryError();
    const parsed = dataSubjectRequestResultSchema.safeParse(data);
    if (!parsed.success) throw new DataLifecycleRepositoryError();
    return parsed.data;
  }

  openRequest(
    context: DataSubjectRequestContext,
    requestType: "access_export" | "erasure",
    idempotencyKey: string,
  ) {
    return this.invoke("open_data_subject_request", context, {
      p_request_type: requestType,
      p_idempotency_key: idempotencyKey,
    });
  }

  completeExport(context: DataSubjectRequestContext, requestId: string) {
    return this.invoke("complete_data_subject_export", context, { p_request_id: requestId });
  }

  executeErasure(context: DataSubjectRequestContext, requestId: string) {
    return this.invoke("execute_data_subject_erasure", context, { p_request_id: requestId });
  }

  reconcileDestination(
    context: DataSubjectRequestContext,
    requestId: string,
    destination: "identity" | "storage" | "recovery_backup",
  ) {
    return this.invoke("reconcile_data_subject_destination", context, {
      p_request_id: requestId,
      p_destination: destination,
    });
  }
}
