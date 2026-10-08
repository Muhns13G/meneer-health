import { describe, expect, it } from "vitest";
import {
  assertLocalMobileEnvironment,
  buildMobileSecuritySuite,
  mobileSecurityBaselineSql,
  mobileSecuritySuites,
  type MobileSecuritySuite,
} from "./sprint14-security";

describe("bounded Sprint 14 security packet", () => {
  it.each(mobileSecuritySuites)("rolls back fixed suite %s", (suite) => {
    const sql = buildMobileSecuritySuite(suite);
    expect(sql).toMatch(/^begin;/);
    expect(sql).toMatch(/rollback;$/);
    expect(sql).toContain("statement_timeout='45s'");
    expect(sql).toContain("lock_timeout='5s'");
    expect(sql).not.toMatch(/^\s*commit\s*;/im);
  });
  it.each(["../seed", "seed", "mobile_invitation_foundation;commit", ""])("rejects %s", (suite) => {
    expect(() => buildMobileSecuritySuite(suite as MobileSecuritySuite)).toThrow();
  });
  it.each([
    "SUPABASE_URL",
    "DATABASE_URL",
    "PGHOST",
    "TELNYX_API_KEY",
    "BREVO_API_KEY",
    "MOBILE_INVITATIONS_EMAIL_MODE",
    "IDENTITY_PREACTIVATION_KEY_BASE64",
    "RECOVERY_ENCRYPTION_KEY_BASE64",
  ])("rejects inherited %s", (name) => {
    expect(() => assertLocalMobileEnvironment({ [name]: "synthetic" })).toThrow(
      "MOBILE_SECURITY_LOCAL_ONLY",
    );
  });
  it("fingerprints rows, forced RLS, ACLs, guards and function definitions", () => {
    expect(mobileSecurityBaselineSql).toContain("to_jsonb(t)");
    expect(mobileSecurityBaselineSql).toContain("relforcerowsecurity");
    expect(mobileSecurityBaselineSql).toContain("pg_get_triggerdef");
    expect(mobileSecurityBaselineSql).toContain("pg_get_functiondef");
    expect(mobileSecurityBaselineSql).toContain("'auth'");
  });
});
