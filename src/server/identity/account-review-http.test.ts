import { describe, expect, it } from "vitest";
import { createAccountReviewHttpHandler } from "./account-review-http";
const encoded = btoa(String.fromCharCode(...new Uint8Array(32).fill(2)));
const handler = createAccountReviewHttpHandler({
  IDENTITY_SESSION_KEY_BASE64: encoded,
  REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
});
const origin = "https://meneerhealth.co.za";
describe("account review HTTP denials", () => {
  it("does not accept a missing documents-only cookie", async () => {
    const r = await handler(new Request(origin + "/account/documents/current"));
    expect(r.status).toBe(401);
    expect(await r.text()).toBe("");
    expect(r.headers.get("cache-control")).toContain("no-store");
  });
  it("rejects cross-origin writes before inspecting a proof", async () => {
    const r = await handler(
      new Request(origin + "/account/documents", {
        method: "POST",
        headers: {
          Origin: "https://wrong.example.invalid",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "termsAccepted=true",
      }),
    );
    expect(r.status).toBe(403);
  });
  it("rejects duplicate/unknown fields and unsupported destinations", async () => {
    const body = new URLSearchParams({
      requestKey: "f9200000-0000-4000-8000-000000000003",
      termsPublicationId: "f9200000-0000-4000-8000-000000000001",
      termsHash: "a".repeat(64),
      privacyPublicationId: "f9200000-0000-4000-8000-000000000002",
      privacyHash: "b".repeat(64),
      termsAccepted: "true",
      privacyAcknowledged: "true",
    });
    body.append("termsAccepted", "true");
    expect(
      (
        await handler(
          new Request(origin + "/account/documents", {
            method: "POST",
            headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
            body,
          }),
        )
      ).status,
    ).toBe(422);
    expect(
      (await handler(new Request(origin + "/account/documents/current?subject=other"))).status,
    ).toBe(404);
    expect(
      (await handler(new Request("https://wrong.example.invalid/account/documents/current")))
        .status,
    ).toBe(404);
  });
});
