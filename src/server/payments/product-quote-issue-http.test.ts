import { expect, it, vi } from "vitest";
import { createProductQuoteIssueHttpHandler } from "./product-quote-issue-http";
import { sealWorkforceProof } from "@/server/identity/workforce-session-cookie";
import {
  productQuoteIssueFixture,
  quoteIssueFixtureId as id,
} from "@/test/product-quote-issue-fixture";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
async function setup() {
  const until = new Date(Date.now() + 300000),
    key = btoa("s".repeat(32));
  const proof: WorkforceProof = {
    context: { subjectId: id, tenantId: id, role: "operations", purpose: "operations" },
    sessionId: id,
    providerSessionId: id,
    providerSession: { accessToken: "synthetic", refreshToken: "synthetic", expiresAt: until },
  };
  const workforce = {
    authorise: vi.fn().mockResolvedValue({
      context: proof.context,
      identity: {
        providerSubject: id,
        providerSessionId: id,
        assurance: "aal2",
        verifiedContact: { value: "staff@example.invalid" },
        expiresAt: until,
      },
      session: { id, idleExpiresAt: until, absoluteExpiresAt: until },
    }),
  };
  const execute = vi.fn().mockResolvedValue(productQuoteIssueFixture());
  const bindings = {
    PRODUCT_ORDERING_MODE: "synthetic",
    PRODUCT_ORDERING_TENANT_ID: id,
    IDENTITY_SESSION_KEY_BASE64: key,
    REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
  const cookie = (await sealWorkforceProof(proof, until, key)).split(";")[0]!;
  const request = (
    body: unknown = { action: "read", caseId: id },
    headers: Record<string, string> = {},
    path = "/staff/products/issue",
  ) =>
    new Request(`https://meneerhealth.co.za${path}`, {
      method: "POST",
      headers: {
        cookie,
        origin: "https://meneerhealth.co.za",
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  return {
    workforce,
    execute,
    bindings,
    request,
    handler: createProductQuoteIssueHttpHandler(bindings, { workforce, execute }),
  };
}
it("uses exact native operations authority and private scope", async () => {
  const s = await setup();
  const r = await s.handler(s.request());
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(s.execute).toHaveBeenCalledWith(
    expect.objectContaining({ subjectId: id, tenantId: id, purpose: "operations" }),
    { action: "read", caseId: id },
    "local-synthetic",
  );
});
it.each(["disabled", "unknown"])("keeps %s closed", async (mode) => {
  const s = await setup();
  expect(
    (
      await createProductQuoteIssueHttpHandler(
        { ...s.bindings, PRODUCT_ORDERING_MODE: mode },
        s,
      )(s.request())
    ).status,
  ).toBe(412);
  expect(s.execute).not.toHaveBeenCalled();
});
it("denies missing cookie, wrong origin and forged money", async () => {
  const s = await setup();
  expect((await s.handler(s.request(undefined, { cookie: "" }))).status).toBe(401);
  expect((await s.handler(s.request(undefined, { origin: "https://evil.invalid" }))).status).toBe(
    403,
  );
  expect(
    (
      await s.handler(
        s.request({
          action: "issue",
          caseId: id,
          draftId: id,
          requestKey: id,
          amountTotalMinor: 1,
        }),
      )
    ).status,
  ).toBe(422);
  expect(s.execute).not.toHaveBeenCalled();
});
it("matches issue key and exact case result", async () => {
  const s = await setup();
  expect(
    (
      await s.handler(
        s.request({ action: "issue", caseId: id, draftId: id, requestKey: crypto.randomUUID() }),
      )
    ).status,
  ).toBe(422);
  s.execute.mockResolvedValue({ ...productQuoteIssueFixture(), caseId: crypto.randomUUID() });
  expect((await s.handler(s.request())).status).toBe(503);
});
it.each(["clinician", "security_administration"])("denies %s issue authority", async (role) => {
  const s = await setup();
  const authority = await s.workforce.authorise();
  s.workforce.authorise.mockResolvedValue({
    ...authority,
    context: { ...authority.context, role },
  });
  expect((await s.handler(s.request())).status).toBe(403);
  expect(s.execute).not.toHaveBeenCalled();
});
it("rejects stale private projections", async () => {
  const s = await setup();
  s.execute.mockResolvedValue({
    ...productQuoteIssueFixture(),
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  expect((await s.handler(s.request())).status).toBe(401);
});
it.each([
  ["42501", 403],
  ["PT409", 409],
  ["private-message", 503],
] as const)("redacts %s", async (code, status) => {
  const s = await setup();
  s.execute.mockRejectedValue(new Error(code));
  const r = await s.handler(s.request());
  expect(r.status).toBe(status);
  expect(await r.text()).toBe("");
});
