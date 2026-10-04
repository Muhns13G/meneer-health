import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import { SupabaseQueueRepository } from "./supabase-queue-repository";
import { QueueConflictError, QueueReadinessError } from "@/application/operations/queue-command";
const id = "a1000000-0000-4000-8000-000000000001";
const identity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: id,
  providerSessionId: id,
  assurance: "aal2",
  authenticatedAt: new Date(),
  expiresAt: new Date(),
  verifiedContact: { kind: "email", value: "Staff@Example.invalid", verifiedAt: new Date() },
};
const proof: WorkforceProof = {
  context: { subjectId: id, tenantId: id, role: "operations", purpose: "operations" },
  providerSessionId: id,
  sessionId: id,
  providerSession: { accessToken: "synthetic", refreshToken: "synthetic", expiresAt: new Date() },
};
describe("minimum server queue repository", () => {
  it("records only a coded actor-scoped denial and validates its opaque receipt", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: id, error: null });
    const repository = new SupabaseQueueRepository({ rpc } as unknown as SupabaseClient);
    expect(await repository.recordDenial(identity, proof, "QUEUE_REJECTED")).toBe(id);
    expect(rpc).toHaveBeenCalledWith("record_operations_denial", {
      p_provider_subject: id,
      p_provider_session_id: id,
      p_verified_email: "staff@example.invalid",
      p_session_id: id,
      p_subject_id: id,
      p_tenant_id: id,
      p_reason_code: "QUEUE_REJECTED",
    });
    rpc.mockResolvedValue({ data: { id, privateDetails: "forbidden" }, error: null });
    await expect(repository.recordDenial(identity, proof, "QUEUE_REJECTED")).rejects.toThrow(
      IdentityUnavailableError,
    );
    rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(repository.recordDenial(identity, proof, "QUEUE_REJECTED")).rejects.toThrow(
      IdentityRejectedError,
    );
  });
  it("binds independent evidence verification to live AAL2 scope and validates opaque results", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: id, error: null });
    const repo = new SupabaseQueueRepository({ rpc } as unknown as SupabaseClient);
    const command = {
      caseId: id,
      attemptId: id,
      kind: "acknowledged" as const,
      externalReference: id,
      sourceReference: id,
      observedAt: new Date().toISOString(),
      requestKey: id,
    };
    expect(await repo.verifyEvidence(identity, proof, command)).toBe(id);
    expect(rpc).toHaveBeenCalledWith(
      "verify_operations_handoff_evidence",
      expect.objectContaining({
        p_subject_id: id,
        p_session_id: id,
        p_verified_email: "staff@example.invalid",
        p_command: command,
      }),
    );
    await expect(
      repo.verifyEvidence({ ...identity, assurance: "aal1" }, proof, command),
    ).rejects.toThrow(IdentityRejectedError);
    rpc.mockResolvedValueOnce({ data: { evidenceId: id, protocol: "forbidden" }, error: null });
    await expect(repo.verifyEvidence(identity, proof, command)).rejects.toThrow(
      IdentityUnavailableError,
    );
    rpc.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    await expect(repo.verifyEvidence(identity, proof, command)).rejects.toThrow(QueueConflictError);
  });
  it("binds hand-off RPC to live scope and rejects expanded or wrong-case receipts", async () => {
    const command = {
      action: "prepare" as const,
      caseId: id,
      expectedVersion: 1,
      requestKey: id,
      authorisationId: id,
    };
    const result = {
      caseId: id,
      version: 2,
      state: "ready_for_handoff",
      attemptId: id,
      attemptState: "prepared",
    };
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    const repo = new SupabaseQueueRepository({ rpc } as unknown as SupabaseClient);
    expect(await repo.handoff(identity, proof, command)).toEqual(result);
    expect(rpc).toHaveBeenCalledWith(
      "command_operations_handoff",
      expect.objectContaining({ p_command: command, p_subject_id: id, p_session_id: id }),
    );
    rpc.mockResolvedValue({
      data: { ...result, externalUrl: "https://private.invalid" },
      error: null,
    });
    await expect(repo.handoff(identity, proof, command)).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );
    rpc.mockResolvedValue({
      data: { ...result, caseId: "a1000000-0000-4000-8000-000000000002" },
      error: null,
    });
    await expect(repo.handoff(identity, proof, command)).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );
    rpc.mockClear();
    await expect(
      repo.handoff({ ...identity, assurance: "aal1" }, proof, command),
    ).rejects.toBeInstanceOf(IdentityRejectedError);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    ["40001", QueueConflictError],
    ["55000", QueueReadinessError],
    ["42501", IdentityRejectedError],
    ["08006", IdentityUnavailableError],
  ])("maps command failure %s without exposing SQL", async (code, errorType) => {
    const rpc = vi.fn().mockResolvedValue({ error: { code }, data: null });
    const repo = new SupabaseQueueRepository({ rpc } as unknown as SupabaseClient);
    await expect(
      repo.command(identity, proof, {
        action: "claim",
        caseId: id,
        expectedVersion: 1,
        requestKey: id,
      }),
    ).rejects.toBeInstanceOf(errorType);
    expect(rpc).toHaveBeenCalledWith(
      "command_operations_queue",
      expect.objectContaining({
        p_session_id: id,
        p_command: { action: "claim", caseId: id, expectedVersion: 1, requestKey: id },
      }),
    );
  });
  it("passes verified scope and rejects an expanded response", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { cases: [], nextCursor: null }, error: null });
    const repo = new SupabaseQueueRepository({ rpc } as unknown as SupabaseClient);
    expect(await repo.list(identity, proof, { state: null, cursor: null })).toEqual({
      cases: [],
      nextCursor: null,
    });
    expect(rpc).toHaveBeenCalledWith(
      "read_operations_queue",
      expect.objectContaining({
        p_verified_email: "staff@example.invalid",
        p_session_id: id,
        p_subject_id: id,
        p_tenant_id: id,
      }),
    );
    rpc.mockResolvedValue({
      data: { cases: [], nextCursor: null, rawEmail: "private@example.invalid" },
      error: null,
    });
    await expect(repo.list(identity, proof, { state: null, cursor: null })).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );
  });
  it.each(["42501", "08006"])("handles %s without leaking database errors", async (code) => {
    const repo = new SupabaseQueueRepository({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code } }),
    } as unknown as SupabaseClient);
    await expect(repo.detail(identity, proof, id)).rejects.toBeInstanceOf(
      code === "42501" ? IdentityRejectedError : IdentityUnavailableError,
    );
  });
  it("never calls the RPC with pending MFA", async () => {
    const rpc = vi.fn();
    const repo = new SupabaseQueueRepository({ rpc } as unknown as SupabaseClient);
    await expect(
      repo.list({ ...identity, assurance: "aal1" }, proof, { state: null, cursor: null }),
    ).rejects.toBeInstanceOf(IdentityRejectedError);
    expect(rpc).not.toHaveBeenCalled();
  });
});
