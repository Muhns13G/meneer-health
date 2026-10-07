import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { readBoundedTextRequest } from "@/server/security/request-security";

const messageIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(256)
  .regex(/^[<>A-Za-z0-9@._:+-]+$/);
export async function notificationMessageHash(value: unknown): Promise<string> {
  const messageId = messageIdSchema.parse(value).replace(/^<|>$/g, "");
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(messageId))),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

// Only the allowlisted delivery event projection is retained. Open/click analytics are rejected.
export async function projectNotificationReceipt(input: unknown) {
  const parsed = z
    .object({
      event: z.enum([
        "delivered",
        "hard_bounce",
        "soft_bounce",
        "blocked",
        "invalid_email",
        "spam",
        "unsubscribed",
        "error",
      ]),
      "message-id": messageIdSchema,
      ts_event: z.int().positive().max(4_102_444_800),
    })
    .parse(input);
  return {
    messageHash: await notificationMessageHash(parsed["message-id"]),
    event: parsed.event === "invalid_email" ? ("invalid" as const) : parsed.event,
    occurredAt: new Date(parsed.ts_event * 1000).toISOString(),
  };
}
export type NotificationReceipt = Awaited<ReturnType<typeof projectNotificationReceipt>>;

export async function readNotificationSendReference(response: Response): Promise<string> {
  const raw = await readBoundedTextRequest(
    new Request("https://provider.invalid", {
      method: "POST",
      body: response.body,
      duplex: "half",
    } as RequestInit),
    4096,
  );
  if (raw === "too-large" || raw === "malformed") throw new Error("NOTIFICATION_REFERENCE_INVALID");
  return notificationMessageHash(
    z.object({ messageId: messageIdSchema }).parse(JSON.parse(raw)).messageId,
  );
}

export function createNotificationReceiptHandler(
  bindings: Record<string, unknown>,
  record?: (tenantId: string, receipt: NotificationReceipt) => Promise<void>,
) {
  return async (request: Request): Promise<Response> => {
    const reply = (status: number) =>
      new Response(null, { status, headers: { "Cache-Control": "no-store" } });
    if (bindings.TRANSACTIONAL_NOTIFICATIONS_MODE !== "brevo") return reply(404);
    const parsed = z
      .object({
        TRANSACTIONAL_NOTIFICATIONS_TENANT_ID: z.uuid(),
        TRANSACTIONAL_NOTIFICATION_WEBHOOK_SECRET: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
        SUPABASE_URL: z.url().startsWith("https://"),
        SUPABASE_SECRET_KEY: z.string().min(20),
      })
      .safeParse(bindings);
    if (!parsed.success) return reply(503);
    if (request.method !== "POST") return reply(405);
    if (new URL(request.url).search) return reply(400);
    if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get("content-type") ?? ""))
      return reply(415);
    const supplied = request.headers.get("x-meneer-notification-secret") ?? "";
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(supplied)) return reply(401);
    const digest = async (value: string) =>
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
    const [actual, expected] = await Promise.all([
      digest(supplied),
      digest(parsed.data.TRANSACTIONAL_NOTIFICATION_WEBHOOK_SECRET),
    ]);
    let difference = 0;
    for (let index = 0; index < expected.length; index++)
      difference |= actual[index]! ^ expected[index]!;
    if (difference !== 0) return reply(401);
    let receipt: NotificationReceipt;
    try {
      const raw = await readBoundedTextRequest(request, 8192);
      if (raw === "too-large") return reply(413);
      if (raw === "malformed") return reply(400);
      receipt = await projectNotificationReceipt(JSON.parse(raw));
      if (Date.parse(receipt.occurredAt) > Date.now() + 300_000) return reply(400);
    } catch {
      return reply(400);
    }
    try {
      if (record) await record(parsed.data.TRANSACTIONAL_NOTIFICATIONS_TENANT_ID, receipt);
      else {
        const client = createClient(parsed.data.SUPABASE_URL, parsed.data.SUPABASE_SECRET_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        const { data, error } = await client.rpc("record_transactional_delivery", {
          p_tenant_id: parsed.data.TRANSACTIONAL_NOTIFICATIONS_TENANT_ID,
          p_message_hash: receipt.messageHash,
          p_event: receipt.event,
          p_occurred_at: receipt.occurredAt,
        });
        // If the callback outruns sender-reference persistence, request provider retry.
        if (error || data !== true) throw new Error("NOTIFICATION_DELIVERY_STORAGE_FAILED");
      }
      return reply(204);
    } catch {
      return reply(503);
    }
  };
}
