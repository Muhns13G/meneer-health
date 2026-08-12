import { expect, test } from "@playwright/test";

import {
  GOOGLE_FONTS_FILE_ORIGIN,
  GOOGLE_FONTS_STYLESHEET_ORIGIN,
  GOOGLE_FONTS_STYLESHEET_URL,
  PUBLIC_FONT_POLICY,
} from "../src/lib/public-font-policy";
import { isolateExternalFonts } from "./helpers";

test.describe("approved external font policy", () => {
  test("publishes only the approved provider links and CSP origins", async ({ page }) => {
    const response = await page.goto("/");

    await expect(
      page.locator(`link[rel="stylesheet"][href="${GOOGLE_FONTS_STYLESHEET_URL}"]`),
    ).toHaveCount(1);
    await expect(
      page.locator(`link[rel="preconnect"][href="${GOOGLE_FONTS_STYLESHEET_ORIGIN}"]`),
    ).toHaveCount(1);
    await expect(
      page.locator(`link[rel="preconnect"][href="${GOOGLE_FONTS_FILE_ORIGIN}"]`),
    ).toHaveAttribute("crossorigin", "anonymous");

    const contentSecurityPolicy = response?.headers()["content-security-policy"];
    expect(contentSecurityPolicy).toContain(
      `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_STYLESHEET_ORIGIN}`,
    );
    expect(contentSecurityPolicy).toContain(`font-src 'self' ${GOOGLE_FONTS_FILE_ORIGIN}`);
  });

  test("retains usable system fallbacks when the external provider is unavailable", async ({
    page,
  }) => {
    await isolateExternalFonts(page);
    await page.goto("/");

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    expect(
      await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily),
    ).toBe(PUBLIC_FONT_POLICY.fallbacks.sans);
    expect(await heading.evaluate((element) => getComputedStyle(element).fontFamily)).toBe(
      PUBLIC_FONT_POLICY.fallbacks.serif,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
  });
});
