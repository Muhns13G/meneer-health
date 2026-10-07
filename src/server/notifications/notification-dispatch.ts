import "@tanstack/react-start/server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { readNotificationSendReference } from "./notification-receipts";
import {
  dispatchTransactionalNotifications,
  notificationClaimSchema,
  notificationTemplates,
  type NotificationClaim,
  type NotificationOutcome,
} from "@/application/notifications/transactional-notifications";

export async function sendTransactionalNotification(
  apiKey: string,
  input: NotificationClaim,
  send: typeof fetch = fetch,
  bindReference?: (messageHash: string) => Promise<void>,
): Promise<NotificationOutcome> {
  const parsed = notificationClaimSchema.safeParse(input);
  if (!parsed.success) return "failed";
  const claim = parsed.data;
  const template = notificationTemplates[claim.template];
  try {
    const result = await send("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Meneer Health", email: "support@meneerhealth.co.za" },
        to: [{ email: claim.recipient }],
        subject: template.subject,
        textContent: `${template.text}\n\nhttps://meneerhealth.co.za/account/sign-in`,
        headers: { idempotencyKey: claim.notificationId },
      }),
    });
    // Retain only an opaque hash of a bounded provider message reference, never the body.
    if (result.status === 201 && bindReference) {
      await bindReference(await readNotificationSendReference(result));
      return "accepted";
    }
    await result.body?.cancel();
    if (result.status === 201) return "accepted";
    if (result.status === 429) return "retryable";
    // Duplicate-key 4xx is conservatively failed, not interpreted as delivered.
    if (result.status >= 400 && result.status < 500) return "failed";
    return "uncertain";
  } catch {
    return "uncertain";
  }
}

const enabledSchema = z.object({
  TRANSACTIONAL_NOTIFICATIONS_MODE: z.literal("brevo"),
  TRANSACTIONAL_NOTIFICATIONS_TENANT_ID: z.uuid(),
  BREVO_API_KEY: z.string().trim().min(20),
  SUPABASE_URL: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "127.0.0.1");
  }),
  SUPABASE_SECRET_KEY: z.string().min(20),
});

export async function runScheduledTransactionalNotifications(bindings: Record<string, unknown>) {
  if (
    bindings.TRANSACTIONAL_NOTIFICATIONS_MODE === undefined ||
    bindings.TRANSACTIONAL_NOTIFICATIONS_MODE === "disabled"
  )
    return;
  const parsed = enabledSchema.safeParse(bindings);
  if (!parsed.success) throw new Error("NOTIFICATION_CONFIGURATION_INVALID");
  const config = parsed.data;
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  await dispatchTransactionalNotifications(
    {
      async claim() {
        const { data, error } = await client.rpc("claim_transactional_notification", {
          p_tenant_id: config.TRANSACTIONAL_NOTIFICATIONS_TENANT_ID,
        });
        if (error) throw new Error("NOTIFICATION_PERSISTENCE_FAILED");
        return data === null ? null : notificationClaimSchema.parse(data);
      },
      async finish(claim, outcome) {
        const { data, error } = await client.rpc("finish_transactional_notification", {
          p_tenant_id: config.TRANSACTIONAL_NOTIFICATIONS_TENANT_ID,
          p_notification_id: claim.notificationId,
          p_lease_id: claim.leaseId,
          p_outcome: outcome,
        });
        if (error || data !== true) throw new Error("NOTIFICATION_RECEIPT_INVALID");
      },
    },
    (claim) =>
      sendTransactionalNotification(config.BREVO_API_KEY, claim, fetch, async (messageHash) => {
        const { data, error } = await client.rpc("bind_transactional_message", {
          p_tenant_id: config.TRANSACTIONAL_NOTIFICATIONS_TENANT_ID,
          p_notification_id: claim.notificationId,
          p_lease_id: claim.leaseId,
          p_message_hash: messageHash,
        });
        if (error || data !== true) throw new Error("NOTIFICATION_REFERENCE_STORAGE_FAILED");
      }),
  );
}
