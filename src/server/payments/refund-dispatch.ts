import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { dispatchRefund, PilotRefundProvider, refundDispatchSchema } from "./pilot-refund";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import {
  commerceSettlementConfigured,
  commerceCredentials,
  paymentMode,
} from "./commerce-environment";

export async function runScheduledRefunds(bindings: Record<string, unknown>) {
  const environment = paymentMode(bindings.COMMERCE_REFUND_MODE);
  if (!environment) return 0;
  if (!commerceSettlementConfigured(bindings) || bindings.COMMERCE_WEBHOOK_MODE !== environment)
    throw new Error("REFUND_CONFIGURATION_INVALID");
  const tenant = z.uuid().parse(bindings.COMMERCE_REVIEW_TENANT_ID);
  const actor = z.uuid().parse(bindings.STRIPE_WEBHOOK_SERVICE_IDENTITY_ID);
  const credentials = commerceCredentials(bindings, environment);
  const account = z
    .string()
    .regex(/^acct_[A-Za-z0-9]{8,64}$/)
    .parse(credentials.account);
  z.string().min(20).parse(credentials.secret);
  const config = initialiseServerEnvironment({
    SUPABASE_URL: bindings.SUPABASE_URL,
    SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
  }).environment.supabase;
  if (!config) throw new Error("REFUND_CONFIGURATION_INVALID");
  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const provider = new PilotRefundProvider(credentials.key, account, undefined, environment);
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
