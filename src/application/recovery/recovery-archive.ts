import {
  encryptedRecoveryArchiveSchema,
  recoveryManifestSchema,
  type EncryptedRecoveryArchive,
  type RecoveryManifest,
} from "../../../contracts/lifecycle";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(value: Uint8Array): string {
  return Buffer.from(value).toString("base64");
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

export async function encryptRecoveryArchive(
  manifest: RecoveryManifest,
  payload: Uint8Array<ArrayBuffer>,
  keyBytes: Uint8Array<ArrayBuffer>,
  keyReference: string,
  iv: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(12)),
): Promise<EncryptedRecoveryArchive> {
  const validated = recoveryManifestSchema.parse(manifest);
  if (keyBytes.byteLength !== 32) throw new Error("RECOVERY_KEY_INVALID");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify({ manifest: validated, payload: bytesToBase64(payload) })),
  );
  return encryptedRecoveryArchiveSchema.parse({
    contract: "recovery.encrypted-archive",
    version: 1,
    algorithm: "AES-256-GCM",
    keyReference,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  });
}

export async function decryptRecoveryArchive(
  archive: EncryptedRecoveryArchive,
  keyBytes: Uint8Array<ArrayBuffer>,
): Promise<{ manifest: RecoveryManifest; payload: Uint8Array<ArrayBuffer> }> {
  const validated = encryptedRecoveryArchiveSchema.parse(archive);
  if (keyBytes.byteLength !== 32) throw new Error("RECOVERY_KEY_INVALID");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(validated.iv) },
    key,
    base64ToBytes(validated.ciphertext),
  );
  const decoded = JSON.parse(decoder.decode(plaintext)) as {
    manifest?: unknown;
    payload?: unknown;
  };
  if (typeof decoded.payload !== "string") throw new Error("RECOVERY_ARCHIVE_INVALID");
  return {
    manifest: recoveryManifestSchema.parse(decoded.manifest),
    payload: base64ToBytes(decoded.payload),
  };
}
