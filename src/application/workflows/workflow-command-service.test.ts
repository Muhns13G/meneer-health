import { describe, expect, it, vi } from "vitest";

import type { AuthorisationService } from "@/application/authorisation/authorisation-service";
import {
  WorkflowRepositoryError,
  type WorkflowCommandRepository,
} from "./workflow-command-repository";
import { resolveServerWorkflowActor, WorkflowCommandService } from "./workflow-command-service";

const tenantId = "10000000-0000-4000-8000-000000000002";
const subjectId = "20000000-0000-4000-8000-000000000002";
const workflowId = "a0000000-0000-4000-8000-000000000002";

const snapshot = {
  workflowId,
  tenantId,
  subjectId,
  version: 0,
  clinicalState: "not_started",
  paymentState: "not_started",
  supplyState: "not_started",
  hubReceiptState: "not_started",
  dispatchState: "not_ready",
  deliveryState: "not_started",
  cancellationState: "active",
  refundState: "not_required",
} as const;

const command = {
  contract: "workflow.transition",
  version: 1,
  requestId: "request_01",
  idempotencyKey: "retry_01",
  correlationId: "trace_01",
  actor: { type: "workforce", id: subjectId },
  subjectId,
  expectedVersion: 0,
  requestedAt: "2030-01-01T00:10:00Z",
  payload: { workflowId, transition: "supply.request" },
} as const;

const actor = resolveServerWorkflowActor({
  providerSessionId: "71000000-0000-4000-8000-000000000002",
  subjectId,
  tenantId,
  role: "operations",
  observedAt: new Date("2030-01-01T00:10:00Z"),
});

function setup(allowed = true) {
  const repository: WorkflowCommandRepository = {
    findWorkflow: vi.fn().mockResolvedValue(snapshot),
    executeTransition: vi.fn().mockResolvedValue({
      replayed: false,
      ...snapshot,
      subjectId: undefined,
      version: 1,
      supplyState: "pending",
    }),
  };
  const authorisation = {
    authoriseHuman: vi
      .fn()
      .mockResolvedValue(
        allowed
          ? { allowed: true, projection: "operations", policyVersion: "test" }
          : { allowed: false, reason: "ROLE_ACTION_DENIED", policyVersion: "test" },
      ),
  } as unknown as AuthorisationService;
  return {
    repository,
    authorisation,
    service: new WorkflowCommandService(repository, authorisation),
  };
}

describe("WorkflowCommandService", () => {
  it("authorises and commits a valid server-resolved transition", async () => {
    const { service, repository, authorisation } = setup();

    const outcome = await service.execute(actor, command);

    expect(outcome.ok).toBe(true);
    expect(authorisation.authoriseHuman).toHaveBeenCalledOnce();
    expect(repository.executeTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        workflowId,
        expectedVersion: 0,
        transition: "supply.request",
        requestFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it("rejects malformed commands before persistence", async () => {
    const { service, repository } = setup();

    const outcome = await service.execute(actor, { ...command, unexpectedStatus: "approved" });

    expect(outcome).toMatchObject({ ok: false, error: { error: { code: "VALIDATION_FAILED" } } });
    expect(repository.findWorkflow).not.toHaveBeenCalled();
  });

  it("rejects raw client-shaped actor context", async () => {
    const { service, repository } = setup();

    const outcome = await service.execute(
      { providerSessionId: actor.providerSessionId, subjectId, tenantId, role: "operations" },
      command,
    );

    expect(outcome).toMatchObject({ ok: false, error: { error: { code: "UNAUTHENTICATED" } } });
    expect(repository.findWorkflow).not.toHaveBeenCalled();
  });

  it("rejects an envelope actor that differs from the authenticated subject", async () => {
    const { service, repository } = setup();

    const outcome = await service.execute(actor, {
      ...command,
      actor: { ...command.actor, id: "20000000-0000-4000-8000-000000000001" },
    });

    expect(outcome).toMatchObject({ ok: false, error: { error: { code: "UNAUTHENTICATED" } } });
    expect(repository.findWorkflow).not.toHaveBeenCalled();
  });

  it("rejects an envelope subject that differs from the server-loaded workflow", async () => {
    const { service, repository } = setup();

    const outcome = await service.execute(actor, {
      ...command,
      subjectId: "20000000-0000-4000-8000-000000000001",
    });

    expect(outcome).toMatchObject({ ok: false, error: { error: { code: "FORBIDDEN" } } });
    expect(repository.executeTransition).not.toHaveBeenCalled();
  });

  it("uses server-observed time instead of the client request timestamp", async () => {
    const { service, authorisation, repository } = setup();

    await service.execute(actor, { ...command, requestedAt: "2040-01-01T00:10:00Z" });

    expect(authorisation.authoriseHuman).toHaveBeenCalledWith(
      actor.providerSessionId,
      actor.role,
      expect.objectContaining({ observedAt: new Date("2030-01-01T00:10:00Z") }),
    );
    expect(repository.executeTransition).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: new Date("2030-01-01T00:10:00Z") }),
    );
  });

  it("does not mutate when contextual authorisation denies the command", async () => {
    const { service, repository } = setup(false);

    const outcome = await service.execute(actor, command);

    expect(outcome).toMatchObject({ ok: false, error: { error: { code: "FORBIDDEN" } } });
    expect(repository.executeTransition).not.toHaveBeenCalled();
  });

  it("translates optimistic or idempotency conflicts without claiming success", async () => {
    const { service, repository } = setup();
    vi.mocked(repository.executeTransition).mockRejectedValue(
      new WorkflowRepositoryError("CONFLICT"),
    );

    const outcome = await service.execute(actor, command);

    expect(outcome).toMatchObject({ ok: false, error: { error: { code: "CONFLICT" } } });
  });

  it("does not expose unexpected provider failures", async () => {
    const { service, repository } = setup();
    vi.mocked(repository.executeTransition).mockRejectedValue(
      new Error("select * from sensitive_patient_table"),
    );

    const outcome = await service.execute(actor, command);

    expect(outcome).toEqual({
      ok: false,
      error: {
        contract: "error.response",
        version: 1,
        correlationId: "trace_01",
        error: {
          code: "INTERNAL_FAILURE",
          message: "The command could not be completed.",
          retry: "reconcile",
        },
      },
    });
  });
});
