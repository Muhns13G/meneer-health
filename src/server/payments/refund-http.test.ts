import { expect, it, vi } from "vitest";
import { createRefundHttpHandler } from "./refund-http";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
const id = "a4700000-0000-4000-8000-000000000001";
function setup() {
  const bindings = {
    COMMERCE_REVIEW_MODE: "enabled",
    COMMERCE_REVIEW_TENANT_ID: id,
    COMMERCE_CHECKOUT_MODE: "sandbox",
    COMMERCE_WEBHOOK_MODE: "sandbox",
    COMMERCE_REFUND_MODE: "sandbox",
    REQUEST_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
  };
  const view = {
    requestState: "requested",
    refunds: [],
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  const authorise = vi.fn(async () => ({
    tenantId: id,
    sessionId: id,
    expiresAt: new Date(Date.now() + 30000),
    context: { sealed: true },
  }));
  const command = vi.fn(
    async (
      _staff: boolean,
      _context: unknown,
      _command: Record<string, unknown>,
    ): Promise<unknown> => view,
  );
  const provider = {
    submit: vi.fn(async () => ({ providerId: "re_synthetic12345", state: "submitted" as const })),
  };
  const deps = { authorise, command, provider };
  const request = (
    body: unknown = { action: "request", offerId: id, requestKey: id },
    path = "/portal/payments/refund",
    origin = "https://meneerhealth.co.za",
  ) =>
    new Request("https://meneerhealth.co.za" + path, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  return { bindings, view, deps, request, handler: createRefundHttpHandler(bindings, deps) };
}
it("uses verified context rather than client authority and returns private bounded facts", async () => {
  const h = setup(),
    response = await h.handler(h.request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(h.deps.command).toHaveBeenCalledWith(
    false,
    { sealed: true },
    { action: "request", offerId: id, requestKey: id },
  );
  expect(h.deps.provider.submit).not.toHaveBeenCalled();
});
it("rejects patient staff commands, injected amounts, cross origin and query strings", async () => {
  const h = setup();
  expect(
    (await h.handler(h.request({ action: "dispatch", offerId: id, refundId: id, requestKey: id })))
      .status,
  ).toBe(422);
  expect(
    (await h.handler(h.request({ action: "request", offerId: id, requestKey: id, amountMinor: 1 })))
      .status,
  ).toBe(422);
  expect((await h.handler(h.request(undefined, undefined, "https://other.invalid"))).status).toBe(
    403,
  );
  expect((await h.handler(h.request(undefined, "/portal/payments/refund?paid=true"))).status).toBe(
    404,
  );
  expect(h.deps.command).not.toHaveBeenCalled();
});
it("denies disabled mode, expired or revoked sessions, rate failure and malformed private output", async () => {
  const h = setup();
  expect(
    (
      await createRefundHttpHandler(
        { ...h.bindings, COMMERCE_REVIEW_MODE: "disabled" },
        h.deps,
      )(h.request())
    ).status,
  ).toBe(412);
  h.deps.authorise.mockRejectedValueOnce(new IdentityRejectedError());
  expect((await h.handler(h.request())).status).toBe(403);
  h.deps.command.mockResolvedValueOnce({ ...h.view, providerId: "secret-reference" });
  expect((await h.handler(h.request())).status).toBe(503);
  h.bindings.REQUEST_RATE_LIMITER.limit.mockResolvedValueOnce({ success: false });
  expect((await h.handler(h.request())).status).toBe(429);
});
it("claims before provider submission and records submitted separately from confirmed refunds", async () => {
  const h = setup();
  h.deps.command.mockResolvedValueOnce({
    refundId: id,
    accountId: "acct_synthetic12345",
    paymentIntentId: "pi_synthetic12345",
    amountMinor: 99900,
    currency: "zar",
  });
  const response = await h.handler(
    h.request(
      { action: "dispatch", offerId: id, refundId: id, requestKey: id },
      "/staff/payments/refund",
    ),
  );
  expect(response.status).toBe(200);
  expect(h.deps.command.mock.calls.map((call) => (call[2] as { action: string }).action)).toEqual([
    "dispatch",
    "record",
    "read",
  ]);
  expect(h.deps.command).toHaveBeenNthCalledWith(
    2,
    true,
    { sealed: true },
    {
      action: "record",
      offerId: id,
      refundId: id,
      providerId: "re_synthetic12345",
      state: "submitted",
    },
  );
});
