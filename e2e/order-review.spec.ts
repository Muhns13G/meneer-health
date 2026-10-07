import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { orderReviewFixture } from "../src/test/order-review-fixture";
import { isolateExternalFonts } from "./helpers";
test("exact order disclosure and unchecked acceptance never imply payment", async ({ page }) => {
  await isolateExternalFonts(page);
  const review = orderReviewFixture();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/portal/order/command", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "accept") {
      expect(body).toEqual({
        action: "accept",
        offerId: review.offerId,
        publicationId: review.terms.publicationId,
        snapshotHash: review.snapshotHash,
        contentHash: review.terms.contentHash,
        requestKey: expect.any(String),
        accepted: true,
      });
      expect(route.request().headers()["idempotency-key"]).toBe(body.requestKey);
      return route.fulfill({
        json: {
          review: {
            ...review,
            acceptance: { receiptId: review.offerId, recordedAt: new Date().toISOString() },
          },
        },
      });
    }
    return route.fulfill({ json: { review } });
  });
  await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/portal/order/command",
    ),
    page.goto("/portal/order"),
  ]);
  await expect(page.getByText("Synthetic review deposit")).toBeVisible();
  await expect(page.getByText("Synthetic supplier — test-only", { exact: false })).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Accept this order" })).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  if (test.info().project.name === "desktop-chromium")
    await page.screenshot({ path: test.info().outputPath("order-review.png"), fullPage: true });
  await page.getByRole("checkbox").focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Accept this order" }).click();
  await expect(page.getByRole("status")).toContainText("Payment is not confirmed here");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(new URL(page.url()).search).toBe("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("denial and stale response clear private order details", async ({ page }) => {
  await isolateExternalFonts(page);
  let count = 0;
  await page.route("**/portal/order/command", (route) =>
    ++count === 1
      ? route.fulfill({ json: { review: orderReviewFixture() } })
      : route.fulfill({ status: 401, body: "" }),
  );
  await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/portal/order/command",
    ),
    page.goto("/portal/order"),
  ]);
  await expect(page.getByRole("checkbox")).toBeVisible();
  await page.getByRole("button", { name: "Reload order" }).click();
  await expect(page.getByRole("status")).toContainText("Your session has ended");
  await expect(page.getByText("Synthetic review deposit")).toHaveCount(0);
});
test("wall-clock expiry clears the review and acknowledgement", async ({ page }) => {
  await isolateExternalFonts(page);
  const review = orderReviewFixture();
  await page.route("**/portal/order/command", (route) =>
    route.fulfill({
      json: {
        review: { ...review, expiresAt: new Date(Date.now() + 2000).toISOString() },
      },
    }),
  );
  await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/portal/order/command",
    ),
    page.goto("/portal/order"),
  ]);
  await expect(page.getByRole("checkbox")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("review has expired", { timeout: 6000 });
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});
test("accepted sandbox order starts only a strict Checkout request and never renders paid", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  const review = orderReviewFixture();
  review.checkoutEnabled = true;
  review.acceptance = { receiptId: review.offerId, recordedAt: new Date().toISOString() };
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({ body: "Synthetic Checkout destination", contentType: "text/html" }),
  );
  await page.route("**/portal/order/command", (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "checkout") {
      expect(body).toEqual({
        action: "checkout",
        offerId: review.offerId,
        requestKey: expect.any(String),
      });
      expect(route.request().headers()["idempotency-key"]).toBe(body.requestKey);
      return route.fulfill({
        json: { checkoutUrl: "https://checkout.stripe.com/c/pay/synthetic" },
      });
    }
    return route.fulfill({ json: { review } });
  });
  await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === "/portal/order/command"),
    page.goto("/portal/order"),
  ]);
  await expect(page.getByRole("status")).toContainText("Payment is not confirmed here");
  await page.getByRole("button", { name: "Continue to secure Checkout" }).click();
  await expect(page).toHaveURL("https://checkout.stripe.com/c/pay/synthetic");
});
