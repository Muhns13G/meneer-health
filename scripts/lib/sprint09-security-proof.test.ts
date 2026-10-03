import { describe, expect, it } from "vitest";
import {
  buildSprint09SecurityProof,
  sprint09HostedInventorySql,
  sprint09SecuritySuites,
  type Sprint09SecuritySuite,
} from "./sprint09-security-proof";

describe("Sprint 09 security proof packet", () => {
  it.each(sprint09SecuritySuites)("bounds %s to one rollback transaction", (suite) => {
    const sql = buildSprint09SecurityProof(suite, "hosted-synthetic");
    expect(sql).toMatch(/^begin;/);
    expect(sql).toMatch(/rollback;$/);
    expect(sql).not.toMatch(/^\s*commit\s*;/im);
    expect(sql).toContain("SPRINT09_HOSTED_BASELINE_CHANGED");
    expect(sql.indexOf("SPRINT09_HOSTED_BASELINE_CHANGED")).toBeLessThan(
      sql.indexOf("insert into public.tenants"),
    );
    expect(sql).not.toContain("payment_price_catalogue");
    expect(sql).toContain("select * from finish(true)");
    expect(sql).toContain("extensions.num_failed()");
  });
  it("leaves local seeded tests separate from hosted fixture creation", () => {
    expect(buildSprint09SecurityProof("patient_account_rights", "local")).not.toContain(
      "insert into public.tenants",
    );
  });
  it("refuses arbitrary paths/suites", () => {
    expect(() => buildSprint09SecurityProof("../seed" as Sprint09SecuritySuite, "local")).toThrow(
      "SPRINT09_SUITE_INVALID",
    );
  });
  it("inventories both hidden rights tables and the activation ledger without row values", () => {
    expect(sprint09HostedInventorySql).toContain("identity_private.patient_account_commands");
    expect(sprint09HostedInventorySql).toContain("identity_private.patient_rights_requests");
    expect(sprint09HostedInventorySql).toContain("identity_private.pilot_activation_commands");
    expect(sprint09HostedInventorySql).not.toMatch(/select \*/i);
  });
});
