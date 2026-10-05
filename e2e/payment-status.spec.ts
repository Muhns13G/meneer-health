import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { portalAccountFixture } from "../src/test/patient-portal-fixture";
import { paymentStatusFixture } from "../src/test/payment-status-fixture";
import { isolateExternalFonts } from "./helpers";

test("own payment facts remain independent and clear when the account is denied", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/portal/account", (route) =>
    route.fulfill({
      json: {
        account: portalAccountFixture,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    }),
  );
  await page.route("**/account/session/renew", (route) => route.fulfill({ status: 401, body: "" }));
  await page.route("**/portal/payments/read", (route) => {
    expect(route.request().postDataJSON()).toEqual({ cursor: null });
    const fixture = paymentStatusFixture();
    fixture.payments[0]!.refundedMinor = 20000;
    fixture.payments[0]!.dispute = true;
    fixture.payments[0]!.requiresReview = true;
    return route.fulfill({ json: fixture });
  });
  await page.goto("/portal");
  const panel = page.getByRole("region", { name: "Payment status" });
  await panel.getByRole("button", { name: "Refresh payment status" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByText(/— Payment confirmed/)).toBeVisible();
  await expect(panel.getByText(/Refund evidence received/)).toBeVisible();
  await expect(panel.getByText(/staff review required/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("payment-status.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Refresh account and session" }).click();
  await expect(panel).toHaveCount(0);
  expect(page.url()).toBe("http://127.0.0.1:8085/portal");
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(errors).toEqual([]);
});

test("staff financial read stays assigned-case scoped and removes denied facts", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  const id = "a3000000-0000-4000-8000-000000000010";
  const row = {
    caseId: id,
    state: "onboarding_pending",
    version: 1,
    assignedOwner: id,
    createdAt: "2026-10-03T12:00:00Z",
    updatedAt: "2026-10-03T12:00:00Z",
    profileActive: true,
    emailVerified: true,
    exceptionCode: null,
    handoffReadiness: "not_evaluated",
    paymentReadiness: "not_evaluated",
  };
  await page.route("**/staff/queue/read", (route) =>
    route.fulfill({ json: { cases: [row], nextCursor: null } }),
  );
  await page.route("**/staff/queue/detail", (route) =>
    route.fulfill({
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
  let reads = 0;
  await page.route("**/staff/payments/read", (route) => {
    expect(route.request().postDataJSON()).toEqual({ cursor: null, caseId: id });
    return ++reads === 1
      ? route.fulfill({ json: paymentStatusFixture() })
      : route.fulfill({ status: 403, body: "" });
  });
  await page.goto("/staff/queue");
  await page.getByRole("button", { name: `View case ${id}` }).click();
  const panel = page.getByRole("region", { name: "Payment status" });
  await panel.getByRole("button", { name: "Refresh payment status" }).click();
  await expect(panel.getByText(/— Payment confirmed/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await panel.getByRole("button", { name: "Refresh payment status" }).click();
  await expect(panel.getByText(/status is unavailable/)).toBeVisible();
  await expect(panel.getByText(/— Payment confirmed/)).toHaveCount(0);
  expect(page.url()).not.toContain(id);
});
