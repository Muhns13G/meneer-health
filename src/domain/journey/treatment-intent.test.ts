import { describe, expect, it } from "vitest";

import {
  openTreatmentIntent,
  readTreatmentIntentEncryptionKey,
  resolveTreatmentIntentWireId,
  sealTreatmentIntent,
  treatmentIntentTtlSeconds,
  treatmentIntentWireIds,
} from "./treatment-intent";

const key = readTreatmentIntentEncryptionKey("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

describe("server-owned treatment intent", () => {
  it("maps only opaque allowlisted identifiers", () => {
    expect(resolveTreatmentIntentWireId(treatmentIntentWireIds.hair)).toBe("hair");
    expect(resolveTreatmentIntentWireId("hair")).toBeUndefined();
    expect(resolveTreatmentIntentWireId("unsupported")).toBeUndefined();
  });

  it("encrypts a valid selection without exposing its meaning", async () => {
    const token = await sealTreatmentIntent("weight", key, 1_000);

    expect(token).not.toContain("weight");
    await expect(openTreatmentIntent(token, key, 2_000)).resolves.toBe("weight");
  });

  it("accepts limited clock skew but rejects implausibly future state", async () => {
    const issuedAt = 100_000;
    const token = await sealTreatmentIntent("hair", key, issuedAt);

    await expect(openTreatmentIntent(token, key, issuedAt - 1_000)).resolves.toBe("hair");
    await expect(openTreatmentIntent(token, key, issuedAt - 60_001)).resolves.toBeUndefined();
  });

  it("fails closed for stale, malformed, and tampered state", async () => {
    const token = await sealTreatmentIntent("trt", key, 1_000);
    const staleAt = 1_000 + treatmentIntentTtlSeconds * 1_000;

    await expect(openTreatmentIntent(token, key, staleAt)).resolves.toBeUndefined();
    await expect(openTreatmentIntent(`${token}tampered`, key, 2_000)).resolves.toBeUndefined();
    await expect(openTreatmentIntent("trt", key, 2_000)).resolves.toBeUndefined();
  });
});
