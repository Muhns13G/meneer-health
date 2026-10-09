import { expect, it, vi } from "vitest";
import { createRefundHttpHandler } from "./refund-http";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { executeWithRequestTimeout } from "@/server/security/request-security";
import { readFileSync } from "node:fs";
const id = "a4700000-0000-4000-8000-000000000001";
it("returns a non-retryable conflict without dispatching a refund", async () => {
  const h = setup();
  h.deps.command.mockRejectedValueOnce(new Error("REFUND_CONFLICT"));
  const response = await h.handler(h.request({ action: "read", offerId: id }));
  expect(response.status).toBe(409);
  expect(await response.text()).not.toContain("REFUND_CONFLICT");
  expect(h.deps.provider.submit).not.toHaveBeenCalled();
});
it.each(["/portal/payments/refund", "/staff/payments/refund"])(
  "reads the transferred JSON body through the timeout boundary at %s",
  async (path) => {
    const h = setup();
    const original = h.request({ action: "read", offerId: id }, path);
    const response = await executeWithRequestTimeout(original, h.handler);
    expect(response.status).toBe(200);
    expect(h.deps.command).toHaveBeenCalledWith(
      path.startsWith("/staff/"),
      { sealed: true },
      { action: "read", offerId: id },
    );
    expect(h.deps.provider.submit).not.toHaveBeenCalled();
    // The Worker entry must pass the replacement Request, not the transferred original stream.
    const entry = readFileSync("src/server.ts", "utf8");
    expect(entry).toMatch(/createRefundHttpHandler\([^)]*\)\(\s*boundedRequest,?\s*\)/);
    expect(entry).not.toMatch(/createRefundHttpHandler\([^)]*\)\(request\)/);
    const stale = setup();
    const staleRequest = stale.request({ action: "read", offerId: id }, path);
    expect(
      (await executeWithRequestTimeout(staleRequest, () => stale.handler(staleRequest))).status,
    ).toBe(503);
    expect(stale.deps.command).not.toHaveBeenCalled();
  },
);
it("records only independently inspected exception references and denies browser observation commands", async () => {
  const h = setup();
  const inspectException = vi.fn(async () => ({
    reference: id,
    kind: "duplicate" as const,
    eventId: "evt_synthetic12345",
  }));
  const deps = { ...h.deps, provider: { ...h.deps.provider, inspectException } };
  deps.command
    .mockResolvedValueOnce([{ reference: id }])
    .mockResolvedValueOnce(h.view)
    .mockResolvedValueOnce(h.view);
  const handler = createRefundHttpHandler(h.bindings, deps);
  expect(
    (
      await handler(
        h.request({ action: "reconcile", offerId: id, requestKey: id }, "/staff/payments/refund"),
      )
    ).status,
  ).toBe(200);
  expect(deps.command.mock.calls.map((call) => call[2].action)).toEqual([
    "inspect_exceptions",
    "record_exception",
    "reconcile",
  ]);
  expect(deps.command.mock.calls[1]?.[2]).toEqual({
    action: "record_exception",
    offerId: id,
    requestKey: id,
    reference: id,
    kind: "duplicate",
    eventId: "evt_synthetic12345",
  });
  for (const action of [
    "record_exception",
    "inspect_exceptions",
    "replace_deposit",
    "own_dispute",
  ]) {
    expect(
      (await handler(h.request({ action, offerId: id, requestKey: id, reference: id }))).status,
    ).toBe(422);
  }
  deps.command.mockClear().mockResolvedValueOnce([{ reference: id }]);
  inspectException.mockRejectedValueOnce(new Error("changed provider evidence"));
  expect(
    (
      await handler(
        h.request({ action: "reconcile", offerId: id, requestKey: id }, "/staff/payments/refund"),
      )
    ).status,
  ).toBe(503);
  expect(deps.command).toHaveBeenCalledOnce();
});
function setup() {
  const bindings = {
    COMMERCE_REVIEW_MODE: "enabled",
    COMMERCE_REVIEW_TENANT_ID: id,
    COMMERCE_CHECKOUT_MODE: "sandbox",
    COMMERCE_WEBHOOK_MODE: "sandbox",
    COMMERCE_REFUND_MODE: "sandbox",
    STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: id,
    STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_synthetic_only",
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
it("permits only staff reconciliation/retry with exact schema and no provider call", async () => {
  const h = setup();
  for (const action of ["reconcile", "retry"]) {
    const body = {
      action,
      offerId: id,
      requestKey: id,
      ...(action === "retry" ? { refundId: id } : {}),
    };
    expect((await h.handler(h.request(body))).status).toBe(422);
    expect((await h.handler(h.request(body, "/staff/payments/refund"))).status).toBe(200);
    expect(
      (await h.handler(h.request({ ...body, state: "confirmed" }, "/staff/payments/refund")))
        .status,
    ).toBe(422);
  }
  expect(h.deps.provider.submit).not.toHaveBeenCalled();
});
it("records a provider-backed terminal observation before reconciliation, and holds on inspection failure", async () => {
  const h = setup(),
    plan = {
      intentId: id,
      tenantId: id,
      accountId: "acct_synthetic12345",
      sessionId: "cs_test_synthetic12345",
      amountMinor: 60100,
      paymentIntentId: "pi_synthetic12345",
    };
  const inspectTerminal = vi.fn(async () => ({
    intentId: id,
    sessionId: plan.sessionId,
    status: "expired" as const,
  }));
  const deps = { ...h.deps, provider: { ...h.deps.provider, inspectTerminal } };
  deps.command.mockResolvedValueOnce([plan]).mockResolvedValueOnce(h.view);
  const handler = createRefundHttpHandler(h.bindings, deps),
    request = () =>
      h.request({ action: "reconcile", offerId: id, requestKey: id }, "/staff/payments/refund");
  expect((await handler(request())).status).toBe(200);
  expect(deps.command.mock.calls.map((call) => call[2].action)).toEqual([
    "inspect",
    "record_terminal",
    "reconcile",
  ]);
  deps.command.mockClear().mockResolvedValueOnce([plan]);
  inspectTerminal.mockRejectedValueOnce(new Error("synthetic pending money"));
  expect((await handler(request())).status).toBe(503);
  expect(deps.command).toHaveBeenCalledOnce();
  expect(deps.provider.submit).not.toHaveBeenCalled();
  expect(
    (
      await handler(
        h.request(
          {
            action: "record_terminal",
            offerId: id,
            requestKey: id,
            intentId: id,
            sessionId: plan.sessionId,
            status: "expired",
          },
          "/staff/payments/refund",
        ),
      )
    ).status,
  ).toBe(422);
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
