import { expect, test } from "@playwright/test";
import { portalAccountFixture } from "../src/test/patient-portal-fixture";
import { orderReviewFixture } from "../src/test/order-review-fixture";
import { paymentStatusFixture } from "../src/test/payment-status-fixture";
import { isolateExternalFonts } from "./helpers";
import { checkClientFormPresentation, checkKeyboardReachability } from "./client-form-checks";
const fixtureLifetime =
  process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic" ? 3600000 : 600000;

for (const path of [
  "/",
  "/start",
  "/peptides",
  "/account/verify",
  "/account/sign-in",
  "/account/recover",
  "/account/activate",
  "/portal/rights",
  "/portal/order",
  "/portal/support",
  "/portal",
]) {
  test(`${path} client controls support keyboard and display preferences`, async ({ page }) => {
    test.setTimeout(
      process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic" ? 0 : 60000,
    );
    await isolateExternalFonts(page);
    // A manual reviewer must never send an unmocked mutation to the local application's
    // configured services. More-specific synthetic handlers registered below take precedence.
    await page.route("http://127.0.0.1:8085/**", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 503, body: "" })
        : route.continue(),
    );
    if (path === "/account/sign-in" || path === "/account/recover")
      await page.route(`**${path}`, (route) =>
        route.request().method() === "POST"
          ? route.fulfill({
              status: route.request().postData()?.includes("action=request") ? 202 : 503,
              body: "",
            })
          : route.continue(),
      );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/portal/account", (route) =>
      route.fulfill({
        json: {
          account: portalAccountFixture,
          expiresAt: new Date(Date.now() + fixtureLifetime).toISOString(),
        },
      }),
    );
    await page.route("**/portal/order/command", (route) =>
      route.fulfill({
        json: {
          review: {
            ...orderReviewFixture(),
            expiresAt: new Date(Date.now() + fixtureLifetime).toISOString(),
          },
        },
      }),
    );
    await page.route("**/portal/payments/read", (route) =>
      route.fulfill({
        json: {
          ...paymentStatusFixture(),
          expiresAt: new Date(Date.now() + fixtureLifetime).toISOString(),
        },
      }),
    );
    await page.route("**/portal/payments/refund", (route) =>
      route.fulfill({
        json: {
          requestState: "not_requested",
          refunds: [],
          expiresAt: new Date(Date.now() + fixtureLifetime).toISOString(),
        },
      }),
    );
    await page.route("**/portal/support/command", (route) =>
      route.fulfill({
        json: {
          outcome: "view",
          routes: ["privacy", "complaint", "clinical"].map((purpose) => ({
            purpose,
            available: true,
          })),
          requests: [],
        },
      }),
    );
    await page.route("**/account/activate/instruments", (route) =>
      route.fulfill({
        json: {
          verifiedEmail: "accessibility@example.invalid",
          documents: ["pilot-account-terms", "pilot-privacy-notice"].map((instrumentId, index) => ({
            publicationId: `96000000-0000-4000-8000-00000000000${index + 4}`,
            instrumentId,
            version: "1.0",
            locale: "en-ZA",
            contentHash: (index ? "b" : "a").repeat(64),
            body: `Synthetic ${instrumentId} only.`,
            effectiveAt: "2026-10-02T00:00:00Z",
          })),
        },
      }),
    );
    await page.goto(path);
    if (path === "/account/sign-in" || path === "/account/recover")
      await expect(page.getByRole("button", { name: "Send code" })).toBeEnabled({
        timeout:
          process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic" ? 30000 : 5000,
      });
    if (path === "/account/activate")
      await page.getByRole("button", { name: "Continue to profile" }).click();
    if (path === "/portal/support")
      await page.getByRole("button", { name: "Refresh support availability and status" }).click();
    if (path === "/portal") {
      await page.getByRole("button", { name: "Refresh payment status" }).click();
      await page.getByRole("button", { name: "Check cancellation / refund request" }).click();
    }
    if (!["/", "/start", "/peptides"].includes(path))
      await expect(
        page.locator('main input:not([type="hidden"]), main select').first(),
      ).toBeVisible({
        // Headed assistive-technology review can hydrate more slowly than the CI browser.
        timeout:
          process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic" ? 30000 : 5000,
      });
    else await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic") {
      // An explicitly selected headed human review keeps the intercepted fixture available.
      // It is not an automated pass or hosted acceptance; record the review separately.
      test.info().annotations.push({
        type: "manual-review-only",
        description: "Human observation required; not automated or hosted acceptance",
      });
      await page.pause();
      return;
    }
    await checkKeyboardReachability(page);
    await checkClientFormPresentation(page);
    if (path === "/account/sign-in" || path === "/account/recover") {
      await page.getByLabel("Email address", { exact: true }).fill("accessibility@example.invalid");
      await page.getByRole("button", { name: "Send code" }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("Six-digit code")).toBeVisible();
      await checkKeyboardReachability(page);
      await checkClientFormPresentation(page);
    }
    expect(errors).toEqual([]);
  });
}
