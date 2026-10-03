import { expect, it, vi } from "vitest";
import { createPatientPortalHttpHandler } from "./patient-portal-http";
import { sealPatientSession, patientSessionCookieName } from "./patient-session-cookie";
import { portalAccountFixture } from "@/test/patient-portal-fixture";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
const id = "97000000-0000-4000-8000-000000000001";
const origin = "https://meneerhealth.co.za";
async function harness() {
  const now = new Date();
  const expiry = new Date(Date.now() + 60000);
  const key = new Uint8Array(32).fill(7);
  const token = await sealPatientSession(
    {
      tenantId: id,
      session: {
        id,
        subjectId: id,
        providerSessionId: id,
        sessionClass: "patient",
        assurance: "aal1",
        status: "active",
        issuedAt: now,
        lastSeenAt: now,
        idleExpiresAt: expiry,
        absoluteExpiresAt: expiry,
      },
      providerSession: {
        accessToken: "synthetic-access",
        refreshToken: "synthetic-refresh",
        expiresAt: expiry,
      },
      providerIdentity: {
        provider: "supabase",
        providerSubject: id,
        providerSessionId: id,
        assurance: "aal1",
        authenticatedAt: now,
        expiresAt: expiry,
        verifiedContact: { kind: "email", value: "portal@example.invalid", verifiedAt: now },
      },
    },
    key,
  );
  const read = vi.fn(async () => ({
    account: portalAccountFixture,
    expiresAt: expiry.toISOString(),
  }));
  const limit = vi.fn(async () => ({ success: true }));
  const handler = createPatientPortalHttpHandler(
    {
      IDENTITY_SESSION_KEY_BASE64: btoa(String.fromCharCode(...key)),
      REQUEST_RATE_LIMITER: { limit },
    },
    { read },
  );
  const request = (
    headers: Record<string, string> = {},
    path = "/portal/account",
    method = "GET",
  ) =>
    new Request(`${origin}${path}`, {
      method,
      headers: { Cookie: `${patientSessionCookieName}=${token}`, ...headers },
    });
  return { handler, read, limit, request, token };
}
it("requires exactly one valid sealed cookie and exposes no credential", async () => {
  const h = await harness();
  expect((await h.handler(h.request({ Cookie: "" }))).status).toBe(401);
  expect(
    (await h.handler(h.request({ Cookie: `${patientSessionCookieName}=forged` }))).status,
  ).toBe(401);
  expect(
    (
      await h.handler(
        h.request({
          Cookie: `${patientSessionCookieName}=${h.token}; ${patientSessionCookieName}=${h.token}`,
        }),
      )
    ).status,
  ).toBe(401);
  expect(h.read).not.toHaveBeenCalled();
  const result = await h.handler(h.request());
  expect(result.status).toBe(200);
  expect(result.headers.get("Cache-Control")).toContain("no-store");
  expect(result.headers.get("Vary")).toBe("Cookie");
  expect(result.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(await result.text()).not.toMatch(/synthetic-access|synthetic-refresh|tenantId|subjectId/);
});
it("rejects cross-origin reads, query authority, methods and framed bodies", async () => {
  const h = await harness();
  expect((await h.handler(h.request({ Origin: "https://example.invalid" }))).status).toBe(403);
  expect((await h.handler(h.request({ "sec-fetch-site": "cross-site" }))).status).toBe(403);
  expect((await h.handler(h.request({}, "/portal/account?tenant=forged"))).status).toBe(405);
  expect((await h.handler(h.request({}, "/portal/account", "HEAD"))).status).toBe(405);
  expect((await h.handler(h.request({}, "/portal/account", "POST"))).status).toBe(405);
  expect((await h.handler(h.request({ "Content-Length": "1" }))).status).toBe(400);
  expect(h.read).not.toHaveBeenCalled();
});
it("rate limits and redacts failed authority without returning cached data", async () => {
  const h = await harness();
  h.limit.mockResolvedValueOnce({ success: false });
  expect((await h.handler(h.request())).status).toBe(429);
  expect(h.read).not.toHaveBeenCalled();
  h.read.mockRejectedValueOnce(new IdentityRejectedError());
  const denied = await h.handler(h.request());
  expect(denied.status).toBe(401);
  expect(denied.headers.get("Set-Cookie")).toContain("Max-Age=0");
  h.read.mockRejectedValueOnce(new Error("private detail"));
  const failed = await h.handler(h.request());
  expect(failed.status).toBe(503);
  expect(await failed.text()).toBe("");
});
