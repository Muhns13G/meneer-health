import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { handoffBaselineSql, validateHandoffBaseline } from "./sprint13-handoff-rehearsal";

// Reviewed local fixtures only. This packet cannot grant hosted execution authority.
export const sprint13RecoverySuites = [
  "pilot_refund_requests",
  "pilot_payment_reconciliation",
  "transactional_notifications",
  "staff_support_followup",
  "purpose_support_routes",
  "workforce_security_context",
] as const;
export type Sprint13RecoverySuite = (typeof sprint13RecoverySuites)[number];

export function assertLocalRecoveryEnvironment(environment: Record<string, string | undefined>) {
  if (
    Object.entries(environment).some(
      ([name, value]) =>
        value &&
        /^(?:SUPABASE_|HOSTED_|SPRINT13_|STRIPE_|BREVO_|MEDICAL_INTAKE_|COMMERCE_|RECOVERY_|BACKUP_|R2_|CLOUDFLARE_)/.test(
          name,
        ),
    )
  ) {
    throw new Error("SPRINT13_RECOVERY_HOSTED_ENVIRONMENT_REJECTED");
  }
}

export function buildSprint13RecoverySuite(suite: Sprint13RecoverySuite): string {
  if (!sprint13RecoverySuites.includes(suite)) throw new Error("SPRINT13_RECOVERY_SUITE_REJECTED");
  const source = readFileSync(
    resolve(process.cwd(), `supabase/tests/database/${suite}.test.sql`),
    "utf8",
  );
  if (!/^begin;\s/i.test(source) || !/\nrollback;\s*$/i.test(source)) {
    throw new Error("SPRINT13_RECOVERY_ROLLBACK_BOUNDARY_MISSING");
  }
  const body = source.replace(/^begin;\s*/i, "").replace(/\nrollback;\s*$/i, "");
  if (/^\s*(begin|commit|rollback)\s*;/im.test(body)) {
    throw new Error("SPRINT13_RECOVERY_TRANSACTION_REJECTED");
  }
  return `begin;\nset local statement_timeout='45s';\nset local lock_timeout='5s';\n${body}\nrollback;`;
}

// Extend the prior all-row/ACL/trigger baseline to include recovery journal function definitions.
export const recoveryBaselineSql = handoffBaselineSql.replace(
  "n.nspname in('public','identity_private','intake_private','commerce_private')",
  "n.nspname in('public','auth','identity_private','intake_private','commerce_private'," +
    "'payments_private','audit_private','fulfilment_private','lifecycle_private','measurement_private')",
);
export const validateRecoveryBaseline = validateHandoffBaseline;
