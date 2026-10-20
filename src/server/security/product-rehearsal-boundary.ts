// Imported only by the separate rehearsal entry, never by the production server.
const canonical = "https://meneerhealth.co.za";
const cookieName = "__Host-product-rehearsal";
type Bindings = Record<string, unknown>;
const tenantNames = [
  "PRODUCT_CATALOGUE_TENANT_ID",
  "PRODUCT_QUOTES_TENANT_ID",
  "PRODUCT_ORDERING_TENANT_ID",
  "COMMERCE_REVIEW_TENANT_ID",
];
const disabledNames = [
  "PUBLIC_REGISTRATION_MODE",
  "MOBILE_INVITATIONS_MODE",
  "MOBILE_INVITATIONS_EMAIL_MODE",
  "MOBILE_INVITATIONS_REDEMPTION_MODE",
  "MOBILE_INVITATIONS_WEBHOOK_MODE",
  "TRANSACTIONAL_NOTIFICATIONS_MODE",
  "OPERATIONS_ALERTS_MODE",
];
const pages = new Set([
  "/staff/sign-in",
  "/staff/queue",
  "/portal/order",
  "/portal/products",
  "/portal/account",
  "/staff/session",
  "/portal/support",
  "/staff/support",
]);
const commands = new Set([
  "/staff/products/command",
  "/staff/products/evidence",
  "/staff/products/issue",
  "/staff/products/fulfilment",
  "/portal/products/command",
  "/portal/order/command",
  "/portal/order/fulfilment",
  "/portal/payments/read",
  "/staff/payments/read",
  "/portal/payments/refund",
  "/staff/payments/refund",
  "/staff/queue/read",
  "/staff/queue/detail",
  "/staff/session",
  "/staff/sign-out",
  "/account/sign-out",
  "/account/session/renew",
]);
function response(status: number, body = "Rehearsal unavailable.") {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'",
    },
  });
}
export function validProductRehearsalBindings(bindings: Bindings, now = Date.now()) {
  const origin = bindings.PRODUCT_REHEARSAL_ORIGIN;
  const tenant = bindings.PRODUCT_REHEARSAL_TENANT_ID;
  const expiry = Date.parse(String(bindings.PRODUCT_REHEARSAL_EXPIRES_AT));
  if (
    typeof origin !== "string" ||
    bindings.SUPABASE_URL !== "https://gibfpolrdjotwvewgfsz.supabase.co" ||
    bindings.COMMERCE_REVIEW_MODE !== "enabled" ||
    bindings.STRIPE_SANDBOX_RETURN_ORIGIN !== origin ||
    typeof tenant !== "string" ||
    !/^[a-f0-9-]{36}$/.test(tenant) ||
    tenant === "80000000-0000-4000-8000-000000000001" ||
    !Number.isFinite(expiry) ||
    expiry <= now ||
    expiry > now + 24 * 60 * 60 * 1000 ||
    typeof bindings.PRODUCT_REHEARSAL_ACCESS_KEY !== "string" ||
    !/^[a-f0-9]{64}$/.test(bindings.PRODUCT_REHEARSAL_ACCESS_KEY) ||
    tenantNames.some((name) => bindings[name] !== tenant) ||
    disabledNames.some((name) => bindings[name] !== "disabled") ||
    ["PRODUCT_CATALOGUE_MODE", "PRODUCT_QUOTES_MODE", "PRODUCT_ORDERING_MODE"].some(
      (name) => bindings[name] !== "synthetic",
    ) ||
    ["COMMERCE_CHECKOUT_MODE", "COMMERCE_WEBHOOK_MODE", "COMMERCE_REFUND_MODE"].some(
      (name) => bindings[name] !== "sandbox",
    ) ||
    bindings.STRIPE_CHECKOUT_ACCOUNT_ID !== "acct_1U32UbFfj16Nnr1i" ||
    typeof bindings.STRIPE_RESTRICTED_KEY !== "string" ||
    !bindings.STRIPE_RESTRICTED_KEY.startsWith("rk_test_") ||
    typeof bindings.IDENTITY_SESSION_KEY_BASE64 !== "string" ||
    !/^[A-Za-z0-9+/]{43}=$/.test(bindings.IDENTITY_SESSION_KEY_BASE64) ||
    Object.keys(bindings).some(
      (name) => /STRIPE_LIVE_|BREVO_|TELNYX_|RECOVERY_|R2_/.test(name) && bindings[name],
    )
  )
    return false;
  try {
    const url = new URL(origin);
    return (
      url.origin === origin &&
      url.protocol === "https:" &&
      url.hostname.endsWith(".workers.dev") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
async function equal(left: string, right: string) {
  const a = await digest(left),
    b = await digest(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i]! ^ b[i]!;
  return difference === 0;
}
async function boundedBody(request: Request, maximum: number) {
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader) {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      length += item.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new Error("REHEARSAL_BODY_TOO_LARGE");
      }
      chunks.push(item.value);
    }
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
export function createProductRehearsalBoundary(
  next: (request: Request) => Promise<Response>,
  bindings: Bindings,
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (
      !validProductRehearsalBindings(bindings) ||
      url.origin !== bindings.PRODUCT_REHEARSAL_ORIGIN
    )
      return response(503);
    if (url.search || !["GET", "POST"].includes(request.method)) return response(404);
    const webhook = url.pathname === "/api/payments/stripe/webhook" && request.method === "POST";
    if (
      !webhook &&
      (request.headers.get("Sec-Fetch-Site") === "cross-site" ||
        (request.headers.has("Origin") && request.headers.get("Origin") !== url.origin))
    )
      return response(403);
    if (!webhook && request.method === "POST" && request.headers.get("Origin") !== url.origin)
      return response(403);
    if (
      request.headers.get("Content-Length") &&
      Number(request.headers.get("Content-Length")) > 65536
    )
      return response(413);
    const accessKey = String(bindings.PRODUCT_REHEARSAL_ACCESS_KEY);
    if (url.pathname === "/__rehearsal" && request.method === "GET") {
      const result = response(200);
      result.headers.set("Content-Type", "text/html; charset=utf-8");
      return new Response(
        '<!doctype html><html lang="en"><title>Restricted synthetic rehearsal</title><h1>Restricted synthetic rehearsal</h1><form method="post"><label>Access key <input type="password" name="key" autocomplete="off" required maxlength="64"></label><button>Unlock rehearsal</button></form></html>',
        result,
      );
    }
    if (url.pathname === "/__rehearsal" && request.method === "POST") {
      if (request.headers.get("Content-Type") !== "application/x-www-form-urlencoded")
        return response(415);
      let body: string;
      try {
        body = new TextDecoder().decode(await boundedBody(request, 128));
      } catch {
        return response(413);
      }
      const form = new URLSearchParams(body);
      if (
        body.length > 128 ||
        [...form.keys()].join(",") !== "key" ||
        !(await equal(form.get("key") ?? "", accessKey))
      )
        return response(403);
      const result = response(303);
      result.headers.set("Location", "/portal/order");
      result.headers.set(
        "Set-Cookie",
        `${cookieName}=${accessKey}; Path=/; Secure; HttpOnly; SameSite=Strict`,
      );
      return result;
    }
    if (!webhook) {
      const cookies = (request.headers.get("Cookie") ?? "")
        .split(";")
        .map((value) => value.trim())
        .filter((value) => value.startsWith(cookieName + "="));
      if (
        cookies.length !== 1 ||
        !(await equal(cookies[0]!.slice(cookieName.length + 1), accessKey))
      )
        return response(401);
      if (
        !(
          request.method === "GET" &&
          (pages.has(url.pathname) || /^\/assets\/[a-zA-Z0-9_.-]+$/.test(url.pathname))
        ) &&
        !(request.method === "POST" && commands.has(url.pathname))
      )
        return response(404);
    }
    // Production handler origin policy is unchanged. Only this authenticated separate entry
    // translates its own exact same-origin requests; arbitrary origins are rejected above.
    const headers = new Headers(request.headers);
    if (headers.has("Origin")) headers.set("Origin", canonical);
    if (headers.has("Referer")) headers.delete("Referer");
    let body: Uint8Array<ArrayBuffer> | undefined;
    try {
      body = request.method === "POST" ? await boundedBody(request, 65536) : undefined;
    } catch {
      return response(413);
    }
    const internal = new Request(canonical + url.pathname, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
    const result = await next(internal);
    const output = new Headers(result.headers);
    const location = output.get("Location");
    if (location?.startsWith(canonical + "/"))
      output.set("Location", url.origin + location.slice(canonical.length));
    output.set("Cache-Control", "private, no-store");
    output.set("X-Robots-Tag", "noindex, nofollow");
    output.set("Referrer-Policy", "no-referrer");
    return new Response(result.body, { status: result.status, headers: output });
  };
}
