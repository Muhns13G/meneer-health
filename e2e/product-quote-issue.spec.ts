import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
import {
  productQuoteIssueFixture,
  quoteIssueFixtureId as id,
} from "../src/test/product-quote-issue-fixture";
import { orderReviewFixture } from "../src/test/order-review-fixture";
test("assigned staff issues one exact checked quote", async ({ page }) => {
  await isolateExternalFonts(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
  let issues = 0;
  await page.route("**/staff/products/issue", (r) => {
    const c = r.request().postDataJSON();
    if (c.action === "issue") {
      issues++;
      expect(c).toEqual({
        action: "issue",
        caseId: id,
        draftId: id,
        requestKey: r.request().headers()["idempotency-key"],
      });
    }
    return r.fulfill({
      json: {
        ...productQuoteIssueFixture(),
        ...(issues ? { status: "issued", offerId: id, canIssue: false } : {}),
      },
    });
  });
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/staff/queue/read")),
    page.goto("/staff/queue"),
  ]);
  await page.getByRole("button", { name: `View case ${id}` }).click();
  await page.getByText("Issue approved product quote", { exact: true }).click();
  const panel = page.getByRole("region", { name: "Issue product quote" });
  await panel.getByRole("button", { name: "Check / reconcile quote issue" }).click();
  await expect(panel.getByRole("button", { name: "Issue this exact quote" })).toBeEnabled();
  await panel.getByRole("button", { name: "Issue this exact quote" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toContainText("Quote issued for exact client review");
  expect(issues).toBe(1);
  expect(
    (await new AxeBuilder({ page }).include('section[aria-label="Issue product quote"]').analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await panel.screenshot({ path: `/tmp/meneer-quote-issue-${test.info().project.name}.png` });
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(panel.getByText(/Draft version/)).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(page.url()).not.toContain(id);
});
test("confirmed deposit does not hide the new product quote; acceptance then decline is explicit", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  let accepted = false,
    declined = false;
  const product = {
    ...orderReviewFixture(),
    scenario: "approved_product_order",
    productProvenance: "local-synthetic",
    quoteCurrent: true,
    offerId: id,
    lines: [
      {
        description: "Synthetic item",
        quantity: 2,
        unitAmountMinor: 150000,
        priceVersion: "synthetic-v1",
        taxTreatment: "vat-inclusive-planning",
      },
    ],
    productSubtotalMinor: 300000,
    deliveryMinor: 10000,
    creditMinor: 99900,
    amountTotalMinor: 210100,
    unusedDepositRefundMinor: 0,
    deliveryVersion: "synthetic-v1",
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  };
  await page.route("**/portal/order/command", (r) => {
    const c = r.request().postDataJSON();
    if (c.action === "accept") {
      expect(c.offerId).toBe(id);
      expect(c.accepted).toBe(true);
      expect(c.snapshotHash).toBe(product.snapshotHash);
      accepted = true;
    }
    if (c.action === "decline") {
      expect(c).toEqual({
        action: "decline",
        offerId: id,
        snapshotHash: product.snapshotHash,
        requestKey: r.request().headers()["idempotency-key"],
      });
      declined = true;
    }
    return r.fulfill({
      json: declined
        ? { review: null, quoteOutcome: "declined" }
        : {
            review: {
              ...product,
              acceptance: accepted ? { receiptId: id, recordedAt: new Date().toISOString() } : null,
              checkoutEnabled: accepted,
            },
          },
    });
  });
  await page.route("**/portal/payments/read", (r) =>
    r.fulfill({
      json: {
        payments: [
          {
            reference: "15600000-0000-4000-8000-000000000009",
            scenario: "review_deposit",
            currency: "zar",
            amountTotalMinor: 99900,
            refundedMinor: 0,
            status: "confirmed",
            dispute: false,
            requiresReview: false,
            createdAt: "2026-10-10T01:00:00Z",
          },
        ],
        nextCursor: null,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      },
    }),
  );
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/portal/order/command")),
    page.goto("/portal/order"),
  ]);
  await expect(page.getByText("Approved product order", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment confirmed — thank you" })).toHaveCount(0);
  const consent = page.getByRole("checkbox");
  await expect(consent).not.toBeChecked();
  await consent.check();
  await page.getByRole("button", { name: "Accept this order" }).click();
  await expect(page.getByRole("button", { name: "Continue to secure Checkout" })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include('section[aria-label="Order details"]').analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Decline this product quote" }).click();
  await expect(page.getByRole("status").first()).toContainText("Product quote declined");
  expect(accepted && declined).toBe(true);
  expect(page.url()).not.toContain(id);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
test("product issue stays disabled for anonymous requests", async ({ request }) => {
  const r = await request.post("/staff/products/issue", {
    headers: { origin: "http://127.0.0.1:8085", "Idempotency-Key": id },
    data: { action: "read", caseId: id },
  });
  expect(r.status()).toBe(412);
  expect(r.headers()["cache-control"]).toContain("no-store");
});
