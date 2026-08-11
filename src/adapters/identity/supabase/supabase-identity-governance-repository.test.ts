import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  IdentityGovernanceRejectedError,
  IdentityGovernanceUnavailableError,
} from "@/application/identity/identity-governance-repository";
import { SupabaseIdentityGovernanceRepository } from "./supabase-identity-governance-repository";

const invitationRow = {
  id: "60000000-0000-4000-8000-000000000002",
  tenant_id: "10000000-0000-4000-8000-000000000001",
  contact_digest: "a".repeat(64),
  intended_role: "patient",
  provider_subject: null,
  status: "pending",
  expires_at: "2030-01-02T00:00:00.000Z",
  accepted_by_subject_id: null,
  accepted_at: null,
};

const recoveryRow = {
  id: "72000000-0000-4000-8000-000000000002",
  subject_id: "20000000-0000-4000-8000-000000000001",
  recovery_class: "workforce",
  status: "requested",
  requested_at: "2030-01-01T00:00:00.000Z",
  expires_at: "2030-01-01T00:15:00.000Z",
  approved_by_subject_id: null,
  sessions_revoked_at: null,
};

function queuedClient(results: Array<{ data: unknown; error: unknown }>): SupabaseClient {
  const terminal = vi.fn(async () => results.shift() ?? { data: null, error: null });
  const query = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: terminal,
    maybeSingle: terminal,
  };
  return { from: vi.fn(() => query) } as unknown as SupabaseClient;
}

describe("SupabaseIdentityGovernanceRepository", () => {
  it("creates, provider-binds, and accepts a bounded patient invitation", async () => {
    const bound = { ...invitationRow, provider_subject: "provider-subject" };
    const accepted = {
      ...bound,
      status: "accepted",
      accepted_by_subject_id: "20000000-0000-4000-8000-000000000001",
      accepted_at: "2030-01-01T00:05:00.000Z",
    };
    const repository = new SupabaseIdentityGovernanceRepository(
      queuedClient([
        { data: invitationRow, error: null },
        { data: bound, error: null },
        { data: accepted, error: null },
      ]),
    );

    const created = await repository.createPatientInvitation({
      tenantId: invitationRow.tenant_id,
      contactDigest: invitationRow.contact_digest,
      expiresAt: new Date(invitationRow.expires_at),
    });
    const providerBound = await repository.bindInvitationProviderSubject(
      created.id,
      "provider-subject",
      new Date("2030-01-01T00:01:00.000Z"),
    );
    await expect(
      repository.acceptPatientInvitation(
        providerBound.id,
        accepted.accepted_by_subject_id,
        new Date(accepted.accepted_at),
      ),
    ).resolves.toMatchObject({ status: "accepted", providerSubject: "provider-subject" });
  });

  it("governs separate workforce recovery approval and completion evidence", async () => {
    const approved = {
      ...recoveryRow,
      status: "approved",
      approved_by_subject_id: "20000000-0000-4000-8000-000000000002",
    };
    const completed = {
      ...approved,
      status: "completed",
      sessions_revoked_at: "2030-01-01T00:10:00.000Z",
    };
    const repository = new SupabaseIdentityGovernanceRepository(
      queuedClient([
        { data: recoveryRow, error: null },
        { data: approved, error: null },
        { data: completed, error: null },
      ]),
    );

    const requested = await repository.createRecoveryCase({
      subjectId: recoveryRow.subject_id,
      recoveryClass: "workforce",
      requestedAt: new Date(recoveryRow.requested_at),
      expiresAt: new Date(recoveryRow.expires_at),
    });
    const approvedCase = await repository.approveWorkforceRecovery(
      requested.id,
      approved.approved_by_subject_id,
      new Date("2030-01-01T00:05:00.000Z"),
    );
    await expect(
      repository.completeRecovery(approvedCase.id, new Date(completed.sessions_revoked_at)),
    ).resolves.toMatchObject({ status: "completed", sessionsRevokedAt: expect.any(Date) });
  });

  it("creates a scoped service principal, rotates in a digest, and revokes it", async () => {
    const identityRow = {
      id: "80000000-0000-4000-8000-000000000002",
      tenant_id: invitationRow.tenant_id,
      name: "synthetic-service",
      environment: "local",
      purpose: "synthetic verification",
      status: "active",
      expires_at: "2030-02-01T00:00:00.000Z",
    };
    const scopeRow = {
      service_identity_id: identityRow.id,
      resource: "synthetic-intake",
      action: "create",
    };
    const credentialRow = {
      id: "90000000-0000-4000-8000-000000000002",
      service_identity_id: identityRow.id,
      valid_from: "2030-01-01T00:00:00.000Z",
      expires_at: "2030-01-02T00:00:00.000Z",
      revoked_at: null,
    };
    const repository = new SupabaseIdentityGovernanceRepository(
      queuedClient([
        { data: identityRow, error: null },
        { data: scopeRow, error: null },
        { data: credentialRow, error: null },
        {
          data: { ...credentialRow, revoked_at: "2030-01-01T12:00:00.000Z" },
          error: null,
        },
      ]),
    );

    const identity = await repository.createServiceIdentity({
      tenantId: invitationRow.tenant_id,
      name: identityRow.name,
      environment: "local",
      purpose: identityRow.purpose,
      expiresAt: new Date(identityRow.expires_at),
    });
    await expect(
      repository.addServiceIdentityScope({
        serviceIdentityId: identity.id,
        resource: scopeRow.resource,
        action: "create",
      }),
    ).resolves.toMatchObject({ action: "create" });
    const credential = await repository.addServiceIdentityCredential({
      serviceIdentityId: identity.id,
      secretDigest: new Uint8Array(32).fill(0xab),
      validFrom: new Date(credentialRow.valid_from),
      expiresAt: new Date(credentialRow.expires_at),
    });
    await expect(
      repository.revokeServiceIdentityCredential(
        credential.id,
        new Date("2030-01-01T12:00:00.000Z"),
      ),
    ).resolves.toMatchObject({ revokedAt: expect.any(Date) });
  });

  it("rejects invalid digest material and hides provider failures", async () => {
    const repository = new SupabaseIdentityGovernanceRepository(
      queuedClient([{ data: null, error: { message: "private provider detail" } }]),
    );

    await expect(
      repository.createPatientInvitation({
        tenantId: invitationRow.tenant_id,
        contactDigest: "raw-email",
        expiresAt: new Date(invitationRow.expires_at),
      }),
    ).rejects.toEqual(new IdentityGovernanceRejectedError());
    await expect(
      repository.createRecoveryCase({
        subjectId: recoveryRow.subject_id,
        recoveryClass: "workforce",
        requestedAt: new Date(recoveryRow.requested_at),
        expiresAt: new Date(recoveryRow.expires_at),
      }),
    ).rejects.toEqual(new IdentityGovernanceUnavailableError());
  });
});
