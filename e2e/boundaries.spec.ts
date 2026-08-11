import { expect, test } from "@playwright/test";
import { campaignRedirects, retiredRoutes } from "./fixtures";
import { isolateExternalFonts, monitorPage } from "./helpers";

test.describe("retired and unknown routes", () => {
  for (const path of retiredRoutes) {
    test(`${path} returns the ordinary 404 boundary`, async ({ page }) => {
      const findings = monitorPage(page);
      await isolateExternalFonts(page);

      const response = await page.goto(path);

      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
      expect(findings).toEqual([
        "console:error: Failed to load resource: the server responded with a status of 404 (Not Found)",
      ]);
    });
  }
});

test.describe("campaign redirects", () => {
  for (const campaign of campaignRedirects) {
    test(`${campaign.path} retains its 307 attribution redirect`, async ({ request, baseURL }) => {
      const response = await request.get(`${baseURL}${campaign.path}`, { maxRedirects: 0 });

      expect(response.status()).toBe(307);
      expect(response.headers().location).toBe(campaign.destination);
    });
  }
});

test("security and cache headers match each Worker response class", async ({
  request,
  baseURL,
}) => {
  const publicResponse = await request.get(`${baseURL}/`);
  expect(publicResponse.status()).toBe(200);
  expect(publicResponse.headers()["cache-control"]).toBe("public, max-age=0, must-revalidate");
  expect(publicResponse.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(publicResponse.headers()["permissions-policy"]).toContain("camera=()");
  expect(publicResponse.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(publicResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(publicResponse.headers()["x-frame-options"]).toBe("DENY");

  for (const path of ["/start", "/peptides"]) {
    const sensitiveResponse = await request.get(`${baseURL}${path}`);
    expect(sensitiveResponse.headers()["cache-control"]).toBe("private, no-store, max-age=0");
  }

  const redirectResponse = await request.get(`${baseURL}/go/dads`, { maxRedirects: 0 });
  expect(redirectResponse.headers()["cache-control"]).toBe("private, no-store, max-age=0");

  const errorResponse = await request.get(`${baseURL}/definitely-not-a-route`);
  expect(errorResponse.status()).toBe(404);
  expect(errorResponse.headers()["cache-control"]).toBe("private, no-store, max-age=0");
});

test("active intake and campaign surfaces remain non-transactional", async ({ page }) => {
  await isolateExternalFonts(page);

  for (const path of ["/start", "/peptides", "/poster", "/poster-thanks"]) {
    await page.goto(path);
    await expect(page.locator("form, input, textarea, select")).toHaveCount(0);
  }

  await page.goto("/start");
  await expect(page.getByRole("link", { name: /Mobile emergency: 112/ })).toHaveAttribute(
    "href",
    "tel:112",
  );
  await expect(page.getByRole("link", { name: /Ambulance: 10177/ })).toHaveAttribute(
    "href",
    "tel:10177",
  );
  await expect(page.getByText("You're in, meneer.")).toHaveCount(0);
});
