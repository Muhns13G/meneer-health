import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { isolateExternalFonts } from "./helpers";

test("first-party code page renders without URL state or accessibility violations", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  const response = await page.goto("/account/verify");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page.getByRole("heading", { name: "Verify your invitation" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
  expect(page.url()).toBe("http://127.0.0.1:8085/account/verify");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("a forged origin cannot consume an invitation code", async ({ request, baseURL }) => {
  const response = await request.post(`${baseURL}/account/verify`, {
    data: "email=synthetic%40example.invalid&code=123456",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://example.invalid",
      "Sec-Fetch-Site": "cross-site",
    },
  });
  expect(response.status()).toBe(403);
  expect(response.headers()["set-cookie"]).toBeUndefined();
});
