import { describe, expect, it, vi } from "vitest";

import { SecurityEvidenceRepositoryError } from "@/application/observability/security-evidence-repository";
import { SupabaseSecurityEvidenceRepository } from "./supabase-security-evidence-repository";

const event = {
  tenantId: "10000000-0000-4000-8000-000000000002",
  actorType: "workforce",
  actorId: "20000000-0000-4000-8000-000000000002",
  actorRole: "operations",
  assurance: "aal2",
  action: "authorisation.denied",
  subjectId: "20000000-0000-4000-8000-000000000001",
  resourceType: "fulfilment",
  resourceId: "a0000000-0000-4000-8000-000000000002",
  purpose: "operations",
  policyVersion: "2026-08-10.1",
  reasonCode: "RELATIONSHIP_REQUIRED",
  correlationId: "security_trace_01",
  occurredAt: new Date("2030-01-01T00:00:00Z"),
} as const;

describe("Supabase security evidence adapter", () => {
  it("maps the safe event to the server-only RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: { factId: crypto.randomUUID(), sequence: 1, eventHash: "a".repeat(64) },
      error: null,
    }));
    const repository = new SupabaseSecurityEvidenceRepository({ rpc } as never);

    await expect(repository.record(event)).resolves.toMatchObject({ sequence: 1 });
    expect(rpc).toHaveBeenCalledWith(
      "record_security_audit_event",
      expect.objectContaining({
        p_action: "authorisation.denied",
        p_reason_code: "RELATIONSHIP_REQUIRED",
        p_correlation_id: "security_trace_01",
      }),
    );
  });

  it("normalises provider and malformed receipt failures", async () => {
    const provider = new SupabaseSecurityEvidenceRepository({
      rpc: vi.fn(async () => ({ data: null, error: { message: "private detail" } })),
    } as never);
    const malformed = new SupabaseSecurityEvidenceRepository({
      rpc: vi.fn(async () => ({ data: { sequence: 0 }, error: null })),
    } as never);

    await expect(provider.record(event)).rejects.toBeInstanceOf(SecurityEvidenceRepositoryError);
    await expect(malformed.record(event)).rejects.toBeInstanceOf(SecurityEvidenceRepositoryError);
  });
});
