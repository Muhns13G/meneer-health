import "@tanstack/react-start/server-only";
import {
  shippingAddressSchema,
  shippingEnvelopeSchema,
  shippingScopeSchema,
  type ShippingScope,
} from "@/domain/payments/product-catalogue";

const encode = (v: Uint8Array) => btoa(Array.from(v, (b) => String.fromCharCode(b)).join(""));
const decode = (v: string) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
function aad(scope: ShippingScope, keyId: string) {
  return new TextEncoder().encode(
    JSON.stringify([
      "meneer-shipping-v1",
      keyId,
      scope.tenantId,
      scope.subjectId,
      scope.caseId,
      scope.snapshotId,
      scope.version,
    ]),
  );
}
async function key(bytes: Uint8Array<ArrayBuffer>, usage: KeyUsage) {
  if (bytes.byteLength !== 32) throw new Error("SHIPPING_KEY_INVALID");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [usage]);
}
export async function encryptShippingAddress(
  address: unknown,
  scope: ShippingScope,
  keyId: string,
  bytes: Uint8Array<ArrayBuffer>,
) {
  shippingScopeSchema.parse(scope);
  const value = shippingAddressSchema.parse(address);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, additionalData: aad(scope, keyId) },
    await key(bytes, "encrypt"),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return shippingEnvelopeSchema.parse({
    algorithm: "AES-256-GCM",
    keyId,
    scope,
    nonce: encode(nonce),
    ciphertext: encode(new Uint8Array(ciphertext)),
  });
}
export async function decryptShippingAddress(
  envelope: unknown,
  expected: ShippingScope,
  keys: Readonly<Record<string, Uint8Array<ArrayBuffer>>>,
) {
  try {
    const v = shippingEnvelopeSchema.parse(envelope);
    shippingScopeSchema.parse(expected);
    if (
      JSON.stringify(aad(v.scope, v.keyId)) !== JSON.stringify(aad(expected, v.keyId)) ||
      !Object.hasOwn(keys, v.keyId)
    )
      throw new Error();
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(v.nonce), additionalData: aad(expected, v.keyId) },
      await key(keys[v.keyId]!, "decrypt"),
      decode(v.ciphertext),
    );
    return shippingAddressSchema.parse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext)),
    );
  } catch {
    throw new Error("SHIPPING_ENVELOPE_REJECTED");
  }
}
