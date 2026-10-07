import { describe, expect, it } from "vitest";
import {
  assertLocalRehearsalEnvironment,
  buildSprint10Rehearsal,
  countRehearsalAssertions,
  sprint10RehearsalSuites,
  type Sprint10RehearsalSuite,
} from "./sprint10-rehearsal";

describe("Sprint 10 bounded rehearsal", () => {
  it.each(sprint10RehearsalSuites)("keeps %s rollback-only and bounded", (suite) => {
    const sql = buildSprint10Rehearsal(suite);
    expect(sql).toMatch(/^begin;/);
    expect(sql).toMatch(/rollback;$/);
    expect(sql).not.toMatch(/^\s*commit\s*;/im);
    expect(sql).toContain("statement_timeout='45s'");
    expect(sql).toContain("lock_timeout='5s'");
  });
  it("rejects arbitrary packet paths", () => {
    expect(() => buildSprint10Rehearsal("../seed" as Sprint10RehearsalSuite)).toThrow();
  });
  it.each([
    "SUPABASE_URL",
    "SUPABASE_DB_URL",
    "SUPABASE_INTEGRATION_TARGET",
    "HOSTED_MEDICAL_INTAKE_CONFIRM",
  ])("rejects %s target configuration", (name) => {
    expect(() => assertLocalRehearsalEnvironment({ [name]: "synthetic-hosted" })).toThrow();
  });
  it("allows the fixed local container without hosted configuration", () => {
    expect(() => assertLocalRehearsalEnvironment({})).not.toThrow();
  });
  it("counts only a complete TAP result", () => {
    expect(countRehearsalAssertions("ok 1 - one\nok 2 - two\n1..2\n")).toBe(2);
  });
  it.each([
    "",
    "1..0",
    "ok 1 - one\n1..2",
    "not ok 1 - failure\n1..1",
    "ok 1\n1..1\n1..1",
    "ok 1\n# Looks like you failed\n1..1",
  ])("rejects incomplete/failing proof %s", (output) => {
    expect(() => countRehearsalAssertions(output)).toThrow();
  });
});
