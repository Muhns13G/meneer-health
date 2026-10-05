import "@tanstack/react-start/server-only";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
const claimSchema = z
  .object({ notificationId: z.uuid(), leaseId: z.uuid(), recipient: z.email().nullable() })
  .strict();
export type MedicalNotificationClaim = z.infer<typeof claimSchema>;
export async function sendMedicalNotification(
  key: string,
  claim: MedicalNotificationClaim,
  send: typeof fetch = fetch,
): Promise<"accepted" | "retryable" | "failed" | "uncertain"> {
  if (!claim.recipient) return "uncertain";
  try {
    const r = await send("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: { "api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "Meneer Health", email: "support@meneerhealth.co.za" },
        to: [{ email: claim.recipient }],
        subject: "Meneer Health — private review required",
        textContent:
          "A private review requires attention. Sign in through the approved workforce system with MFA. This message contains no client or medical details. Email delivery does not acknowledge or resolve the review.",
        headers: { idempotencyKey: claim.notificationId },
      }),
    });
    await r.body?.cancel();
    return r.status === 201
      ? "accepted"
      : r.status === 429
        ? "retryable"
        : r.status >= 400 && r.status < 500
          ? "failed"
          : "uncertain";
  } catch {
    return "uncertain";
  }
}
export async function runMedicalSafetyDispatch(bindings: Record<string, unknown>) {
  if (bindings.MEDICAL_INTAKE_MODE !== "enabled") return;
  const config = z
    .object({
      MEDICAL_INTAKE_TENANT_ID: z.uuid(),
      SUPABASE_URL: z.url().startsWith("https://"),
      SUPABASE_SECRET_KEY: z.string().min(20),
      BREVO_API_KEY: z.string().min(20),
    })
    .safeParse(bindings);
  if (!config.success) throw new Error("MEDICAL_NOTIFICATION_CONFIGURATION_INVALID");
  const c = createClient(config.data.SUPABASE_URL, config.data.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  for (let count = 0; count < 3; count++) {
    const r = await c.rpc("claim_medical_safety_notification", {
      p_tenant_id: config.data.MEDICAL_INTAKE_TENANT_ID,
    });
    if (r.error) throw new Error("MEDICAL_NOTIFICATION_STORAGE_FAILED");
    if (r.data === null) return;
    const claim = claimSchema.parse(r.data);
    const outcome = await sendMedicalNotification(config.data.BREVO_API_KEY, claim);
    const receipt = await c.rpc("finish_medical_safety_notification", {
      p_notification_id: claim.notificationId,
      p_lease_id: claim.leaseId,
      p_outcome: outcome,
    });
    if (receipt.error || receipt.data !== true)
      throw new Error("MEDICAL_NOTIFICATION_STORAGE_FAILED");
  }
}
