import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { AuthorisationContextUnavailableError } from "@/application/authorisation/authorisation-context-repository";
import { resolveServerAuthorisationResource } from "@/domain/access/authorisation";
import { SupabaseAuthorisationContextRepository } from "./supabase-authorisation-context-repository";

type ProviderResult = { data: unknown; error: unknown };

function query(result: ProviderResult) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    returns: vi.fn().mockReturnThis(),
    then: vi.fn((resolve, reject) => Promise.resolve(result).then(resolve, reject)),
  };
  return chain;
}

function mockClient(results: Record<string, ProviderResult>): SupabaseClient {
  return {
    from: vi.fn((table: string) => query(results[table] ?? { data: null, error: null })),
  } as unknown as SupabaseClient;
}

describe("SupabaseAuthorisationContextRepository", () => {
  it("maps the server-owned human principal context", async () => {
    const repository = new SupabaseAuthorisationContextRepository(
      mockClient({
        identity_sessions: {
          data: {
            id: "session",
            subject_id: "subject",
            provider_session_id: "provider-session",
            session_class: "workforce",
            assurance: "aal2",
            status: "active",
            issued_at: "2030-01-01T00:00:00Z",
            last_seen_at: "2030-01-01T00:05:00Z",
            idle_expires_at: "2030-01-01T00:20:00Z",
            absolute_expires_at: "2030-01-01T08:00:00Z",
            revoked_at: null,
          },
          error: null,
        },
        subjects: { data: { status: "active" }, error: null },
        tenants: { data: { status: "active" }, error: null },
        tenant_memberships: {
          data: {
            tenant_id: "tenant",
            subject_id: "subject",
            role: "clinician",
            status: "active",
            valid_from: "2029-12-01T00:00:00Z",
            expires_at: "2030-02-01T00:00:00Z",
          },
          error: null,
        },
      }),
    );

    await expect(
      repository.loadHumanPrincipal("provider-session", "tenant", "clinician"),
    ).resolves.toMatchObject({
      kind: "human",
      subjectId: "subject",
      tenantId: "tenant",
      role: "clinician",
      membershipStatus: "active",
      session: { assurance: "aal2", sessionClass: "workforce" },
    });
  });

  it("maps only resource-specific assignment evidence", async () => {
    const repository = new SupabaseAuthorisationContextRepository(
      mockClient({
        access_assignments: {
          data: [
            {
              id: "assignment",
              tenant_id: "tenant",
              subject_id: "subject",
              resource_type: "clinical_decision",
              resource_id: "resource",
              purpose: "care_delivery",
              status: "active",
              valid_from: "2029-12-01T00:00:00Z",
              expires_at: "2030-02-01T00:00:00Z",
            },
          ],
          error: null,
        },
      }),
    );

    await expect(
      repository.listAssignments(
        "subject",
        resolveServerAuthorisationResource({
          tenantId: "tenant",
          type: "clinical_decision",
          id: "resource",
          workflowState: "active",
          restriction: "none",
          allowedPurposes: ["care_delivery"],
        }),
      ),
    ).resolves.toEqual([
      {
        id: "assignment",
        tenantId: "tenant",
        subjectId: "subject",
        resourceType: "clinical_decision",
        resourceId: "resource",
        purpose: "care_delivery",
        status: "active",
        validFrom: new Date("2029-12-01T00:00:00Z"),
        expiresAt: new Date("2030-02-01T00:00:00Z"),
      },
    ]);
  });

  it("maps a service identity and its exact scopes", async () => {
    const repository = new SupabaseAuthorisationContextRepository(
      mockClient({
        service_identities: {
          data: {
            id: "service",
            tenant_id: "tenant",
            environment: "local",
            purpose: "operations",
            status: "active",
            expires_at: "2030-02-01T00:00:00Z",
          },
          error: null,
        },
        service_identity_scopes: {
          data: [{ service_identity_id: "service", resource: "fulfilment", action: "update" }],
          error: null,
        },
        service_identity_credentials: { data: { id: "credential" }, error: null },
      }),
    );

    await expect(
      repository.loadServicePrincipal("service", new Uint8Array(32).fill(0xab), new Date()),
    ).resolves.toMatchObject({
      id: "service",
      tenantId: "tenant",
      environment: "local",
      purpose: "operations",
      scopes: [{ resource: "fulfilment", action: "update" }],
    });
  });

  it("rejects a missing or malformed service credential", async () => {
    const repository = new SupabaseAuthorisationContextRepository(mockClient({}));
    await expect(
      repository.loadServicePrincipal("service", new Uint8Array(31), new Date()),
    ).resolves.toBeNull();
  });

  it("returns no principal when the server session is unknown", async () => {
    const repository = new SupabaseAuthorisationContextRepository(
      mockClient({ identity_sessions: { data: null, error: null } }),
    );
    await expect(repository.loadHumanPrincipal("unknown", "tenant", "patient")).resolves.toBeNull();
  });

  it("does not leak provider errors through the authorisation boundary", async () => {
    const repository = new SupabaseAuthorisationContextRepository(
      mockClient({
        identity_sessions: { data: null, error: { message: "private provider error" } },
      }),
    );
    await expect(repository.loadHumanPrincipal("session", "tenant", "patient")).rejects.toEqual(
      new AuthorisationContextUnavailableError(),
    );
  });
});
