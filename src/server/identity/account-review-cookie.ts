import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AccountReviewRequiredError } from "@/application/identity/patient-session-service";
export const accountReviewCookieName = "__Host-meneer-document-review";
const aad = new TextEncoder().encode("meneer-account-documents-only-v1");
const schema = z
  .object({
    purpose: z.literal("account-document-review"),
    tenantId: z.uuid(),
    providerSubject: z.uuid(),
    providerSessionId: z.uuid(),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    issuedAt: z.number().int(),
    expiresAt: z.number().int(),
  })
  .strict();
export type AccountReviewProof = z.infer<typeof schema>;
const encode = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
const decode = (s: string) =>
  Uint8Array.from(
    atob(
      s
        .replaceAll("-", "+")
        .replaceAll("_", "/")
        .padEnd(Math.ceil(s.length / 4) * 4, "="),
    ),
    (c) => c.charCodeAt(0),
  );
const key = (bytes: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
export async function sealAccountReview(
  error: AccountReviewRequiredError,
  bytes: Uint8Array<ArrayBuffer>,
  now = Date.now(),
) {
  const value = schema.parse({
    purpose: "account-document-review",
    tenantId: error.tenantId,
    providerSubject: error.identity.providerSubject,
    providerSessionId: error.identity.providerSessionId,
    accessToken: error.providerSession.accessToken,
    refreshToken: error.providerSession.refreshToken,
    issuedAt: now,
    expiresAt: Math.min(
      now + 600000,
      error.providerSession.expiresAt.getTime(),
      error.identity.expiresAt.getTime(),
    ),
  });
  if (value.expiresAt <= now) throw Error("REVIEW_EXPIRED");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    await key(bytes),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  const token = `review1.${encode(iv)}.${encode(new Uint8Array(body))}`;
  if (token.length > 3800) throw Error("REVIEW_TOO_LARGE");
  return token;
}
export async function openAccountReview(
  request: Request,
  bytes: Uint8Array<ArrayBuffer>,
  now = Date.now(),
): Promise<AccountReviewProof | null> {
  try {
    const token = request.headers
      .get("cookie")
      ?.match(new RegExp(`(?:^|;\\s*)${accountReviewCookieName}=([^;]+)`))?.[1];
    if (!token || token.length > 4000) return null;
    const [version, iv, body, extra] = token.split(".");
    if (version !== "review1" || extra || !iv || !body) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(iv), additionalData: aad },
      await key(bytes),
      decode(body),
    );
    const p = schema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
    return p.expiresAt > now && p.issuedAt <= now + 60000 && p.expiresAt - p.issuedAt <= 600000
      ? p
      : null;
  } catch {
    return null;
  }
}
export const reviewCookie = (token: string) =>
  `${accountReviewCookieName}=${token}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Strict`;
export const clearReviewCookie = () =>
  `${accountReviewCookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
