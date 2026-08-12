import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { AuditEvidenceRepositoryError } from "@/application/audit/audit-evidence-repository";
import { SupabaseAuditEvidenceRepository } from "./supabase-audit-evidence-repository";

const request = {
  tenantId: "10000000-0000-4000-8000-000000000002",
  aggregateId: "a0000000-0000-4000-8000-000000000002",
  actorSubjectId: "20000000-0000-4000-8000-000000000003",
  actorRole: "auditor",
  assurance: "aal2",
  purpose: "privacy_review",
  policyVersion: "authorisation.v1",
  correlationId: "audit_review_01",
  occurredAt: new Date("2030-01-01T00:20:00Z"),
  limit: 50,
} as const;

const result = {
  reviewId: "b0000000-0000-4000-8000-000000000004",
  reviewedAt: "2030-01-01T00:20:00Z",
  reviewedThroughSequence: 1,
  chainVerified: true,
  events: [],
};

describe("SupabaseAuditEvidenceRepository", () => {
  it("maps the privileged review RPC result", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    const repository = new SupabaseAuditEvidenceRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.reviewEvidence(request)).resolves.toEqual(result);
    expect(rpc).toHaveBeenCalledWith(
      "review_audit_evidence",
      expect.objectContaining({
        p_actor_role: "auditor",
        p_assurance: "aal2",
        p_limit: 50,
      }),
    );
  });

  it("fails closed for provider errors or malformed evidence", async () => {
    const providerFailure = new SupabaseAuditEvidenceRepository({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "42501" } }),
    } as unknown as SupabaseClient);
    const malformed = new SupabaseAuditEvidenceRepository({
      rpc: vi.fn().mockResolvedValue({ data: { events: "private" }, error: null }),
    } as unknown as SupabaseClient);

    await expect(providerFailure.reviewEvidence(request)).rejects.toBeInstanceOf(
      AuditEvidenceRepositoryError,
    );
    await expect(malformed.reviewEvidence(request)).rejects.toBeInstanceOf(
      AuditEvidenceRepositoryError,
    );
  });
});
