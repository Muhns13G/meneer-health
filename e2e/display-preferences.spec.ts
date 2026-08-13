import { expect, test } from "@playwright/test";

import { activeRoutes } from "./fixtures";
import { isolateExternalFonts } from "./helpers";

test.describe("display preferences and narrow reflow", () => {
  test("every active route reflows without horizontal page overflow at 320 CSS pixels", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await isolateExternalFonts(page);

    for (const route of activeRoutes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
        `${route.path} should not overflow horizontally`,
      ).toBe(false);
    }
  });

  test("reduced-motion preference disables smooth scrolling and meaningful transitions", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const motionPolicy = await page.evaluate(() => {
      const treatmentCard = document.querySelector("#treatments button");
      return {
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        rootScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        transitionDuration: treatmentCard
          ? getComputedStyle(treatmentCard).transitionDuration
          : undefined,
      };
    });

    expect(motionPolicy.reducedMotion).toBe(true);
    expect(motionPolicy.rootScrollBehavior).toBe("auto");
    expect(Number.parseFloat(motionPolicy.transitionDuration ?? "1")).toBeLessThanOrEqual(0.00001);
  });

  test("forced-colour rendering retains landmarks, actions, and content reflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  });
});
