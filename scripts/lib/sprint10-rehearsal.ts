import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Fixed local-only packet; never build a hosted version or import the seed into hosted services.
export const sprint10RehearsalSuites = [
  "workforce_security_context",
  "staff_queue_projection",
  "staff_queue_commands",
  "manual_handoff_commands",
  "private_portal_handoff_delivery",
  "patient_portal_projection",
  "medical_intake_foundation",
  "medical_intake_workforce",
  "medical_intake_transfer_rights",
] as const;
export type Sprint10RehearsalSuite = (typeof sprint10RehearsalSuites)[number];

export function buildSprint10Rehearsal(suite: Sprint10RehearsalSuite): string {
  if (!sprint10RehearsalSuites.includes(suite)) throw new Error("SPRINT10_SUITE_REJECTED");
  const source = readFileSync(
    resolve(process.cwd(), `supabase/tests/database/${suite}.test.sql`),
    "utf8",
  );
  if (!/^begin;\s/i.test(source) || !/\nrollback;\s*$/i.test(source))
    throw new Error("SPRINT10_ROLLBACK_BOUNDARY_MISSING");
  const body = source.replace(/^begin;\s*/i, "").replace(/\nrollback;\s*$/i, "");
  if (/^\s*(begin|commit|rollback)\s*;/im.test(body))
    throw new Error("SPRINT10_TRANSACTION_REJECTED");
  return `begin;\nset local statement_timeout='45s';\nset local lock_timeout='5s';\n${body}\nrollback;`;
}

export function countRehearsalAssertions(output: string): number {
  const lines = output.split("\n");
  const plans = lines.filter((line) => /^1\.\.\d+$/.test(line));
  const passed = lines.filter((line) => /^ok \d+\b/.test(line)).length;
  if (
    lines.some((line) => /^not ok\b|^#.*(?:failed|Looks like)/i.test(line)) ||
    plans.length !== 1 ||
    passed === 0 ||
    passed !== Number(plans[0]!.slice(3))
  )
    throw new Error("SPRINT10_REHEARSAL_ASSERTIONS_FAILED");
  return passed;
}

export function assertLocalRehearsalEnvironment(
  environment: Record<string, string | undefined>,
): void {
  if (
    environment.SUPABASE_INTEGRATION_TARGET ||
    environment.SUPABASE_DB_URL ||
    environment.HOSTED_MEDICAL_INTAKE_CONFIRM ||
    environment.SUPABASE_URL
  )
    throw new Error("SPRINT10_LOCAL_REHEARSAL_HOSTED_TARGET_REJECTED");
}
