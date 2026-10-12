import { describe, expect, it, vi } from "vitest";
import { PublicRegistrationService } from "@/application/identity/public-registration-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import type { PatientSession } from "@/application/identity/patient-session-service";
import { createPublicRegistrationHttpHandler } from "./public-registration-http";
import { openPreactivationProof, preactivationCookieName } from "./preactivation-cookie";
import { inspectPublicRequest } from "@/server/security/request-security";
const tenant = "10000000-0000-4000-8000-000000000001",
  subject = "f8000000-0000-4000-8000-000000000001",
  sid = "f8000000-0000-4000-8000-000000000002",
  invitation = "f8000000-0000-4000-8000-000000000003";
const key = new Uint8Array(32).fill(7),
  encoded = btoa(String.fromCharCode(...key));
function setup(mode = "enabled") {
  const until = new Date(Date.now() + 3600000);
  const session = {
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
    expiresAt: until,
  };
  const identity = {
    provider: "supabase" as const,
    providerSubject: subject,
    providerSessionId: sid,
    assurance: "aal1" as const,
    authenticatedAt: new Date(),
    expiresAt: until,
    verifiedContact: {
      kind: "email" as const,
      value: "signup@example.invalid",
      verifiedAt: new Date(),
    },
  };
  const patient: PatientSession = {
    tenantId: tenant,
    providerSession: session,
    providerIdentity: identity,
    session: {
      id: invitation,
      subjectId: subject,
      providerSessionId: sid,
      sessionClass: "patient",
      assurance: "aal1",
      status: "active",
      issuedAt: new Date(),
      lastSeenAt: new Date(),
      idleExpiresAt: until,
      absoluteExpiresAt: until,
    },
  };
  const provider = {
    publicRegistrationAvailable: vi.fn(async () => true),
    requestPublicRegistration: vi.fn(async () => {}),
    verifyEmailOtp: vi.fn(async () => session),
    verifyAccessToken: vi.fn(async () => identity),
    revokeSessions: vi.fn(async () => {}),
  };
  const repository = {
    available: vi.fn(async () => true),
    reserveSend: vi.fn(async () => true),
    prepare: vi.fn(async () => ({
      alreadyActive: false,
      invitationId: invitation as string | null,
    })),
  };
  const sessions = {
    continueAfterActivation: vi.fn(async () => patient),
    signOut: vi.fn(async () => {}),
  };
  const service = new PublicRegistrationService(tenant, provider, repository, sessions);
  const bindings = {
    PUBLIC_REGISTRATION_MODE: mode,
    PUBLIC_REGISTRATION_TENANT_ID: tenant,
    IDENTITY_PREACTIVATION_KEY_BASE64: encoded,
    IDENTITY_SESSION_KEY_BASE64: encoded,
    REQUEST_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
  };
  return {
    provider,
    repository,
    sessions,
    service,
    bindings,
    handler: createPublicRegistrationHttpHandler(bindings, service),
  };
}
const request = (body: string, origin = "https://meneerhealth.co.za") =>
  new Request("https://meneerhealth.co.za/account/sign-up", {
    method: "POST",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
describe("public registration boundary", () => {
  it("passes the shared POST gateway and limits readiness reads before provider calls", async () => {
    const s = setup();
    const post = request("action=request&email=signup%40example.invalid");
    const inspected = await inspectPublicRequest(post, s.bindings.REQUEST_RATE_LIMITER);
    expect(inspected.allowed).toBe(true);
    expect(inspected.decision.routeClass).toBe("protected-command");
    s.bindings.REQUEST_RATE_LIMITER.limit.mockResolvedValue({ success: false });
    const get = new Request("https://meneerhealth.co.za/account/sign-up/availability");
    expect((await s.handler(get)).status).toBe(429);
    expect(s.repository.available).not.toHaveBeenCalled();
  });
  it("is default-off and checks native availability before sends", async () => {
    const s = setup("disabled");
    expect((await s.handler(request("action=request&email=signup%40example.invalid"))).status).toBe(
      412,
    );
    expect(s.provider.requestPublicRegistration).not.toHaveBeenCalled();
    const enabled = setup();
    enabled.repository.available.mockResolvedValue(false);
    expect(
      (await enabled.handler(request("action=request&email=signup%40example.invalid"))).status,
    ).toBe(412);
    expect(enabled.provider.requestPublicRegistration).not.toHaveBeenCalled();
  });
  it("reserves only hashed contact send budget, then requests one OTP", async () => {
    const s = setup();
    const result = await s.handler(request("action=request&email=signup%40example.invalid"));
    expect(result.status).toBe(202);
    expect(s.repository.reserveSend).toHaveBeenCalledWith(
      tenant,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(s.provider.requestPublicRegistration).toHaveBeenCalledWith(
      "signup@example.invalid",
      "https://meneerhealth.co.za/start",
    );
    expect(s.sessions.continueAfterActivation).not.toHaveBeenCalled();
    expect(s.repository.prepare).not.toHaveBeenCalled();
  });
  it("exhausted send budget never sends or grants, with the same outward response", async () => {
    const s = setup();
    s.repository.reserveSend.mockResolvedValue(false);
    expect((await s.handler(request("action=request&email=signup%40example.invalid"))).status).toBe(
      202,
    );
    expect(s.provider.requestPublicRegistration).not.toHaveBeenCalled();
  });
  it("verified own-email OTP creates only a sealed activation continuation", async () => {
    const s = setup();
    const response = await s.handler(
      request("action=verify&email=signup%40example.invalid&code=123456"),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("X-Meneer-Session")).toBe("activation");
    const cookie = response.headers.get("Set-Cookie")!;
    expect(cookie).toContain("HttpOnly; Secure; SameSite=Strict");
    const proof = await openPreactivationProof(
      cookie.split(";")[0]!.slice(preactivationCookieName.length + 1),
      key,
    );
    expect(proof).toMatchObject({
      invitationId: invitation,
      tenantId: tenant,
      providerSubject: subject,
    });
    expect(s.sessions.continueAfterActivation).not.toHaveBeenCalled();
    expect(await response.text()).toBe("");
  });
  it("returning accounts reuse the verified session without duplicate signup or a second OTP", async () => {
    const s = setup();
    s.repository.prepare.mockResolvedValue({ alreadyActive: true, invitationId: null });
    const response = await s.handler(
      request("action=verify&email=signup%40example.invalid&code=123456"),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("X-Meneer-Session")).toBe("ready");
    expect(response.headers.get("Set-Cookie")).not.toContain(preactivationCookieName);
    expect(s.provider.verifyEmailOtp).toHaveBeenCalledOnce();
    expect(s.sessions.continueAfterActivation).toHaveBeenCalledOnce();
  });
  it("a different verified mailbox cannot adopt the submitted address", async () => {
    const s = setup();
    s.provider.verifyAccessToken.mockResolvedValue({
      ...(await s.provider.verifyAccessToken()),
      verifiedContact: { kind: "email", value: "other@example.invalid", verifiedAt: new Date() },
    });
    const result = await s.handler(
      request("action=verify&email=signup%40example.invalid&code=123456"),
    );
    expect(result.status).toBe(422);
    expect(s.repository.prepare).not.toHaveBeenCalled();
    expect(s.provider.revokeSessions).toHaveBeenCalledWith("synthetic-access", "local");
  });
  it("native admission denial cannot be bypassed by an otherwise valid OTP", async () => {
    const s = setup();
    s.repository.prepare.mockRejectedValue(new IdentityRejectedError());
    expect(
      (await s.handler(request("action=verify&email=signup%40example.invalid&code=123456"))).status,
    ).toBe(422);
    expect(s.sessions.continueAfterActivation).not.toHaveBeenCalled();
  });
  it("denies cross-origin, extra fields, malformed codes and alternate hosts", async () => {
    const s = setup();
    expect(
      (
        await s.handler(
          request("action=request&email=signup%40example.invalid", "https://evil.invalid"),
        )
      ).status,
    ).toBe(403);
    expect(
      (await s.handler(request("action=verify&email=signup%40example.invalid&code=abc123"))).status,
    ).toBe(422);
    expect(
      (await s.handler(request("action=request&email=signup%40example.invalid&tenantId=other")))
        .status,
    ).toBe(422);
    expect(s.provider.requestPublicRegistration).not.toHaveBeenCalled();
  });
  it("revokes undeliverable continuation credentials instead of leaking tokens", async () => {
    const s = setup();
    const handler = createPublicRegistrationHttpHandler(
      { ...s.bindings, IDENTITY_PREACTIVATION_KEY_BASE64: undefined },
      s.service,
    );
    expect(
      (await handler(request("action=verify&email=signup%40example.invalid&code=123456"))).status,
    ).toBe(503);
    expect(s.provider.revokeSessions).toHaveBeenCalledWith("synthetic-access", "local");
  });
});
