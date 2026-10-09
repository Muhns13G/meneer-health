import { describe, expect, it, vi } from "vitest";
import { createWorkforceHttpHandler } from "./workforce-http";
import {
  workforceCookieName,
  openWorkforceProof,
  sealWorkforceProof,
} from "./workforce-session-cookie";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";
const secret = btoa("k".repeat(32));
const id = "a1000000-0000-4000-8000-000000000001";
const proof: WorkforceProof = {
  context: { subjectId: id, tenantId: id, role: "operations", purpose: "operations" },
  providerSessionId: id,
  providerSession: {
    accessToken: "synthetic",
    refreshToken: "synthetic",
    expiresAt: new Date(Date.now() + 3600_000),
  },
  factorId: id,
};
const bindings = {
  IDENTITY_SESSION_KEY_BASE64: secret,
  REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
function setup() {
  const service = {
    requestCode: vi.fn(),
    verifyCode: vi.fn().mockResolvedValue({ proof }),
    completeMfa: vi.fn(),
    completeMfaForContextChoice: vi.fn(),
    selectContext: vi.fn(),
    authorise: vi.fn(),
    renew: vi.fn(),
    invite: vi.fn(),
    signOut: vi.fn(),
  };
  return { service, handler: createWorkforceHttpHandler(bindings, service) };
}
function request(
  path = "sign-in",
  fields: Record<string, string> = { action: "request", email: "staff@example.invalid" },
  headers: Record<string, string> = {},
) {
  return new Request(`https://meneerhealth.co.za/staff/${path}`, {
    method: "POST",
    headers: {
      origin: "https://meneerhealth.co.za",
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(fields),
  });
}
describe("staff HTTP and sealed cookie boundary", () => {
  it("post-MFA context choices expose no tokens and still issue only a pending cookie", async () => {
    const s = setup();
    const pending = { ...proof, contextChoiceRequired: true };
    s.service.completeMfaForContextChoice.mockResolvedValue({
      proof: { ...pending, factorId: undefined, contextChoiceReady: true },
      contexts: [proof.context],
    });
    const cookie = await sealWorkforceProof(pending, new Date(Date.now() + 600000), secret);
    const response = await s.handler(
      request("mfa", { code: "123456" }, { cookie: cookie.split(";", 1)[0]! }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contexts: [proof.context] });
    expect(s.service.completeMfa).not.toHaveBeenCalled();
    const next = await openWorkforceProof(
      new Request("https://meneerhealth.co.za", {
        headers: { cookie: response.headers.get("set-cookie")!.split(";", 1)[0]! },
      }),
      secret,
    );
    expect(next?.contextChoiceReady).toBe(true);
    expect(next?.sessionId).toBeUndefined();
  });
  it("context endpoint rejects extra authority fields and anonymous requests", async () => {
    const s = setup();
    expect((await s.handler(request("context", { tenantId: id, role: "auditor" }))).status).toBe(
      401,
    );
    const cookie = await sealWorkforceProof(
      { ...proof, contextChoiceRequired: true, contextChoiceReady: true },
      new Date(Date.now() + 600000),
      secret,
    );
    expect(
      (
        await s.handler(
          request(
            "context",
            { tenantId: id, role: "auditor", purpose: "forged" },
            {
              cookie: cookie.split(";", 1)[0]!,
            },
          ),
        )
      ).status,
    ).toBe(422);
    expect(s.service.selectContext).not.toHaveBeenCalled();
  });
  it("rejects role/tenant/purpose inputs and duplicate fields", async () => {
    const s = setup();
    for (const field of ["role", "tenantId", "purpose", "assurance"]) {
      const r = await s.handler(
        request("sign-in", {
          action: "request",
          email: "staff@example.invalid",
          [field]: "forged",
        }),
      );
      expect(r.status).toBe(422);
    }
    expect(s.service.requestCode).not.toHaveBeenCalled();
    const r = request();
    const duplicate = new Request(r.url, {
      method: "POST",
      headers: r.headers,
      body: "action=request&email=a%40example.invalid&email=b%40example.invalid",
    });
    expect((await s.handler(duplicate)).status).toBe(422);
  });
  it("rejects cross-origin and oversized requests before identity calls", async () => {
    const s = setup();
    expect(
      (await s.handler(request("sign-in", undefined, { origin: "https://evil.invalid" }))).status,
    ).toBe(403);
    expect(
      (await s.handler(request("sign-in", { action: "request", email: "x".repeat(600) }))).status,
    ).toBe(413);
    expect(s.service.requestCode).not.toHaveBeenCalled();
  });
  it("email verification issues only a protected pending cookie and no token JSON", async () => {
    const s = setup();
    const r = await s.handler(
      request("sign-in", { action: "verify", email: "staff@example.invalid", code: "123456" }),
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ enrollment: null });
    expect(r.headers.get("set-cookie")).toContain("HttpOnly; Secure; SameSite=Strict");
    expect(r.headers.get("cache-control")).toContain("no-store");
    const p = await openWorkforceProof(
      new Request("https://meneerhealth.co.za", {
        headers: { cookie: r.headers.get("set-cookie")!.split(";", 1)[0]! },
      }),
      secret,
    );
    expect(p?.sessionId).toBeUndefined();
  });
  it("pending setup cookies cannot read staff session", async () => {
    const s = setup();
    const cookie = await sealWorkforceProof(proof, new Date(Date.now() + 600_000), secret);
    expect(
      (
        await s.handler(
          new Request("https://meneerhealth.co.za/staff/session", {
            headers: { cookie: cookie.split(";", 1)[0]! },
          }),
        )
      ).status,
    ).toBe(401);
    expect(s.service.authorise).not.toHaveBeenCalled();
  });
  it("rejects missing, duplicate, tampered, expired and patient cookies", async () => {
    const cookie = await sealWorkforceProof(proof, new Date(Date.now() + 600_000), secret);
    const value = cookie.split(";", 1)[0]!;
    for (const bad of [
      "",
      `${value}; ${value}`,
      value.slice(0, -8) + "tampered",
      "__Host-meneer-session=synthetic",
    ]) {
      expect(
        await openWorkforceProof(
          new Request("https://meneerhealth.co.za", { headers: { cookie: bad } }),
          secret,
        ),
      ).toBeNull();
    }
    expect(
      await openWorkforceProof(
        new Request("https://meneerhealth.co.za", { headers: { cookie: value } }),
        secret,
        Date.now() + 700_000,
      ),
    ).toBeNull();
    expect(value).toContain(workforceCookieName);
  });
  it("does not disclose context in URLs", async () => {
    expect(
      (await setup().handler(new Request("https://meneerhealth.co.za/staff/session?role=admin")))
        .status,
    ).toBe(404);
  });
});
