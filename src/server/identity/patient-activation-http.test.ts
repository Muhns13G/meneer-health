import { describe, expect, it, vi } from "vitest";
import { createPatientActivationHttpHandler } from "./patient-activation-http";
import { sealPreactivationProof, preactivationCookieName } from "./preactivation-cookie";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";

const id = "91000000-0000-4000-8000-000000000001";
const key = new Uint8Array(32).fill(9);
const origin = "https://meneerhealth.co.za";
async function harness() {
  const token = await sealPreactivationProof(
    {
      invitation: {
        id,
        tenantId: id,
        contactDigest: "a".repeat(64),
        providerSubject: id,
        intendedRole: "patient",
        status: "pending",
        expiresAt: new Date(Date.now() + 60000),
      },
      session: {
        accessToken: "synthetic-access",
        refreshToken: "synthetic-refresh",
        expiresAt: new Date(Date.now() + 60000),
      },
    },
    key,
  );
  const activate = vi.fn(async () => {});
  const prepare = vi.fn(async () => ({
    verifiedEmail: "synthetic@example.invalid",
    documents: [],
  }));
  const handler = createPatientActivationHttpHandler(
    {
      IDENTITY_PREACTIVATION_KEY_BASE64: btoa(String.fromCharCode(...key)),
      REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
    },
    { activate, prepare },
  );
  const post = (headers?: HeadersInit, body = JSON.stringify({ requestKey: id })) =>
    new Request(`${origin}/account/activate`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        Cookie: `${preactivationCookieName}=${token}`,
        ...headers,
      },
      body,
    });
  return { handler, activate, prepare, post, token };
}
describe("activation HTTP boundary", () => {
  it("requires a valid preactivation proof and same-origin idempotent command", async () => {
    const h = await harness();
    expect((await h.handler(h.post({ Cookie: "" }))).status).toBe(401);
    expect((await h.handler(h.post({ Origin: "https://example.invalid" }))).status).toBe(403);
    expect((await h.handler(h.post({}, "x".repeat(2049)))).status).toBe(413);
    expect((await h.handler(h.post({}, JSON.stringify({ requestKey: "mismatched" })))).status).toBe(
      422,
    );
    expect(h.activate).not.toHaveBeenCalled();
  });
  it("returns an empty no-store success only after storage commits", async () => {
    const h = await harness();
    const result = await h.handler(h.post());
    expect(result.status).toBe(204);
    expect(await result.text()).toBe("");
    expect(result.headers.get("Cache-Control")).toContain("no-store");
    expect(result.headers.get("Set-Cookie")).toBeNull();
    expect(h.activate).toHaveBeenCalledTimes(1);
  });
  it("maps durable failures and stale publications to safe responses without details", async () => {
    const h = await harness();
    h.activate.mockRejectedValueOnce(new Error("secret-provider-diagnostic"));
    expect((await h.handler(h.post())).status).toBe(503);
    h.activate.mockRejectedValueOnce(new IdentityRejectedError());
    expect((await h.handler(h.post())).status).toBe(422);
  });
  it("serves instruments only with a proof and without caching", async () => {
    const h = await harness();
    const result = await h.handler(
      new Request(`${origin}/account/activate/instruments`, {
        headers: { Cookie: `${preactivationCookieName}=${h.token}` },
      }),
    );
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toContain("no-store");
    expect(await result.text()).not.toContain("synthetic-access");
  });
});
