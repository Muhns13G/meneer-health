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
  it("requires an active profile and both current, non-withdrawn account receipts", async () => {
    const rows: Record<string, { data: unknown; error: null }> = {
      client_profiles: { data: { id: "profile" }, error: null },
      pilot_instrument_publications: {
        data: [
          { id: "terms", instrument_id: "pilot-account-terms" },
          { id: "privacy", instrument_id: "pilot-privacy-notice" },
        ],
        error: null,
      },
      pilot_instrument_receipts: {
        data: [
          {
            id: "terms-receipt",
            publication_id: "terms",
            instrument_id: "pilot-account-terms",
            action: "accepted",
          },
          {
            id: "privacy-receipt",
            publication_id: "privacy",
            instrument_id: "pilot-privacy-notice",
            action: "acknowledged",
          },
        ],
        error: null,
      },
      pilot_instrument_receipt_events: { data: [], error: null },
      pilot_account_lifecycle_events: { data: [{ event_type: "activated" }], error: null },
    };
    const client = {
      from: vi.fn((table: string) => {
        const result = rows[table];
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          in() {
            return this;
          },
          lte() {
            return this;
          },
          or() {
            return this;
          },
          order() {
            return this;
          },
          limit() {
            return this;
          },
          maybeSingle: async () => result,
          returns: async () => result,
        };
      }),
    } as unknown as SupabaseClient;
    const repository = new SupabaseAccessRepository(client);
    const tenant = "10000000-0000-4000-8000-000000000001";
    const subject = "20000000-0000-4000-8000-000000000001";
    await expect(repository.hasPilotAccountEvidence(tenant, subject)).resolves.toBe(true);
    rows.pilot_instrument_receipt_events = {
      data: [{ receipt_id: "privacy-receipt" }],
      error: null,
    };
    await expect(repository.hasPilotAccountEvidence(tenant, subject)).resolves.toBe(false);
    rows.pilot_instrument_receipt_events = { data: [], error: null };
    rows.pilot_account_lifecycle_events = { data: [{ event_type: "suspended" }], error: null };
    await expect(repository.hasPilotAccountEvidence(tenant, subject)).resolves.toBe(false);
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
