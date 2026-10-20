import { expect, test } from "@playwright/test";
import { activeRoutes } from "./fixtures";
import {
  expectConfiguredMediaAvailable,
  expectHealthyRendering,
  isolateExternalFonts,
  monitorPage,
} from "./helpers";

test.describe("active route health", () => {
  for (const route of activeRoutes) {
    test(`${route.path} renders its approved boundary`, async ({ page }) => {
      const findings = monitorPage(page);
      await isolateExternalFonts(page);
      // This packet measures rendering, not configured hosted signup authority. Keep the
      // availability read deterministic/no-send; public-registration.spec owns denial proof.
      if (route.path === "/start")
        await page.route("**/account/sign-up/availability", (request) =>
          request.fulfill({ status: 204 }),
        );

      const response = await page.goto(route.path);

      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(route.title);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expectConfiguredMediaAvailable(page);
      if (route.path === "/start") {
        // Hydration may cancel an earlier availability read. Accept that exact cancellation
        // only after the later read actually enables the form; all other failures stay fatal.
        await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
        await page.waitForLoadState("networkidle");
        await expectHealthyRendering(
          page,
          findings.filter(
            (finding) =>
              finding !== "requestfailed: GET /account/sign-up/availability (net::ERR_ABORTED)",
          ),
        );
      } else await expectHealthyRendering(page, findings);
    });
  }
});
