import { describe, expect, it, vi } from "vitest";
import { createQueueHttpHandler } from "./queue-http";
import { sealWorkforceProof } from "@/server/identity/workforce-session-cookie";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
const id = "a1000000-0000-4000-8000-000000000001";
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
      identity: { expiresAt: new Date(Date.now() + 600_000) },
      context: proof.context,
      session: {
        idleExpiresAt: new Date(Date.now() + 600_000),
        absoluteExpiresAt: new Date(Date.now() + 600_000),
      },
    }),
  };
  const queue = {
    list: vi.fn().mockResolvedValue({ cases: [], nextCursor: null }),
    detail: vi.fn().mockResolvedValue({}),
  };
  const cookie = (await sealWorkforceProof(proof, new Date(Date.now() + 600_000), key)).split(
    ";",
    1,
  )[0]!;
  const handler = createQueueHttpHandler(
    {
      IDENTITY_SESSION_KEY_BASE64: key,
      REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
    },
    { workforce, queue },
  );
  const request = (
    fields: Record<string, string> = { state: "", afterCreatedAt: "", afterId: "" },
    path = "read",
    headers: Record<string, string> = {},
  ) =>
    new Request(`https://meneerhealth.co.za/staff/queue/${path}`, {
      method: "POST",
      headers: {
        cookie,
        origin: "https://meneerhealth.co.za",
        "content-type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body: new URLSearchParams(fields),
    });
  return { workforce, queue, handler, request };
}
describe("scoped queue HTTP", () => {
  it("authorises each read and uses private no-store responses without renewing", async () => {
    const s = await setup();
    const r = await s.handler(s.request());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ cases: [], nextCursor: null });
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect(r.headers.get("set-cookie")).toBeNull();
    expect(s.workforce.authorise).toHaveBeenCalledOnce();
    expect(s.queue.list).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: expect.any(Date) }),
      expect.objectContaining({ sessionId: id }),
      {
        state: null,
        cursor: null,
      },
    );
  });
  it("denies anonymous, foreign origin, oversized and unexpected scope fields", async () => {
    const s = await setup();
    expect((await s.handler(s.request(undefined, "read", { cookie: "" }))).status).toBe(401);
    expect(
      (await s.handler(s.request(undefined, "read", { origin: "https://evil.invalid" }))).status,
    ).toBe(403);
    expect((await s.handler(s.request({ state: "x".repeat(600) }))).status).toBe(413);
    for (const field of ["role", "tenantId", "purpose", "subjectId", "limit"]) {
      expect(
        (await s.handler(s.request({ state: "", afterCreatedAt: "", afterId: "", [field]: id })))
          .status,
      ).toBe(422);
    }
    expect(s.queue.list).not.toHaveBeenCalled();
  });
  it.each(["support", "admin", "auditor", "release", "clinician", "pharmacy"])(
    "denies %s routine case browsing",
    async (role) => {
      const s = await setup();
      s.workforce.authorise.mockResolvedValue({
        identity: {},
        context: { ...proof.context, role },
      });
      expect((await s.handler(s.request())).status).toBe(403);
      expect(s.queue.list).not.toHaveBeenCalled();
    },
  );
  it("fails closed after live revocation or assignment denial without private errors", async () => {
    const s = await setup();
    s.queue.detail.mockRejectedValue(new IdentityRejectedError());
    const r = await s.handler(s.request({ caseId: id }, "detail"));
    expect(r.status).toBe(403);
    expect(await r.text()).toBe("");
    s.workforce.authorise.mockRejectedValue(new IdentityRejectedError());
    expect((await s.handler(s.request())).status).toBe(403);
  });
  it("rejects malformed cursors, invalid state and duplicate fields", async () => {
    const s = await setup();
    for (const fields of [
      { state: "not-real", afterCreatedAt: "", afterId: "" },
      { state: "", afterCreatedAt: "", afterId: id },
    ])
      expect((await s.handler(s.request(fields))).status).toBe(422);
    const r = s.request();
    expect(
      (
        await s.handler(
          new Request(r.url, {
            method: "POST",
            headers: r.headers,
            body: "state=&state=&afterCreatedAt=&afterId=",
          }),
        )
      ).status,
    ).toBe(422);
    expect(s.queue.list).not.toHaveBeenCalled();
  });
});
