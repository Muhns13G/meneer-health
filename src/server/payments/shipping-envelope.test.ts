import { expect, it } from "vitest";
import { encryptShippingAddress, decryptShippingAddress } from "./shipping-envelope";
const scope = {
  tenantId: "15020000-0000-4000-8000-000000000001",
  subjectId: "15020000-0000-4000-8000-000000000002",
  caseId: "15020000-0000-4000-8000-000000000003",
  snapshotId: "15020000-0000-4000-8000-000000000004",
  version: 1,
};
const bytes = Uint8Array.from({ length: 32 }, (_, i) => i);
const address = {
  recipient: "Synthetic client",
  line1: "1 Example Road",
  locality: "Synthetic town",
  province: "Western Cape",
  postalCode: "7201",
  country: "ZA",
};
it("encrypts addresses with random nonces and no plaintext fields", async () => {
  const a = await encryptShippingAddress(address, scope, "synthetic-address-v1", bytes);
  const b = await encryptShippingAddress(address, scope, "synthetic-address-v1", bytes);
  expect(a.nonce).not.toBe(b.nonce);
  expect(JSON.stringify(a)).not.toContain(address.line1);
  expect(await decryptShippingAddress(a, scope, { "synthetic-address-v1": bytes })).toEqual(
    address,
  );
});
it.each(["tenantId", "subjectId", "caseId", "snapshotId", "version"] as const)(
  "rejects wrong %s scope",
  async (field) => {
    const envelope = await encryptShippingAddress(address, scope, "synthetic-address-v1", bytes);
    const changed = {
      ...scope,
      [field]: field === "version" ? 2 : "15020000-0000-4000-8000-000000000009",
    };
    await expect(
      decryptShippingAddress(envelope, changed, { "synthetic-address-v1": bytes }),
    ).rejects.toThrow("SHIPPING_ENVELOPE_REJECTED");
  },
);
it("rejects unknown/wrong keys, tampering and malformed addresses", async () => {
  const envelope = await encryptShippingAddress(address, scope, "synthetic-address-v1", bytes);
  await expect(decryptShippingAddress(envelope, scope, {})).rejects.toThrow();
  await expect(
    decryptShippingAddress(envelope, scope, { "synthetic-address-v1": new Uint8Array(32) }),
  ).rejects.toThrow();
  await expect(
    decryptShippingAddress({ ...envelope, ciphertext: "A".repeat(24) }, scope, {
      "synthetic-address-v1": bytes,
    }),
  ).rejects.toThrow();
  await expect(
    encryptShippingAddress({ ...address, line1: "" }, scope, "synthetic-address-v1", bytes),
  ).rejects.toThrow();
  await expect(
    encryptShippingAddress(address, scope, "synthetic-address-v1", new Uint8Array(16)),
  ).rejects.toThrow();
});
