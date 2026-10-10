import { expect, it, vi } from "vitest";
import { createStaffProductQuoteHttpHandler } from "./staff-product-quote-http";
import { sealWorkforceProof } from "@/server/identity/workforce-session-cookie";
import { staffQuoteFixture, quoteFixtureId as id } from "@/test/staff-product-quote-fixture";
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
  const execute = vi.fn().mockResolvedValue(staffQuoteFixture());
  const bindings = {
    PRODUCT_QUOTES_MODE: "synthetic",
    PRODUCT_QUOTES_TENANT_ID: id,
    IDENTITY_SESSION_KEY_BASE64: key,
    REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
  const cookie = (await sealWorkforceProof(proof, until, key)).split(";")[0]!;
  const request = (
    body: unknown = { action: "read", caseId: id },
    headers: Record<string, string> = {},
    path = "/staff/products/command",
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
    handler: createStaffProductQuoteHttpHandler(bindings, { workforce, execute }),
  };
}
it("derives authority and returns a minimum private DTO", async () => {
  const s = await setup();
  const r = await s.handler(s.request());
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(s.execute).toHaveBeenCalledWith(
    expect.objectContaining({ p_subject_id: id, p_tenant_id: id }),
    { action: "read", caseId: id },
    "local-synthetic",
  );
  expect(await r.text()).not.toMatch(/staff@example|accessToken|refreshToken|envelope/);
});
it.each(["disabled", "unknown"])("keeps %s mode closed", async (mode) => {
  const s = await setup();
  expect(
    (
      await createStaffProductQuoteHttpHandler(
        { ...s.bindings, PRODUCT_QUOTES_MODE: mode },
        s,
      )(s.request())
    ).status,
  ).toBe(412);
  expect(s.execute).not.toHaveBeenCalled();
});
it("denies missing cookie and cross-origin requests", async () => {
  const s = await setup();
  expect((await s.handler(s.request(undefined, { cookie: "" }))).status).toBe(401);
  expect((await s.handler(s.request(undefined, { origin: "https://evil.invalid" }))).status).toBe(
    403,
  );
  expect(s.execute).not.toHaveBeenCalled();
});
it.each(["role", "purpose", "tenantId"])("denies wrong %s", async (field) => {
  const s = await setup();
  const a = await s.workforce.authorise();
  s.workforce.authorise.mockResolvedValue({
    ...a,
    context: { ...a.context, [field]: field === "tenantId" ? crypto.randomUUID() : "clinician" },
  });
  expect((await s.handler(s.request())).status).toBe(403);
  expect(s.execute).not.toHaveBeenCalled();
});
it("rejects forged flags and mismatched idempotency", async () => {
  const s = await setup();
  expect((await s.handler(s.request({ action: "read", caseId: id, approved: true }))).status).toBe(
    422,
  );
  expect(
    (
      await s.handler(
        s.request({
          action: "prepare_draft",
          caseId: id,
          catalogueId: id,
          deliveryQuoteId: id,
          expectedCaseVersion: 1,
          expectedDraftVersion: 0,
          requestKey: crypto.randomUUID(),
          items: [{ productId: id, quantity: 1 }],
        }),
      )
    ).status,
  ).toBe(422);
});
it.each([
  ["PT409", 409],
  ["42501", 403],
  ["private-key-detail", 503],
])("redacts %s", async (message, code) => {
  const s = await setup();
  s.execute.mockRejectedValue(new Error(String(message)));
  const r = await s.handler(s.request());
  expect(r.status).toBe(code);
  expect(await r.text()).toBe("");
});
it("rejects synthetic projection in pilot and a mismatched case", async () => {
  const s = await setup();
  expect(
    (
      await createStaffProductQuoteHttpHandler(
        { ...s.bindings, PRODUCT_QUOTES_MODE: "pilot" },
        s,
      )(s.request())
    ).status,
  ).toBe(503);
  s.execute.mockResolvedValue({ ...staffQuoteFixture(), caseId: crypto.randomUUID() });
  expect((await s.handler(s.request())).status).toBe(503);
});
