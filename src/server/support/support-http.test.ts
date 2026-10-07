import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { executeWithRequestTimeout } from "@/server/security/request-security";
import { createSupportHttpHandler } from "./support-http";
import {
  sealPatientSession,
  patientSessionCookieName,
} from "@/server/identity/patient-session-cookie";
import { sealWorkforceProof } from "@/server/identity/workforce-session-cookie";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
const id = "f1300000-0000-4000-8000-000000000001";
const origin = "https://meneerhealth.co.za";
async function setup() {
  const now = new Date(),
    expiresAt = new Date(Date.now() + 600000),
    secret = btoa("s".repeat(32));
  const identity = {
    provider: "supabase" as const,
    providerSubject: id,
    providerSessionId: id,
    assurance: "aal1" as const,
    authenticatedAt: now,
    expiresAt,
    verifiedContact: { kind: "email" as const, value: "support@example.invalid", verifiedAt: now },
  };
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
      providerIdentity: identity,
      providerSession: { accessToken: "synthetic", refreshToken: "synthetic", expiresAt },
    },
    new Uint8Array(32).fill(115),
  );
  const proof: WorkforceProof = {
    context: { tenantId: id, subjectId: id, role: "auditor", purpose: "privacy_review" },
    providerSessionId: id,
    sessionId: id,
    providerSession: { accessToken: "synthetic", refreshToken: "synthetic", expiresAt },
  };
  const staffCookie = (await sealWorkforceProof(proof, expiresAt, secret)).split(";", 1)[0]!;
  const patient = vi.fn().mockResolvedValue({
    tenantId: id,
    subjectId: id,
    sessionId: id,
    providerSubject: id,
    providerSessionId: id,
    verifiedEmail: identity.verifiedContact.value,
    purpose: "account",
  });
  const workforce = {
    authorise: vi
      .fn()
      .mockResolvedValue({ identity: { ...identity, assurance: "aal2" }, context: proof.context }),
  };
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: { outcome: "received", reference: id }, error: null });
  const limit = vi.fn().mockResolvedValue({ success: true });
  const handler = createSupportHttpHandler(
    { IDENTITY_SESSION_KEY_BASE64: secret, REQUEST_RATE_LIMITER: { limit } },
    { patient, workforce, rpc },
  );
  function request(
    body: unknown = { action: "request", purpose: "privacy", urgent: false, requestKey: id },
    headers: Record<string, string> = {},
    staff = false,
    path = staff ? "/staff/support/command" : "/portal/support/command",
  ) {
    return new Request(origin + path, {
      method: "POST",
      headers: {
        cookie: staff ? staffCookie : `${patientSessionCookieName}=${token}`,
        origin,
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }
  return { handler, request, patient, workforce, rpc, limit };
}
it("keeps both support routes ahead of the staff catch-all and reads the bounded request", async () => {
  const h = await setup();
  expect((await executeWithRequestTimeout(h.request(), h.handler)).status).toBe(200);
  const entry = readFileSync("src/server.ts", "utf8");
  expect(entry.indexOf("createSupportHttpHandler(env")).toBeLessThan(
    entry.indexOf('pathname.startsWith("/staff/")'),
  );
  expect(entry).toMatch(/createSupportHttpHandler\([^)]*\)\(\s*boundedRequest,?\s*\)/);
});
it("binds the support command to a sealed patient session with private response", async () => {
  const h = await setup();
  const r = await h.handler(h.request());
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(r.headers.get("vary")).toBe("Cookie");
  expect(h.rpc).toHaveBeenCalledWith(
    "patient_support_command",
    expect.objectContaining({
      p_context: expect.objectContaining({ tenantId: id, subjectId: id, purpose: "account" }),
    }),
  );
  expect(await r.text()).not.toMatch(/email|tenantId|subjectId/);
});
it("rejects forged cookies, foreign origins, extra data and mismatched replay keys", async () => {
  const h = await setup();
  expect((await h.handler(h.request(undefined, { cookie: "" }))).status).toBe(401);
  expect(
    (await h.handler(h.request(undefined, { origin: "https://foreign.invalid" }))).status,
  ).toBe(403);
  expect((await h.handler(h.request({ action: "read", tenantId: id }))).status).toBe(422);
  expect(
    (
      await h.handler(
        h.request({
          action: "request",
          purpose: "clinical",
          urgent: false,
          requestKey: id,
          notes: "private",
        }),
      )
    ).status,
  ).toBe(422);
  expect((await h.handler(h.request(undefined, { "Idempotency-Key": "" }))).status).toBe(422);
  expect((await h.handler(h.request(" ".repeat(1025)))).status).toBe(413);
  expect(h.rpc).not.toHaveBeenCalled();
});
it("checks principal limits and never returns false success or provider diagnostics", async () => {
  const h = await setup();
  h.limit.mockResolvedValueOnce({ success: false });
  expect((await h.handler(h.request())).status).toBe(429);
  for (const [code, status] of [
    ["42501", 403],
    ["40001", 409],
    ["PT409", 409],
    ["P0001", 429],
    ["unknown", 503],
  ] as const) {
    h.rpc.mockResolvedValueOnce({ data: null, error: { code, message: "private diagnostic" } });
    const r = await h.handler(h.request());
    expect(r.status).toBe(status);
    expect(await r.text()).toBe("");
  }
  h.rpc.mockResolvedValueOnce({
    data: { outcome: "received", reference: id, private: "data" },
    error: null,
  });
  expect((await h.handler(h.request())).status).toBe(503);
});
it("requires current AAL2 purpose/role and sends only derived workforce authority", async () => {
  const h = await setup();
  h.rpc.mockResolvedValue({ data: [], error: null });
  expect((await h.handler(h.request({ action: "read" }, {}, true))).status).toBe(200);
  expect(h.rpc).toHaveBeenCalledWith(
    "staff_support_command",
    expect.objectContaining({
      p_context: expect.objectContaining({ purpose: "privacy_review", subjectId: id }),
    }),
  );
  h.rpc.mockClear();
  h.workforce.authorise.mockResolvedValueOnce({
    identity: { assurance: "aal1" },
    context: { role: "auditor", purpose: "privacy_review" },
  });
  expect((await h.handler(h.request({ action: "read" }, {}, true))).status).toBe(403);
  h.workforce.authorise.mockResolvedValueOnce({
    identity: { assurance: "aal2" },
    context: { role: "operations", purpose: "privacy_review" },
  });
  expect((await h.handler(h.request({ action: "read" }, {}, true))).status).toBe(403);
  expect(h.rpc).not.toHaveBeenCalled();
});
it("denies query-based targeting and wrong methods", async () => {
  const h = await setup();
  expect(
    (
      await h.handler(
        h.request({ action: "read" }, {}, false, "/portal/support/command?subject=forged"),
      )
    ).status,
  ).toBe(404);
  expect(
    (await h.handler(new Request(origin + "/portal/support/command", { headers: { cookie: "" } })))
      .status,
  ).toBe(401);
  expect(h.rpc).not.toHaveBeenCalled();
});
it("reads strict purpose follow-up through AAL2 authority and rejects provider payloads", async () => {
  const h = await setup();
  const view = { cases: [], notifications: [], coverage: [] };
  h.rpc.mockResolvedValueOnce({ data: view, error: null });
  const response = await executeWithRequestTimeout(
    h.request({ action: "read" }, {}, true, "/staff/support/followup"),
    h.handler,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(view);
  expect(h.rpc).toHaveBeenCalledWith(
    "staff_support_followup",
    expect.objectContaining({
      p_context: expect.objectContaining({ purpose: "privacy_review", subjectId: id }),
    }),
  );
  h.rpc.mockResolvedValueOnce({ data: { ...view, email: "secret@example.invalid" }, error: null });
  expect(
    (await h.handler(h.request({ action: "read" }, {}, true, "/staff/support/followup"))).status,
  ).toBe(503);
  const calls = h.rpc.mock.calls.length;
  expect(
    (
      await h.handler(
        h.request(
          { action: "resend", reference: id, requestKey: id, reason: "timeout" },
          {},
          true,
          "/staff/support/followup",
        ),
      )
    ).status,
  ).toBe(422);
  expect(
    (
      await h.handler(
        h.request(
          {
            action: "resend",
            reference: id,
            requestKey: id,
            reason: "confirmed_non_acceptance",
            recipient: "secret@example.invalid",
          },
          {},
          true,
          "/staff/support/followup",
        ),
      )
    ).status,
  ).toBe(422);
  expect(h.rpc.mock.calls).toHaveLength(calls);
});
it("queues an exact audited resend command without contacting any email provider", async () => {
  const h = await setup();
  h.rpc.mockResolvedValueOnce({ data: id, error: null });
  const command = {
    action: "resend",
    reference: id,
    requestKey: id,
    reason: "confirmed_non_acceptance",
  };
  const response = await h.handler(h.request(command, {}, true, "/staff/support/followup"));
  expect(response.status).toBe(200);
  expect(await response.json()).toBe(id);
  expect(h.rpc).toHaveBeenCalledWith(
    "staff_support_followup",
    expect.objectContaining({ p_command: command }),
  );
  expect(
    (
      await h.handler(
        h.request(command, { "Idempotency-Key": "wrong" }, true, "/staff/support/followup"),
      )
    ).status,
  ).toBe(422);
});
it("limits administrator access to the coverage follow-up route", async () => {
  const h = await setup();
  h.workforce.authorise.mockResolvedValue({
    identity: { assurance: "aal2" },
    context: { role: "admin", purpose: "security_administration", tenantId: id, subjectId: id },
  });
  h.rpc.mockResolvedValue({ data: { cases: [], notifications: [], coverage: [] }, error: null });
  // Complete provider identity is still required even for administrators.
  expect(
    (await h.handler(h.request({ action: "read" }, {}, true, "/staff/support/followup"))).status,
  ).toBe(503);
  expect((await h.handler(h.request({ action: "read" }, {}, true))).status).toBe(403);
});
