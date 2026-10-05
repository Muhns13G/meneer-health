import "@tanstack/react-start/server-only";
import {
  intakeEnvelopeSchema,
  intakeScopeSchema,
  type IntakeScope,
  type IntakeEnvelope,
} from "../../../contracts/medical-intake";

const encode = (v: Uint8Array) => btoa(Array.from(v, (b) => String.fromCharCode(b)).join(""));
const decode = (v: string) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
export type IntakeKeyRing = Readonly<{
  current: string;
  keys: Readonly<Record<string, Uint8Array<ArrayBuffer>>>;
}>;
export function readIntakeKeyRing(value: unknown): IntakeKeyRing {
  if (typeof value !== "string") throw new Error("INTAKE_KEY_UNAVAILABLE");
  try {
    const v = JSON.parse(value) as { current: string; keys: Record<string, string> };
    if (
      Object.keys(v).sort().join(",") !== "current,keys" ||
      !/^[a-z0-9-]{1,48}$/.test(v.current) ||
      !v.keys ||
      typeof v.keys !== "object" ||
      Array.isArray(v.keys) ||
      !Object.hasOwn(v.keys, v.current) ||
      Object.keys(v.keys).length > 5
    )
      throw new Error();
    const keys = Object.fromEntries(
      Object.entries(v.keys).map(([id, b64]) => {
        if (!/^[a-z0-9-]{1,48}$/.test(id) || !/^[A-Za-z0-9+/]{43}=$/.test(b64)) throw new Error();
        const bytes = decode(b64);
        if (bytes.length !== 32) throw new Error();
        return [id, bytes];
      }),
    );
    return { current: v.current, keys };
  } catch {
    throw new Error("INTAKE_KEY_UNAVAILABLE");
  }
}
function aad(scope: IntakeScope, keyId: string) {
  return new TextEncoder().encode(
    JSON.stringify([
      "meneer-medical-envelope-v1",
      keyId,
      scope.tenantId,
      scope.subjectId,
      scope.intakeId,
      scope.snapshotId,
      scope.collectionVersion,
      scope.controlVersion,
    ]),
  );
}
export async function encryptIntake(
  value: unknown,
  scope: IntakeScope,
  ring: IntakeKeyRing,
): Promise<IntakeEnvelope> {
  intakeScopeSchema.parse(scope);
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.length > 65536) throw new Error("INTAKE_PAYLOAD_TOO_LARGE");
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", ring.keys[ring.current]!, "AES-GCM", false, [
    "encrypt",
  ]);
  return intakeEnvelopeSchema.parse({
    algorithm: "AES-256-GCM",
    keyId: ring.current,
    scope,
    nonce: encode(nonce),
    ciphertext: encode(
      new Uint8Array(
        await crypto.subtle.encrypt(
          { name: "AES-GCM", iv: nonce, additionalData: aad(scope, ring.current) },
          key,
          bytes,
        ),
      ),
    ),
  });
}
export async function decryptIntake(
  envelope: unknown,
  expected: IntakeScope,
  ring: IntakeKeyRing,
): Promise<unknown> {
  try {
    const v = intakeEnvelopeSchema.parse(envelope);
    intakeScopeSchema.parse(expected);
    if (
      JSON.stringify(aad(v.scope, v.keyId)) !== JSON.stringify(aad(expected, v.keyId)) ||
      !Object.hasOwn(ring.keys, v.keyId)
    )
      throw new Error();
    const key = await crypto.subtle.importKey("raw", ring.keys[v.keyId]!, "AES-GCM", false, [
      "decrypt",
    ]);
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: decode(v.nonce), additionalData: aad(expected, v.keyId) },
          key,
          decode(v.ciphertext),
        ),
      ),
    );
  } catch {
    throw new Error("INTAKE_ENVELOPE_REJECTED");
  }
}
