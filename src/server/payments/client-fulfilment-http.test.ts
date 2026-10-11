import { expect, it, vi } from "vitest";
import { createClientFulfilmentHttpHandler } from "./client-fulfilment-http";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { fulfilmentFixtureId as id } from "@/test/product-fulfilment-fixture";
function setup() {
  const authority = {
    tenantId: id,
    expiresAt: new Date(Date.now() + 60000),
    args: { p_context: { sessionId: id } },
  };
  const dependencies = {
    authorise: vi.fn().mockResolvedValue(authority),
    read: vi.fn().mockResolvedValue({
      progress: "preparing",
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    }),
  };
  const bindings = {
    PRODUCT_ORDERING_MODE: "synthetic",
    PRODUCT_ORDERING_TENANT_ID: id,
    REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
  const request = (body: unknown = {}, headers: Record<string, string> = {}) =>
    new Request("https://meneerhealth.co.za/portal/order/fulfilment", {
      method: "POST",
      headers: {
        origin: "https://meneerhealth.co.za",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  return {
    authority,
    dependencies,
    bindings,
    request,
    handler: createClientFulfilmentHttpHandler(bindings, dependencies),
  };
}
it("returns only coarse own-client state capped to current session", async () => {
  const s = setup(),
    r = await s.handler(s.request());
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(await r.json()).toEqual({
    progress: "preparing",
    expiresAt: s.authority.expiresAt.toISOString(),
  });
  expect(s.dependencies.read).toHaveBeenCalledWith(s.authority.args);
  expect(s.dependencies.authorise).toHaveBeenCalledTimes(2);
});
it("rejects selectors and cross-origin requests before data read", async () => {
  const s = setup();
  expect((await s.handler(s.request({ subjectId: id }))).status).toBe(422);
  expect((await s.handler(s.request({}, { origin: "https://evil.invalid" }))).status).toBe(403);
  expect(s.dependencies.read).not.toHaveBeenCalled();
});
it("keeps disabled, wrong-tenant and expired access closed", async () => {
  const s = setup();
  expect(
    (
      await createClientFulfilmentHttpHandler(
        { ...s.bindings, PRODUCT_ORDERING_MODE: "disabled" },
        s.dependencies,
      )(s.request())
    ).status,
  ).toBe(412);
  s.dependencies.authorise.mockResolvedValue({ ...s.authority, tenantId: crypto.randomUUID() });
  expect((await s.handler(s.request())).status).toBe(403);
  s.dependencies.authorise.mockResolvedValue({ ...s.authority, expiresAt: new Date(0) });
  expect((await s.handler(s.request())).status).toBe(401);
});
it("rejects session revocation during the read", async () => {
  const s = setup();
  s.dependencies.authorise
    .mockResolvedValueOnce(s.authority)
    .mockRejectedValue(new IdentityRejectedError());
  expect((await s.handler(s.request())).status).toBe(403);
});
it("rejects expanded provider projection and redacts failure", async () => {
  const s = setup();
  s.dependencies.read.mockResolvedValue({
    progress: "received",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    address: "private",
  });
  const r = await s.handler(s.request());
  expect(r.status).toBe(503);
  expect(await r.text()).toBe("");
});
