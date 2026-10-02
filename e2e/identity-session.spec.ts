import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { isolateExternalFonts } from "./helpers";

for (const route of [
  { path: "/account/sign-in", heading: "Sign in to Meneer" },
  { path: "/account/recover", heading: "Recover your account" },
  { path: "/account/sign-out", heading: "Sign out" },
] as const) {
  test(`${route.path} remains private, accessible and free of URL tokens`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !(
          message.text().includes("https://fonts.googleapis.com/css2?") &&
          message.text().includes("violates the following Content Security Policy directive")
        )
      ) {
        consoleErrors.push(message.text());
      }
    });
    await isolateExternalFonts(page);
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
    expect(await page.locator(".vite-error-overlay, [data-nextjs-dialog]").count()).toBe(0);
    expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(0);
    expect(page.url()).toBe(`http://127.0.0.1:8085${route.path}`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}

test("forged-origin sign-in, recovery and sign-out POSTs are denied", async ({
  request,
  baseURL,
}) => {
  for (const path of ["/account/sign-in", "/account/recover", "/account/sign-out"]) {
    const response = await request.post(`${baseURL}${path}`, {
      data: "action=request&email=synthetic%40example.invalid",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://example.invalid",
        "Sec-Fetch-Site": "cross-site",
      },
    });
    expect(response.status()).toBe(403);
    expect(response.headers()["set-cookie"]).toBeUndefined();
  }
});
