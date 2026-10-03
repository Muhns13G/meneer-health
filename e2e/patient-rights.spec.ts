import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { portalAccountFixture } from "../src/test/patient-portal-fixture";
import { isolateExternalFonts } from "./helpers";

test("rights shell and direct command deny an unauthenticated caller", async ({
  page,
  request,
}) => {
  await isolateExternalFonts(page);
  const response = await page.goto("/portal/rights");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page.getByRole("status")).toContainText("Sign in with an active invited account");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  expect(
    (
      await request.post("/portal/rights/command", { data: { action: "request", kind: "export" } })
    ).status(),
  ).toBe(401);
});
test("correction waits for durable success; requests acknowledge receipt only", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  await page.setViewportSize({ width: 320, height: 800 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let profile = portalAccountFixture.profile;
  let fail = true;
  const keys: string[] = [];
  await page.route("**/portal/account", (route) =>
    route.fulfill({
      json: {
        account: { ...portalAccountFixture, profile },
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    }),
  );
  await page.route("**/portal/rights/command", async (route) => {
    const body = route.request().postDataJSON();
    keys.push(body.requestKey);
    expect(Object.keys(body)).not.toContain("tenantId");
    expect(Object.keys(body)).not.toContain("notes");
    expect(route.request().headers()["idempotency-key"]).toBe(body.requestKey);
    if (fail) {
      await route.fulfill({ status: 503, body: "" });
      return;
    }
    if (body.action === "correct") profile = { ...profile, givenName: body.givenName, version: 2 };
    await route.fulfill({
      json: {
        reference: "98000000-0000-4000-8000-000000000011",
        outcome: body.action === "correct" ? "corrected" : "received",
        profileVersion: profile.version,
      },
    });
  });
  await page.goto("/portal/rights");
  await page.getByLabel("Given name", { exact: true }).fill("Corrected");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.getByRole("status")).toContainText("No completion was confirmed");
  fail = false;
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.getByLabel("Given name", { exact: true })).toHaveValue("Corrected");
  expect(keys[0]).toBe(keys[1]);
  await page.getByLabel("Request type").selectOption("export");
  await expect(page.getByRole("button", { name: "Record request" })).toBeDisabled();
  await page.getByLabel("I understand this records a request only.").check();
  await page.getByRole("button", { name: "Record request" }).click();
  await expect(page.getByRole("status")).toContainText("This confirms receipt only");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(
    await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage))),
  ).toEqual([]);
  expect(page.url()).not.toMatch(/Corrected|requestKey|export/);
  expect(errors).toEqual([]);
});
test("stale correction does not report success; returning after revocation clears fields", async ({
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
  await page.route("**/portal/rights/command", (route) => route.fulfill({ status: 409, body: "" }));
  await page.goto("/portal/rights");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.getByRole("status")).toContainText("Reload your account");
  allowed = false;
  await page.getByRole("button", { name: "Reload account" }).click();
  await expect(page.getByRole("status")).toContainText("Sign in with an active invited account");
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
