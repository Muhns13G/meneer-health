import { z } from "zod";
import { treatmentIntentWireIds, type TreatmentIntent } from "./treatment-intent-catalogue";

export { treatmentIntentWireIds, type TreatmentIntent } from "./treatment-intent-catalogue";

export const treatmentIntentTtlSeconds = 30 * 60;
export const treatmentIntentCookieName = "__Host-meneer-journey";

const treatmentIntentClockSkewToleranceMs = 60 * 1_000;

export const treatmentIntentSchema = z.enum(["hair", "ed", "weight", "trt"]);

const treatmentIntentWireSchema = z.enum([
  "f78b1764-6838-4df7-92d7-a715a24ab247",
  "68211ec1-8594-4a6e-a003-e027871b9345",
  "74daf768-b1ee-4c25-9284-d8e875bd0282",
  "211137a7-7d1d-4381-aa68-655379397363",
]);

export type TreatmentIntentWireId = z.infer<typeof treatmentIntentWireSchema>;

const treatmentIntentByWireId = new Map<TreatmentIntentWireId, TreatmentIntent>(
  Object.entries(treatmentIntentWireIds).map(([intent, wireId]) => [
    wireId,
    treatmentIntentSchema.parse(intent),
  ]),
);

const storedTreatmentIntentSchema = z
  .object({
    version: z.literal(1),
    intent: treatmentIntentSchema,
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

type StoredTreatmentIntent = z.infer<typeof storedTreatmentIntentSchema>;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("TREATMENT_INTENT_TOKEN_INVALID");
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function resolveTreatmentIntentWireId(value: unknown): TreatmentIntent | undefined {
  const wireId = treatmentIntentWireSchema.safeParse(value);
  return wireId.success ? treatmentIntentByWireId.get(wireId.data) : undefined;
}

export function readTreatmentIntentEncryptionKey(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new Error("TREATMENT_INTENT_KEY_INVALID");
  }
  const key = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  if (key.byteLength !== 32) throw new Error("TREATMENT_INTENT_KEY_INVALID");
  return key;
}

async function importKey(key: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealTreatmentIntent(
  intent: TreatmentIntent,
  key: Uint8Array<ArrayBuffer>,
  now = Date.now(),
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload: StoredTreatmentIntent = {
    version: 1,
    intent,
    issuedAt: now,
    expiresAt: now + treatmentIntentTtlSeconds * 1_000,
  };
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await importKey(key),
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`;
}

export async function openTreatmentIntent(
  token: string | undefined,
  key: Uint8Array<ArrayBuffer>,
  now = Date.now(),
): Promise<TreatmentIntent | undefined> {
  if (!token) return undefined;
  try {
    const [version, encodedIv, encodedCiphertext, unexpected] = token.split(".");
    if (version !== "v1" || !encodedIv || !encodedCiphertext || unexpected) return undefined;
    const iv = base64UrlToBytes(encodedIv);
    if (iv.byteLength !== 12) return undefined;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      await importKey(key),
      base64UrlToBytes(encodedCiphertext),
    );
    const stored = storedTreatmentIntentSchema.safeParse(
      JSON.parse(new TextDecoder().decode(plaintext)),
    );
    if (
      !stored.success ||
      stored.data.issuedAt > now + treatmentIntentClockSkewToleranceMs ||
      stored.data.expiresAt <= now
    ) {
      return undefined;
    }
    return stored.data.intent;
  } catch {
    return undefined;
  }
}
