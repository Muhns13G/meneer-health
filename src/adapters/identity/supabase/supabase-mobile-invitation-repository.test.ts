import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import { SupabaseMobileInvitationRepository } from "./supabase-mobile-invitation-repository";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import {
  MobileInvitationBudgetError,
  MobileInvitationConflictError,
} from "@/application/identity/mobile-invitation";
const id = "a1430000-0000-4000-8000-000000000001";
const identity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: id,
  providerSessionId: id,
  assurance: "aal2",
  authenticatedAt: new Date(),
  expiresAt: new Date(Date.now() + 600_000),
  verifiedContact: { kind: "email", value: "operator@example.invalid", verifiedAt: new Date() },
};
const proof: WorkforceProof = {
  sessionId: id,
  providerSessionId: id,
  context: { subjectId: id, tenantId: id, role: "operations", purpose: "operations" },
  providerSession: {
    accessToken: "synthetic",
    refreshToken: "synthetic",
    expiresAt: identity.expiresAt,
  },
};
const page = { invitations: [], nextId: null, reservationEnabled: false, sendingEnabled: false };
function setup(data: unknown = page, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return {
    rpc,
    repository: new SupabaseMobileInvitationRepository({ rpc } as unknown as SupabaseClient),
  };
}
describe("governed Supabase mobile invitation repository", () => {
  it("uses only server-derived authority and a bounded cursor projection", async () => {
    const s = setup();
    await expect(s.repository.read(identity, proof, null)).resolves.toEqual(page);
    expect(s.rpc).toHaveBeenCalledWith("read_mobile_invitation_register", {
      p_provider_subject: id,
      p_provider_session_id: id,
      p_verified_email: "operator@example.invalid",
      p_session_id: id,
      p_subject_id: id,
      p_tenant_id: id,
      p_after_id: null,
    });
  });
  it("rejects email-only and mismatched authority before RPC", async () => {
    const s = setup();
    await expect(
      s.repository.read({ ...identity, assurance: "aal1" }, proof, null),
    ).rejects.toBeInstanceOf(IdentityRejectedError);
    await expect(
      s.repository.read(identity, { ...proof, providerSessionId: "other" }, null),
    ).rejects.toBeInstanceOf(IdentityRejectedError);
    expect(s.rpc).not.toHaveBeenCalled();
  });
  it.each([
    ["42501", IdentityRejectedError],
    ["PT409", MobileInvitationConflictError],
    ["23505", MobileInvitationConflictError],
    ["PT429", MobileInvitationBudgetError],
    ["XX000", IdentityUnavailableError],
  ])("maps %s without leaking provider details", async (code, errorType) => {
    const s = setup(null, { code, message: "private diagnostic" });
    await expect(s.repository.read(identity, proof, null)).rejects.toBeInstanceOf(errorType);
  });
  it("rejects leaked contacts or malformed readiness projections", async () => {
    for (const data of [
      { ...page, token: "private" },
      { ...page, sendingEnabled: "true" },
    ]) {
      await expect(setup(data).repository.read(identity, proof, null)).rejects.toBeInstanceOf(
        IdentityUnavailableError,
      );
    }
  });
  it("requires the exact invitation and action in the command receipt", async () => {
    const s = setup({
      invitationId: id,
      version: 1,
      status: "revoked",
      action: "revoke",
      smsSent: false,
    });
    const command = {
      action: "revoke" as const,
      invitationId: id,
      expectedVersion: 1,
      requestKey: id,
    };
    await expect(s.repository.command(identity, proof, command)).resolves.toMatchObject({
      smsSent: false,
    });
    await expect(
      s.repository.command(identity, proof, { ...command, action: "review" }),
    ).rejects.toBeInstanceOf(IdentityUnavailableError);
  });
});
