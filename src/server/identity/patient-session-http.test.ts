import { describe, expect, it, vi } from "vitest";

import type { PatientSessionService } from "@/application/identity/patient-session-service";
import type { PatientSession } from "@/application/identity/patient-session-service";
import {
  openPatientSession,
  patientSessionCookieName,
  sealPatientSession,
} from "./patient-session-cookie";
import { createPatientSessionHttpHandler } from "./patient-session-http";

const origin = "https://meneerhealth.co.za";
const key = new Uint8Array(32).fill(7);
const encodedKey = btoa(String.fromCharCode(...key));
const now = Date.now();
const signedIn = {
  session: {
    id: "40000000-0000-4000-8000-000000000001",
    subjectId: "20000000-0000-4000-8000-000000000001",
    providerSessionId: "50000000-0000-4000-8000-000000000001",
    sessionClass: "patient",
    assurance: "aal1",
    status: "active",
    issuedAt: new Date(now),
    lastSeenAt: new Date(now),
    idleExpiresAt: new Date(now + 30 * 60_000),
    absoluteExpiresAt: new Date(now + 12 * 60 * 60_000),
  },
  providerSession: {
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
    expiresAt: new Date(now + 15 * 60_000),
  },
  providerIdentity: {
    provider: "supabase",
    providerSubject: "30000000-0000-4000-8000-000000000001",
    providerSessionId: "50000000-0000-4000-8000-000000000001",
    assurance: "aal1",
    authenticatedAt: new Date(now),
    expiresAt: new Date(now + 15 * 60_000),
    verifiedContact: { kind: "email", value: "patient@example.invalid", verifiedAt: new Date(now) },
  },
  tenantId: "10000000-0000-4000-8000-000000000001",
} as PatientSession;

function post(path: string, body: string, cookie?: string, originHeader = origin): Request {
  return new Request(`${origin}${path}`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: originHeader,
      "Sec-Fetch-Site": "same-origin",
      ...(cookie ? { Cookie: `${patientSessionCookieName}=${cookie}` } : {}),
    },
  });
}

function harness(keyValue: unknown = encodedKey) {
  const service = {
    requestSignIn: vi.fn(async () => undefined),
    signIn: vi.fn(async () => signedIn),
    renew: vi.fn(async () => signedIn),
    signOut: vi.fn(async () => undefined),
    requestRecovery: vi.fn(async () => undefined),
    completeRecovery: vi.fn(async () => undefined),
  } as unknown as PatientSessionService;
  const handler = createPatientSessionHttpHandler(
    {
      IDENTITY_SESSION_KEY_BASE64: keyValue,
      REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
    },
    service,
  );
  return { handler, service };
}

describe("patient session HTTP boundary", () => {
  it("returns generic request response and no email or token payload", async () => {
    const { handler, service } = harness();
    const response = await handler(
      post("/account/sign-in", "action=request&email=patient%40example.invalid"),
    );
    expect(response.status).toBe(202);
    expect(await response.text()).toBe("");
    expect(response.headers.has("Set-Cookie")).toBe(false);
    expect(service.requestSignIn).toHaveBeenCalledWith(
      "patient@example.invalid",
      `${origin}/account/sign-in`,
    );
  });

  it("issues an encrypted host-only cookie after server approval", async () => {
    const { handler } = harness();
    const response = await handler(
      post("/account/sign-in", "action=verify&email=patient%40example.invalid&code=123456"),
    );
    expect(response.status).toBe(204);
    const cookie = response.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain("HttpOnly; Secure; SameSite=Strict");
    expect(cookie).not.toContain("synthetic-access");
    const token = cookie.match(new RegExp(`${patientSessionCookieName}=([^;]+)`))?.[1];
    await expect(openPatientSession(token, key)).resolves.toMatchObject({
      sessionId: signedIn.session.id,
    });
  });

  it("revokes a created session if its proof cannot be safely delivered", async () => {
    const { handler, service } = harness();
    vi.mocked(service.signIn).mockResolvedValue({
      ...signedIn,
      providerSession: { ...signedIn.providerSession, accessToken: "x".repeat(5_000) },
    });
    const response = await handler(
      post("/account/sign-in", "action=verify&email=patient%40example.invalid&code=123456"),
    );
    expect(response.status).toBe(503);
    expect(response.headers.has("Set-Cookie")).toBe(false);
    expect(service.signOut).toHaveBeenCalledOnce();
  });

  it("renews only with a valid cookie and clears it on invalid or revoked session", async () => {
    const { handler, service } = harness();
    const token = await sealPatientSession(signedIn, key);
    expect((await handler(post("/account/session/renew", "action=renew", token))).status).toBe(204);
    expect(service.renew).toHaveBeenCalledOnce();
    const denied = await handler(post("/account/session/renew", "action=renew", `${token}x`));
    expect(denied.status).toBe(401);
    expect(denied.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("signs out server-side and clears the browser cookie", async () => {
    const { handler, service } = harness();
    const token = await sealPatientSession(signedIn, key);
    const response = await handler(post("/account/sign-out", "action=sign-out", token));
    expect(response.status).toBe(204);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(service.signOut).toHaveBeenCalledOnce();
  });

  it("rejects cross-origin requests and fails closed without the server key", async () => {
    const { handler, service } = harness();
    expect(
      (
        await handler(
          post(
            "/account/sign-in",
            "action=request&email=patient%40example.invalid",
            undefined,
            "https://evil.invalid",
          ),
        )
      ).status,
    ).toBe(403);
    expect(service.requestSignIn).not.toHaveBeenCalled();
    const missing = harness(null);
    expect(
      (
        await missing.handler(
          post("/account/sign-in", "action=request&email=patient%40example.invalid"),
        )
      ).status,
    ).toBe(503);
    expect(missing.service.requestSignIn).not.toHaveBeenCalled();
  });

  it("completes recovery without issuing a new authorising cookie", async () => {
    const { handler, service } = harness();
    const response = await handler(
      post("/account/recover", "action=verify&email=patient%40example.invalid&code=123456"),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(service.completeRecovery).toHaveBeenCalledWith("patient@example.invalid", "123456");
  });
});
