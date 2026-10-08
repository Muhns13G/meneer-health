import { describe, expect, it, vi } from "vitest";
import { createMobileInvitationHttpHandler } from "./mobile-invitation-http";
import { sealWorkforceProof } from "./workforce-session-cookie";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import {
  MobileInvitationBudgetError,
  MobileInvitationConflictError,
} from "@/application/identity/mobile-invitation";
const id = "a1430000-0000-4000-8000-000000000001";
const key = btoa("s".repeat(32));
const proof: WorkforceProof = {
  context: { subjectId: id, tenantId: id, role: "operations", purpose: "operations" },
  providerSessionId: id,
  sessionId: id,
  providerSession: {
    accessToken: "synthetic",
    refreshToken: "synthetic",
    expiresAt: new Date(Date.now() + 600_000),
  },
};
async function setup() {
  const workforce = {
    authorise: vi.fn().mockResolvedValue({
      identity: { assurance: "aal2", expiresAt: new Date(Date.now() + 600_000) },
      context: proof.context,
      session: {
        idleExpiresAt: new Date(Date.now() + 500_000),
        absoluteExpiresAt: new Date(Date.now() + 600_000),
      },
    }),
  };
  const repository = {
    read: vi.fn().mockResolvedValue({
      invitations: [],
      nextId: null,
      reservationEnabled: false,
      sendingEnabled: false,
    }),
    command: vi.fn().mockResolvedValue({
      invitationId: id,
      version: 1,
      status: "draft",
      action: "review",
      smsSent: false,
    }),
  };
  const cookie = (await sealWorkforceProof(proof, new Date(Date.now() + 600_000), key)).split(
    ";",
    1,
  )[0]!;
  const limit = vi.fn().mockResolvedValue({ success: true });
  const handler = createMobileInvitationHttpHandler(
    { IDENTITY_SESSION_KEY_BASE64: key, REQUEST_RATE_LIMITER: { limit } },
    { workforce, repository },
  );
  const request = (
    fields: Record<string, string> = { afterId: "" },
    path = "read",
    headers: Record<string, string> = {},
  ) =>
    new Request(`https://meneerhealth.co.za/staff/mobile-invitations/${path}`, {
      method: "POST",
      headers: {
        cookie,
        origin: "https://meneerhealth.co.za",
        "content-type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body: new URLSearchParams(fields),
    });
  return { workforce, repository, limit, handler, request };
}
const command = { action: "review", invitationId: id, expectedVersion: "1", requestKey: id };
describe("private mobile invitation HTTP", () => {
  it("rechecks authority and returns private expiry-bound projections", async () => {
    const s = await setup();
    const response = await s.handler(s.request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-session-expires-at")).not.toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(s.workforce.authorise).toHaveBeenCalledOnce();
    expect(s.repository.read).toHaveBeenCalledWith(expect.anything(), expect.anything(), null);
  });
  it("rejects anonymous, cross-origin, oversized and duplicate requests", async () => {
    const s = await setup();
    expect((await s.handler(s.request(command, "command", { cookie: "" }))).status).toBe(401);
    expect(
      (await s.handler(s.request(command, "command", { origin: "https://evil.invalid" }))).status,
    ).toBe(403);
    expect((await s.handler(s.request({ afterId: "x".repeat(2100) }))).status).toBe(413);
    const r = s.request();
    expect(
      (
        await s.handler(
          new Request(r.url, { method: "POST", headers: r.headers, body: "afterId=&afterId=" }),
        )
      ).status,
    ).toBe(422);
    expect(s.repository.command).not.toHaveBeenCalled();
    expect(s.repository.read).not.toHaveBeenCalled();
  });
  it.each(["tenantId", "role", "purpose", "token", "delivered", "paid", "email"])(
    "rejects client-supplied %s",
    async (field) => {
      const s = await setup();
      expect((await s.handler(s.request({ ...command, [field]: id }, "command"))).status).toBe(422);
      expect(s.repository.command).not.toHaveBeenCalled();
    },
  );
  it.each(["admin", "support", "auditor", "clinician", "pharmacy", "release"])(
    "denies %s roster access",
    async (role) => {
      const s = await setup();
      s.workforce.authorise.mockResolvedValue({ context: { ...proof.context, role } });
      expect((await s.handler(s.request())).status).toBe(403);
      expect(s.repository.read).not.toHaveBeenCalled();
    },
  );
  it("does not accept operations role for a different purpose", async () => {
    const s = await setup();
    s.workforce.authorise.mockResolvedValue({
      context: { ...proof.context, purpose: "care_delivery" },
    });
    expect((await s.handler(s.request())).status).toBe(403);
  });
  it("preserves conflict, budget and unavailable outcomes without provider retries or private errors", async () => {
    const s = await setup();
    for (const [error, status] of [
      [new MobileInvitationConflictError(), 409],
      [new MobileInvitationBudgetError(), 429],
      [new Error("synthetic-private-contact"), 503],
    ] as const) {
      s.repository.command.mockRejectedValue(error);
      const response = await s.handler(s.request(command, "command"));
      expect(response.status).toBe(status);
      expect(await response.text()).toBe("");
    }
    expect(s.repository.command).toHaveBeenCalledTimes(3);
    s.workforce.authorise.mockRejectedValue(new IdentityRejectedError());
    expect((await s.handler(s.request())).status).toBe(403);
  });
  it("supports every deliberate action without a provider binding", async () => {
    const s = await setup();
    const create = {
      action: "create",
      requestKey: id,
      givenName: "Synthetic",
      familyName: "Participant",
      phone: "+999000000001",
      provenanceReference: id,
      contactAuthorityReference: id,
    };
    for (const fields of [
      create,
      ...["review", "send", "resend", "revoke"].map((action) => ({ ...command, action })),
    ])
      expect((await s.handler(s.request(fields, "command"))).status).toBe(200);
    expect(s.repository.command).toHaveBeenCalledTimes(5);
  });
  it("denies GET, query strings, unknown endpoints and exhausted request budget", async () => {
    const s = await setup();
    expect((await s.handler(new Request(s.request().url))).status).toBe(405);
    expect((await s.handler(new Request(`${s.request().url}?token=secret`))).status).toBe(404);
    expect((await s.handler(s.request({}, "override"))).status).toBe(404);
    s.limit.mockResolvedValue({ success: false });
    expect((await s.handler(s.request())).status).toBe(429);
    expect(s.repository.read).not.toHaveBeenCalled();
  });
});
