import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";

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
