import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";

test("private workforce entry loads without granting access", async ({ page, request }) => {
  await isolateExternalFonts(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/staff/sign-in");
  await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
  await expect(page.getByLabel("Staff email address")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send code" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Renew session" })).toHaveCount(0);
  await page.getByLabel("Staff email address").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Send code" })).toBeFocused();
  const analysis = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(analysis.violations).toEqual([]);
  expect(errors).toEqual([]);
  const session = await request.get("/staff/session");
  expect(session.status()).toBe(401);
  expect(session.headers()["cache-control"]).toContain("no-store");
});
