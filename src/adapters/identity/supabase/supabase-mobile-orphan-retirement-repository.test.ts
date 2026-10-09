import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import { SupabaseMobileOrphanRetirementRepository } from "./supabase-mobile-orphan-retirement-repository";
const id = "a1470000-0000-4000-8000-000000000001";
const other = "a1470000-0000-4000-8000-000000000002";
const identity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: id,
  providerSessionId: id,
  assurance: "aal2",
  authenticatedAt: new Date(),
  expiresAt: new Date(Date.now() + 3600_000),
  verifiedContact: { kind: "email", value: "Operator@Example.invalid", verifiedAt: new Date() },
};
const proof: WorkforceProof = {
  providerSession: {
    accessToken: "synthetic",
    refreshToken: "synthetic",
    expiresAt: identity.expiresAt,
  },
  providerSessionId: id,
  sessionId: id,
  context: { subjectId: id, tenantId: id, role: "operations", purpose: "operations" },
};
function setup(nextIdentity = identity, nextProof = proof) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  return {
    rpc,
    repository: new SupabaseMobileOrphanRetirementRepository(
      { rpc } as unknown as SupabaseClient,
      nextIdentity,
      nextProof,
    ),
  };
}
describe("native private retirement repository", () => {
  it("derives authority from the verified session, never from the command", async () => {
    const { rpc, repository } = setup();
    await repository.reserve({ tenantId: id, emailInvitationId: other, requestKey: other });
    expect(rpc).toHaveBeenCalledWith("reserve_mobile_orphan_retirement", {
      p_provider_subject: id,
      p_provider_session_id: id,
      p_verified_email: "operator@example.invalid",
      p_session_id: id,
      p_subject_id: id,
      p_tenant_id: id,
      p_email_invitation_id: other,
      p_request_key: other,
    });
  });
  it.each([
    { ...proof, sessionId: undefined },
    { ...proof, providerSessionId: other },
    {
      ...proof,
      context: {
        ...proof.context,
        role: "admin" as const,
        purpose: "security_administration" as const,
      },
    },
  ])("rejects pending, mismatched or wrong-purpose authority before RPC", async (nextProof) => {
    const { rpc, repository } = setup(identity, nextProof);
    await expect(
      repository.reserve({ tenantId: id, emailInvitationId: id, requestKey: id }),
    ).rejects.toBeInstanceOf(IdentityRejectedError);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects email-only and wrong-tenant requests", async () => {
    const { rpc, repository } = setup({ ...identity, assurance: "aal1" });
    await expect(
      repository.reserve({ tenantId: id, emailInvitationId: id, requestKey: id }),
    ).rejects.toBeInstanceOf(IdentityRejectedError);
    expect(rpc).not.toHaveBeenCalled();
    await expect(
      setup().repository.reserve({ tenantId: other, emailInvitationId: id, requestKey: id }),
    ).rejects.toBeInstanceOf(IdentityRejectedError);
  });
  it("requires a bounded native state rather than treating arbitrary RPC success as erasure", async () => {
    const { rpc, repository } = setup();
    rpc.mockResolvedValueOnce({ data: "uncertain", error: null });
    await repository.markUncertain(id);
    rpc.mockResolvedValueOnce({ data: "held", error: null });
    await repository.markProtected(id);
    rpc.mockResolvedValueOnce({ data: "copies_pending", error: null });
    expect(await repository.finishProviderAbsence(id, other)).toBe("copies_pending");
    rpc.mockResolvedValueOnce({ data: "completed", error: null });
    await expect(repository.finishProviderAbsence(id, other)).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );
  });
  it.each([
    { ...identity, expiresAt: new Date(0) },
    { ...identity, expiresAt: new Date(NaN) },
    { ...identity, providerSubject: "not-a-provider-id" },
    { ...identity, verifiedContact: { ...identity.verifiedContact, kind: "phone" as const } },
  ])(
    "rejects expired or malformed verified identity before native dispatch",
    async (nextIdentity) => {
      const { rpc, repository } = setup(nextIdentity);
      await expect(
        repository.reserve({ tenantId: id, emailInvitationId: other, requestKey: other }),
      ).rejects.toBeInstanceOf(IdentityRejectedError);
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it("rejects malformed continuation IDs before calling the native repository", async () => {
    const { rpc, repository } = setup();
    await expect(repository.markUncertain("invalid")).rejects.toBeInstanceOf(IdentityRejectedError);
    await expect(repository.finishProviderAbsence(id, "invalid")).rejects.toBeInstanceOf(
      IdentityRejectedError,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
  it("a reviewed reissue can return only a new draft, never a dispatched invitation", async () => {
    const { rpc, repository } = setup();
    const command = {
      action: "create" as const,
      requestKey: other,
      givenName: "Synthetic",
      familyName: "Reissue",
      phone: "+27000000001",
      provenanceReference: other,
      contactAuthorityReference: other,
    };
    rpc.mockResolvedValueOnce({
      data: { invitationId: other, version: 1, status: "draft", action: "create", smsSent: false },
      error: null,
    });
    expect((await repository.prepareReviewedReissue(id, other, command)).status).toBe("draft");
    rpc.mockResolvedValueOnce({
      data: { invitationId: other, version: 1, status: "issued", action: "create", smsSent: false },
      error: null,
    });
    await expect(repository.prepareReviewedReissue(id, other, command)).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );
  });
  it.each(["42501", "PT409", "08006"])("redacts native error %s", async (code) => {
    const { rpc, repository } = setup();
    rpc.mockResolvedValueOnce({ data: null, error: { code, message: "private detail" } });
    await expect(repository.markUncertain(id)).rejects.toThrow(
      code === "42501" ? IdentityRejectedError : IdentityUnavailableError,
    );
  });
});
