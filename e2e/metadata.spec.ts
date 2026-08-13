import { expect, test } from "@playwright/test";

import { activeRoutes, retiredRoutes } from "./fixtures";

const expectedAssetPath =
  /^\/(?:src\/assets\/brand\/meneer-mark\.png|assets\/meneer-mark-[A-Za-z0-9_-]+\.png)$/;
const expectedSocialImage =
  /^https:\/\/meneerhealth\.co\.za\/(?:src\/assets\/brand\/meneer-mark\.png|assets\/meneer-mark-[A-Za-z0-9_-]+\.png)$/;

test.describe("favicon and social metadata", () => {
  for (const route of activeRoutes) {
    test(`${route.path} renders the approved placeholder metadata`, async ({ page, request }) => {
      await page.goto(route.path);

      const favicon = page.locator('link[rel="icon"]');
      const faviconHref = await favicon.getAttribute("href");
      await expect(favicon).toHaveCount(1);
      await expect(favicon).toHaveAttribute("type", "image/png");
      expect(faviconHref).toMatch(expectedAssetPath);

      const faviconResponse = await request.get(faviconHref!);
      expect(faviconResponse.ok()).toBe(true);
      expect(faviconResponse.headers()["content-type"]).toContain("image/png");

      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        expectedSocialImage,
      );
      await expect(page.locator('meta[property="og:image:secure_url"]')).toHaveAttribute(
        "content",
        expectedSocialImage,
      );
      await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute(
        "content",
        "image/png",
      );
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
        "content",
        "550",
      );
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
        "content",
        "370",
      );
      await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
        "content",
        "Meneer Health placeholder brand mark",
      );
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
        "content",
        expectedSocialImage,
      );
      await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
        "content",
        "Meneer Health placeholder brand mark",
      );
    });
  }

  test("not-found metadata retains the approved fallback and exclusion header", async ({
    page,
  }) => {
    const response = await page.goto(retiredRoutes.at(-1)!);

    expect(response?.status()).toBe(404);
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      expectedSocialImage,
    );
  });
});
