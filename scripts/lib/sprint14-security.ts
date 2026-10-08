import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { recoveryBaselineSql, validateRecoveryBaseline } from "./sprint13-recovery-rehearsal";

export const mobileSecuritySuites = [
  "mobile_invitation_foundation",
  "mobile_invitation_staff_commands",
  "mobile_invitation_delivery_intents",
  "mobile_invitation_delivery_receipts",
  "mobile_invitation_redemption",
  "mobile_invitation_email_conversion",
  "workforce_security_context",
  "pilot_account_activation",
] as const;
export type MobileSecuritySuite = (typeof mobileSecuritySuites)[number];
export const mobileSecurityBaselineSql = recoveryBaselineSql;
export const validateMobileSecurityBaseline = validateRecoveryBaseline;
export function assertLocalMobileEnvironment(environment: Record<string, string | undefined>) {
  if (
    Object.entries(environment).some(
      ([name, value]) =>
        value &&
        /^(SUPABASE_|POSTGRES_|PGHOST|PGPORT|PGDATABASE|PGPASSWORD|DATABASE_URL|HOSTED_|TELNYX_|BREVO_|STRIPE_|MOBILE_INVITATION|IDENTITY_|JOURNEY_|RECOVERY_|BACKUP_|R2_|CLOUDFLARE_)/.test(
          name,
        ),
    )
  ) {
    throw new Error("MOBILE_SECURITY_LOCAL_ONLY");
  }
}
export function buildMobileSecuritySuite(suite: MobileSecuritySuite): string {
  if (!mobileSecuritySuites.includes(suite)) throw new Error("MOBILE_SECURITY_SUITE_REJECTED");
  const source = readFileSync(
    resolve(process.cwd(), `supabase/tests/database/${suite}.test.sql`),
    "utf8",
  );
  if (!/^begin;\s/i.test(source) || !/\nrollback;\s*$/i.test(source))
    throw new Error("MOBILE_SECURITY_ROLLBACK_REQUIRED");
  const body = source.replace(/^begin;\s*/i, "").replace(/\nrollback;\s*$/i, "");
  if (/^\s*(begin|commit|rollback)\s*;/im.test(body))
    throw new Error("MOBILE_SECURITY_TRANSACTION_REJECTED");
  return `begin;\nset local statement_timeout='45s';\nset local lock_timeout='5s';\n${body}\nrollback;`;
}
