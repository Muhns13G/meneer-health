import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { portalAccountFixture } from "../src/test/patient-portal-fixture";
import { isolateExternalFonts } from "./helpers";

test("private intake is unavailable anonymously and does not imply provider receipt", async ({
  page,
  request,
}) => {
  await isolateExternalFonts(page);
  expect(
    (
      await request.post("/portal/handoff/open", {
        form: { requestKey: "b6000000-0000-4000-8000-000000000011" },
        headers: { origin: "http://127.0.0.1:8085" },
      })
    ).status(),
  ).toBe(401);
  await page.route("**/portal/account", (route) =>
    route.fulfill({
      json: {
        account: portalAccountFixture,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    }),
  );
  let body = "";
  await page.route("**/portal/handoff/open", (route) => {
    body = route.request().postData() ?? "";
    return route.fulfill({ status: 412, body: "" });
  });
  await page.goto("/portal");
  await page.getByRole("button", { name: "Continue to private intake" }).click();
  await expect(page.getByText("Your hand-off is not ready yet.", { exact: false })).toBeVisible();
  expect([...new URLSearchParams(body).keys()]).toEqual(["requestKey"]);
  expect(page.url()).toBe("http://127.0.0.1:8085/portal");
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("portal shells deny data without a session and preserve private response policies", async ({
  page,
  request,
}) => {
  await isolateExternalFonts(page);
  for (const path of ["/portal", "/portal/profile"]) {
    const response = await page.goto(path);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("status")).toContainText("Sign in with an active invited account", {
      timeout: 15000,
    });
    await expect(page.getByText("portal@example.invalid")).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  const read = await request.get("/portal/account");
  expect(read.status()).toBe(401);
  expect(await read.text()).toBe("");
  expect((await request.get("/portal/account?subject=forged")).status()).toBe(405);
});
test("own account documents and literal operational states are accessible without clinical/payment inference", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const account = {
    ...portalAccountFixture,
    workflows: [
      {
        reference: "97000000-0000-4000-8000-000000000007",
        dispatchState: "not_ready",
        deliveryState: "not_started",
        cancellationState: "active",
        updatedAt: "2026-10-03T00:00:00Z",
      },
    ],
  };
  await page.route("**/portal/account", (route) =>
    route.fulfill({ json: { account, expiresAt: new Date(Date.now() + 60000).toISOString() } }),
  );
  await page.goto("/portal");
  await expect(page.getByRole("heading", { name: "Your Meneer account" })).toBeFocused();
  await expect(page.getByText("Accepted", { exact: false })).toBeVisible();
  await expect(page.getByText("Acknowledged", { exact: false })).toBeVisible();
  await expect(page.getByText("Not ready", { exact: true })).toBeVisible();
  await page.getByText("Read this exact version", { exact: true }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Synthetic account terms only.", { exact: true })).toBeVisible();
  const saved = page.waitForEvent("download");
  await page.getByRole("link", { name: "Save this exact version" }).first().click();
  const download = await saved;
  expect(readFileSync((await download.path())!, "utf8")).toBe(
    portalAccountFixture.instruments[0].body,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: "View profile" }).click();
  await expect(page.getByText("portal@example.invalid", { exact: true })).toBeVisible();
  await expect(page.getByText("Not verified", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage))),
  ).toEqual([]);
  expect(page.url()).toBe("http://127.0.0.1:8085/portal/profile");
  expect(errors).toEqual([]);
});
test("failure, expiry and renewed-session denial remove the old projection", async ({ page }) => {
  await isolateExternalFonts(page);
  await page.clock.install();
  let available = false;
  await page.route("**/portal/account", (route) =>
    available
      ? route.fulfill({
          json: {
            account: portalAccountFixture,
            expiresAt: new Date(Date.now() + 1500).toISOString(),
          },
        })
      : route.fulfill({ status: 503, body: "" }),
  );
  await page.route("**/account/session/renew", (route) => route.fulfill({ status: 401, body: "" }));
  await page.goto("/portal/profile");
  await expect(page.getByRole("status")).toContainText("temporarily unavailable");
  await expect(page.getByText("portal@example.invalid")).toHaveCount(0);
  available = true;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("portal@example.invalid", { exact: true })).toBeVisible();
  await page.clock.fastForward(2000);
  await expect(page.getByRole("status")).toContainText("information has been hidden");
  await expect(page.getByText("portal@example.invalid")).toHaveCount(0);
  await page.getByRole("button", { name: "Check session" }).click();
  await expect(page.getByRole("status")).toContainText("Sign in with an active invited account");
});
test("successful sign-in links to the portal, never an arbitrary return URL", async ({ page }) => {
  await isolateExternalFonts(page);
  await page.route("**/account/sign-in", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: route.request().postData()?.includes("action=request") ? 202 : 204,
          body: "",
        })
      : route.continue(),
  );
  await page.goto("/account/sign-in");
  await expect(page.locator("form")).toHaveAttribute("method", "post");
  await page.getByLabel("Email address").fill("portal@example.invalid");
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Six-digit code").fill("123456");
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page.getByRole("link", { name: "Open your private account" })).toHaveAttribute(
    "href",
    "/portal",
  );
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("pre-hydration sign-in cannot submit a contact into a GET URL", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await isolateExternalFonts(page);
    await page.goto(`${baseURL}/account/sign-in`);
    await expect(page.locator("form")).toHaveAttribute("method", "post");
    await expect(page.getByRole("button", { name: "Send code" })).toBeDisabled();
  } finally {
    await context.close();
  }
});

test("returning to a hidden portal rechecks authority and discards its previous data", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  let allowed = true;
  await page.route("**/portal/account", (route) =>
    allowed
      ? route.fulfill({
          json: {
            account: portalAccountFixture,
            expiresAt: new Date(Date.now() + 60000).toISOString(),
          },
        })
      : route.fulfill({ status: 401, body: "" }),
  );
  await page.goto("/portal/profile");
  await expect(page.getByText("portal@example.invalid", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText("portal@example.invalid")).toHaveCount(0);
  allowed = false;
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("status")).toContainText("Sign in with an active invited account");
  await expect(page.getByText("portal@example.invalid")).toHaveCount(0);
});
