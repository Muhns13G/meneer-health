import "@tanstack/react-start/server-only";

import { z } from "zod";

import type {
  PatientSession,
  PatientSessionProof,
} from "@/application/identity/patient-session-service";

export const patientSessionCookieName = "__Host-meneer-session";
const aad = new TextEncoder().encode("meneer-patient-session-v1");

const proofSchema = z
  .object({
    version: z.literal(1),
    sessionId: z.uuid(),
    subjectId: z.uuid(),
    tenantId: z.uuid(),
    providerSessionId: z.uuid(),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    providerExpiresAt: z.number().int(),
    issuedAt: z.number().int(),
    absoluteExpiresAt: z.number().int(),
  })
  .strict();

export type SealedPatientSessionProof = z.infer<typeof proofSchema>;

function encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("PATIENT_SESSION_INVALID");
  const binary = atob(
    value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "="),
  );
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function readPatientSessionKey(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new Error("PATIENT_SESSION_KEY_INVALID");
  }
  const key = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  if (key.byteLength !== 32) throw new Error("PATIENT_SESSION_KEY_INVALID");
  return key;
}

async function cryptoKey(bytes: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealPatientSession(
  value: PatientSession,
  keyBytes: Uint8Array<ArrayBuffer>,
  now = Date.now(),
): Promise<string> {
  const payload = proofSchema.parse({
    version: 1,
    sessionId: value.session.id,
    subjectId: value.session.subjectId,
    tenantId: value.tenantId,
    providerSessionId: value.session.providerSessionId,
    accessToken: value.providerSession.accessToken,
    refreshToken: value.providerSession.refreshToken,
    providerExpiresAt: value.providerSession.expiresAt.getTime(),
    issuedAt: now,
    absoluteExpiresAt: value.session.absoluteExpiresAt.getTime(),
  });
  if (payload.absoluteExpiresAt <= now) throw new Error("PATIENT_SESSION_EXPIRED");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    await cryptoKey(keyBytes),
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return `v1.${encode(iv)}.${encode(new Uint8Array(ciphertext))}`;
}

export async function openPatientSession(
  token: string | undefined,
  keyBytes: Uint8Array<ArrayBuffer>,
  now = Date.now(),
): Promise<SealedPatientSessionProof | null> {
  if (!token || token.length > 4_000) return null;
  try {
    const [version, encodedIv, encodedBody, extra] = token.split(".");
    if (version !== "v1" || !encodedIv || !encodedBody || extra) return null;
    const iv = decode(encodedIv);
    if (iv.byteLength !== 12) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: aad },
      await cryptoKey(keyBytes),
      decode(encodedBody),
    );
    const parsed = proofSchema.safeParse(JSON.parse(new TextDecoder().decode(plaintext)));
    if (
      !parsed.success ||
      parsed.data.issuedAt > now + 60_000 ||
      parsed.data.absoluteExpiresAt <= now
    ) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function patientSessionCookie(
  token: string,
  absoluteExpiresAt: Date,
  now = Date.now(),
): string {
  const seconds = Math.max(0, Math.floor((absoluteExpiresAt.getTime() - now) / 1_000));
  return `${patientSessionCookieName}=${token}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearPatientSessionCookie(): string {
  return `${patientSessionCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export function readPatientSessionCookie(request: Request): string | undefined {
  const match = request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|;\\s*)${patientSessionCookieName}=([^;]+)`));
  return match?.[1];
}

export function asPatientSessionProof(value: SealedPatientSessionProof): PatientSessionProof {
  return value;
}
