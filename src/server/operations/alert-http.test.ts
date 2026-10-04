import { describe, expect, it, vi } from "vitest";
import { createAlertHttpHandler } from "./alert-http";
import { sealWorkforceProof } from "@/server/identity/workforce-session-cookie";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
const id = "a1000000-0000-4000-8000-000000000001";
const key = btoa("s".repeat(32));
async function setup() {
  const proof: WorkforceProof = {
    context: { subjectId: id, tenantId: id, role: "admin", purpose: "security_administration" },
    providerSessionId: id,
    sessionId: id,
    providerSession: {
      accessToken: "synthetic",
      refreshToken: "synthetic",
      expiresAt: new Date(Date.now() + 600_000),
    },
  };
  const workforce = {
    authorise: vi.fn().mockResolvedValue({
      identity: {
        providerSubject: id,
        providerSessionId: id,
        assurance: "aal2",
        verifiedContact: { value: "admin@example.invalid" },
      },
      context: proof.context,
    }),
  };
  const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
  const cookie = (await sealWorkforceProof(proof, new Date(Date.now() + 600_000), key)).split(
    ";",
    1,
  )[0]!;
  const handler = createAlertHttpHandler(
    {
      IDENTITY_SESSION_KEY_BASE64: key,
      REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
    },
    { workforce, rpc },
  );
  const request = (
    path = "read",
    fields: Record<string, string> = {},
    headers: Record<string, string> = {},
  ) =>
    new Request(`https://meneerhealth.co.za/staff/alerts/${path}`, {
      method: "POST",
      headers: {
        cookie,
        origin: "https://meneerhealth.co.za",
        "content-type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body: new URLSearchParams(fields),
    });
  return { workforce, rpc, handler, request };
}
describe("protected operations alert HTTP", () => {
  it("reads only a fresh administrator projection with private response headers", async () => {
    const s = await setup();
    const r = await s.handler(s.request());
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toContain("no-store");
    expect(s.rpc).toHaveBeenCalledWith(
      "read_operations_alerts",
      expect.objectContaining({ p_verified_email: "admin@example.invalid", p_subject_id: id }),
    );
  });
  it("denies wrong role and email-only assurance without invoking RPC", async () => {
    const s = await setup();
    s.workforce.authorise.mockResolvedValue({
      identity: { assurance: "aal1" },
      context: { role: "operations", purpose: "operations" },
    });
    expect((await s.handler(s.request())).status).toBe(403);
    expect(s.rpc).not.toHaveBeenCalled();
  });
  it("rejects missing cookie, foreign origin and browser-supplied authority", async () => {
    const s = await setup();
    expect((await s.handler(s.request("read", {}, { cookie: "" }))).status).toBe(401);
    expect(
      (await s.handler(s.request("read", {}, { origin: "https://foreign.invalid" }))).status,
    ).toBe(403);
    expect(
      (
        await s.handler(
          s.request("respond", {
            alertId: id,
            action: "acknowledged",
            requestKey: id,
            tenantId: id,
          }),
        )
      ).status,
    ).toBe(422);
    expect(s.rpc).not.toHaveBeenCalled();
  });
  it("persists explicit human intent and rejects conflicting receipt", async () => {
    const s = await setup();
    s.rpc.mockResolvedValue({ data: id, error: null });
    expect(
      (
        await s.handler(
          s.request("respond", { alertId: id, action: "acknowledged", requestKey: id }),
        )
      ).status,
    ).toBe(200);
    expect(s.rpc).toHaveBeenCalledWith(
      "respond_operations_alert",
      expect.objectContaining({ p_action: "acknowledged", p_alert_id: id }),
    );
    s.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    expect(
      (await s.handler(s.request("respond", { alertId: id, action: "resolved", requestKey: id })))
        .status,
    ).toBe(409);
  });
  it("fails closed on malformed projection or lost persistence", async () => {
    const s = await setup();
    s.rpc.mockResolvedValue({ data: [{ email: "client@example.invalid" }], error: null });
    expect((await s.handler(s.request())).status).toBe(503);
    s.rpc.mockRejectedValue(new Error("private diagnostics"));
    const r = await s.handler(s.request());
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("private");
  });
});
