import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const alertClaimSchema = z.strictObject({
  alertId: z.uuid(),
  leaseId: z.uuid(),
  code: z.enum([
    "ASSIGNMENT_CHANGED",
    "HANDOFF_UNCERTAIN",
    "OPERATIONS_EXCEPTION",
    "ACKNOWLEDGEMENT_OVERDUE",
    "ACCESS_DENIED",
    "OVERRIDE_DENIED",
  ]),
  severity: z.enum(["warning", "critical"]),
  owner: z.enum(["security", "technology-operations"]),
});
export type AlertClaim = z.infer<typeof alertClaimSchema>;
export type AlertOutcome = "accepted" | "retryable" | "failed" | "uncertain";
export type AlertDispatchRepository = {
  sweep(): Promise<void>;
  claim(): Promise<AlertClaim | null>;
  finish(claim: AlertClaim, outcome: AlertOutcome): Promise<void>;
};

// No clinical information, identifiers, deep links or tracking content crosses this boundary.
export async function sendBrevoOperationsAlert(
  apiKey: string,
  claim: AlertClaim,
  send: typeof fetch = fetch,
): Promise<AlertOutcome> {
  try {
    const result = await send("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      // Workers supports manual/follow, not error. Never forward the API key on redirects.
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Meneer Health", email: "support@meneerhealth.co.za" },
        to: [{ email: "support@meneerhealth.co.za" }],
        subject: "Meneer Health — internal operations review required",
        textContent:
          "An internal operations alert requires review. Sign in through the approved staff system with MFA. Email acceptance does not acknowledge or resolve the alert. Initial responder: Mansoer Gallie.",
        headers: { idempotencyKey: claim.alertId },
      }),
    });
    // Never retain or log provider bodies: they may contain addresses or diagnostics.
    await result.body?.cancel();
    if (result.status === 201) return "accepted";
    if (result.status === 429) return "retryable";
    // An ambiguous send must be reviewed, not automatically repeated after a timeout.
    if (result.status >= 500 || result.status < 400) return "uncertain";
    return "failed";
  } catch {
    return "uncertain";
  }
}

export async function dispatchOperationsAlerts(
  repository: AlertDispatchRepository,
  send: (claim: AlertClaim) => Promise<AlertOutcome>,
): Promise<number> {
  await repository.sweep();
  let processed = 0;
  for (; processed < 3; processed++) {
    const claim = await repository.claim();
    if (!claim) break;
    let outcome: AlertOutcome;
    try {
      outcome = await send(claim);
    } catch {
      outcome = "uncertain";
    }
    // If receipt persistence fails, leave the lease to expire to uncertain; never claim success.
    await repository.finish(claim, outcome);
  }
  return processed;
}

const enabledConfiguration = z.object({
  OPERATIONS_ALERTS_MODE: z.literal("brevo"),
  OPERATIONS_ALERTS_TENANT_ID: z.uuid(),
  BREVO_API_KEY: z.string().trim().min(16),
  SUPABASE_URL: z.url().startsWith("https://"),
  SUPABASE_SECRET_KEY: z.string().min(20),
});

export async function runScheduledOperationsAlerts(bindings: Record<string, unknown>) {
  if (
    bindings.OPERATIONS_ALERTS_MODE === undefined ||
    bindings.OPERATIONS_ALERTS_MODE === "disabled"
  )
    return;
  const parsed = enabledConfiguration.safeParse(bindings);
  if (!parsed.success) throw new Error("OPERATIONS_ALERT_CONFIGURATION_INVALID");
  const config = parsed.data;
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const call = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error("OPERATIONS_ALERT_PERSISTENCE_FAILED");
    return data as unknown;
  };
  await dispatchOperationsAlerts(
    {
      async sweep() {
        await call("sweep_operations_alerts", {
          p_tenant_id: config.OPERATIONS_ALERTS_TENANT_ID,
          p_overdue_hours: 24,
        });
      },
      async claim() {
        const value = await call("claim_operations_alert_notification", {
          p_tenant_id: config.OPERATIONS_ALERTS_TENANT_ID,
        });
        if (value === null) return null;
        const claim = alertClaimSchema.safeParse(value);
        if (!claim.success) throw new Error("OPERATIONS_ALERT_CLAIM_INVALID");
        return claim.data;
      },
      async finish(claim, outcome) {
        if (
          (await call("finish_operations_alert_notification", {
            p_tenant_id: config.OPERATIONS_ALERTS_TENANT_ID,
            p_alert_id: claim.alertId,
            p_lease_id: claim.leaseId,
            p_outcome: outcome,
          })) !== true
        )
          throw new Error("OPERATIONS_ALERT_RECEIPT_INVALID");
      },
    },
    (claim) => sendBrevoOperationsAlert(config.BREVO_API_KEY, claim),
  );
}
