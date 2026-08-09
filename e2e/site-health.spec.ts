import { expect, test } from "@playwright/test";
import { activeRoutes } from "./fixtures";
import { expectHealthyRendering, isolateExternalFonts, monitorPage } from "./helpers";

test.describe("active route health", () => {
  for (const route of activeRoutes) {
    test(`${route.path} renders its approved boundary`, async ({ page }) => {
      const findings = monitorPage(page);
      await isolateExternalFonts(page);

      const response = await page.goto(route.path);

      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(route.title);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expectHealthyRendering(page, findings);
    });
  }
});
