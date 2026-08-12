import { describe, expect, it } from "vitest";

import { applyResponsePolicy, classifyResponse } from "./response-policy";

const BASE_URL = "https://meneerhealth.co.za";

function request(pathname: string, method = "GET"): Request {
  return new Request(`${BASE_URL}${pathname}`, { method });
}

describe("response security policy", () => {
  it("sets the browser security baseline on public documents", async () => {
    const original = new Response("home", {
      headers: { "Content-Type": "text/html", "X-Existing": "retained" },
    });
    const secured = applyResponsePolicy(request("/"), original, "syntheticnonce");

    expect(classifyResponse(request("/"), original)).toBe("public-document");
    expect(secured.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    expect(secured.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(secured.headers.get("Content-Security-Policy")).toContain(
      "https://fonts.googleapis.com",
    );
    expect(secured.headers.get("Content-Security-Policy")).toContain("upgrade-insecure-requests");
    expect(secured.headers.get("Content-Security-Policy")).toContain(
      "script-src 'self' 'nonce-syntheticnonce'",
    );
    expect(secured.headers.get("Content-Security-Policy")).not.toContain(
      "script-src 'self' 'unsafe-inline'",
    );
    expect(secured.headers.get("Permissions-Policy")).toContain("camera=()");
    expect(secured.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(secured.headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(secured.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(secured.headers.get("X-Frame-Options")).toBe("DENY");
    expect(secured.headers.has("X-Robots-Tag")).toBe(false);
    expect(secured.headers.get("X-Existing")).toBe("retained");
    expect(await secured.text()).toBe("home");
  });

  it.each(["/start", "/start/step", "/peptides"])(
    "prevents storage of the sensitive route %s",
    (pathname) => {
      const original = new Response("sensitive");
      const secured = applyResponsePolicy(request(pathname), original);

      expect(classifyResponse(request(pathname), original)).toBe("sensitive");
      expect(secured.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
      expect(secured.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    },
  );

  it("fails unknown future success responses closed instead of caching them publicly", () => {
    const futureRequest = request("/future-endpoint");
    const original = new Response("future");
    const secured = applyResponsePolicy(futureRequest, original);

    expect(classifyResponse(futureRequest, original)).toBe("sensitive");
    expect(secured.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(secured.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("gives fingerprinted build assets a long immutable lifetime", () => {
    const original = new Response("asset");
    const secured = applyResponsePolicy(request("/assets/site-a1b2c3.js"), original);

    expect(classifyResponse(request("/assets/site-a1b2c3.js"), original)).toBe(
      "fingerprinted-asset",
    );
    expect(secured.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("keeps non-fingerprinted campaign assets revalidatable", () => {
    const original = new Response("asset");
    const secured = applyResponsePolicy(request("/campaigns/qr/dads.svg"), original);

    expect(classifyResponse(request("/campaigns/qr/dads.svg"), original)).toBe("public-asset");
    expect(secured.headers.get("Cache-Control")).toBe("public, max-age=3600, must-revalidate");
  });

  it.each([
    ["error", "/missing", new Response("missing", { status: 404 })],
    ["error", "/", new Response("failed public document", { status: 503 })],
    ["redirect", "/go/dads", new Response(null, { status: 307 })],
  ] as const)("prevents storage of %s responses", (responseClass, pathname, original) => {
    const secured = applyResponsePolicy(request(pathname), original);

    expect(classifyResponse(request(pathname), original)).toBe(responseClass);
    expect(secured.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(secured.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("prevents storage of cookie-bearing and non-read responses", () => {
    const cookieResponse = applyResponsePolicy(
      request("/"),
      new Response("cookie", { headers: { "Set-Cookie": "session=synthetic" } }),
    );
    const postResponse = applyResponsePolicy(request("/", "POST"), new Response("post"));

    expect(cookieResponse.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(postResponse.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
  });

  it("does not emit transport-only policy on local HTTP", () => {
    const localRequest = new Request("http://127.0.0.1:8080/");
    const secured = applyResponsePolicy(localRequest, new Response("local"));

    expect(secured.headers.has("Strict-Transport-Security")).toBe(false);
    expect(secured.headers.get("Content-Security-Policy")).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("preserves a nonce-bearing policy when the outer entry applies the policy again", () => {
    const initial = applyResponsePolicy(request("/"), new Response("stream"), "syntheticnonce");
    const outer = applyResponsePolicy(request("/"), initial);

    expect(outer.headers.get("Content-Security-Policy")).toContain(
      "script-src 'self' 'nonce-syntheticnonce'",
    );
  });
});
