import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { initialiseServerEnvironment } from "@/server/config/environment.server";

export async function runMobileInvitationRetention(
  bindings: Record<string, unknown>,
): Promise<void> {
  if (bindings.MOBILE_INVITATIONS_EMAIL_MODE !== "enabled") return;
  const tenant = z.uuid().parse(bindings.MOBILE_INVITATIONS_TENANT_ID);
  const configuration = initialiseServerEnvironment({
    SUPABASE_URL: bindings.SUPABASE_URL,
    SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
  }).environment.supabase;
  if (!configuration) throw new Error("MOBILE_RETENTION_UNAVAILABLE");
  const client = createClient(configuration.url, configuration.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await client.rpc("sweep_mobile_invitation_retention", {
    p_tenant_id: tenant,
  });
  if (
    error ||
    !z
      .object({
        expired: z.number().int().nonnegative(),
        contactsPurged: z.number().int().nonnegative(),
        eventsPurged: z.number().int().nonnegative(),
      })
      .strict()
      .safeParse(data).success
  )
    throw new Error("MOBILE_RETENTION_UNAVAILABLE");
}
