import { describe, expect, it, vi } from "vitest";
import { createQueueHttpHandler } from "./queue-http";
import { sealWorkforceProof } from "@/server/identity/workforce-session-cookie";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { QueueConflictError, QueueReadinessError } from "@/application/operations/queue-command";
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
    command: vi.fn().mockResolvedValue({}),
    handoff: vi.fn().mockResolvedValue({}),
  };
  const boundary = {
    verifyEvidence: vi.fn().mockResolvedValue(id),
    approveDestination: vi.fn().mockResolvedValue(id),
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
    { workforce, queue, boundary },
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
  return { workforce, queue, boundary, handler, request };
}
describe("scoped queue HTTP", () => {
  it("takes only opaque reviewed evidence and denies operations destination approval", async () => {
    const s = await setup();
    const command = {
      caseId: id,
      attemptId: id,
      kind: "acknowledged",
      externalReference: id,
      sourceReference: id,
      observedAt: new Date().toISOString(),
      requestKey: id,
    };
    const result = await s.handler(s.request(command, "evidence"));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ evidenceId: id });
    expect(s.boundary.verifyEvidence).toHaveBeenCalledOnce();
    expect(
      (await s.handler(s.request({ ...command, protocol: "forbidden" }, "evidence"))).status,
    ).toBe(422);
    expect(
      (await s.handler(s.request({ approvalReference: id, requestKey: id }, "destination"))).status,
    ).toBe(403);
    expect(s.boundary.approveDestination).not.toHaveBeenCalled();
  });
  it("protects hand-off commands and cannot accept operator delivery or payment assertions", async () => {
    const s = await setup();
    const fields = {
      action: "prepare",
      caseId: id,
      expectedVersion: "1",
      requestKey: id,
      authorisationId: id,
    };
    expect((await s.handler(s.request(fields, "handoff"))).status).toBe(200);
    expect(s.queue.handoff).toHaveBeenCalledOnce();
    for (const field of ["paid", "delivered", "providerUrl", "notes", "subjectId"])
      expect((await s.handler(s.request({ ...fields, [field]: "x" }, "handoff"))).status).toBe(422);
    expect((await s.handler(s.request(fields, "handoff", { cookie: "" }))).status).toBe(401);
    expect(
      (await s.handler(s.request(fields, "handoff", { origin: "https://evil.invalid" }))).status,
    ).toBe(403);
    s.queue.handoff.mockRejectedValue(new QueueReadinessError());
    expect((await s.handler(s.request(fields, "handoff"))).status).toBe(412);
    s.queue.handoff.mockRejectedValue(new QueueConflictError());
    expect((await s.handler(s.request(fields, "handoff"))).status).toBe(409);
  });
  it("protects commands with live scope, exact fields and typed denial statuses", async () => {
    const s = await setup();
    const fields = { action: "claim", caseId: id, expectedVersion: "1", requestKey: id };
    expect((await s.handler(s.request(fields, "command"))).status).toBe(200);
    expect(s.queue.command).toHaveBeenCalledOnce();
    expect((await s.handler(s.request({ ...fields, paid: "true" }, "command"))).status).toBe(422);
    expect((await s.handler(s.request(fields, "command", { cookie: "" }))).status).toBe(401);
    expect(
      (await s.handler(s.request(fields, "command", { origin: "https://evil.invalid" }))).status,
    ).toBe(403);
    s.queue.command.mockRejectedValue(new QueueConflictError());
    expect((await s.handler(s.request(fields, "command"))).status).toBe(409);
    s.queue.command.mockRejectedValue(new QueueReadinessError());
    expect((await s.handler(s.request(fields, "command"))).status).toBe(412);
  });
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
