import { expect, it, vi } from "vitest";
import { createPatientRightsHttpHandler } from "./patient-rights-http";
import { sealPatientSession, patientSessionCookieName } from "./patient-session-cookie";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { PatientRightsConflictError } from "@/domain/identity/patient-rights";
const id = "98000000-0000-4000-8000-000000000001";
const origin = "https://meneerhealth.co.za";
async function harness() {
  const now = new Date();
  const expiresAt = new Date(Date.now() + 60000);
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
        idleExpiresAt: expiresAt,
        absoluteExpiresAt: expiresAt,
      },
      providerSession: { accessToken: "synthetic", refreshToken: "synthetic", expiresAt },
      providerIdentity: {
        provider: "supabase",
        providerSubject: id,
        providerSessionId: id,
        assurance: "aal1",
        authenticatedAt: now,
        expiresAt,
        verifiedContact: { kind: "email", value: "rights@example.invalid", verifiedAt: now },
      },
    },
    key,
  );
  const execute = vi.fn(async () => ({
    reference: id,
    outcome: "received" as const,
    profileVersion: 1,
  }));
  const limit = vi.fn(async () => ({ success: true }));
  const handler = createPatientRightsHttpHandler(
    {
      IDENTITY_SESSION_KEY_BASE64: btoa(String.fromCharCode(...key)),
      REQUEST_RATE_LIMITER: { limit },
    },
    { execute },
  );
  const request = (
    headers: Record<string, string> = {},
    body = JSON.stringify({
      action: "request",
      kind: "export",
      expectedVersion: 1,
      requestKey: id,
    }),
    path = "/portal/rights/command",
    method = "POST",
  ) =>
    new Request(`${origin}${path}`, {
      method,
      headers: {
        Cookie: `${patientSessionCookieName}=${token}`,
        Origin: origin,
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...headers,
      },
      ...(method === "POST" ? { body } : {}),
    });
  return { handler, request, execute, limit, token };
}
it("requires a sealed unique cookie, same origin and matching request key", async () => {
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
  expect((await h.handler(h.request({ Origin: "https://example.invalid" }))).status).toBe(403);
  expect((await h.handler(h.request({ "Sec-Fetch-Site": "cross-site" }))).status).toBe(403);
  expect((await h.handler(h.request({ "Idempotency-Key": "" }))).status).toBe(400);
  expect(
    (await h.handler(h.request({ "Idempotency-Key": "98000000-0000-4000-8000-000000000002" })))
      .status,
  ).toBe(422);
  expect(h.execute).not.toHaveBeenCalled();
  const result = await h.handler(h.request());
  expect(result.status).toBe(200);
  expect(result.headers.get("Cache-Control")).toContain("no-store");
  expect(result.headers.get("Vary")).toBe("Cookie");
  expect(await result.text()).not.toMatch(/tenantId|subjectId|synthetic|email/);
});
it("bounds and validates transport, query and methods before execution", async () => {
  const h = await harness();
  expect(
    (await h.handler(h.request({}, "{}", "/portal/rights/command?subject=forged"))).status,
  ).toBe(405);
  expect((await h.handler(h.request({}, "", "/portal/rights/command", "GET"))).status).toBe(405);
  expect((await h.handler(h.request({ "Content-Type": "text/plain" }))).status).toBe(400);
  expect((await h.handler(h.request({}, "{"))).status).toBe(400);
  expect((await h.handler(h.request({}, " ".repeat(1025)))).status).toBe(413);
  h.limit.mockResolvedValueOnce({ success: false });
  expect((await h.handler(h.request())).status).toBe(429);
  expect(h.execute).not.toHaveBeenCalled();
});
it("never confirms success on conflict, authority or storage failure", async () => {
  const h = await harness();
  for (const [error, status] of [
    [new PatientRightsConflictError(), 409],
    [new IdentityRejectedError(), 401],
    [new Error("secret"), 503],
  ] as const) {
    h.execute.mockRejectedValueOnce(error);
    const response = await h.handler(h.request());
    expect(response.status).toBe(status);
    expect(await response.text()).toBe("");
  }
});
