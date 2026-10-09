import { describe, it, expect, vi } from "vitest";
import { MobileInvitationEmailService } from "./mobile-invitation-email-service";
import { createMobileRedemptionHandler } from "./mobile-invitation-redemption-http";
import { sealMobileClaim, mobileClaimKey, mobileClaimCookie } from "./mobile-invitation-claim";
import {
  openPreactivationProof,
  readPreactivationKey,
  preactivationCookieName,
} from "./preactivation-cookie";

const id = "a1470000-0000-4000-8000-000000000001";
const proof = {
  tenantId: id,
  invitationId: id,
  version: 1,
  claimId: id,
  requestKey: id,
  tokenDigest: "a".repeat(64),
  secret: "b".repeat(64),
  expiresAt: Date.now() + 600000,
};
const invitation = {
  id,
  tenantId: id,
  contactDigest: "c".repeat(64),
  providerSubject: id,
  email: "mobile@example.invalid",
  expiresAt: new Date(proof.expiresAt).toISOString(),
};
function setup() {
  const call = vi.fn(async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    void args;
    if (name === "prepare_mobile_email_exchange")
      return {
        dispatch: true,
        state: "reserved",
        email: invitation.email,
        invitationId: id,
        creationProof: "d".repeat(64),
      };
    if (name === "read_mobile_email_exchange") return invitation;
    return true;
  });
  const provider = {
    invitePatient: vi.fn(async () => id),
    verifyInvitationOtp: vi.fn(async () => ({
      accessToken: "private-access",
      refreshToken: "private-refresh",
      expiresAt: new Date(Date.now() + 3600000),
    })),
    verifyAccessToken: vi.fn(async () => ({
      provider: "supabase" as const,
      providerSubject: id,
      providerSessionId: id,
      assurance: "aal1" as const,
      authenticatedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      verifiedContact: { kind: "email" as const, value: invitation.email, verifiedAt: new Date() },
    })),
    revokeSessions: vi.fn(async () => {}),
  };
  return { call, provider, service: new MobileInvitationEmailService({ call }, provider) };
}
describe("mobile email conversion", () => {
  it("reserves before the one-shot provider call, never sends contacts/digests in redirect", async () => {
    const s = setup();
    expect(await s.service.request(proof)).toBe(true);
    expect(s.call.mock.invocationCallOrder[0]).toBeLessThan(
      s.provider.invitePatient.mock.invocationCallOrder[0]!,
    );
    expect(s.provider.invitePatient).toHaveBeenCalledWith(
      invitation.email,
      "https://meneerhealth.co.za/mobile-invitation",
      "d".repeat(64),
    );
    expect(s.call.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ p_token_digest: proof.tokenDigest }),
    );
    expect(JSON.stringify(s.call.mock.calls)).not.toContain(proof.secret);
  });
  it.each(["reserved", "uncertain", "delivered"])(
    "never repeats a %s provider invocation",
    async (state) => {
      const s = setup();
      s.call.mockResolvedValueOnce({ dispatch: false, state });
      expect(await s.service.request(proof)).toBe(state === "delivered");
      expect(s.provider.invitePatient).not.toHaveBeenCalled();
    },
  );
  it("unknown/existing-account reservations do not contact Auth", async () => {
    const s = setup();
    s.call.mockResolvedValueOnce(null);
    expect(await s.service.request(proof)).toBe(false);
    expect(s.provider.invitePatient).not.toHaveBeenCalled();
  });
  it.each([undefined, "invalid", 123])(
    "rejects missing or malformed creation capability %s before Auth",
    async (creationProof) => {
      const s = setup();
      s.call.mockResolvedValueOnce({
        dispatch: true,
        state: "reserved",
        email: invitation.email,
        invitationId: id,
        creationProof,
      });
      await expect(s.service.request(proof)).rejects.toThrow();
      expect(s.provider.invitePatient).not.toHaveBeenCalled();
    },
  );
  it("timeout marks uncertainty, no success/retry", async () => {
    const s = setup();
    s.provider.invitePatient.mockRejectedValueOnce(new Error("private provider detail"));
    expect(await s.service.request(proof)).toBe(false);
    expect(s.call).toHaveBeenLastCalledWith(
      "finish_mobile_email_exchange",
      expect.objectContaining({ p_provider_subject: null }),
    );
    expect(s.provider.invitePatient).toHaveBeenCalledOnce();
  });
  it("verified provider subject/mail and current claim precede bounded preactivation", async () => {
    const s = setup();
    const verified = await s.service.verify(proof, "123456");
    expect(verified.session.expiresAt.getTime()).toBe(proof.expiresAt);
    expect(s.provider.verifyInvitationOtp).toHaveBeenCalledWith(invitation.email, "123456");
    expect(s.call).toHaveBeenLastCalledWith(
      "verify_mobile_email_exchange",
      expect.objectContaining({ p_provider_session_id: id }),
    );
  });
  it.each(["12345", "1234567", "abcdef"])(
    "rejects invalid code %s before provider",
    async (code) => {
      const s = setup();
      await expect(s.service.verify(proof, code)).rejects.toThrow();
      expect(s.provider.verifyInvitationOtp).not.toHaveBeenCalled();
    },
  );
  it("revocation between OTP and completion revokes the new provider session", async () => {
    const s = setup();
    s.call.mockResolvedValueOnce(invitation).mockResolvedValueOnce(null);
    await expect(s.service.verify(proof, "123456")).rejects.toThrow();
    expect(s.provider.revokeSessions).toHaveBeenCalledWith("private-access", "local");
  });
  it("mismatched provider subject cannot convert", async () => {
    const s = setup();
    s.provider.verifyAccessToken.mockResolvedValueOnce({
      ...(await s.provider.verifyAccessToken()),
      providerSubject: "a1470000-0000-4000-8000-000000000002",
    });
    await expect(s.service.verify(proof, "123456")).rejects.toThrow();
    expect(s.provider.revokeSessions).toHaveBeenCalledOnce();
  });
  it("failed SQL verification cannot issue application proof", async () => {
    const s = setup();
    s.call
      .mockResolvedValueOnce(invitation)
      .mockResolvedValueOnce(invitation)
      .mockResolvedValueOnce(false);
    await expect(s.service.verify(proof, "123456")).rejects.toThrow();
    expect(s.provider.revokeSessions).toHaveBeenCalledOnce();
  });
  it("HTTP requires sealed claim, separate gate and strict code; only preactivation cookie is issued", async () => {
    const s = setup();
    const key = btoa("k".repeat(32));
    const cookie = await sealMobileClaim(proof, mobileClaimKey(key));
    const bindings = {
      REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
      MOBILE_INVITATIONS_REDEMPTION_MODE: "enabled",
      MOBILE_INVITATIONS_EMAIL_MODE: "enabled",
      MOBILE_INVITATIONS_TENANT_ID: id,
      MOBILE_INVITATION_CLAIM_KEY_BASE64: key,
      IDENTITY_PREACTIVATION_KEY_BASE64: key,
    };
    const handler = createMobileRedemptionHandler(bindings, undefined, s.service);
    function request(action: string, fields: Record<string, string>, withCookie = true) {
      return new Request(`https://meneerhealth.co.za/mobile-invitation/${action}`, {
        method: "POST",
        headers: {
          origin: "https://meneerhealth.co.za",
          "content-type": "application/x-www-form-urlencoded",
          cookie: withCookie ? `${mobileClaimCookie}=${cookie}` : "",
        },
        body: new URLSearchParams(fields),
      });
    }
    expect(await (await handler(request("verify", { code: "123456" }, false))).json()).toEqual({
      status: "unavailable",
    });
    expect(
      (await handler(request("verify", { code: "123456", email: invitation.email }))).status,
    ).toBe(422);
    const result = await handler(request("verify", { code: "123456" }));
    expect(await result.json()).toEqual({ status: "verified" });
    const setCookie = result.headers.get("set-cookie")!;
    expect(setCookie).toContain(preactivationCookieName + "=");
    expect(setCookie).not.toContain("private-access");
    expect(setCookie).not.toContain(invitation.email);
    const opened = await openPreactivationProof(
      setCookie.split(";")[0]!.slice(preactivationCookieName.length + 1),
      readPreactivationKey(key),
    );
    expect(opened?.expiresAt).toBeLessThanOrEqual(proof.expiresAt);
    expect(opened?.invitationId).toBe(id);
    expect(setCookie).toContain("HttpOnly; Secure; SameSite=Strict");
    const disabled = createMobileRedemptionHandler(
      { ...bindings, MOBILE_INVITATIONS_EMAIL_MODE: "disabled" },
      undefined,
      s.service,
    );
    expect((await disabled(request("email", {}))).status).toBe(503);
  });
});
