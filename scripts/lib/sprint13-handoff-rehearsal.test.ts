import { describe, expect, it } from "vitest";
import {
  assertLocalHandoffEnvironment,
  buildSprint13HandoffSuite,
  handoffBaselineSql,
  sprint13HandoffSuites,
  validateHandoffBaseline,
} from "./sprint13-handoff-rehearsal";

describe("Sprint 13.5 local handoff packet", () => {
  it.each(sprint13HandoffSuites)("reuses bounded rollback-only %s", (suite) => {
    const sql = buildSprint13HandoffSuite(suite);
    expect(sql).toMatch(/^begin;/);
    expect(sql).toMatch(/rollback;$/);
    expect(sql).not.toMatch(/^\s*commit\s*;/im);
    expect(sql).toContain("statement_timeout='45s'");
    expect(sql).toContain("lock_timeout='5s'");
  });
  it.each([
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "HOSTED_INTAKE_CONFIRM",
    "STRIPE_RESTRICTED_KEY",
    "BREVO_API_KEY",
    "MEDICAL_INTAKE_KEYRING_JSON",
    "SPRINT13_PAYMENT_CONFIRM",
  ])("rejects %s", (name) => {
    expect(() => assertLocalHandoffEnvironment({ [name]: "not-a-local-value" })).toThrow();
  });
  it("allows a credential-free local process", () => {
    expect(() => assertLocalHandoffEnvironment({ PATH: "/usr/bin" })).not.toThrow();
  });
  it("compares row fingerprints, grants, triggers and full function definitions", () => {
    for (const marker of [
      "to_jsonb(t)",
      "relrowsecurity",
      "relforcerowsecurity",
      "relacl",
      "pg_get_triggerdef",
      "pg_get_functiondef",
      "proowner",
      "proacl",
      "proconfig",
      "'commerce_private'",
      "'auth'",
    ]) {
      expect(handoffBaselineSql).toContain(marker);
    }
    expect(
      validateHandoffBaseline(`${"a".repeat(32)}\n${"b".repeat(32)}\n${"c".repeat(32)}\n`),
    ).toContain(":");
  });
  it.each(["", "private-row", "a".repeat(32), `${"a".repeat(32)}\nextra`])(
    "rejects invalid inventory %s",
    (output) => {
      expect(() => validateHandoffBaseline(output)).toThrow();
    },
  );
});
