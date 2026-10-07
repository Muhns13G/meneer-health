import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { isolateExternalFonts } from "./helpers";

const id = "d1350000-0000-4000-8000-000000000001";
test("first-party preparation submits references only and announces no external delivery", async ({
  page,
}, testInfo) => {
  await isolateExternalFonts(page);
  const commands: Record<string, unknown>[] = [];
  await page.route("**/staff/intake/command", async (route) => {
    commands.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ reference: id, outcome: "recorded" }),
    });
  });
  await page.goto("/staff/intake");
  await expect(page.getByRole("combobox", { name: "Operation" })).toHaveValue("prepare_transfer");
  await page.getByLabel("intake Id", { exact: true }).fill(id);
  await page.getByLabel("snapshot Id", { exact: true }).fill(id);
  await page.getByLabel("case Version", { exact: true }).fill("1");
  await expect(page.getByLabel("external Reference", { exact: true })).toHaveCount(0);
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("combobox", { name: "Operation" }) });
  await form.getByRole("button").click();
  await expect(page.getByRole("status")).toContainText("No information has been sent");
  expect(commands).toHaveLength(1);
  expect(commands[0]).toEqual({
    action: "prepare_transfer",
    intakeId: id,
    snapshotId: id,
    caseVersion: 1,
    requestKey: expect.any(String),
  });
  expect(new URL(page.url()).search).toBe("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("preparation-result.png"), fullPage: true });
});

test("stale preparation shows no success and never automatically resubmits", async ({ page }) => {
  await isolateExternalFonts(page);
  let commands = 0;
  await page.route("**/staff/intake/command", async (route) => {
    commands++;
    await route.fulfill({ status: 409, body: "" });
  });
  await page.goto("/staff/intake");
  await page.getByLabel("intake Id", { exact: true }).fill(id);
  await page.getByLabel("snapshot Id", { exact: true }).fill(id);
  await page.getByLabel("case Version", { exact: true }).fill("1");
  await page
    .locator("form")
    .filter({ has: page.getByRole("combobox", { name: "Operation" }) })
    .getByRole("button")
    .click();
  await expect(page.getByRole("status")).toContainText("changed");
  await expect(page.getByRole("status")).not.toContainText("Transfer preparation recorded");
  expect(commands).toBe(1);
});
