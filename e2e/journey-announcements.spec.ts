import { expect, test, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { isolateExternalFonts } from "./helpers";
import { portalAccountFixture } from "../src/test/patient-portal-fixture";
import { paymentStatusFixture } from "../src/test/payment-status-fixture";
import { orderReviewFixture } from "../src/test/order-review-fixture";

// Hold only intercepted synthetic responses so pending states are observable without sleeps.
function responseGate() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => (release = resolve));
  return { wait, release };
}

test.beforeEach(async ({ page }) => {
  await isolateExternalFonts(page);
  await page.route("http://127.0.0.1:8085/**", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, body: "" })
      : route.continue(),
  );
  await page.route("**/portal/account", (route) =>
    route.fulfill({
      json: {
        account: portalAccountFixture,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      },
    }),
  );
});

for (const mode of ["sign-in", "recover"] as const) {
  test(`${mode} announces pending, moves step focus and reports failure/retry completion`, async ({
    page,
  }) => {
    let gate = responseGate();
    let codeAttempts = 0;
    await page.route(`**/account/${mode}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const action = new URLSearchParams(route.request().postData()!).get("action");
      await gate.wait;
      return route.fulfill({
        status: action === "request" ? 202 : ++codeAttempts === 1 ? 400 : 204,
        body: "",
      });
    });
    await page.goto(`/account/${mode}`);
    const status = page.getByRole("status");
    await expect(status).toBeAttached();
    await expect(page.getByRole("button", { name: "Send code" })).toBeEnabled({ timeout: 30000 });
    await page.getByLabel("Email address").fill("journey@example.invalid");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(status).toHaveText("Checking…");
    await expect(status).not.toBeFocused();
    gate.release();
    const code = page.getByLabel("Six-digit code");
    await expect(code).toBeFocused();
    await expect(page.locator("[data-sonner-toast]")).toContainText(
      "If an eligible account exists",
    );
    if (mode === "sign-in") {
      await page
        .locator("[data-sonner-toast]")
        .screenshot({ path: test.info().outputPath("action-toast.png") });
    }
    expect(
      (await new AxeBuilder({ page }).include("[data-sonner-toaster]").analyze()).violations,
    ).toEqual([]);
    await expect(code).toHaveValue("");
    await code.fill("123456");
    gate = responseGate();
    const submit = page.getByRole("button", {
      name: mode === "recover" ? "Complete recovery" : "Verify and sign in",
    });
    await submit.click();
    await expect(status).toHaveText("Checking…");
    await expect(page.locator("[data-sonner-toast][data-removed=false]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Use another email address" })).toBeDisabled();
    gate.release();
    await expect(status).toContainText("We could not verify those details");
    await expect(status).toBeFocused();
    gate = responseGate();
    await submit.click();
    await expect(status).toHaveText("Checking…");
    gate.release();
    await expect(status).toContainText(
      mode === "recover" ? "Recovery is complete" : "You are signed in",
    );
    await expect(status).toBeFocused();
    await expect(code).toHaveCount(0);
    expect(new URL(page.url()).search).toBe("");
  });
}

for (const mode of ["verify", "sign-out"] as const) {
  test(`${mode} has persistent pending and focused failure/success results`, async ({ page }) => {
    let gate = responseGate();
    let attempts = 0;
    await page.route(`**/account/${mode}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await gate.wait;
      return route.fulfill({ status: ++attempts === 1 ? 503 : 204, body: "" });
    });
    await page.goto(`/account/${mode}`);
    if (mode === "verify") {
      await page.getByLabel("Email address").fill("journey@example.invalid");
      await page.getByLabel("Six-digit code").fill("123456");
    }
    const status = page.getByRole("status");
    const submit = page.getByRole("button", {
      name: mode === "verify" ? "Verify code" : "Sign out",
      exact: true,
    });
    await submit.click();
    await expect(status).toHaveText(mode === "verify" ? "Checking…" : "Signing out…");
    gate.release();
    await expect(status).toBeFocused();
    await expect(status).toContainText(
      mode === "verify" ? "temporarily unavailable" : "could not be confirmed",
    );
    gate = responseGate();
    await submit.click();
    await expect(status).toContainText(mode === "verify" ? "Checking…" : "Signing out…");
    gate.release();
    await expect(status).toContainText(
      mode === "verify" ? "Your code was verified" : "You have signed out",
    );
    await expect(status).toBeFocused();
  });
}

test("order pending, failed acknowledgement and retry results never imply payment", async ({
  page,
}) => {
  const review = orderReviewFixture();
  let gate = responseGate();
  const keys: string[] = [];
  await page.route("**/portal/order/command", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "read") return route.fulfill({ json: { review } });
    keys.push(body.requestKey);
    await gate.wait;
    return keys.length === 1
      ? route.fulfill({ status: 503, body: "" })
      : route.fulfill({
          json: {
            review: {
              ...review,
              acceptance: { receiptId: review.offerId, recordedAt: new Date().toISOString() },
            },
          },
        });
  });
  const loaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/portal/order/command") &&
      response.request().postDataJSON().action === "read",
  );
  await page.goto("/portal/order");
  await loaded;
  const status = page.locator("#order-feedback");
  await expect(status).toBeFocused();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept this order" }).click();
  await expect(status).toHaveText("Checking…");
  gate.release();
  await expect(status).toContainText("not available");
  await expect(status).toBeFocused();
  await page.getByRole("button", { name: "Reload order" }).click();
  await expect(page.getByRole("checkbox")).toBeVisible();
  gate = responseGate();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept this order" }).click();
  await expect(status).toHaveText("Checking…");
  gate.release();
  await expect(status).toContainText("Payment is not confirmed here");
  await expect(status).toBeFocused();
  // Reloading the authoritative offer starts a fresh acknowledgement attempt.
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe(keys[1]);
});

test("payment and refund pending/failure/retry results preserve focus and receipt boundaries", async ({
  page,
}) => {
  let paymentGate = responseGate();
  let refundGate = responseGate();
  let payments = 0;
  let refunds = 0;
  let initialRead = true;
  await page.route("**/portal/payments/read", async (route: Route) => {
    if (initialRead) {
      return route.fulfill({ json: { ...paymentStatusFixture(), payments: [] } });
    }
    await paymentGate.wait;
    return ++payments === 1
      ? route.fulfill({ status: 503, body: "" })
      : route.fulfill({ json: paymentStatusFixture() });
  });
  await page.route("**/portal/payments/refund", async (route) => {
    await refundGate.wait;
    return ++refunds === 1
      ? route.fulfill({ status: 503, body: "" })
      : route.fulfill({
          json: {
            requestState: "not_requested",
            refunds: [],
            expiresAt: new Date(Date.now() + 60000).toISOString(),
          },
        });
  });
  await page.goto("/portal");
  await expect(page.getByRole("button", { name: "Refresh payment status" })).toBeEnabled({
    timeout: 30000,
  });
  initialRead = false;
  const panel = page.getByRole("region", { name: "Payment status" });
  const paymentStatus = panel.getByRole("status").first();
  await page.getByRole("button", { name: "Refresh payment status" }).click();
  await expect(paymentStatus).toHaveText("Checking payment evidence…");
  paymentGate.release();
  await expect(paymentStatus).toContainText("unavailable");
  await expect(paymentStatus).toBeFocused();
  paymentGate = responseGate();
  await page.getByRole("button", { name: "Refresh payment status" }).click();
  await expect(paymentStatus).toHaveText("Checking payment evidence…");
  paymentGate.release();
  await expect(page.locator("[data-sonner-toast]")).toContainText("Payment status refreshed.");
  await expect(page.getByRole("button", { name: "Refresh payment status" })).toBeFocused();
  const refundStatus = panel.getByRole("status").nth(1);
  await page.getByRole("button", { name: "Check cancellation / refund request" }).click();
  await expect(refundStatus).toHaveText("Checking refund request…");
  refundGate.release();
  await expect(refundStatus).toContainText("unavailable");
  await expect(refundStatus).toBeFocused();
  refundGate = responseGate();
  await page.getByRole("button", { name: "Check cancellation / refund request" }).click();
  await expect(refundStatus).toHaveText("Checking refund request…");
  refundGate.release();
  await expect(refundStatus).toContainText("does not confirm a refund");
  await expect(refundStatus).toBeFocused();
});

test("rights request pending failure and same-key retry announce receipt only", async ({
  page,
}) => {
  let gate = responseGate();
  const keys: string[] = [];
  await page.route("**/portal/rights/command", async (route) => {
    keys.push(route.request().postDataJSON().requestKey);
    await gate.wait;
    return keys.length === 1
      ? route.fulfill({ status: 503, body: "" })
      : route.fulfill({
          json: {
            reference: "98000000-0000-4000-8000-000000000011",
            outcome: "received",
            profileVersion: portalAccountFixture.profile.version,
          },
        });
  });
  await page.goto("/portal/rights");
  await page.getByLabel("I understand this records a request only.").check();
  const submit = page.getByRole("button", { name: "Record request" });
  const status = page.getByRole("status");
  await submit.click();
  await expect(status).toHaveText("Checking…");
  gate.release();
  await expect(status).toContainText("No completion was confirmed");
  await expect(status).toBeFocused();
  gate = responseGate();
  await submit.click();
  await expect(status).toHaveText("Checking…");
  gate.release();
  await expect(status).toContainText("This confirms receipt only");
  await expect(status).toBeFocused();
  expect(keys[0]).toBe(keys[1]);
});

test("support pending failure and receipt focus preserve uncertain retry and emergency denial", async ({
  page,
}) => {
  let gate = responseGate();
  const keys: string[] = [];
  await page.route("**/portal/support/command", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "read")
      return route.fulfill({
        json: {
          outcome: "view",
          routes: ["privacy", "complaint", "clinical"].map((purpose) => ({
            purpose,
            available: purpose === "privacy",
          })),
          requests: [],
        },
      });
    keys.push(body.requestKey);
    await gate.wait;
    return keys.length === 1
      ? route.fulfill({ status: 503, body: "" })
      : route.fulfill({
          json: { outcome: "received", reference: "c8000000-0000-4000-8000-000000000001" },
        });
  });
  await page.goto("/portal/support");
  const refresh = page.getByRole("button", { name: "Refresh support availability and status" });
  const submit = page.getByRole("button", { name: "Request secure follow-up" });
  const status = page.getByRole("region", { name: "Secure support requests" }).getByRole("status");
  await refresh.click();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(status).toHaveText("Checking…");
  gate.release();
  await expect(status).toContainText("do not assume it was received");
  await expect(status).toBeFocused();
  await refresh.click();
  await expect(submit).toBeEnabled();
  gate = responseGate();
  await submit.click();
  await expect(status).toHaveText("Checking…");
  gate.release();
  await expect(status).toContainText("not human acknowledgement");
  await expect(status).toBeFocused();
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("alert")).toContainText("112, 10177");
  await expect(submit).toBeDisabled();
  expect(keys[0]).toBe(keys[1]);
  expect(keys).toHaveLength(2);
});
