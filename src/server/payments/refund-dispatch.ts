import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { dispatchRefund, PilotRefundProvider, refundDispatchSchema } from "./pilot-refund";
import { initialiseServerEnvironment } from "@/server/config/environment.server";

export async function runScheduledRefunds(bindings: Record<string, unknown>) {
  if (bindings.COMMERCE_REFUND_MODE !== "sandbox") return 0;
  if (bindings.COMMERCE_WEBHOOK_MODE !== "sandbox" || bindings.COMMERCE_CHECKOUT_MODE !== "sandbox")
    throw new Error("REFUND_CONFIGURATION_INVALID");
  const tenant = z.uuid().parse(bindings.COMMERCE_REVIEW_TENANT_ID);
  const actor = z.uuid().parse(bindings.STRIPE_WEBHOOK_SERVICE_IDENTITY_ID);
  const account = z
    .string()
    .regex(/^acct_[A-Za-z0-9]{8,64}$/)
    .parse(bindings.STRIPE_CHECKOUT_ACCOUNT_ID);
  z.string().min(20).parse(bindings.STRIPE_WEBHOOK_SIGNING_SECRET);
  const config = initialiseServerEnvironment({
    SUPABASE_URL: bindings.SUPABASE_URL,
    SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
  }).environment.supabase;
  if (!config) throw new Error("REFUND_CONFIGURATION_INVALID");
  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const provider = new PilotRefundProvider(bindings.STRIPE_RESTRICTED_KEY, account);
  const rpc = async (command: Record<string, unknown>) => {
    const { data, error } = await client.rpc("service_refund_command", {
      p_service_id: actor,
      p_tenant_id: tenant,
      p_account: account,
      p_command: command,
    });
    if (error) throw new Error("REFUND_DISPATCH_UNAVAILABLE");
    return data as unknown;
  };
  let processed = 0;
  while (processed < 5) {
    const raw = await rpc({ action: "claim" });
    if (raw === null) break;
    const job = refundDispatchSchema.parse(raw);
    await dispatchRefund(
      async () => job,
      provider,
      (result) =>
        rpc({ action: "record", refundId: job.refundId, ...result }).then(() => undefined),
    );
    processed++;
  }
  return processed;
}
