import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  workflowSnapshotSchema,
  workflowTransitionResultSchema,
  type WorkflowSnapshot,
  type WorkflowTransitionResult,
} from "../../../../contracts/workflows";
import {
  WorkflowRepositoryError,
  type ExecuteWorkflowTransition,
  type WorkflowCommandRepository,
  type WorkflowRepositoryFailure,
} from "@/application/workflows/workflow-command-repository";

type WorkflowRow = Readonly<{
  id: string;
  tenant_id: string;
  subject_id: string;
  version: number;
  clinical_state: string;
  payment_state: string;
  supply_state: string;
  hub_receipt_state: string;
  dispatch_state: string;
  delivery_state: string;
  cancellation_state: string;
  refund_state: string;
}>;

type ProviderError = Readonly<{ code?: string; message?: string }>;

function providerFailure(error: ProviderError): WorkflowRepositoryFailure {
  if (error.message?.includes("COMMAND_RESOURCE_NOT_FOUND") || error.code === "P0002") {
    return "NOT_FOUND";
  }
  if (error.message?.includes("COMMAND_RETRY_REQUIRED")) return "PENDING_RECONCILIATION";
  if (
    ["22023", "23505", "23514", "40001"].includes(error.code ?? "") ||
    error.message?.startsWith("COMMAND_")
  ) {
    return "CONFLICT";
  }
  return "DEPENDENCY_UNAVAILABLE";
}

function mapWorkflow(row: WorkflowRow): WorkflowSnapshot {
  return workflowSnapshotSchema.parse({
    workflowId: row.id,
    tenantId: row.tenant_id,
    subjectId: row.subject_id,
    version: row.version,
    clinicalState: row.clinical_state,
    paymentState: row.payment_state,
    supplyState: row.supply_state,
    hubReceiptState: row.hub_receipt_state,
    dispatchState: row.dispatch_state,
    deliveryState: row.delivery_state,
    cancellationState: row.cancellation_state,
    refundState: row.refund_state,
  });
}

export class SupabaseWorkflowCommandRepository implements WorkflowCommandRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findWorkflow(tenantId: string, workflowId: string): Promise<WorkflowSnapshot | null> {
    const { data, error } = await this.client
      .from("workflow_instances")
      .select(
        "id, tenant_id, subject_id, version, clinical_state, payment_state, supply_state, hub_receipt_state, dispatch_state, delivery_state, cancellation_state, refund_state",
      )
      .eq("tenant_id", tenantId)
      .eq("id", workflowId)
      .maybeSingle<WorkflowRow>();

    if (error) throw new WorkflowRepositoryError(providerFailure(error));
    return data ? mapWorkflow(data) : null;
  }

  async executeTransition(command: ExecuteWorkflowTransition): Promise<WorkflowTransitionResult> {
    const { data, error } = await this.client.rpc("execute_audited_workflow_transition", {
      p_tenant_id: command.tenantId,
      p_workflow_id: command.workflowId,
      p_command_name: command.commandName,
      p_request_id: command.requestId,
      p_idempotency_key: command.idempotencyKey,
      p_request_fingerprint: command.requestFingerprint,
      p_expected_version: command.expectedVersion,
      p_transition: command.transition,
      p_occurred_at: command.occurredAt.toISOString(),
      p_actor_type: command.actorType,
      p_actor_subject_id: command.actorSubjectId,
      p_actor_role: command.actorRole,
      p_assurance: command.assurance,
      p_subject_id: command.subjectId,
      p_purpose: command.purpose,
      p_policy_version: command.policyVersion,
      p_correlation_id: command.correlationId,
      p_causation_id: command.causationId,
    });

    if (error) throw new WorkflowRepositoryError(providerFailure(error));
    const parsed = workflowTransitionResultSchema.safeParse(data);
    if (!parsed.success) throw new WorkflowRepositoryError("DEPENDENCY_UNAVAILABLE");
    return parsed.data;
  }
}
