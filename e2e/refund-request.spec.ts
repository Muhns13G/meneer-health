import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { portalAccountFixture } from "../src/test/patient-portal-fixture";
import { paymentStatusFixture } from "../src/test/payment-status-fixture";
import { isolateExternalFonts } from "./helpers";

test("client request is explicit, private and distinct from confirmed cancellation/refund", async ({
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
  await page.route("**/portal/payments/read", (route) =>
    route.fulfill({ json: paymentStatusFixture() }),
  );
  await page.route("**/portal/payments/refund", (route) => {
    const body = route.request().postDataJSON();
    expect(Object.keys(body).sort()).toEqual(
      body.action === "request" ? ["action", "offerId", "requestKey"] : ["action", "offerId"],
    );
    expect(body.offerId).toBe(paymentStatusFixture().payments[0]!.reference);
    return route.fulfill({
      json: {
        requestState: body.action === "request" ? "requested" : "not_requested",
        refunds: [],
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
  });
  await page.goto("/portal");
  await page.getByRole("button", { name: "Refresh payment status" }).click();
  await page.getByRole("button", { name: "Check cancellation / refund request" }).click();
  const submit = page.getByRole("button", { name: "Submit cancellation / refund request" });
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox").focus();
  await page.keyboard.press("Space");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Request: requested", { exact: true })).toBeVisible();
  await expect(page.getByText(/A request or submission does not confirm a refund/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("refund-request.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("assigned staff reviews coded evidence and submits a sandbox refund without false completion", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  const id = "a3000000-0000-4000-8000-000000000010";
  const reference = paymentStatusFixture().payments[0]!.reference;
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
  await page.route("**/staff/payments/read", (route) =>
    route.fulfill({ json: paymentStatusFixture() }),
  );
  await page.route("**/staff/payments/refund", (route) => {
    const body = route.request().postDataJSON();
    expect(body.offerId).toBe(reference);
    expect(body).not.toHaveProperty("amountMinor");
    expect(body).not.toHaveProperty("tenantId");
    if (body.action === "review") expect(body.reason).toBe("no_review");
    return route.fulfill({
      json: {
        requestState: "queued",
        refunds:
          body.action === "read"
            ? []
            : [
                {
                  reference,
                  amountMinor: 99900,
                  state:
                    body.action === "reconcile"
                      ? "confirmed"
                      : body.action === "dispatch"
                        ? "submitted"
                        : "queued",
                },
              ],
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
  });
  await page.goto("/staff/queue");
  await page.getByRole("button", { name: `View case ${id}` }).click();
  await page.getByRole("button", { name: "Refresh payment status" }).click();
  await page.getByRole("button", { name: "Check cancellation / refund request" }).click();
  await page.getByLabel("Verified evidence reference").fill(reference);
  await page.getByRole("button", { name: "Review verified disposition" }).click();
  await page.getByRole("button", { name: "Submit original-method sandbox refund" }).click();
  await expect(page.getByText("R999.00 — refund submitted")).toBeVisible();
  await page.getByRole("button", { name: "Reconcile verified payment evidence" }).click();
  await expect(page.getByText("R999.00 — refund confirmed")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Queue retry after verified failure" }),
  ).toHaveCount(0);
  await expect(page.getByText(/does not confirm a refund/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("staff-refund.png"), fullPage: true });
});
