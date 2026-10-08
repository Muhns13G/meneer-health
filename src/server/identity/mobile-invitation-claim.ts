import "@tanstack/react-start/server-only";
import { z } from "zod";

export const mobileClaimCookie = "__Host-meneer-mobile-claim";
const encoder = new TextEncoder();
const proofSchema = z
  .object({
    tenantId: z.uuid(),
    invitationId: z.uuid(),
    version: z.number().int().positive(),
    claimId: z.uuid(),
    requestKey: z.uuid(),
    tokenDigest: z.string().regex(/^[a-f0-9]{64}$/),
    secret: z.string().regex(/^[a-f0-9]{64}$/),
    expiresAt: z.number().int().positive(),
  })
  .strict();
export type MobileClaimProof = z.infer<typeof proofSchema>;
export const mobileClaimResultSchema = z
  .object({
    invitationId: z.uuid(),
    version: z.number().int().positive(),
    claimId: z.uuid(),
    expiresAt: z.iso.datetime({ offset: true }),
    emailBound: z.boolean(),
  })
  .strict();
export function mobileClaimKey(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value))
    throw new Error("MOBILE_CLAIM_KEY_INVALID");
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("MOBILE_CLAIM_KEY_INVALID");
  return bytes;
}
export async function mobileDigest(value: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}
function hex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function derivedKey(master: Uint8Array<ArrayBuffer>, purpose: "seal" | "resume") {
  const source = await crypto.subtle.importKey("raw", master, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("meneer-mobile-claim-v1"),
      info: encoder.encode(purpose),
    },
    source,
    purpose === "seal"
      ? { name: "AES-GCM", length: 256 }
      : { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    purpose === "seal" ? ["encrypt", "decrypt"] : ["sign"],
  );
}
/** Deterministic, keyed resume secret lets an exact interrupted exchange recover its cookie.
 * HKDF separates this HMAC key from the cookie encryption key; SQL stores only its SHA-256. */
export async function mobileClaimSecret(
  master: Uint8Array<ArrayBuffer>,
  tenant: string,
  tokenDigest: string,
  requestKey: string,
) {
  return hex(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await derivedKey(master, "resume"),
        encoder.encode(`${tenant}:${tokenDigest}:${requestKey}`),
      ),
    ),
  );
}
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("MOBILE_CLAIM_INVALID");
  return Uint8Array.from(
    atob(
      value
        .replaceAll("-", "+")
        .replaceAll("_", "/")
        .padEnd(Math.ceil(value.length / 4) * 4, "="),
    ),
    (c) => c.charCodeAt(0),
  );
}
export async function sealMobileClaim(
  proof: MobileClaimProof,
  key: Uint8Array<ArrayBuffer>,
  now = Date.now(),
) {
  const payload = proofSchema.parse(proof);
  if (payload.expiresAt <= now || payload.expiresAt > now + 900_000)
    throw new Error("MOBILE_CLAIM_INVALID");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(mobileClaimCookie) },
    await derivedKey(key, "seal"),
    encoder.encode(JSON.stringify(payload)),
  );
  return `v1.${encode(iv)}.${encode(new Uint8Array(body))}`;
}
export async function openMobileClaim(
  value: string | undefined,
  key: Uint8Array<ArrayBuffer>,
  now = Date.now(),
): Promise<MobileClaimProof | null> {
  if (!value || value.length > 2000) return null;
  try {
    const [v, iv, body, extra] = value.split(".");
    if (v !== "v1" || !iv || !body || extra || decode(iv).length !== 12) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(iv), additionalData: encoder.encode(mobileClaimCookie) },
      await derivedKey(key, "seal"),
      decode(body),
    );
    const proof = proofSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
    return proof.expiresAt > now && proof.expiresAt <= now + 900_000 ? proof : null;
  } catch {
    return null;
  }
}
