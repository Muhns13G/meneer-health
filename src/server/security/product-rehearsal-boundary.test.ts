import { expect, it, vi } from "vitest";
import {
  createProductRehearsalBoundary,
  validProductRehearsalBindings,
} from "./product-rehearsal-boundary";
const origin = "https://meneer-product-rehearsal.example.workers.dev";
const tenant = "e1590000-0000-4000-8000-000000000001";
const key = "a".repeat(64);
function bindings() {
  return {
    PRODUCT_REHEARSAL_ORIGIN: origin,
    SUPABASE_URL: "https://gibfpolrdjotwvewgfsz.supabase.co",
    COMMERCE_REVIEW_MODE: "enabled",
    STRIPE_SANDBOX_RETURN_ORIGIN: origin,
    PRODUCT_REHEARSAL_TENANT_ID: tenant,
    PRODUCT_REHEARSAL_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
    PRODUCT_REHEARSAL_ACCESS_KEY: key,
    IDENTITY_SESSION_KEY_BASE64: "A".repeat(43) + "=",
    PRODUCT_CATALOGUE_TENANT_ID: tenant,
    PRODUCT_QUOTES_TENANT_ID: tenant,
    PRODUCT_ORDERING_TENANT_ID: tenant,
    COMMERCE_REVIEW_TENANT_ID: tenant,
    PRODUCT_CATALOGUE_MODE: "synthetic",
    PRODUCT_QUOTES_MODE: "synthetic",
    PRODUCT_ORDERING_MODE: "synthetic",
    PUBLIC_REGISTRATION_MODE: "disabled",
    MOBILE_INVITATIONS_MODE: "disabled",
    MOBILE_INVITATIONS_EMAIL_MODE: "disabled",
    MOBILE_INVITATIONS_REDEMPTION_MODE: "disabled",
    MOBILE_INVITATIONS_WEBHOOK_MODE: "disabled",
    TRANSACTIONAL_NOTIFICATIONS_MODE: "disabled",
    OPERATIONS_ALERTS_MODE: "disabled",
    COMMERCE_CHECKOUT_MODE: "sandbox",
    COMMERCE_WEBHOOK_MODE: "sandbox",
    COMMERCE_REFUND_MODE: "sandbox",
    STRIPE_CHECKOUT_ACCOUNT_ID: "acct_1U32UbFfj16Nnr1i",
    STRIPE_RESTRICTED_KEY: "rk_test_synthetic",
  };
}
it("fails closed on missing, expired, live, real-tenant or send configuration", () => {
  const b = bindings();
  expect(validProductRehearsalBindings(b)).toBe(true);
  for (const changed of [
    {},
    { ...b, PRODUCT_REHEARSAL_ORIGIN: "https://meneerhealth.co.za" },
    { ...b, PRODUCT_REHEARSAL_EXPIRES_AT: new Date(0).toISOString() },
    { ...b, PRODUCT_REHEARSAL_EXPIRES_AT: new Date(Date.now() + 25 * 3600000).toISOString() },
    { ...b, PRODUCT_REHEARSAL_TENANT_ID: "80000000-0000-4000-8000-000000000001" },
    { ...b, PRODUCT_QUOTES_TENANT_ID: crypto.randomUUID() },
    { ...b, COMMERCE_CHECKOUT_MODE: "live" },
    { ...b, STRIPE_LIVE_RESTRICTED_KEY: "rk_live_synthetic" },
    { ...b, BREVO_API_KEY: "synthetic" },
    { ...b, MOBILE_INVITATIONS_MODE: "pilot" },
  ])
    expect(validProductRehearsalBindings(changed)).toBe(false);
});
it("protects pages and assets, then issues only a host-only secure access cookie", async () => {
  const next = vi.fn(async () => new Response("ok"));
  const handler = createProductRehearsalBoundary(next, bindings());
  for (const path of ["/portal/order", "/assets/application.js"])
    expect((await handler(new Request(origin + path))).status).toBe(401);
  const unlocked = await handler(
    new Request(origin + "/__rehearsal", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key }),
    }),
  );
  expect(unlocked.status).toBe(303);
  expect(unlocked.headers.get("set-cookie")).toBe(
    `__Host-product-rehearsal=${key}; Path=/; Secure; HttpOnly; SameSite=Strict`,
  );
  expect(next).not.toHaveBeenCalled();
});
it("denies cross-origin, messaging, signup, unknown routes and duplicate cookies", async () => {
  const next = vi.fn(async () => new Response("ok"));
  const handler = createProductRehearsalBoundary(next, bindings());
  const cookie = `__Host-product-rehearsal=${key}`;
  expect(
    (
      await handler(
        new Request(origin + "/portal/order/command", {
          method: "POST",
          headers: { Origin: "https://attacker.invalid", Cookie: cookie },
        }),
      )
    ).status,
  ).toBe(403);
  for (const path of [
    "/start",
    "/staff/invite",
    "/staff/mobile-invitations/dispatch",
    "/account/sign-in",
    "/portal/handoff/open",
  ])
    expect(
      (
        await handler(
          new Request(origin + path, {
            method: "POST",
            headers: { Origin: origin, Cookie: cookie },
          }),
        )
      ).status,
    ).toBe(404);
  expect(
    (
      await handler(
        new Request(origin + "/portal/order", { headers: { Cookie: cookie + "; " + cookie } }),
      )
    ).status,
  ).toBe(401);
  expect(next).not.toHaveBeenCalled();
});
it("reuses production handlers without widening their origin policy", async () => {
  const next = vi.fn(async (request: Request) => {
    expect(request.url).toBe("https://meneerhealth.co.za/portal/order/command");
    expect(request.headers.get("Origin")).toBe("https://meneerhealth.co.za");
    expect(await request.text()).toBe("{}");
    return new Response(null, {
      status: 303,
      headers: { Location: "https://meneerhealth.co.za/portal/order" },
    });
  });
  const handler = createProductRehearsalBoundary(next, bindings());
  const result = await handler(
    new Request(origin + "/portal/order/command", {
      method: "POST",
      headers: { Origin: origin, Cookie: `__Host-product-rehearsal=${key}` },
      body: "{}",
    }),
  );
  expect(result.headers.get("Location")).toBe(origin + "/portal/order");
  expect(result.headers.get("Cache-Control")).toContain("no-store");
  expect(next).toHaveBeenCalledOnce();
});
it("passes only the exact webhook path to the existing signature verifier", async () => {
  const next = vi.fn(async () => new Response(null, { status: 401 }));
  const handler = createProductRehearsalBoundary(next, bindings());
  expect(
    (
      await handler(
        new Request(origin + "/api/payments/stripe/webhook", { method: "POST", body: "{}" }),
      )
    ).status,
  ).toBe(401);
  expect(next).toHaveBeenCalledOnce();
});
it("limits streamed request bodies and permits the UI's own session reads", async () => {
  const next = vi.fn(async () => new Response("ok"));
  const handler = createProductRehearsalBoundary(next, bindings());
  const headers = { Origin: origin, Cookie: `__Host-product-rehearsal=${key}` };
  for (const path of ["/portal/account", "/staff/session"])
    expect((await handler(new Request(origin + path, { headers }))).status).toBe(200);
  const huge = await handler(
    new Request(origin + "/portal/order/command", {
      method: "POST",
      headers,
      body: "a".repeat(65537),
    }),
  );
  expect(huge.status).toBe(413);
  expect(
    (
      await handler(
        new Request(origin + "/portal/account", {
          headers: { ...headers, "Sec-Fetch-Site": "cross-site" },
        }),
      )
    ).status,
  ).toBe(403);
  expect(next).toHaveBeenCalledTimes(2);
});
