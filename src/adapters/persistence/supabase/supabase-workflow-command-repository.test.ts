import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { WorkflowRepositoryError } from "@/application/workflows/workflow-command-repository";
import { SupabaseWorkflowCommandRepository } from "./supabase-workflow-command-repository";

const workflowRow = {
  id: "a0000000-0000-4000-8000-000000000002",
  tenant_id: "10000000-0000-4000-8000-000000000002",
  subject_id: "20000000-0000-4000-8000-000000000002",
  version: 0,
  clinical_state: "not_started",
  payment_state: "not_started",
  supply_state: "not_started",
  hub_receipt_state: "not_started",
  dispatch_state: "not_ready",
  delivery_state: "not_started",
  cancellation_state: "active",
  refund_state: "not_required",
};

const result = {
  replayed: false,
  workflowId: workflowRow.id,
  tenantId: workflowRow.tenant_id,
  version: 1,
  clinicalState: "not_started",
  paymentState: "not_started",
  supplyState: "pending",
  hubReceiptState: "not_started",
  dispatchState: "not_ready",
  deliveryState: "not_started",
  cancellationState: "active",
  refundState: "not_required",
};

function queryClient(queryResult: { data: unknown; error: unknown }): SupabaseClient {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(queryResult),
  };
  return { from: vi.fn(() => query) } as unknown as SupabaseClient;
}

describe("SupabaseWorkflowCommandRepository", () => {
  it("maps the minimum server workflow projection", async () => {
    const repository = new SupabaseWorkflowCommandRepository(
      queryClient({ data: workflowRow, error: null }),
    );

    await expect(repository.findWorkflow(workflowRow.tenant_id, workflowRow.id)).resolves.toEqual({
      workflowId: workflowRow.id,
      tenantId: workflowRow.tenant_id,
      subjectId: workflowRow.subject_id,
      version: 0,
      clinicalState: "not_started",
      paymentState: "not_started",
      supplyState: "not_started",
      hubReceiptState: "not_started",
      dispatchState: "not_ready",
      deliveryState: "not_started",
      cancellationState: "active",
      refundState: "not_required",
    });
  });

  it("returns null without leaking whether another tenant owns the identifier", async () => {
    const repository = new SupabaseWorkflowCommandRepository(
      queryClient({ data: null, error: null }),
    );

    await expect(
      repository.findWorkflow(workflowRow.tenant_id, crypto.randomUUID()),
    ).resolves.toBeNull();
  });

  it("maps an atomic RPC result", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    const repository = new SupabaseWorkflowCommandRepository({ rpc } as unknown as SupabaseClient);

    await expect(
      repository.executeTransition({
        tenantId: workflowRow.tenant_id,
        workflowId: workflowRow.id,
        commandName: "workflow.transition",
        requestId: "request_01",
        idempotencyKey: "retry_01",
        requestFingerprint: "a".repeat(64),
        expectedVersion: 0,
        transition: "supply.request",
        occurredAt: new Date("2030-01-01T00:10:00Z"),
      }),
    ).resolves.toEqual(result);
    expect(rpc).toHaveBeenCalledWith(
      "execute_workflow_transition",
      expect.objectContaining({ p_expected_version: 0, p_transition: "supply.request" }),
    );
  });

  it.each([
    [{ code: "23505", message: "COMMAND_IDEMPOTENCY_CONFLICT" }, "CONFLICT"],
    [{ code: "40001", message: "COMMAND_RETRY_REQUIRED" }, "PENDING_RECONCILIATION"],
    [{ code: "P0002", message: "COMMAND_RESOURCE_NOT_FOUND" }, "NOT_FOUND"],
    [{ code: "XX000", message: "provider internals" }, "DEPENDENCY_UNAVAILABLE"],
  ] as const)("translates provider failures into stable failures", async (error, failure) => {
    const repository = new SupabaseWorkflowCommandRepository({
      rpc: vi.fn().mockResolvedValue({ data: null, error }),
    } as unknown as SupabaseClient);

    await expect(
      repository.executeTransition({
        tenantId: workflowRow.tenant_id,
        workflowId: workflowRow.id,
        commandName: "workflow.transition",
        requestId: "request_01",
        idempotencyKey: "retry_01",
        requestFingerprint: "a".repeat(64),
        expectedVersion: 0,
        transition: "supply.request",
        occurredAt: new Date("2030-01-01T00:10:00Z"),
      }),
    ).rejects.toEqual(new WorkflowRepositoryError(failure));
  });
});
