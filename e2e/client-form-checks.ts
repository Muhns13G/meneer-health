import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Presentation proof, not screen-reader speech or hosted authority proof.
export async function checkClientFormPresentation(page: Page) {
  if (process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic") {
    if (process.env.CI || new URL(page.url()).origin !== "http://127.0.0.1:8085")
      throw new Error("Manual form review is local-only and unavailable in CI.");
    await page.pause();
  }
  const original = page.viewportSize()!;
  for (const mode of ["normal", "reflow", "text-size", "forced-colours"] as const) {
    await page.setViewportSize(
      mode === "reflow" || mode === "forced-colours" ? { width: 320, height: 800 } : original,
    );
    await page.emulateMedia({
      reducedMotion: "reduce",
      forcedColors: mode === "forced-colours" ? "active" : "none",
    });
    await page.evaluate((enlarged) => {
      document.documentElement.style.fontSize = enlarged ? "200%" : "";
    }, mode === "text-size");
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const width = innerWidth;
            return {
              excess: Math.max(0, document.documentElement.scrollWidth - width),
              offenders: [...document.querySelectorAll("body *")]
                .filter((element) => element.getBoundingClientRect().right > width + 1)
                .map(
                  (element) =>
                    `${element.tagName}.${element.className}:${Math.round(element.getBoundingClientRect().right)}`,
                )
                .slice(0, 8),
            };
          }),
        { message: `${mode} reflow overflow` },
      )
      .toMatchObject({ excess: 0 });
    const controls = page.locator('main input:not([type="hidden"]), main select, main textarea');
    for (let index = 0; index < (await controls.count()); index++) {
      const control = controls.nth(index);
      await expect(control).toBeVisible();
      await expect(control).toHaveAccessibleName(/\S/);
      if (await control.isEnabled()) {
        await control.focus();
        await expect(control).toBeFocused();
        const rect = await control.boundingBox();
        expect(rect?.width).toBeGreaterThan(0);
        expect(rect?.height).toBeGreaterThan(0);
      }
    }
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
      true,
    );
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).toBe("auto");
    if (mode === "forced-colours")
      expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    const axe = new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);
    // Forced colours use the user's system palette at paint time, not the authored gold/dark
    // palette used by axe's contrast calculation. Keep contrast enabled in every other mode.
    if (mode === "forced-colours") axe.disableRules(["color-contrast"]);
    expect((await axe.analyze()).violations).toEqual([]);
    if (mode === "forced-colours")
      await page.screenshot({
        path: `/private/tmp/meneer-client-form-${new URL(page.url()).pathname.replaceAll("/", "-")}.png`,
        fullPage: true,
      });
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize(original);
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "none" });
}

export async function checkKeyboardReachability(page: Page) {
  await page.waitForLoadState("networkidle");
  const controls = page.locator(
    'main input:not([type="hidden"]):enabled, main select:enabled, main textarea:enabled, main button:enabled, main a[href]',
  );
  await controls.evaluateAll((items) =>
    items.forEach((item, index) => item.setAttribute("data-a11y-control", String(index))),
  );
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.tabIndex = -1;
    document.body.focus();
  });
  const visited = new Set<string>();
  for (let index = 0; index < 100 && visited.size < (await controls.count()); index++) {
    await page.keyboard.press("Tab");
    const current = await page.evaluate(() =>
      document.activeElement?.getAttribute("data-a11y-control"),
    );
    if (current) visited.add(current);
  }
  expect(visited.size).toBe(await controls.count());
}
