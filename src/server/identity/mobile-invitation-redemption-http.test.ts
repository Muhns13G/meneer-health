import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createMobileRedemptionHandler } from "./mobile-invitation-redemption-http";
import {
  mobileClaimCookie,
  mobileClaimKey,
  mobileClaimSecret,
  mobileDigest,
  openMobileClaim,
  sealMobileClaim,
} from "./mobile-invitation-claim";
import { applyResponsePolicy } from "@/server/security/response-policy";

const id = "a1460000-0000-4000-8000-000000000001";
const key = btoa("k".repeat(32));
const token = "A".repeat(43);
function request(
  action: string,
  fields: Record<string, string> = {},
  cookie = "",
  headers: Record<string, string> = {},
) {
  return new Request(`https://meneerhealth.co.za/mobile-invitation/${action}`, {
    method: "POST",
    headers: {
      origin: "https://meneerhealth.co.za",
      "content-type": "application/x-www-form-urlencoded",
      cookie,
      ...headers,
    },
    body: new URLSearchParams(fields),
  });
}
function setup() {
  const exchange = vi.fn().mockResolvedValue({
    invitationId: id,
    version: 1,
    claimId: id,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    emailBound: false,
  });
  const limit = vi.fn().mockResolvedValue({ success: true });
  const bindings = {
    REQUEST_RATE_LIMITER: { limit },
    MOBILE_INVITATIONS_REDEMPTION_MODE: "enabled",
    MOBILE_INVITATIONS_TENANT_ID: id,
    MOBILE_INVITATION_CLAIM_KEY_BASE64: key,
  };
  return { exchange, limit, bindings, handler: createMobileRedemptionHandler(bindings, exchange) };
}
describe("mobile claim transport", () => {
  it("rejects noncanonical hosts, query bearers, oversized and duplicate fields", async () => {
    const { handler, exchange } = setup();
    for (const url of [
      "https://foreign.example.invalid/mobile-invitation",
      "http://meneerhealth.co.za/mobile-invitation",
      `https://meneerhealth.co.za/mobile-invitation?token=${token}`,
    ]) {
      expect((await handler(new Request(url))).status).toBe(404);
    }
    const duplicated = new Request("https://meneerhealth.co.za/mobile-invitation/redeem", {
      method: "POST",
      headers: {
        origin: "https://meneerhealth.co.za",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `token=${token}&token=${token}&requestKey=${id}`,
    });
    expect((await handler(duplicated)).status).toBe(422);
    expect(
      (await handler(request("redeem", { token: "A".repeat(900), requestKey: id }))).status,
    ).toBe(413);
    expect(exchange).not.toHaveBeenCalled();
  });
  it.each(["GET", "HEAD"])(
    "%s renders only a generic document and never exchanges",
    async (method) => {
      const { handler, exchange } = setup();
      const req = new Request("https://meneerhealth.co.za/mobile-invitation", { method });
      const response = applyResponsePolicy(req, await handler(req));
      expect(response.status).toBe(200);
      expect(exchange).not.toHaveBeenCalled();
      expect(response.headers.has("Set-Cookie")).toBe(false);
      expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
      expect(response.headers.get("Content-Security-Policy")).not.toContain("https:");
      if (method === "HEAD") expect(await response.text()).toBe("");
      else expect(await response.text()).not.toContain("googletag");
    },
  );
  it("exchanges a digest only and seals a host-only claim, never an account session", async () => {
    const { handler, exchange } = setup();
    const result = await handler(request("redeem", { token, requestKey: id }));
    expect(result.status).toBe(200);
    const cookie = result.headers.get("Set-Cookie")!;
    expect(cookie).toMatch(/; Path=\/; Max-Age=\d+; HttpOnly; Secure; SameSite=Strict$/);
    expect(cookie.startsWith(`${mobileClaimCookie}=v1.`)).toBe(true);
    expect(JSON.stringify(exchange.mock.calls)).not.toContain(token);
    expect(exchange.mock.calls[0]![0]).toMatchObject({
      p_action: "redeem",
      p_tenant_id: id,
      p_email: null,
      p_token_digest: await mobileDigest(token),
    });
    expect(await result.json()).toEqual({
      status: "claimed",
      expiresAt:
        exchange.mock.results[0]!.value instanceof Promise
          ? (await exchange.mock.results[0]!.value).expiresAt
          : "",
      emailBound: false,
    });
    const proof = await openMobileClaim(
      cookie.split(";", 1)[0]!.split("=", 2)[1],
      mobileClaimKey(key),
    );
    expect(proof).toMatchObject({ tenantId: id, requestKey: id, version: 1 });
    expect(proof).not.toHaveProperty("email");
    expect(proof).not.toHaveProperty("accessToken");
  });
  it("exact interrupted exchanges derive the same secret; different requests and tenants do not", async () => {
    const bytes = mobileClaimKey(key);
    const digest = await mobileDigest(token);
    const original = await mobileClaimSecret(bytes, id, digest, id);
    expect(await mobileClaimSecret(bytes, id, digest, id)).toBe(original);
    expect(await mobileClaimSecret(bytes, id, digest, crypto.randomUUID())).not.toBe(original);
    expect(await mobileClaimSecret(bytes, crypto.randomUUID(), digest, id)).not.toBe(original);
    expect(await mobileClaimSecret(mobileClaimKey(btoa("j".repeat(32))), id, digest, id)).not.toBe(
      original,
    );
  });
  it("binds normalised email only through the sealed live claim and resumes without bearer", async () => {
    const { handler, exchange } = setup();
    const first = await handler(request("redeem", { token, requestKey: id }));
    const cookie = first.headers.get("Set-Cookie")!.split(";", 1)[0]!;
    exchange.mockResolvedValue({
      invitationId: id,
      version: 1,
      claimId: id,
      expiresAt: z.object({ expiresAt: z.string() }).parse(await first.json()).expiresAt,
      emailBound: true,
    });
    const bound = await handler(
      request("bind", { email: "  Synthetic@Example.invalid  " }, cookie),
    );
    expect(bound.status).toBe(200);
    expect(exchange.mock.lastCall![0].p_email).toBe("synthetic@example.invalid");
    expect(await bound.text()).not.toContain("synthetic");
    expect((await handler(request("read", {}, cookie))).status).toBe(200);
  });
  it("does not extend expiry on cookie reissue", async () => {
    const { handler, exchange } = setup();
    const first = await handler(request("redeem", { token, requestKey: id }));
    const cookie = first.headers.get("Set-Cookie")!.split(";", 1)[0]!;
    const original = z.object({ expiresAt: z.string() }).parse(await first.json());
    exchange.mockResolvedValue({
      invitationId: id,
      version: 1,
      claimId: id,
      expiresAt: original.expiresAt,
      emailBound: false,
    });
    expect(
      z
        .object({ expiresAt: z.string() })
        .parse(await (await handler(request("read", {}, cookie))).json()).expiresAt,
    ).toBe(original.expiresAt);
  });
  it.each(["read", "bind", "decline"])(
    "%s needs a cookie and cannot use forged IDs",
    async (action) => {
      const { handler, exchange } = setup();
      expect(
        await (
          await handler(request(action, action === "bind" ? { email: "s@example.invalid" } : {}))
        ).json(),
      ).toEqual({ status: "unavailable" });
      expect(exchange).not.toHaveBeenCalled();
      expect((await handler(request(action, { invitationId: id }))).status).toBe(422);
    },
  );
  it("clears stale claims with the same generic invalid/revoked/replaced response", async () => {
    const { handler, exchange } = setup();
    exchange.mockResolvedValue(null);
    const result = await handler(request("redeem", { token, requestKey: id }));
    expect(await result.json()).toEqual({ status: "unavailable" });
    expect(result.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
  it("deliberate decline does not create or return an identity", async () => {
    const { handler, exchange } = setup();
    exchange.mockResolvedValue({ declined: true });
    const result = await handler(request("decline", { token, requestKey: id }));
    expect(await result.json()).toEqual({ status: "declined" });
    expect(result.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
  it.each([
    ["redeem", { token, requestKey: id, tenantId: id }, {}, 422],
    ["redeem", { token: "bad", requestKey: id }, {}, 422],
    ["redeem", { token, requestKey: id }, { origin: "https://evil.example.invalid" }, 403],
    ["redeem", { token, requestKey: id }, { "sec-fetch-site": "cross-site" }, 403],
    ["redeem", { token, requestKey: id }, { "content-type": "application/json" }, 400],
    ["bind", { email: "not-an-email" }, {}, 422],
  ] as const)(
    "rejects malformed/cross-origin input %s %j",
    async (action, fields, headers, expected) => {
      const { handler, exchange } = setup();
      expect((await handler(request(action, fields, "", headers))).status).toBe(expected);
      expect(exchange).not.toHaveBeenCalled();
    },
  );
  it("rate and dependency failures never acknowledge a binding", async () => {
    const { handler, exchange, limit } = setup();
    limit.mockResolvedValue({ success: false });
    expect((await handler(request("redeem", { token, requestKey: id }))).status).toBe(429);
    expect(exchange).not.toHaveBeenCalled();
    limit.mockResolvedValue({ success: true });
    exchange.mockRejectedValue(new Error("private-provider-error"));
    const response = await handler(request("redeem", { token, requestKey: id }));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-provider");
  });
  it("disabled or missing configuration never touches SQL", async () => {
    const { bindings, exchange } = setup();
    for (const override of [
      { MOBILE_INVITATIONS_REDEMPTION_MODE: "disabled" },
      { MOBILE_INVITATION_CLAIM_KEY_BASE64: "" },
      { MOBILE_INVITATIONS_TENANT_ID: "" },
    ]) {
      expect(
        (
          await createMobileRedemptionHandler(
            { ...bindings, ...override },
            exchange,
          )(request("redeem", { token, requestKey: id }))
        ).status,
      ).toBe(503);
    }
    expect(exchange).not.toHaveBeenCalled();
  });
  it("rejects tamper, wrong key, expiry, and unbounded cookie deadlines", async () => {
    const bytes = mobileClaimKey(key);
    const proof = {
      tenantId: id,
      invitationId: id,
      version: 1,
      claimId: id,
      requestKey: id,
      tokenDigest: "a".repeat(64),
      secret: "b".repeat(64),
      expiresAt: 601000,
    };
    const sealed = await sealMobileClaim(proof, bytes, 1000);
    expect(await openMobileClaim(sealed, bytes, 1000)).toEqual(proof);
    expect(await openMobileClaim(sealed, bytes, 601000)).toBeNull();
    expect(await openMobileClaim(sealed + "x", bytes, 1000)).toBeNull();
    expect(await openMobileClaim(sealed, mobileClaimKey(btoa("j".repeat(32))), 1000)).toBeNull();
    await expect(sealMobileClaim({ ...proof, expiresAt: 902000 }, bytes, 1000)).rejects.toThrow();
  });
});
