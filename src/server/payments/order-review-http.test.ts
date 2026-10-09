import { expect, it, vi } from "vitest";
import { createOrderReviewHttpHandler } from "./order-review-http";
import { orderReviewFixture } from "@/test/order-review-fixture";
import { sealPatientSession, patientSessionCookieName } from "../identity/patient-session-cookie";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
const id = "a2400000-0000-4000-8000-000000000001";
async function harness() {
  const now = new Date(),
    until = new Date(Date.now() + 60000),
    key = new Uint8Array(32).fill(9);
  const token = await sealPatientSession(
    {
      tenantId: id,
      session: {
        id,
        subjectId: id,
        providerSessionId: id,
        sessionClass: "patient",
        assurance: "aal1",
        status: "active",
        issuedAt: now,
        lastSeenAt: now,
        idleExpiresAt: until,
        absoluteExpiresAt: until,
      },
      providerSession: { accessToken: "synthetic", refreshToken: "synthetic", expiresAt: until },
      providerIdentity: {
        provider: "supabase",
        providerSubject: id,
        providerSessionId: id,
        assurance: "aal1",
        authenticatedAt: now,
        expiresAt: until,
        verifiedContact: { kind: "email", value: "commerce@example.invalid", verifiedAt: now },
      },
    },
    key,
  );
  const execute = vi.fn(async () => ({ review: orderReviewFixture() }));
  const authorise = vi.fn(async () => ({
    context: {
      tenantId: id,
      subjectId: id,
      sessionId: id,
      providerSubject: id,
      providerSessionId: id,
      verifiedEmail: "commerce@example.invalid",
      purpose: "account" as const,
    },
    expiresAt: until,
  }));
  const bindings = {
    COMMERCE_REVIEW_MODE: "enabled",
    COMMERCE_REVIEW_TENANT_ID: id,
    IDENTITY_SESSION_KEY_BASE64: btoa(String.fromCharCode(...key)),
    REQUEST_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
  };
  const request = (
    body: unknown = { action: "read" },
    headers: Record<string, string> = {},
    path = "/portal/order/command",
  ) =>
    new Request("https://meneerhealth.co.za" + path, {
      method: "POST",
      headers: {
        Cookie: patientSessionCookieName + "=" + token,
        Origin: "https://meneerhealth.co.za",
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  return {
    bindings,
    execute,
    authorise,
    request,
    handler: createOrderReviewHttpHandler(bindings, { execute, authorise }),
  };
}
it("binds sealed proof to authority and returns only strict private review", async () => {
  const h = await harness();
  const response = await h.handler(h.request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(h.authorise).toHaveBeenCalledOnce();
  expect(h.execute).toHaveBeenCalledWith(expect.objectContaining({ subjectId: id, tenantId: id }), {
    action: "read",
  });
  expect(await response.json()).toMatchObject({ review: { checkoutEnabled: false } });
});
it("keeps runtime disabled and rejects missing cookies, wrong origin and URL state", async () => {
  const h = await harness();
  expect(
    (
      await createOrderReviewHttpHandler({ ...h.bindings, COMMERCE_REVIEW_MODE: "disabled" })(
        h.request(),
      )
    ).status,
  ).toBe(412);
  expect((await h.handler(h.request({}, { Cookie: "" }))).status).toBe(401);
  expect(
    (await h.handler(h.request({ action: "read" }, { Origin: "https://other.invalid" }))).status,
  ).toBe(403);
  expect(
    (await h.handler(h.request({ action: "read" }, {}, "/portal/order/command?offer=private")))
      .status,
  ).toBe(404);
  expect(h.execute).not.toHaveBeenCalled();
});
it("rejects unchecked or injected amounts and mismatched mutation keys", async () => {
  const h = await harness(),
    r = orderReviewFixture();
  const cmd = {
    action: "accept",
    offerId: r.offerId,
    publicationId: r.terms.publicationId,
    snapshotHash: r.snapshotHash,
    contentHash: r.terms.contentHash,
    requestKey: id,
    accepted: true,
  };
  for (const extra of [{ accepted: false }, { amountTotalMinor: 1 }, { requestKey: r.offerId }])
    expect((await h.handler(h.request({ ...cmd, ...extra }))).status).toBe(422);
  expect(h.execute).not.toHaveBeenCalled();
  expect((await h.handler(h.request(cmd))).status).toBe(200);
});
it("clears revoked authority and fails closed on unsafe provider projections", async () => {
  const h = await harness();
  h.authorise.mockRejectedValueOnce(new IdentityRejectedError());
  const rejected = await h.handler(h.request());
  expect(rejected.status).toBe(401);
  expect(rejected.headers.has("set-cookie")).toBe(true);
  h.execute.mockResolvedValueOnce({
    review: { ...orderReviewFixture(), diagnosis: "synthetic-prohibited-field" },
  } as never);
  expect((await h.handler(h.request())).status).toBe(503);
});
it("denies oversized payloads, exhausted limits and a different configured tenant", async () => {
  const h = await harness();
  expect((await h.handler(h.request({ action: "read", extra: "x".repeat(5000) }))).status).toBe(
    413,
  );
  h.bindings.REQUEST_RATE_LIMITER.limit.mockResolvedValueOnce({ success: false });
  expect((await h.handler(h.request())).status).toBe(429);
  expect(
    (
      await createOrderReviewHttpHandler({
        ...h.bindings,
        COMMERCE_REVIEW_TENANT_ID: orderReviewFixture().offerId,
      })(h.request())
    ).status,
  ).toBe(403);
  expect(h.execute).not.toHaveBeenCalled();
});
it("permits only explicit sandbox Checkout and validates the returned provider origin", async () => {
  const h = await harness(),
    checkout = vi.fn(async () => ({ checkoutUrl: "https://checkout.stripe.com/c/pay/synthetic" }));
  const deps = { authorise: h.authorise, execute: h.execute, checkout, ready: async () => true };
  const command = { action: "checkout", offerId: orderReviewFixture().offerId, requestKey: id };
  expect((await createOrderReviewHttpHandler(h.bindings, deps)(h.request(command))).status).toBe(
    412,
  );
  expect(
    (
      await createOrderReviewHttpHandler(
        { ...h.bindings, COMMERCE_CHECKOUT_MODE: "live" },
        deps,
      )(h.request(command))
    ).status,
  ).toBe(412);
  const handler = createOrderReviewHttpHandler(
    {
      ...h.bindings,
      COMMERCE_CHECKOUT_MODE: "sandbox",
      COMMERCE_WEBHOOK_MODE: "sandbox",
      STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: id,
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_synthetic_only",
    },
    deps,
  );
  expect((await handler(h.request({ ...command, amountTotalMinor: 1 }))).status).toBe(422);
  expect((await handler(h.request(command))).status).toBe(200);
  checkout.mockResolvedValueOnce({ checkoutUrl: "https://untrusted.invalid" });
  expect((await handler(h.request(command))).status).toBe(503);
});
it("permits explicitly configured live Checkout only on canonical HTTPS with current readiness", async () => {
  const h = await harness();
  const checkout = vi.fn(async () => ({
    checkoutUrl: "https://checkout.stripe.com/c/pay/synthetic",
  }));
  const ready = vi.fn(async () => true);
  const bindings = {
    ...h.bindings,
    COMMERCE_CHECKOUT_MODE: "live",
    COMMERCE_WEBHOOK_MODE: "live",
    STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: id,
    STRIPE_LIVE_ACCOUNT_ID: "acct_syntheticlive123",
    STRIPE_LIVE_RESTRICTED_KEY: "rk_live_synthetic_only",
    STRIPE_LIVE_WEBHOOK_SIGNING_SECRET: "whsec_synthetic_live_only",
  };
  const handler = createOrderReviewHttpHandler(bindings, {
    authorise: h.authorise,
    execute: h.execute,
    checkout,
    ready,
  });
  const command = { action: "checkout", offerId: orderReviewFixture().offerId, requestKey: id };
  expect((await handler(h.request(command))).status).toBe(200);
  ready.mockResolvedValueOnce(false);
  expect((await handler(h.request(command))).status).toBe(403);
  expect(checkout).toHaveBeenCalledOnce();
  for (const origin of [
    "http://localhost:8085",
    "http://meneerhealth.co.za",
    "https://preview.example.invalid",
  ])
    expect(
      (await handler(new Request(origin + "/portal/order/command", h.request(command)))).status,
    ).toBe(404);
});
