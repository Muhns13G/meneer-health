import "@tanstack/react-start/server-only";

import { z } from "zod";

import type { VerifiedPatientInvitation } from "@/application/identity/patient-invitation-verification-service";

export const preactivationCookieName = "__Host-meneer-preactivation";
export const preactivationTtlSeconds = 10 * 60;

const payloadSchema = z
  .object({
    version: z.literal(1),
    invitationId: z.uuid(),
    tenantId: z.uuid(),
    providerSubject: z.string().min(1),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    issuedAt: z.number().int(),
    expiresAt: z.number().int(),
  })
  .strict();

export type PreactivationProof = z.infer<typeof payloadSchema>;

function encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("PREACTIVATION_TOKEN_INVALID");
  const binary = atob(
    value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "="),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function readPreactivationKey(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new Error("PREACTIVATION_KEY_INVALID");
  }
  const key = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  if (key.byteLength !== 32) throw new Error("PREACTIVATION_KEY_INVALID");
  return key;
}

async function importKey(bytes: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealPreactivationProof(
  verified: VerifiedPatientInvitation,
  keyBytes: Uint8Array<ArrayBuffer>,
  now = Date.now(),
): Promise<string> {
  const expiresAt = Math.min(
    now + preactivationTtlSeconds * 1_000,
    verified.session.expiresAt.getTime(),
  );
  if (expiresAt <= now) throw new Error("PREACTIVATION_SESSION_EXPIRED");
  const payload = payloadSchema.parse({
    version: 1,
    invitationId: verified.invitation.id,
    tenantId: verified.invitation.tenantId,
    providerSubject: verified.invitation.providerSubject,
    accessToken: verified.session.accessToken,
    refreshToken: verified.session.refreshToken,
    issuedAt: now,
    expiresAt,
  });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await importKey(keyBytes),
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return `v1.${encode(iv)}.${encode(new Uint8Array(ciphertext))}`;
}

export async function openPreactivationProof(
  token: string | undefined,
  keyBytes: Uint8Array<ArrayBuffer>,
  now = Date.now(),
): Promise<PreactivationProof | null> {
  if (!token || token.length > 4_000) return null;
  try {
    const [version, encodedIv, encodedBody, extra] = token.split(".");
    if (version !== "v1" || !encodedIv || !encodedBody || extra) return null;
    const iv = decode(encodedIv);
    if (iv.byteLength !== 12) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      await importKey(keyBytes),
      decode(encodedBody),
    );
    const parsed = payloadSchema.safeParse(JSON.parse(new TextDecoder().decode(plaintext)));
    if (!parsed.success || parsed.data.issuedAt > now + 60_000 || parsed.data.expiresAt <= now) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}
