import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
import { staffQuoteFixture, quoteFixtureId as id } from "../src/test/staff-product-quote-fixture";
const row = {
  caseId: id,
  state: "onboarding_pending",
  version: 1,
  assignedOwner: id,
  createdAt: "2026-10-10T01:00:00Z",
  updatedAt: "2026-10-10T01:00:00Z",
  profileActive: true,
  emailVerified: true,
  exceptionCode: null,
  handoffReadiness: "not_evaluated",
  paymentReadiness: "not_evaluated",
};
test("assigned staff prepares a private immutable non-payable draft", async ({ page }) => {
  await isolateExternalFonts(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/staff/queue/read", (r) =>
    r.fulfill({ json: { cases: [row], nextCursor: null } }),
  );
  await page.route("**/staff/queue/detail", (r) =>
    r.fulfill({
      json: {
        ...row,
        claim: "unclaimed",
        profile: null,
        readiness: {
          profileActive: true,
          accountActive: true,
          emailVerified: true,
          instrumentsCurrent: false,
          authorisationCurrent: false,
          paymentReadiness: "integration_pending",
          recipientReadiness: "integration_pending",
          ready: false,
        },
      },
    }),
  );
  let commands = 0;
  await page.route("**/staff/products/command", (r) => {
    const command = r.request().postDataJSON();
    const view = staffQuoteFixture();
    if (command.action === "prepare_draft") {
      commands++;
      expect(command).toEqual({
        action: "prepare_draft",
        caseId: id,
        catalogueId: id,
        expectedCaseVersion: 1,
        expectedDraftVersion: 0,
        deliveryQuoteId: id,
        requestKey: r.request().headers()["idempotency-key"],
        items: [{ productId: id, quantity: 2 }],
      });
      return r.fulfill({
        json: {
          ...view,
          draft: {
            draftId: id,
            version: 1,
            items: [
              {
                productId: id,
                description: "Synthetic item",
                quantity: 2,
                unitAmountMinor: 150000,
              },
            ],
            productSubtotalMinor: 300000,
            deliveryMinor: 10000,
            totalBeforeCreditMinor: 310000,
          },
        },
      });
    }
    return r.fulfill({ json: view });
  });
  await page.goto("/staff/queue");
  await page.getByRole("button", { name: `View case ${id}` }).click();
  await page.getByText("Product quote preparation", { exact: true }).click();
  const panel = page.getByRole("region", { name: "Product quote preparation" });
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/staff/products/command")),
    panel.getByRole("button", { name: "Load / reconcile product draft" }).click(),
  ]);
  await expect(panel.getByText(/Synthetic workspace/)).toBeVisible();
  await panel.getByLabel("Quantity: Synthetic item").fill("2");
  await panel.getByLabel("Approved delivery/address reference").selectOption(id);
  await panel.getByRole("button", { name: "Save non-payable draft" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toContainText("Draft saved");
  await expect(panel.getByText(/Latest saved draft/)).toBeVisible();
  expect(commands).toBe(1);
  expect(
    (
      await new AxeBuilder({ page })
        .include('section[aria-label="Product quote preparation"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  expect(page.url()).not.toContain(id);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.screenshot({
    path: `/tmp/meneer-staff-draft-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(panel.getByLabel("Quantity: Synthetic item")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("disabled anonymous quote endpoint stays closed", async ({ request }) => {
  const r = await request.post("/staff/products/command", {
    headers: { origin: "http://127.0.0.1:8085", "Idempotency-Key": id },
    data: { action: "read", caseId: id },
  });
  expect([401, 412]).toContain(r.status());
  expect(r.headers()["cache-control"]).toContain("no-store");
});
