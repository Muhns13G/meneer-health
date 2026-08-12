import { expect, test } from "@playwright/test";
import { sharedChromeRoutes, sharedNavigationTargets } from "./fixtures";
import { isolateExternalFonts } from "./helpers";

test.describe("shared route-aware navigation", () => {
  for (const path of sharedChromeRoutes) {
    test(`${path} resolves every shared destination`, async ({ page }, testInfo) => {
      await isolateExternalFonts(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const header = page.locator("header");
      if (testInfo.project.name === "mobile-chromium") {
        await header.getByRole("button", { name: "Menu" }).click();
      }

      await expect(header.locator('a[href="/"]').first()).toHaveAttribute("href", "/");
      await expect(header.getByRole("link", { name: "Start privately" })).toHaveAttribute(
        "href",
        "/start",
      );

      for (const target of sharedNavigationTargets) {
        await expect(header.getByRole("link", { name: target.label })).toHaveAttribute(
          "href",
          target.href,
        );
      }

      const footer = page.locator("footer");
      await expect(footer.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
        "href",
        "/privacy",
      );
      await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
      await expect(footer.getByRole("link", { name: "Contact" })).toHaveAttribute(
        "href",
        "/contact",
      );

      await header.getByRole("link", { name: "How It Works" }).click();
      await expect(page).toHaveURL(/\/#how$/);
      await expect(page.locator("#how")).toBeVisible();
    });
  }
});

test("primary navigation matches the active viewport", async ({ page }, testInfo) => {
  await isolateExternalFonts(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const menuButton = page.getByRole("button", { name: "Menu" });
  const desktopStart = page.locator("header > div").getByRole("link", { name: "Start privately" });

  if (testInfo.project.name === "mobile-chromium") {
    await expect(menuButton).toBeVisible();
    await expect(desktopStart).toBeHidden();

    await menuButton.click();
    const mobileStart = page.locator("header").getByRole("link", { name: "Start privately" });
    await expect(mobileStart).toBeVisible();
    await mobileStart.click();
  } else {
    await expect(menuButton).toBeHidden();
    await expect(desktopStart).toBeVisible();
    await desktopStart.click();
  }

  await expect(page).toHaveURL(/\/start$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Start your private consult" }),
  ).toBeVisible();
});
