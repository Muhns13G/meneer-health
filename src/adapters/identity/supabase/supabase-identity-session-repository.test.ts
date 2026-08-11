import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  IdentitySessionRejectedError,
  IdentitySessionUnavailableError,
  sessionDeadlines,
} from "@/application/identity/identity-session-repository";
import type { IdentitySession, ProviderIdentity } from "@/domain/access/identity";
import { SupabaseIdentitySessionRepository } from "./supabase-identity-session-repository";

const providerIdentity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: "provider-subject",
  providerSessionId: "71000000-0000-4000-8000-000000000001",
  assurance: "aal1",
  authenticatedAt: new Date("2030-01-01T00:00:00.000Z"),
  expiresAt: new Date("2030-01-01T00:15:00.000Z"),
  verifiedContact: {
    kind: "email",
    value: "patient.one@example.invalid",
    verifiedAt: new Date("2030-01-01T00:00:00.000Z"),
  },
};

const sessionRow = {
  id: "70000000-0000-4000-8000-000000000001",
  subject_id: "20000000-0000-4000-8000-000000000001",
  provider_session_id: providerIdentity.providerSessionId,
  session_class: "patient",
  assurance: "aal1",
  status: "active",
  issued_at: "2030-01-01T00:00:00.000Z",
  last_seen_at: "2030-01-01T00:00:00.000Z",
  idle_expires_at: "2030-01-01T00:30:00.000Z",
  absolute_expires_at: "2030-01-01T12:00:00.000Z",
  revoked_at: null,
};

function mockClient(results: Array<{ data: unknown; error: unknown }>): {
  client: SupabaseClient;
  query: Record<string, ReturnType<typeof vi.fn>>;
} {
  const terminal = vi.fn(async () => results.shift() ?? { data: null, error: null });
  const query = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: terminal,
    maybeSingle: terminal,
  };
  return {
    client: { from: vi.fn(() => query) } as unknown as SupabaseClient,
    query,
  };
}

describe("SupabaseIdentitySessionRepository", () => {
  it("calculates the approved patient, workforce, and privileged session bounds", () => {
    const issuedAt = new Date("2030-01-01T00:00:00.000Z");

    expect(sessionDeadlines("patient", issuedAt, issuedAt)).toEqual({
      idleExpiresAt: new Date("2030-01-01T00:30:00.000Z"),
      absoluteExpiresAt: new Date("2030-01-01T12:00:00.000Z"),
    });
    expect(sessionDeadlines("workforce", issuedAt, issuedAt)).toEqual({
      idleExpiresAt: new Date("2030-01-01T00:15:00.000Z"),
      absoluteExpiresAt: new Date("2030-01-01T08:00:00.000Z"),
    });
    expect(sessionDeadlines("privileged", issuedAt, issuedAt)).toEqual({
      idleExpiresAt: new Date("2030-01-01T00:10:00.000Z"),
      absoluteExpiresAt: new Date("2030-01-01T04:00:00.000Z"),
    });
  });

  it("starts and resolves a bounded active patient session", async () => {
    const { client } = mockClient([
      { data: null, error: null },
      { data: sessionRow, error: null },
      { data: sessionRow, error: null },
    ]);
    const repository = new SupabaseIdentitySessionRepository(client);

    await expect(
      repository.start({
        subjectId: sessionRow.subject_id,
        providerIdentity,
        sessionClass: "patient",
        observedAt: providerIdentity.authenticatedAt,
      }),
    ).resolves.toMatchObject({
      id: sessionRow.id,
      subjectId: sessionRow.subject_id,
      sessionClass: "patient",
      assurance: "aal1",
    });
    await expect(
      repository.findActive(
        providerIdentity.providerSessionId,
        new Date("2030-01-01T00:10:00.000Z"),
      ),
    ).resolves.toMatchObject({ id: sessionRow.id, status: "active" });
  });

  it("requires aal2 before a workforce or privileged session can start", async () => {
    const { client } = mockClient([{ data: null, error: null }]);
    const repository = new SupabaseIdentitySessionRepository(client);

    await expect(
      repository.start({
        subjectId: sessionRow.subject_id,
        providerIdentity,
        sessionClass: "workforce",
        observedAt: providerIdentity.authenticatedAt,
      }),
    ).rejects.toEqual(new IdentitySessionRejectedError());
  });

  it("rejects a provider token observed at or after its expiry", async () => {
    const { client, query } = mockClient([]);
    const repository = new SupabaseIdentitySessionRepository(client);

    await expect(
      repository.start({
        subjectId: sessionRow.subject_id,
        providerIdentity,
        sessionClass: "patient",
        observedAt: providerIdentity.expiresAt,
      }),
    ).rejects.toEqual(new IdentitySessionRejectedError());
    expect(query.select).not.toHaveBeenCalled();
  });

  it("rejects expired touches and blank revocation reasons", async () => {
    const { client, query } = mockClient([{ data: sessionRow, error: null }]);
    const repository = new SupabaseIdentitySessionRepository(client);
    const session = {
      id: sessionRow.id,
      subjectId: sessionRow.subject_id,
      providerSessionId: sessionRow.provider_session_id,
      sessionClass: "patient",
      assurance: "aal1",
      status: "active",
      issuedAt: new Date(sessionRow.issued_at),
      lastSeenAt: new Date(sessionRow.last_seen_at),
      idleExpiresAt: new Date(sessionRow.idle_expires_at),
      absoluteExpiresAt: new Date(sessionRow.absolute_expires_at),
    } satisfies IdentitySession;

    await expect(repository.touch(session, session.absoluteExpiresAt)).rejects.toEqual(
      new IdentitySessionRejectedError(),
    );
    await expect(repository.touch(session, new Date("2030-01-01T00:31:00.000Z"))).rejects.toEqual(
      new IdentitySessionRejectedError(),
    );
    expect(query.update).not.toHaveBeenCalled();
    await expect(repository.revoke(session.id, new Date(), " ")).rejects.toEqual(
      new IdentitySessionRejectedError(),
    );
  });

  it("hides provider failures behind a stable storage error", async () => {
    const { client } = mockClient([{ data: null, error: { message: "private database detail" } }]);
    const repository = new SupabaseIdentitySessionRepository(client);

    await expect(
      repository.findActive(providerIdentity.providerSessionId, new Date()),
    ).rejects.toEqual(new IdentitySessionUnavailableError());
  });

  it("preserves the original absolute boundary when the same session refreshes and elevates", async () => {
    const elevatedRow = {
      ...sessionRow,
      session_class: "workforce",
      assurance: "aal2",
      last_seen_at: "2030-01-01T00:10:00.000Z",
      idle_expires_at: "2030-01-01T00:25:00.000Z",
      absolute_expires_at: "2030-01-01T08:00:00.000Z",
    };
    const { client, query } = mockClient([
      { data: sessionRow, error: null },
      { data: elevatedRow, error: null },
    ]);
    const repository = new SupabaseIdentitySessionRepository(client);
    const refreshedIdentity = {
      ...providerIdentity,
      assurance: "aal2" as const,
      authenticatedAt: new Date("2030-01-01T00:10:00.000Z"),
    };

    await expect(
      repository.start({
        subjectId: sessionRow.subject_id,
        providerIdentity: refreshedIdentity,
        sessionClass: "workforce",
        observedAt: refreshedIdentity.authenticatedAt,
      }),
    ).resolves.toMatchObject({
      issuedAt: new Date(sessionRow.issued_at),
      absoluteExpiresAt: new Date("2030-01-01T08:00:00.000Z"),
      sessionClass: "workforce",
    });
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_seen_at: "2030-01-01T00:10:00.000Z",
        idle_expires_at: "2030-01-01T00:25:00.000Z",
        absolute_expires_at: "2030-01-01T08:00:00.000Z",
      }),
    );
  });
});
