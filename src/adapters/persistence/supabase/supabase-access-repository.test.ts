import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { PersistenceUnavailableError } from "@/application/persistence/access-repository";
import { SupabaseAccessRepository } from "./supabase-access-repository";

function mockClient(result: { data: unknown; error: unknown }): SupabaseClient {
  const terminal = vi.fn().mockResolvedValue(result);
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: terminal,
    returns: vi.fn().mockReturnThis(),
    then: vi.fn((resolve, reject) => Promise.resolve(result).then(resolve, reject)),
  };

  return { from: vi.fn(() => query) } as unknown as SupabaseClient;
}

describe("SupabaseAccessRepository", () => {
  it("delegates exact current or individually approved legacy evidence to the native boundary", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const repository = new SupabaseAccessRepository({ rpc } as unknown as SupabaseClient);
    const tenant = "10000000-0000-4000-8000-000000000001";
    const subject = "20000000-0000-4000-8000-000000000001";
    await expect(repository.hasPilotAccountEvidence(tenant, subject)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("has_pilot_account_evidence", {
      p_tenant_id: tenant,
      p_subject_id: subject,
    });
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(repository.hasPilotAccountEvidence(tenant, subject)).resolves.toBe(false);
  });

  it("never turns unavailable or malformed evidence into permission", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const repository = new SupabaseAccessRepository({ rpc } as unknown as SupabaseClient);
    await expect(repository.hasPilotAccountEvidence("tenant", "subject")).rejects.toBeInstanceOf(
      PersistenceUnavailableError,
    );
    rpc.mockResolvedValue({ data: true, error: { code: "42501" } });
    await expect(repository.hasPilotAccountEvidence("tenant", "subject")).rejects.toBeInstanceOf(
      PersistenceUnavailableError,
    );
  });

  it("maps provider tenant rows to the provider-neutral model", async () => {
    const repository = new SupabaseAccessRepository(
      mockClient({
        data: {
          id: "10000000-0000-4000-8000-000000000001",
          slug: "synthetic-alpha",
          display_name: "Synthetic Alpha",
          status: "active",
        },
        error: null,
      }),
    );

    await expect(
      repository.findTenantById("10000000-0000-4000-8000-000000000001"),
    ).resolves.toEqual({
      id: "10000000-0000-4000-8000-000000000001",
      slug: "synthetic-alpha",
      displayName: "Synthetic Alpha",
      status: "active",
    });
  });

  it("returns null when no subject exists", async () => {
    const repository = new SupabaseAccessRepository(mockClient({ data: null, error: null }));

    await expect(
      repository.findSubjectById("20000000-0000-4000-8000-000000000099"),
    ).resolves.toBeNull();
  });

  it("maps an external provider identity to its stable internal subject", async () => {
    const repository = new SupabaseAccessRepository(
      mockClient({
        data: {
          subjects: {
            id: "20000000-0000-4000-8000-000000000001",
            status: "active",
          },
        },
        error: null,
      }),
    );

    await expect(
      repository.findSubjectByExternalIdentity("synthetic", "subject-alpha"),
    ).resolves.toEqual({
      id: "20000000-0000-4000-8000-000000000001",
      status: "active",
    });
  });

  it("maps tenant-scoped membership rows", async () => {
    const repository = new SupabaseAccessRepository(
      mockClient({
        data: [
          {
            tenant_id: "10000000-0000-4000-8000-000000000001",
            subject_id: "20000000-0000-4000-8000-000000000001",
            role: "patient",
            status: "active",
            valid_from: "2030-01-01T00:00:00Z",
            expires_at: null,
            approved_by_subject_id: null,
          },
        ],
        error: null,
      }),
    );

    await expect(
      repository.listMemberships("20000000-0000-4000-8000-000000000001"),
    ).resolves.toEqual([
      {
        tenantId: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        role: "patient",
        status: "active",
        validFrom: new Date("2030-01-01T00:00:00Z"),
      },
    ]);
  });

  it("does not leak provider errors through the application boundary", async () => {
    const repository = new SupabaseAccessRepository(
      mockClient({ data: null, error: { message: "provider details must stay private" } }),
    );

    await expect(repository.findTenantById("10000000-0000-4000-8000-000000000001")).rejects.toEqual(
      new PersistenceUnavailableError(),
    );
  });
});
