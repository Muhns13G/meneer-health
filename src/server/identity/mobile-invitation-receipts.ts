import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { renderMobileInvitation } from "@/application/identity/mobile-invitation-delivery";
import { readBoundedTextRequest } from "@/server/security/request-security";

const configuration = z.object({
  MOBILE_INVITATIONS_WEBHOOK_MODE: z.literal("telnyx"),
  MOBILE_INVITATIONS_TENANT_ID: z.uuid(),
  TELNYX_MESSAGING_PROFILE_ID: z.uuid(),
  TELNYX_FROM_NUMBER: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
  TELNYX_PUBLIC_KEY_BASE64: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
});
export function readMobileReceiptConfiguration(input: Record<string, unknown>) {
  if (
    input.MOBILE_INVITATIONS_WEBHOOK_MODE === undefined ||
    input.MOBILE_INVITATIONS_WEBHOOK_MODE === "disabled"
  )
    return null;
  const parsed = configuration.safeParse(input);
  if (!parsed.success) throw new Error("MOBILE_RECEIPT_CONFIGURATION_INVALID");
  return parsed.data;
}
const envelope = z.object({
  data: z.object({
    id: z.uuid(),
    event_type: z.enum(["message.sent", "message.finalized"]),
    occurred_at: z.iso.datetime({ offset: true }),
    payload: z.object({
      id: z.uuid(),
      direction: z.literal("outbound"),
      type: z.literal("SMS"),
      messaging_profile_id: z.uuid(),
      from: z.object({ phone_number: z.string() }),
      to: z
        .array(z.object({ phone_number: z.string().regex(/^\+27[0-9]{9}$/), status: z.string() }))
        .length(1),
      text: z.string().max(512),
      encoding: z.literal("GSM-7"),
      parts: z.int().min(1).max(2),
      errors: z.array(z.unknown()).max(50).default([]),
      cost: z
        .object({
          amount: z
            .string()
            .regex(/^\d{1,4}(?:\.\d{1,6})?$/)
            .nullable(),
          currency: z.literal("USD"),
        })
        .nullish(),
    }),
  }),
});
export async function projectMobileReceipt(
  input: unknown,
  config: NonNullable<ReturnType<typeof readMobileReceiptConfiguration>>,
) {
  const { data } = envelope.parse(input);
  const p = data.payload;
  const token = /#([A-Za-z0-9_-]{43})\./.exec(p.text)?.[1];
  if (
    !token ||
    p.text !== renderMobileInvitation(token).text ||
    p.messaging_profile_id !== config.TELNYX_MESSAGING_PROFILE_ID ||
    p.from.phone_number !== config.TELNYX_FROM_NUMBER
  )
    throw new Error("MOBILE_RECEIPT_INVALID");
  const status = p.to[0]!.status;
  const outcome =
    data.event_type === "message.sent" && status === "sent" && p.errors.length === 0
      ? "sent"
      : data.event_type === "message.finalized"
        ? status === "delivered" && p.errors.length === 0
          ? "delivered"
          : ["sending_failed", "delivery_failed"].includes(status)
            ? "failed"
            : status === "delivery_unconfirmed"
              ? "unconfirmed"
              : null
        : null;
  if (!outcome) throw new Error("MOBILE_RECEIPT_INVALID");
  const tokenDigest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const amount = p.cost?.amount;
  const cost = amount == null ? null : Math.round(Number(amount) * 1_000_000);
  if (cost !== null && (!Number.isSafeInteger(cost) || cost > 2_000_000_000))
    throw new Error("MOBILE_RECEIPT_INVALID");
  return {
    eventId: data.id,
    messageId: p.id,
    event: data.event_type,
    outcome,
    occurredAt: data.occurred_at,
    tokenDigest,
    profileId: p.messaging_profile_id,
    fromPhone: p.from.phone_number,
    toPhone: p.to[0]!.phone_number,
    cost,
  };
}
export type MobileReceipt = Awaited<ReturnType<typeof projectMobileReceipt>>;

export function createMobileReceiptHandler(
  bindings: Record<string, unknown>,
  record?: (tenant: string, receipt: MobileReceipt) => Promise<void>,
) {
  return async (request: Request) => {
    const reply = (status: number) =>
      new Response(null, {
        status,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    const url = new URL(request.url);
    if (
      url.origin !== "https://meneerhealth.co.za" ||
      url.pathname !== "/api/invitations/telnyx/webhook" ||
      url.search
    )
      return reply(404);
    let config;
    try {
      config = readMobileReceiptConfiguration(bindings);
    } catch {
      return reply(503);
    }
    if (!config) return reply(404);
    if (request.method !== "POST") return reply(405);
    if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get("content-type") ?? ""))
      return reply(415);
    const timestamp = request.headers.get("telnyx-timestamp") ?? "";
    const signature = request.headers.get("telnyx-signature-ed25519") ?? "";
    const fresh = () =>
      /^\d{10}$/.test(timestamp) && Math.abs(Date.now() / 1000 - Number(timestamp)) <= 300;
    if (!fresh() || !/^[A-Za-z0-9+/]{86}==$/.test(signature)) return reply(401);
    try {
      const raw = await readBoundedTextRequest(request, 16_384);
      if (raw === "too-large") return reply(413);
      if (raw === "malformed") return reply(400);
      const key = await crypto.subtle.importKey(
        "raw",
        Uint8Array.from(atob(config.TELNYX_PUBLIC_KEY_BASE64), (c) => c.charCodeAt(0)),
        "Ed25519",
        false,
        ["verify"],
      );
      if (
        !fresh() ||
        !(await crypto.subtle.verify(
          "Ed25519",
          key,
          Uint8Array.from(atob(signature), (c) => c.charCodeAt(0)),
          new TextEncoder().encode(`${timestamp}|${raw}`),
        ))
      )
        return reply(401);
      const receipt = await projectMobileReceipt(JSON.parse(raw), config);
      if (Date.parse(receipt.occurredAt) > Date.now() + 30_000) return reply(400);
      try {
        if (record) await record(config.MOBILE_INVITATIONS_TENANT_ID, receipt);
        else {
          const env = z
            .object({
              SUPABASE_URL: z.url().startsWith("https://"),
              SUPABASE_SECRET_KEY: z.string().min(20),
            })
            .parse(bindings);
          const client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          });
          const { data, error } = await client.rpc("record_mobile_invitation_receipt", {
            p_tenant_id: config.MOBILE_INVITATIONS_TENANT_ID,
            p_event_id: receipt.eventId,
            p_message_id: receipt.messageId,
            p_event: receipt.event,
            p_outcome: receipt.outcome,
            p_occurred_at: receipt.occurredAt,
            p_token_digest: receipt.tokenDigest,
            p_profile_id: receipt.profileId,
            p_from_phone: receipt.fromPhone,
            p_to_phone: receipt.toPhone,
            p_cost: receipt.cost,
          });
          if (error || data !== true) throw new Error("MOBILE_RECEIPT_STORAGE_FAILED");
        }
        return reply(204);
      } catch {
        return reply(503);
      }
    } catch {
      return reply(400);
    }
  };
}
