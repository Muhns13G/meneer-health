import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mobileInvitationDestination } from "./mobile-invitation-destination";

describe("ZA and US invitation destinations", () => {
  it.each(["+27000000001", "+27820000000"])("retains ZA %s", (phone) => {
    expect(mobileInvitationDestination(phone)).toBe("ZA");
  });
  it.each(["+15105550123", "+12125550123", "+12025550123", "+19835550123"])(
    "recognises US geographic number %s",
    (phone) => expect(mobileInvitationDestination(phone)).toBe("US"),
  );
  it.each([
    "+14165550123", // Canada
    "+12425550123", // Bahamas
    "+17875550123", // Puerto Rico: separate numbering territory
    "+18005550123", // Non-geographic toll-free destination
    "+15101550123", // Invalid exchange
    "+1510555012",
    "+151055501234",
    "+442055501234",
    " +15105550123",
    "+15105550123\n",
  ])("rejects unsupported/malformed %j", (phone) => {
    expect(mobileInvitationDestination(phone)).toBeNull();
  });
  it("keeps the database and runtime US pattern identical", () => {
    const migration = readFileSync(
      "supabase/migrations/20261010122842_mobile_invitation_us_destinations.sql",
      "utf8",
    );
    const pattern = migration.match(/phone ~ '([^']+)'/)?.[1];
    expect(pattern).toBeDefined();
    const sqlPattern = new RegExp(pattern!);
    for (let area = 200; area <= 999; area++) {
      for (const exchange of ["155", "255", "655", "955"]) {
        const phone = `+1${area}${exchange}0123`;
        expect(sqlPattern.test(phone)).toBe(mobileInvitationDestination(phone) === "US");
      }
    }
  });
});
