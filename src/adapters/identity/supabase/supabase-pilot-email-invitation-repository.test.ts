import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import type { ProviderIdentity } from "@/domain/access/identity";
import { SupabasePilotEmailInvitationRepository } from "./supabase-pilot-email-invitation-repository";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import {
  MobileInvitationConflictError,
  MobileInvitationBudgetError,
} from "@/application/identity/mobile-invitation";
const id = "a1510000-0000-4000-8000-000000000001";
const identity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: id,
  providerSessionId: id,
  assurance: "aal2",
  authenticatedAt: new Date(),
  expiresAt: new Date(Date.now() + 600000),
  verifiedContact: { kind: "email", value: "operator@example.invalid", verifiedAt: new Date() },
};
const proof: WorkforceProof = {
  sessionId: id,
  providerSessionId: id,
  context: { tenantId: id, subjectId: id, role: "operations", purpose: "operations" },
  providerSession: {
    accessToken: "synthetic",
    refreshToken: "synthetic",
    expiresAt: identity.expiresAt,
  },
};
const input = {
  invitationId: id,
  expectedVersion: 1,
  requestKey: id,
  email: "recipient@example.invalid",
};
describe("governed email repository", () => {
  it("passes current server authority and digest to native lease", async () => {
    const data = { attemptId: id, dispatchUntil: new Date(Date.now() + 60000).toISOString() };
    const rpc = vi.fn().mockResolvedValue({ data, error: null });
    const repo = new SupabasePilotEmailInvitationRepository(
      { rpc } as unknown as SupabaseClient,
      identity,
      proof,
    );
    expect(await repo.prepare(input, "a".repeat(64))).toEqual(data);
    expect(rpc).toHaveBeenCalledWith(
      "prepare_pilot_email_invitation",
      expect.objectContaining({
        p_provider_subject: id,
        p_tenant_id: id,
        p_session_id: id,
        p_email: input.email,
        p_token_digest: "a".repeat(64),
      }),
    );
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("synthetic");
  });
  it("rejects mismatched context before database access", async () => {
    const rpc = vi.fn();
    const repo = new SupabasePilotEmailInvitationRepository(
      { rpc } as unknown as SupabaseClient,
      { ...identity, assurance: "aal1" },
      proof,
    );
    await expect(repo.prepare(input, "a".repeat(64))).rejects.toBeInstanceOf(IdentityRejectedError);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    ["42501", IdentityRejectedError],
    ["PT409", MobileInvitationConflictError],
    ["PT429", MobileInvitationBudgetError],
    ["XX000", IdentityUnavailableError],
  ])("redacts native %s failures", async (code, ErrorType) => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code, message: "private" } });
    const repo = new SupabasePilotEmailInvitationRepository(
      { rpc } as unknown as SupabaseClient,
      identity,
      proof,
    );
    await expect(repo.prepare(input, "a".repeat(64))).rejects.toBeInstanceOf(ErrorType);
  });
  it("rejects malformed lease and missing finish receipt", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: { attemptId: id, dispatchUntil: "invalid" }, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    const repo = new SupabasePilotEmailInvitationRepository(
      { rpc } as unknown as SupabaseClient,
      identity,
      proof,
    );
    await expect(repo.prepare(input, "a".repeat(64))).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );
    await expect(repo.finish(id, "accepted")).rejects.toBeInstanceOf(IdentityUnavailableError);
  });
});
