import { describe, expect, it, vi } from "vitest";

import {
  openTreatmentIntent,
  readTreatmentIntentEncryptionKey,
  treatmentIntentWireIds,
} from "@/domain/journey/treatment-intent";
import { createTreatmentIntentHttpHandler } from "./treatment-intent-http";

const origin = "https://meneerhealth.co.za";
const encodedKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const key = readTreatmentIntentEncryptionKey(encodedKey);
const allowRate = { limit: vi.fn(async () => ({ success: true })) };

function request(selection: string, requestOrigin = origin): Request {
  return new Request(`${origin}/api/journey/intent`, {
    method: "POST",
    body: new URLSearchParams({ selection }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: requestOrigin,
      "Sec-Fetch-Site": requestOrigin === origin ? "same-origin" : "cross-site",
    },
  });
}

describe("treatment intent endpoint", () => {
  it("stores an encrypted short-lived cookie and redirects without URL intent", async () => {
    const response = await createTreatmentIntentHttpHandler({
      JOURNEY_INTENT_ENCRYPTION_KEY_BASE64: encodedKey,
      REQUEST_RATE_LIMITER: allowRate,
    })(request(treatmentIntentWireIds.ed));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${origin}/start`);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).not.toContain("ed");
    const token = cookie.match(/^[^=]+=([^;]+)/)?.[1];
    await expect(openTreatmentIntent(token, key)).resolves.toBe("ed");
  });

  it("redirects unsupported input without storing it", async () => {
    const response = await createTreatmentIntentHttpHandler({
      JOURNEY_INTENT_ENCRYPTION_KEY_BASE64: encodedKey,
      REQUEST_RATE_LIMITER: allowRate,
    })(request("hair"));

    expect(response.status).toBe(303);
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it("rejects cross-origin requests and degrades safely without configuration", async () => {
    const handler = createTreatmentIntentHttpHandler({
      JOURNEY_INTENT_ENCRYPTION_KEY_BASE64: encodedKey,
      REQUEST_RATE_LIMITER: allowRate,
    });
    const crossOrigin = await handler(
      request(treatmentIntentWireIds.hair, "https://example.invalid"),
    );
    const unavailable = await createTreatmentIntentHttpHandler({
      REQUEST_RATE_LIMITER: allowRate,
    })(request(treatmentIntentWireIds.hair));

    expect(crossOrigin.status).toBe(403);
    expect(unavailable.status).toBe(303);
    expect(unavailable.headers.get("location")).toBe(`${origin}/start`);
    expect(unavailable.headers.has("set-cookie")).toBe(false);
  });
});
