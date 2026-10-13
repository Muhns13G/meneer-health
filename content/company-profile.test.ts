import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { companyProfile } from "./company-profile";
import { replacePilotCompanyIdentity } from "./company-notice-transition";
import { publicContent } from "./public-content";

describe("approved company identity", () => {
  it("uses the CIPC identity/address, undisclosed VAT and unchanged collector", () => {
    expect(companyProfile).toMatchObject({
      legalName: "Meneer Health (Pty) Ltd",
      registrationNumber: "2026/652695/07",
      registeredAddress: "14 College Road, Rondebosch, Western Cape, 7700, South Africa",
      paymentCollector: "Octothorp LLC",
    });
    expect(Object.hasOwn(companyProfile, "vatNumber")).toBe(false);
    expect(publicContent.support.general.owner).toBe(companyProfile.legalName);
    expect(publicContent.campaigns.shared.operatorLine).toContain(
      companyProfile.registrationNumber,
    );
  });
  it("derives the four historical instruments without changing their source or service promises", () => {
    const path = "docs/02-implementation-plans/phase-02/annexures/pilot-client-terms-v1.md";
    const original = readFileSync(path, "utf8");
    const headings = [
      "## A — Account and Pilot Terms",
      "## B — Privacy Collection Notice",
      "## C — Questionnaire Acknowledgement and Collection Consent",
      "## D — R999 Review Deposit and Payment Terms",
      "## Internal Publication and Release Notes — Not Client Copy",
    ];
    const successors = headings.slice(0, 4).map((heading, i) => {
      const body = original
        .slice(original.indexOf(heading) + heading.length, original.indexOf(headings[i + 1]))
        .trim();
      const next = replacePilotCompanyIdentity(body);
      expect(next).toContain(companyProfile.legalName);
      expect(next).not.toMatch(/OCTOTHORP ZA|9279262266|K2024185008|De Chatillon/);
      return next;
    });
    expect(successors[3]).toContain("R999");
    expect(successors[3]).toContain("Octothorp LLC");
    expect(successors[2]).toContain("does not consent to marketing");
    expect(readFileSync(path, "utf8")).toBe(original);
  });
  it("rejects unrelated/new-company bodies instead of silently rewriting them", () => {
    expect(() => replacePilotCompanyIdentity("Other company terms")).toThrow(
      "COMPANY_NOTICE_PREDECESSOR_REJECTED",
    );
    expect(() => replacePilotCompanyIdentity("OCTOTHORP ZA VAT number unverified")).toThrow(
      "COMPANY_NOTICE_UNRECOGNISED_TAX_OR_ADDRESS_LAYOUT",
    );
  });
});
