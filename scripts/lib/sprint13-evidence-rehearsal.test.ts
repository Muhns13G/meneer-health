import { describe, expect, it } from "vitest";
import {
  assertLocalEvidenceEnvironment,
  buildSprint13EvidenceSuite,
  evidenceBaselineSql,
  sprint13EvidenceSuites,
  type Sprint13EvidenceSuite,
} from "./sprint13-evidence-rehearsal";

describe("Sprint 13.7 evidence packet", () => {
  it.each(sprint13EvidenceSuites)("bounds and rolls back %s", (suite) => {
    const sql = buildSprint13EvidenceSuite(suite);
    expect(sql).toMatch(/^begin;/);
    expect(sql).toMatch(/rollback;$/);
    expect(sql).not.toMatch(/^\s*commit\s*;/im);
    expect(sql).toContain("statement_timeout='45s'");
    expect(sql).toContain("lock_timeout='5s'");
  });
  it.each(["../seed", "seed", "audit_inbox_outbox_evidence;commit", ""])(
    "rejects unreviewed suite %s",
    (suite) => {
      expect(() => buildSprint13EvidenceSuite(suite as Sprint13EvidenceSuite)).toThrow();
    },
  );
  it.each([
    "SUPABASE_URL",
    "RECOVERY_ENCRYPTION_KEY_BASE64",
    "STRIPE_SECRET_KEY",
    "SPRINT13_PAYMENT_CONFIRM",
  ])("rejects hosted configuration %s", (name) => {
    expect(() => assertLocalEvidenceEnvironment({ [name]: "synthetic" })).toThrow();
  });
  it("preserves exact row, function, ACL and trigger checks", () => {
    expect(evidenceBaselineSql).toContain("to_jsonb(t)");
    expect(evidenceBaselineSql).toContain("pg_get_functiondef");
    expect(evidenceBaselineSql).toContain("pg_get_triggerdef");
    expect(evidenceBaselineSql).toContain("relforcerowsecurity");
  });
});
