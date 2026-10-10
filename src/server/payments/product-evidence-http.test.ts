import { expect, it, vi } from "vitest";
import { createProductEvidenceHttpHandler } from "./product-evidence-http";
import { sealWorkforceProof } from "@/server/identity/workforce-session-cookie";
import { productEvidenceFixture, evidenceFixtureId as id } from "@/test/product-evidence-fixture";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
async function setup(role: "operations" | "clinician" = "operations") {
  const until = new Date(Date.now() + 300000),
    key = btoa("s".repeat(32));
  const proof: WorkforceProof = {
    context: {
      subjectId: id,
      tenantId: id,
      role,
      purpose: role === "clinician" ? "care_delivery" : "operations",
    },
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
  const execute = vi.fn().mockResolvedValue(productEvidenceFixture(role));
  const bindings = {
    PRODUCT_QUOTES_MODE: "synthetic",
    PRODUCT_QUOTES_TENANT_ID: id,
    IDENTITY_SESSION_KEY_BASE64: key,
    REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
  const cookie = (await sealWorkforceProof(proof, until, key)).split(";")[0]!;
  const request = (
    body: unknown = {
      action: "read",
      target: role === "clinician" ? { intakeId: id } : { caseId: id },
    },
    headers: Record<string, string> = {},
    path = "/staff/products/evidence",
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
    handler: createProductEvidenceHttpHandler(bindings, { workforce, execute }),
  };
}
it.each(["operations", "clinician"] as const)(
  "derives exact native authority for %s",
  async (role) => {
    const s = await setup(role),
      r = await s.handler(s.request());
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect(s.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: id,
        tenantId: id,
        purpose: role === "clinician" ? "care_delivery" : "operations",
      }),
      expect.anything(),
      "local-synthetic",
    );
    expect(await r.text()).not.toMatch(
      /staff@example|accessToken|refreshToken|envelope|evidenceReference/,
    );
  },
);
it.each(["disabled", "unknown"])("keeps %s disabled", async (mode) => {
  const s = await setup();
  expect(
    (
      await createProductEvidenceHttpHandler(
        { ...s.bindings, PRODUCT_QUOTES_MODE: mode },
        s,
      )(s.request())
    ).status,
  ).toBe(412);
  expect(s.execute).not.toHaveBeenCalled();
});
it("denies missing cookie and cross-origin", async () => {
  const s = await setup();
  expect((await s.handler(s.request(undefined, { cookie: "" }))).status).toBe(401);
  expect((await s.handler(s.request(undefined, { origin: "https://evil.invalid" }))).status).toBe(
    403,
  );
  expect(s.execute).not.toHaveBeenCalled();
});
it("operations cannot submit clinical approval", async () => {
  const s = await setup();
  expect(
    (
      await s.handler(
        s.request({
          action: "record",
          target: { caseId: id },
          draftId: id,
          kind: "clinical",
          evidenceReference: id,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          requestKey: id,
        }),
      )
    ).status,
  ).toBe(403);
  expect(s.execute).not.toHaveBeenCalled();
});
it("rejects forged authority and mismatched idempotency", async () => {
  const s = await setup();
  expect(
    (await s.handler(s.request({ action: "read", target: { caseId: id }, approved: true }))).status,
  ).toBe(422);
  expect(
    (
      await s.handler(
        s.request({
          action: "record",
          target: { caseId: id },
          draftId: id,
          kind: "provider_stock",
          evidenceReference: id,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          requestKey: crypto.randomUUID(),
        }),
      )
    ).status,
  ).toBe(422);
  expect(s.execute).not.toHaveBeenCalled();
});
it.each([
  ["42501", 403],
  ["PT409", 409],
  ["40001", 409],
  ["private provider message", 503],
] as const)("redacts %s failures", async (code, status) => {
  const s = await setup();
  s.execute.mockRejectedValue(new Error(code));
  const r = await s.handler(s.request());
  expect(r.status).toBe(status);
  expect(await r.text()).toBe("");
});
it("rejects a foreign role projection and expired view", async () => {
  const s = await setup();
  s.execute.mockResolvedValue(productEvidenceFixture("clinician"));
  expect((await s.handler(s.request())).status).toBe(503);
  s.execute.mockResolvedValue({
    ...productEvidenceFixture(),
    expiresAt: new Date(Date.now() - 1).toISOString(),
  });
  expect((await s.handler(s.request())).status).toBe(401);
});
