import { describe, expect, it } from "vitest";
import { initialOperatorRoster, verifyPilotStaffBaseline } from "./pilot-staff-baseline";

const attribution = {
  authorised_staff_accounts: 4,
  unexpected_auth_accounts: 0,
  unexpected_subjects: 0,
  unexpected_contacts: 0,
  unexpected_identity_links: 0,
  unexpected_tenants: 0,
};
function inventory() {
  return [
    ["auth", "users", 4],
    ["auth", "identities", 4],
    ["auth", "one_time_tokens", 4],
    ["auth", "schema_migrations", 82],
    ["storage", "migrations", 73],
    ["public", "subjects", 4],
    ["public", "external_identities", 4],
    ["public", "tenants", 1],
    ["public", "fulfilment_provider_gates", 12],
  ].map(([schemaname, tablename, row_count]) => ({ schemaname, tablename, row_count }));
}
describe("primary database staff-only baseline", () => {
  it("preserves the four authorised accounts without requiring their deletion", () => {
    expect(() => verifyPilotStaffBaseline(inventory(), attribution)).not.toThrow();
  });
  it.each([
    ["public", "client_profiles"],
    ["intake_private", "snapshots"],
    ["commerce_private", "deposit_funding"],
    ["public", "tenant_memberships"],
    ["auth", "sessions"],
    ["storage", "objects"],
    ["identity_private", "mobile_invitations"],
    ["unknown", "unreviewed_records"],
  ])("rejects unexpected data in %s.%s", (schemaname, tablename) => {
    expect(() =>
      verifyPilotStaffBaseline(
        [...inventory(), { schemaname, tablename, row_count: 1 }],
        attribution,
      ),
    ).toThrow();
  });
  it.each(Object.keys(attribution).filter((key) => key !== "authorised_staff_accounts"))(
    "requires zero unexpected %s",
    (key) => {
      expect(() => verifyPilotStaffBaseline(inventory(), { ...attribution, [key]: 1 })).toThrow();
    },
  );
  it("rejects incomplete, duplicate or row-content-expanded evidence", () => {
    const rows = inventory();
    expect(() => verifyPilotStaffBaseline(rows.slice(1), attribution)).toThrow();
    expect(() => verifyPilotStaffBaseline([...rows, rows[0]], attribution)).toThrow();
    expect(() =>
      verifyPilotStaffBaseline(
        [{ ...rows[0], email: "synthetic@example.invalid" }, ...rows.slice(1)],
        attribution,
      ),
    ).toThrow();
  });
  it("records only the two operators and never silently activates clinical access", () => {
    expect(initialOperatorRoster.operators).toEqual(["mansoer", "mikhail"]);
    expect(initialOperatorRoster.state).toBe("grants-provisioned-tenant-suspended");
    expect(initialOperatorRoster.clinicalGrants).toBe(0);
    expect(initialOperatorRoster.requiresIndependentApproval).toBe(true);
  });
});
