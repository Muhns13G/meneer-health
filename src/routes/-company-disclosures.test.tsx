import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Route as TermsRoute } from "./terms";
import { Route as PrivacyRoute } from "./privacy";
import { renderWithRouter } from "@/test/render-with-router";
import { companyProfile } from "@content/company-profile";

describe("current public company disclosures", () => {
  it.each([TermsRoute, PrivacyRoute])(
    "shows the approved identity/address without old company or VAT claims",
    async (route) => {
      const Component = route.options.component as () => React.ReactNode;
      await renderWithRouter(<Component />);
      expect(
        screen.getAllByText(
          (_, el) =>
            el?.tagName === "P" &&
            el.textContent?.includes(companyProfile.registrationNumber) === true,
        ).length,
      ).toBeGreaterThan(0);
      expect(document.body.textContent).toContain(companyProfile.registeredAddress);
      expect(document.body.textContent).not.toMatch(
        /OCTOTHORP ZA|K2024185008|9279262266|De Chatillon/,
      );
      expect(document.body.textContent).toContain("Octothorp LLC");
    },
  );
});
