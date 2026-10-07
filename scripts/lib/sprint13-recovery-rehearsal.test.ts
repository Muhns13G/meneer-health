import { describe, expect, it } from "vitest";
import { countRehearsalAssertions } from "./sprint10-rehearsal";
import {
  assertLocalRecoveryEnvironment,
  buildSprint13RecoverySuite,
  recoveryBaselineSql,
  sprint13RecoverySuites,
  validateRecoveryBaseline,
  type Sprint13RecoverySuite,
} from "./sprint13-recovery-rehearsal";

describe("Sprint 13.6 local recovery packet", () => {
  it.each(sprint13RecoverySuites)("wraps only reviewed rollback-only %s", (suite) => {
    const sql = buildSprint13RecoverySuite(suite);
    expect(sql).toMatch(/^begin;/);
    expect(sql).toMatch(/rollback;$/);
    expect(sql).not.toMatch(/^\s*commit\s*;/im);
    expect(sql).toContain("statement_timeout='45s'");
    expect(sql).toContain("lock_timeout='5s'");
  });
  it.each(["../seed", "seed", "pilot_refund_requests;commit", ""])(
    "rejects non-packet suite %s",
    (suite) => {
      expect(() => buildSprint13RecoverySuite(suite as Sprint13RecoverySuite)).toThrow(
        "SPRINT13_RECOVERY_SUITE_REJECTED",
      );
    },
  );
  it.each([
    "SUPABASE_URL",
    "HOSTED_RECOVERY_CONFIRM",
    "SPRINT13_PAYMENT_CONFIRM",
    "STRIPE_RESTRICTED_KEY",
    "BREVO_API_KEY",
    "MEDICAL_INTAKE_KEYRING_JSON",
    "COMMERCE_REVIEW_MODE",
    "RECOVERY_ENCRYPTION_KEY_BASE64",
    "BACKUP_HEARTBEAT_URL",
    "R2_ACCESS_KEY_ID",
    "CLOUDFLARE_ACCOUNT_ID",
  ])("rejects provider configuration %s before execution", (name) => {
    expect(() => assertLocalRecoveryEnvironment({ [name]: "synthetic" })).toThrow(
      "SPRINT13_RECOVERY_HOSTED_ENVIRONMENT_REJECTED",
    );
  });
  it("accepts a credential-free local process", () => {
    expect(() =>
      assertLocalRecoveryEnvironment({ PATH: "/usr/bin", SUPABASE_URL: "" }),
    ).not.toThrow();
  });
  it("fingerprints rows, security metadata and every recovery schema's functions", () => {
    expect(recoveryBaselineSql).toContain("to_jsonb(t)");
    expect(recoveryBaselineSql).toContain("pg_get_triggerdef");
    expect(recoveryBaselineSql).toContain("relforcerowsecurity");
    const functions = recoveryBaselineSql.split("where p.prokind='f'")[1]!;
    for (const schema of [
      "commerce_private",
      "identity_private",
      "audit_private",
      "payments_private",
    ]) {
      expect(functions).toContain(`'${schema}'`);
    }
    expect(
      validateRecoveryBaseline(`${"a".repeat(32)}\n${"b".repeat(32)}\n${"c".repeat(32)}`),
    ).toBe(`${"a".repeat(32)}:${"b".repeat(32)}:${"c".repeat(32)}`);
    expect(() => validateRecoveryBaseline("private row")).toThrow();
  });
  it.each(["1..2\nok 1 pass", "1..1\nnot ok 1 fail", "ok 1 missing plan", "1..0"])(
    "does not accept partial or failed SQL evidence",
    (output) => expect(() => countRehearsalAssertions(output)).toThrow(),
  );
});
