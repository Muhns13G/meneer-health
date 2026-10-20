import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
import { checkClientFormPresentation, checkKeyboardReachability } from "./client-form-checks";
import { orderReviewFixture } from "../src/test/order-review-fixture";
import {
  productFulfilmentFixture,
  fulfilmentFixtureId as id,
} from "../src/test/product-fulfilment-fixture";
test("assigned staff records an attested custody event, not an automatic provider action", async ({
  page,
}) => {
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
  let records = 0;
  await page.route("**/staff/products/fulfilment", (r) => {
    const c = r.request().postDataJSON();
    if (c.action === "record") {
      records++;
      expect(c).toEqual({
        action: "record",
        caseId: id,
        offerId: id,
        expectedVersion: 0,
        event: "provider_ordered",
        evidenceReference: id,
        requestKey: r.request().headers()["idempotency-key"],
      });
    }
    return r.fulfill({
      json: {
        ...productFulfilmentFixture(),
        ...(records
          ? { version: 1, stage: "provider_ordered", nextEvent: "pharmacy_released" }
          : {}),
      },
    });
  });
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/staff/queue/read")),
    page.goto("/staff/queue"),
  ]);
  await page.getByRole("button", { name: `View case ${id}` }).click();
  const storageBefore = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage).filter(
      ([key]) => key !== "tsr-scroll-restoration-v1_3",
    ),
  }));
  await page.getByText("Manual product fulfilment", { exact: true }).first().click();
  const panel = page.getByRole("region", { name: "Product fulfilment" });
  await panel.getByRole("button", { name: "Check fulfilment progress" }).click();
  await expect(panel.getByRole("button", { name: "Record provider ordered" })).toBeDisabled();
  await panel.getByLabel("Private evidence reference").fill(id);
  await panel.getByRole("checkbox").check();
  await panel.getByRole("button", { name: "Record provider ordered" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toContainText("Evidence recorded");
  expect(records).toBe(1);
  await expect(panel.getByRole("checkbox")).not.toBeChecked();
  await expect(panel.getByText(/Wait for the pharmacy's actual release evidence/)).toBeVisible();
  await expect(panel.getByRole("link", { name: "Open assigned support work" })).toHaveAttribute(
    "href",
    "/staff/support",
  );
  if (process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic") {
    if (process.env.CI || new URL(page.url()).origin !== "http://127.0.0.1:8085")
      throw new Error("Manual fulfilment review is local-only.");
    await page.pause();
  }
  expect(
    (await new AxeBuilder({ page }).include('section[aria-label="Product fulfilment"]').analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await panel.screenshot({ path: `/tmp/meneer-fulfilment-${test.info().project.name}.png` });
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(panel.getByText(/Record version/)).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(page.url()).not.toContain(id);
  const storageAfter = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }));
  // TanStack records navigation scroll positions, not private fulfilment state.
  for (const [key, value] of storageAfter.session) {
    if (key !== "tsr-scroll-restoration-v1_3") continue;
    for (const position of Object.values(JSON.parse(value)) as Record<string, unknown>[]) {
      expect(Object.keys(position)).toEqual(["window"]);
      expect(position.window).toEqual({ scrollX: expect.any(Number), scrollY: expect.any(Number) });
    }
  }
  expect({
    local: storageAfter.local,
    session: storageAfter.session.filter(([key]) => key !== "tsr-scroll-restoration-v1_3"),
  }).toEqual(storageBefore);
  expect(JSON.stringify(storageAfter)).not.toContain(id);
  expect(JSON.stringify(storageAfter)).not.toContain("provider_ordered");
  expect(JSON.stringify(storageAfter)).not.toContain("Synthetic workspace");
});
test("client receives only coarse own-order progress", async ({ page }) => {
  test.setTimeout(90_000);
  await isolateExternalFonts(page);
  await page.route("**/portal/order/command", (r) =>
    r.fulfill({
      json: {
        review: {
          ...orderReviewFixture(),
          scenario: "approved_product_order",
          productProvenance: "local-synthetic",
          quoteCurrent: true,
          offerId: id,
          productSubtotalMinor: 150000,
          deliveryMinor: 10000,
          deliveryVersion: "synthetic-delivery-v1",
          creditMinor: 99900,
          amountTotalMinor: 60100,
          lines: [
            {
              description: "Synthetic product",
              quantity: 1,
              unitAmountMinor: 150000,
              priceVersion: "synthetic-v1",
              taxTreatment: "vat-inclusive-planning",
            },
          ],
        },
      },
    }),
  );
  await page.route("**/portal/payments/read", (r) =>
    r.fulfill({
      json: {
        payments: [],
        nextCursor: null,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      },
    }),
  );
  await page.route("**/portal/order/fulfilment", (r) => {
    expect(r.request().postDataJSON()).toEqual({});
    return r.fulfill({
      json: { progress: "dispatched", expiresAt: new Date(Date.now() + 300000).toISOString() },
    });
  });
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/portal/order/command")),
    page.goto("/portal/order"),
  ]);
  const panel = page.getByRole("region", { name: "Product fulfilment" });
  await panel.getByRole("button", { name: "Check fulfilment progress" }).click();
  await expect(panel.getByText("Progress: dispatched.")).toBeVisible();
  await expect(panel.getByText(/Your order is with the courier/)).toBeVisible();
  await expect(panel.getByRole("link", { name: "Get secure order help" })).toHaveAttribute(
    "href",
    "/portal/support",
  );
  await expect(panel.getByLabel("Private evidence reference")).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).include('section[aria-label="Product fulfilment"]').analyze())
      .violations,
  ).toEqual([]);
  await checkClientFormPresentation(page);
  await checkKeyboardReachability(page);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(panel.getByText("Progress: dispatched.")).toHaveCount(0);
  await expect(panel.getByText(/Next step:/)).toHaveCount(0);
});
test("native fulfilment endpoints remain disabled without a release", async ({ request }) => {
  for (const path of ["/staff/products/fulfilment", "/portal/order/fulfilment"]) {
    const r = await request.post(path, {
      headers: { origin: "http://127.0.0.1:8085", "Idempotency-Key": id },
      data: path.startsWith("/staff") ? { action: "read", caseId: id } : {},
    });
    expect(r.status()).toBe(412);
    expect(r.headers()["cache-control"]).toContain("no-store");
  }
});
