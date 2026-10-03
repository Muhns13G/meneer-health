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
