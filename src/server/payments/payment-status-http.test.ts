import { expect, it, vi } from "vitest";
import { createPaymentStatusHttpHandler } from "./payment-status-http";
import { paymentStatusFixture } from "@/test/payment-status-fixture";
import { paymentStatusPageSchema } from "@/domain/payments/payment-status";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
const id = "a4600000-0000-4000-8000-000000000001";
function setup() {
  const bindings = {
    COMMERCE_REVIEW_MODE: "enabled",
    COMMERCE_REVIEW_TENANT_ID: id,
    REQUEST_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
  };
  const authorise = vi.fn(
    async (): Promise<{ tenantId: string; expiresAt: Date; args: Record<string, unknown> }> => ({
      tenantId: id,
      expiresAt: new Date(Date.now() + 30000),
      args: { p_context: { subjectId: id, sessionId: id }, p_session_id: id },
    }),
  );
  const read = vi.fn(async (): Promise<unknown> => paymentStatusFixture());
  const request = (
    body: unknown = { cursor: null },
    path = "/portal/payments/read",
    headers = {},
  ) =>
    new Request("https://meneerhealth.co.za" + path, {
      method: "POST",
      headers: {
        Origin: "https://meneerhealth.co.za",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  return {
    bindings,
    authorise,
    read,
    request,
    handler: createPaymentStatusHttpHandler(bindings, { authorise, read }),
  };
}
it("returns only strict private facts and caps their expiry to current authority", async () => {
  const h = setup();
  const response = await h.handler(h.request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  const value = paymentStatusPageSchema.parse(await response.json());
  expect(Date.parse(value.expiresAt)).toBeLessThanOrEqual(Date.now() + 30000);
  expect(h.read).toHaveBeenCalledWith(false, {
    p_context: { subjectId: id, sessionId: id },
    p_session_id: id,
    p_cursor: null,
  });
});
it("takes staff case/cursor only in the protected body", async () => {
  const h = setup();
  expect(
    (await h.handler(h.request({ cursor: null, caseId: id }, "/staff/payments/read"))).status,
  ).toBe(200);
  expect(h.read).toHaveBeenCalledWith(true, expect.objectContaining({ p_case_id: id }));
});
it("rejects injected scope/amount, missing staff case, query state and cross origin", async () => {
  const h = setup();
  for (const body of [
    { cursor: null, tenantId: id },
    { cursor: null, amount: 1 },
    { cursor: null, caseId: id },
  ])
    expect((await h.handler(h.request(body))).status).toBe(422);
  expect((await h.handler(h.request({ cursor: null }, "/staff/payments/read"))).status).toBe(422);
  expect((await h.handler(h.request({}, "/portal/payments/read?status=paid"))).status).toBe(404);
  expect(
    (await h.handler(h.request({ cursor: null }, undefined, { Origin: "https://other.invalid" })))
      .status,
  ).toBe(403);
  expect(h.read).not.toHaveBeenCalled();
});
it("denies disabled mode, wrong tenant, rejected authority, expiry and provider-field leakage", async () => {
  const h = setup();
  expect(
    (
      await createPaymentStatusHttpHandler({ ...h.bindings, COMMERCE_REVIEW_MODE: "disabled" })(
        h.request(),
      )
    ).status,
  ).toBe(412);
  h.authorise.mockResolvedValueOnce({
    tenantId: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 1000),
    args: {},
  });
  expect((await h.handler(h.request())).status).toBe(403);
  h.authorise.mockRejectedValueOnce(new IdentityRejectedError());
  expect((await h.handler(h.request())).status).toBe(403);
  h.authorise.mockResolvedValueOnce({
    tenantId: id,
    expiresAt: new Date(0),
    args: { p_context: { sessionId: id } },
  });
  expect((await h.handler(h.request())).status).toBe(401);
  h.read.mockResolvedValueOnce({ ...paymentStatusFixture(), providerSessionId: "cs_test_private" });
  expect((await h.handler(h.request())).status).toBe(503);
});
