import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertLocalRecoveryEnvironment,
  recoveryBaselineSql,
  validateRecoveryBaseline,
} from "./sprint13-recovery-rehearsal";

// Fixed, reviewed local fixtures. This is not permission to replay them hosted.
export const sprint13EvidenceSuites = [
  "audit_inbox_outbox_evidence",
  "security_observability_evidence",
  "pilot_payment_reconciliation",
  "staff_queue_handoff_records",
  "private_portal_handoff_delivery",
  "transactional_notifications",
  "lifecycle_recovery_governance",
] as const;
export type Sprint13EvidenceSuite = (typeof sprint13EvidenceSuites)[number];
export const assertLocalEvidenceEnvironment = assertLocalRecoveryEnvironment;
export const evidenceBaselineSql = recoveryBaselineSql;
export const validateEvidenceBaseline = validateRecoveryBaseline;

export function buildSprint13EvidenceSuite(suite: Sprint13EvidenceSuite): string {
  if (!sprint13EvidenceSuites.includes(suite)) throw new Error("SPRINT13_EVIDENCE_SUITE_REJECTED");
  const source = readFileSync(
    resolve(process.cwd(), `supabase/tests/database/${suite}.test.sql`),
    "utf8",
  );
  if (!/^begin;\s/i.test(source) || !/\nrollback;\s*$/i.test(source)) {
    throw new Error("SPRINT13_EVIDENCE_ROLLBACK_BOUNDARY_MISSING");
  }
  const body = source.replace(/^begin;\s*/i, "").replace(/\nrollback;\s*$/i, "");
  if (/^\s*(begin|commit|rollback)\s*;/im.test(body)) {
    throw new Error("SPRINT13_EVIDENCE_TRANSACTION_REJECTED");
  }
  return `begin;\nset local statement_timeout='45s';\nset local lock_timeout='5s';\n${body}\nrollback;`;
}
