import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import { readMobileDeliveryConfiguration } from "@/server/identity/mobile-invitation-delivery-config";
import {
  IdentityRejectedError,
  IdentityUnavailableError,
} from "@/application/identity/managed-identity-provider";
import { MobileInvitationBudgetError } from "@/application/identity/mobile-invitation";
import { SupabaseMobileDeliveryRepository } from "./supabase-mobile-delivery-repository";
const id = "a1440000-0000-4000-8000-000000000001";
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
  context: { subjectId: id, tenantId: id, role: "operations", purpose: "operations" },
  providerSession: {
    accessToken: "synthetic",
    refreshToken: "synthetic",
    expiresAt: identity.expiresAt,
  },
};
const config = readMobileDeliveryConfiguration({
  MOBILE_INVITATIONS_MODE: "telnyx",
  MOBILE_INVITATIONS_DELIVERY_READY: "true",
  MOBILE_INVITATIONS_TENANT_ID: id,
  TELNYX_API_KEY: "synthetic-key-not-a-credential",
  TELNYX_MESSAGING_PROFILE_ID: id,
  TELNYX_FROM_NUMBER: "+999000000001",
})!;
const request = { invitationId: id, expectedVersion: 1, reservationRequestKey: id };
const claim = {
  attemptId: id,
  phone: "+27000000001",
  reservedUsdMicros: 80000,
  dispatchUntil: new Date(Date.now() + 60000).toISOString(),
};
describe("scoped server delivery repository", () => {
  it("passes server authority, digest and profile, never a bearer/text/API credential", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: claim, error: null });
    const repo = new SupabaseMobileDeliveryRepository(
      { rpc } as unknown as SupabaseClient,
      identity,
      proof,
    );
    expect(await repo.prepare(request, "a".repeat(64), config)).toEqual(claim);
    expect(rpc).toHaveBeenCalledWith(
      "prepare_mobile_invitation_delivery",
      expect.objectContaining({
        p_token_digest: "a".repeat(64),
        p_tenant_id: id,
        p_subject_id: id,
        p_reservation_request_key: id,
      }),
    );
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(config.TELNYX_API_KEY);
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("pilot invitation");
  });
  it.each(["tenant", "assurance", "purpose", "session"])(
    "rejects mismatched %s before database",
    async (field) => {
      const rpc = vi.fn();
      const alteredProof = { ...proof, context: { ...proof.context } };
      const alteredIdentity = { ...identity };
      if (field === "tenant")
        alteredProof.context.tenantId = "b1440000-0000-4000-8000-000000000001";
      if (field === "assurance") alteredIdentity.assurance = "aal1";
      if (field === "purpose") alteredProof.context.purpose = "care_delivery";
      if (field === "session") alteredIdentity.providerSessionId = "other";
      const repo = new SupabaseMobileDeliveryRepository(
        { rpc } as unknown as SupabaseClient,
        alteredIdentity,
        alteredProof,
      );
      await expect(repo.prepare(request, "a".repeat(64), config)).rejects.toBeInstanceOf(
        IdentityRejectedError,
      );
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["42501", IdentityRejectedError],
    ["PT429", MobileInvitationBudgetError],
    ["XX000", IdentityUnavailableError],
  ])("redacts provider/database error %s", async (code, ErrorClass) => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code, message: "sensitive-provider-body" } });
    const repo = new SupabaseMobileDeliveryRepository(
      { rpc } as unknown as SupabaseClient,
      identity,
      proof,
    );
    await expect(repo.prepare(request, "a".repeat(64), config)).rejects.toBeInstanceOf(ErrorClass);
  });
  it("replay returns no claim and receipt is bounded", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    const repo = new SupabaseMobileDeliveryRepository(
      { rpc } as unknown as SupabaseClient,
      identity,
      proof,
    );
    expect(await repo.prepare(request, "a".repeat(64), config)).toBeNull();
    await repo.finish(id, { outcome: "uncertain", providerMessageId: null });
    expect(rpc).toHaveBeenLastCalledWith(
      "finish_mobile_invitation_delivery",
      expect.objectContaining({
        p_attempt_id: id,
        p_outcome: "uncertain",
        p_provider_message_id: null,
      }),
    );
  });
  it("malformed claim never crosses port boundary", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ...claim, text: "unexpected" }, error: null });
    const repo = new SupabaseMobileDeliveryRepository(
      { rpc } as unknown as SupabaseClient,
      identity,
      proof,
    );
    await expect(repo.prepare(request, "a".repeat(64), config)).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );
  });
});
