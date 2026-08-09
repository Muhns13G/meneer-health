import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { activeRoutes } from "./fixtures";
import { isolateExternalFonts } from "./helpers";

test.describe("automated accessibility", () => {
  for (const route of activeRoutes) {
    test(`${route.path} has no WCAG A or AA axe violations`, async ({ page }) => {
      await isolateExternalFonts(page);
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
