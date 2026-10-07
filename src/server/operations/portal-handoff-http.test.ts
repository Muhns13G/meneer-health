import { expect, it, vi } from "vitest";
import { createPortalHandoffHttpHandler } from "./portal-handoff-http";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
const id = "b6000000-0000-4000-8000-000000000011";
vi.mock("@/server/identity/patient-session-cookie", () => ({
  patientSessionCookieName: "synthetic-session",
  readPatientSessionCookie: () => "synthetic-sealed",
  readPatientSessionKey: () => new Uint8Array(32),
  openPatientSession: async () => ({ sessionId: id, tenantId: id, subjectId: id }),
}));
function setup() {
  const authorise = vi.fn(async () => ({
    context: {
      tenantId: id,
      subjectId: id,
      sessionId: id,
      providerSubject: id,
      providerSessionId: id,
      verifiedEmail: "client@example.invalid",
      purpose: "account" as const,
    },
  }));
  const issue = vi.fn(async (...args: unknown[]) => {
    void args;
    return id;
  });
  const bindings = {
    IDENTITY_SESSION_KEY_BASE64: "synthetic",
    REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
    HANDOFF_INTAKE_URL: "https://protocols.example.invalid/intake/synthetic",
    HANDOFF_DESTINATION_ID: id,
    HANDOFF_DESTINATION_VERSION: "1",
  };
  const request = (
    body: Record<string, string> = { requestKey: id },
    headers = {},
    path = "/portal/handoff/open",
  ) =>
    new Request(`https://meneerhealth.co.za${path}`, {
      method: "POST",
      headers: {
        origin: "https://meneerhealth.co.za",
        cookie: "synthetic-session=sealed",
        "content-type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body: new URLSearchParams(body),
    });
  return {
    authorise,
    issue,
    bindings,
    request,
    handler: createPortalHandoffHttpHandler(bindings, { authorise, issue }),
  };
}
it("returns the link only after live own-account authority and durable issuance", async () => {
  const h = setup();
  const response = await h.handler(h.request());
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(response.headers.get("Vary")).toBe("Cookie");
  expect(await response.json()).toEqual({ url: h.bindings.HANDOFF_INTAKE_URL });
  expect(h.authorise).toHaveBeenCalledOnce();
  expect(h.issue).toHaveBeenCalledOnce();
  expect(h.issue.mock.calls[0]?.[0]).toMatchObject({ subjectId: id, purpose: "account" });
});
it("rejects cross-origin, query, extra target and ambiguous cookie requests before issuing", async () => {
  const h = setup();
  expect(
    (await h.handler(h.request({}, { origin: "https://attacker.example.invalid" }))).status,
  ).toBe(403);
  expect(
    (
      await h.handler(
        h.request({ requestKey: id, url: "https://attacker.example.invalid" } as {
          requestKey: string;
        }),
      )
    ).status,
  ).toBe(422);
  expect(
    (await h.handler(h.request({ requestKey: id }, {}, "/portal/handoff/open?case=forged"))).status,
  ).toBe(404);
  expect((await h.handler(h.request({ requestKey: id }, { cookie: "" }))).status).toBe(401);
  expect(
    (
      await h.handler(
        h.request({ requestKey: id }, { cookie: "synthetic-session=one; synthetic-session=two" }),
      )
    ).status,
  ).toBe(401);
  expect(h.issue).not.toHaveBeenCalled();
});
it("does not release links after failed authority, missing configuration or storage", async () => {
  const h = setup();
  h.authorise.mockRejectedValueOnce(new IdentityRejectedError());
  expect((await h.handler(h.request())).status).toBe(401);
  h.issue.mockRejectedValueOnce(new Error("HANDOFF_NOT_READY"));
  const denied = await h.handler(h.request());
  expect(denied.status).toBe(412);
  expect(await denied.text()).not.toContain("protocols");
  h.issue.mockRejectedValueOnce(new Error("synthetic storage failed"));
  expect((await h.handler(h.request())).status).toBe(503);
  const disabled = createPortalHandoffHttpHandler(
    { REQUEST_RATE_LIMITER: h.bindings.REQUEST_RATE_LIMITER },
    { authorise: h.authorise, issue: h.issue },
  );
  expect((await disabled(h.request())).status).toBe(503);
});
