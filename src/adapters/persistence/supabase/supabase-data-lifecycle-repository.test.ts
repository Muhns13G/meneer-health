import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { DataLifecycleRepositoryError } from "@/application/lifecycle/data-lifecycle-repository";
import { SupabaseDataLifecycleRepository } from "./supabase-data-lifecycle-repository";

const context = {
  tenantId: "10000000-0000-4000-8000-000000000002",
  subjectId: "20000000-0000-4000-8000-000000000002",
  actorSubjectId: "20000000-0000-4000-8000-000000000003",
  actorRole: "auditor",
  assurance: "aal2",
  purpose: "privacy_review",
  correlationId: "lifecycle_adapter_01",
  occurredAt: new Date("2030-01-01T01:00:00Z"),
} as const;

const result = {
  requestId: "b0000000-0000-4000-8000-000000000013",
  status: "verified",
  expiresAt: null,
  reconciliationPending: [],
} as const;

describe("SupabaseDataLifecycleRepository", () => {
  it("maps lifecycle operations to the narrow server RPCs", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    const repository = new SupabaseDataLifecycleRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.openRequest(context, "erasure", "erasure-request-01")).resolves.toEqual(
      result,
    );
    expect(rpc).toHaveBeenCalledWith(
      "open_data_subject_request",
      expect.objectContaining({
        p_actor_role: "auditor",
        p_assurance: "aal2",
        p_request_type: "erasure",
      }),
    );
  });

  it("fails closed for provider errors and malformed responses", async () => {
    const failed = new SupabaseDataLifecycleRepository({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "42501" } }),
    } as unknown as SupabaseClient);
    const malformed = new SupabaseDataLifecycleRepository({
      rpc: vi.fn().mockResolvedValue({ data: { patient: "private" }, error: null }),
    } as unknown as SupabaseClient);

    await expect(failed.openRequest(context, "erasure", "request-01")).rejects.toBeInstanceOf(
      DataLifecycleRepositoryError,
    );
    await expect(malformed.openRequest(context, "erasure", "request-01")).rejects.toBeInstanceOf(
      DataLifecycleRepositoryError,
    );
  });
});
