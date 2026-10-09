import "@tanstack/react-start/server-only";
import { z } from "zod";
import {
  workforceContextSchema,
  type WorkforceProof,
} from "@/application/identity/workforce-session-service";
import { readPatientSessionKey } from "./patient-session-cookie";

export const workforceCookieName = "__Host-meneer-workforce";
const aad = new TextEncoder().encode("meneer-workforce-session-v1");
const payloadSchema = z
  .object({
    context: workforceContextSchema,
    providerSessionId: z.uuid(),
    sessionId: z.uuid().optional(),
    factorId: z.uuid().optional(),
    contextChoiceRequired: z.literal(true).optional(),
    contextChoiceReady: z.literal(true).optional(),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    providerExpiresAt: z.number().int(),
    issuedAt: z.number().int(),
    expiresAt: z.number().int(),
  })
  .strict();
const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[\w-]+$/.test(value)) throw new Error("WORKFORCE_COOKIE_INVALID");
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
async function key(value: unknown) {
  return crypto.subtle.importKey("raw", readPatientSessionKey(value), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function sealWorkforceProof(
  proof: WorkforceProof,
  expiresAt: Date,
  secret: unknown,
  now = Date.now(),
) {
  const deadline = Math.min(
    expiresAt.getTime(),
    proof.sessionId ? Number.POSITIVE_INFINITY : now + 10 * 60_000,
  );
  const payload = payloadSchema.parse({
    context: proof.context,
    providerSessionId: proof.providerSessionId,
    ...(proof.sessionId ? { sessionId: proof.sessionId } : {}),
    ...(proof.factorId ? { factorId: proof.factorId } : {}),
    ...(proof.contextChoiceRequired ? { contextChoiceRequired: true } : {}),
    ...(proof.contextChoiceReady ? { contextChoiceReady: true } : {}),
    accessToken: proof.providerSession.accessToken,
    refreshToken: proof.providerSession.refreshToken,
    providerExpiresAt: proof.providerSession.expiresAt.getTime(),
    issuedAt: now,
    expiresAt: deadline,
  });
  if (deadline <= now) throw new Error("WORKFORCE_COOKIE_EXPIRED");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    await key(secret),
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const token = `v1.${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
  if (token.length > 3800) throw new Error("WORKFORCE_COOKIE_TOO_LARGE");
  return `${workforceCookieName}=${token}; Path=/; Max-Age=${Math.floor((deadline - now) / 1000)}; HttpOnly; Secure; SameSite=Strict`;
}
export const clearWorkforceCookie = () =>
  `${workforceCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
export async function openWorkforceProof(
  request: Request,
  secret: unknown,
  now = Date.now(),
): Promise<WorkforceProof | null> {
  const cookies = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.startsWith(`${workforceCookieName}=`));
  if (cookies.length !== 1) return null;
  try {
    const token = cookies[0]!.slice(workforceCookieName.length + 1);
    if (token.length > 4000) return null;
    const [version, nonce, body, extra] = token.split(".");
    if (version !== "v1" || !nonce || !body || extra) return null;
    const iv = decode(nonce);
    if (iv.length !== 12) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: aad },
      await key(secret),
      decode(body),
    );
    const p = payloadSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
    if (
      p.issuedAt > now + 60_000 ||
      p.expiresAt <= now ||
      (!p.sessionId && p.expiresAt - p.issuedAt > 600_000) ||
      (p.contextChoiceReady && !p.contextChoiceRequired) ||
      (p.sessionId && (p.contextChoiceReady || p.contextChoiceRequired))
    )
      return null;
    return {
      context: p.context,
      providerSessionId: p.providerSessionId,
      ...(p.sessionId ? { sessionId: p.sessionId } : {}),
      ...(p.factorId ? { factorId: p.factorId } : {}),
      ...(p.contextChoiceRequired ? { contextChoiceRequired: true } : {}),
      ...(p.contextChoiceReady ? { contextChoiceReady: true } : {}),
      providerSession: {
        accessToken: p.accessToken,
        refreshToken: p.refreshToken,
        expiresAt: new Date(p.providerExpiresAt),
      },
    };
  } catch {
    return null;
  }
}
