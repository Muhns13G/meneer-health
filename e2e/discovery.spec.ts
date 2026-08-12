import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/contact", "/privacy", "/terms"] as const;
const excludedDocumentRoutes = ["/start", "/peptides", "/poster", "/poster-thanks"] as const;

test.describe("public discovery policy", () => {
  for (const path of publicRoutes) {
    test(`${path} publishes one absolute canonical`, async ({ page }) => {
      await page.goto(path);

      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://meneerhealth.co.za${path}`,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    });
  }

  for (const path of excludedDocumentRoutes) {
    test(`${path} remains excluded from indexing`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );
    });
  }

  test("committed robots and sitemap outputs are served", async ({ request }) => {
    const robotsResponse = await request.get("/robots.txt");
    const sitemapResponse = await request.get("/sitemap.xml");
    const robots = await robotsResponse.text();
    const sitemap = await sitemapResponse.text();

    expect(robotsResponse.ok()).toBe(true);
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Disallow: /go/");
    expect(robots).toContain("Sitemap: https://meneerhealth.co.za/sitemap.xml");
    expect(sitemapResponse.ok()).toBe(true);
    expect(sitemap).toContain("https://meneerhealth.co.za/contact");
    expect(sitemap).not.toMatch(/start|peptides|poster|\/go\/|\/api\//);
  });
});
