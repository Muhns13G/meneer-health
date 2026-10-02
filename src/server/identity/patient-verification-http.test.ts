import { describe, expect, it, vi } from "vitest";

import type { VerifiedPatientInvitation } from "@/application/identity/patient-invitation-verification-service";
import { openPreactivationProof, preactivationCookieName } from "./preactivation-cookie";
import { createPatientVerificationHttpHandler } from "./patient-verification-http";

const origin = "https://meneerhealth.co.za";
const key = new Uint8Array(32).fill(9);
const encodedKey = btoa(String.fromCharCode(...key));

const verified: VerifiedPatientInvitation = {
  invitation: {
    id: "60000000-0000-4000-8000-000000000002",
    tenantId: "10000000-0000-4000-8000-000000000001",
    contactDigest: "a".repeat(64),
    intendedRole: "patient",
    providerSubject: "provider-subject",
    status: "pending",
    expiresAt: new Date(Date.now() + 3_600_000),
  },
  session: {
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
    expiresAt: new Date(Date.now() + 3_600_000),
  },
};

function post(headers?: HeadersInit, body = "email=patient%40example.invalid&code=123456") {
  return new Request(`${origin}/account/verify`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      ...headers,
    },
  });
}

function harness(keyValue: unknown = encodedKey) {
  const verify = vi.fn(async () => verified);
  const handler = createPatientVerificationHttpHandler(
    {
      IDENTITY_PREACTIVATION_KEY_BASE64: keyValue,
      REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
    },
    { verify },
  );
  return { handler, verify };
}

describe("first-party invitation HTTP boundary", () => {
  it("issues only an encrypted, secure, HttpOnly, short-lived continuation cookie", async () => {
    const { handler, verify } = harness();
    const response = await handler(post());
    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const cookie = response.headers.get("Set-Cookie") ?? "";
    expect(cookie).toMatch(/Path=\/; Max-Age=600; HttpOnly; Secure; SameSite=Strict/);
    expect(cookie).not.toContain("synthetic-access");
    expect(cookie).not.toContain("patient@example.invalid");
    const token = cookie.match(new RegExp(`${preactivationCookieName}=([^;]+)`))?.[1];
    await expect(openPreactivationProof(token, key)).resolves.toMatchObject({
      invitationId: verified.invitation.id,
      providerSubject: verified.invitation.providerSubject,
    });
    expect(verify).toHaveBeenCalledWith("patient@example.invalid", "123456");
  });

  it("rejects cross-origin, duplicate fields and oversized bodies before Auth", async () => {
    const { handler, verify } = harness();
    expect((await handler(post({ Origin: "https://example.invalid" }))).status).toBe(403);
    expect(
      (await handler(post(undefined, "email=a%40example.invalid&code=123456&code=654321"))).status,
    ).toBe(422);
    expect((await handler(post(undefined, "x".repeat(385)))).status).toBe(413);
    expect(verify).not.toHaveBeenCalled();
  });

  it("fails closed before code consumption when the server key is absent", async () => {
    const { handler, verify } = harness(null);
    const response = await handler(post());
    expect(response.status).toBe(503);
    expect(response.headers.has("Set-Cookie")).toBe(false);
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns the same empty rejection for any invalid or stale invitation", async () => {
    const verify = vi.fn(async () => {
      throw new Error("private provider detail");
    });
    const handler = createPatientVerificationHttpHandler(
      {
        IDENTITY_PREACTIVATION_KEY_BASE64: encodedKey,
        REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
      },
      { verify },
    );
    const response = await handler(post());
    expect(response.status).toBe(422);
    expect(await response.text()).toBe("");
    expect(response.headers.has("Set-Cookie")).toBe(false);
  });
});
