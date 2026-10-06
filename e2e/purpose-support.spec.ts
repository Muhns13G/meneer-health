import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { portalAccountFixture } from "../src/test/patient-portal-fixture";
import { isolateExternalFonts } from "./helpers";

test("secure support separates receipt, emergency care and expired authority", async ({ page }) => {
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
  let expired = false;
  const requests: unknown[] = [];
  await page.route("**/portal/support/command", (route) => {
    if (expired) return route.fulfill({ status: 401, body: "" });
    const body = route.request().postDataJSON();
    requests.push(body);
    return route.fulfill({
      json:
        body.action === "read"
          ? {
              outcome: "view",
              routes: ["privacy", "complaint", "clinical"].map((purpose) => ({
                purpose,
                available: purpose !== "clinical",
              })),
              requests: [],
            }
          : { outcome: "received", reference: "c8000000-0000-4000-8000-000000000001" },
    });
  });
  await page.goto("/portal/support");
  const submit = page.getByRole("button", { name: "Request secure follow-up" });
  await expect(submit).toBeDisabled();
  await page.getByRole("button", { name: "Refresh support availability and status" }).click();
  await expect(submit).toBeEnabled();
  await page.getByRole("combobox", { name: "Support purpose" }).selectOption("clinical");
  await expect(submit).toBeDisabled();
  await expect(page.getByText(/This purpose route is not currently available/)).toBeVisible();
  await page.getByRole("combobox", { name: "Support purpose" }).selectOption("privacy");
  await page.getByRole("checkbox").check();
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("112, 10177");
  expect(requests).toHaveLength(1);
  await page.getByRole("checkbox").uncheck();
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("not human acknowledgement");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual({
    action: "request",
    purpose: "privacy",
    urgent: false,
    requestKey: expect.any(String),
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expired = true;
  await page.getByRole("button", { name: "Refresh support availability and status" }).click();
  await expect(page.getByRole("status")).toContainText("Sign in with an active invited account");
  await expect(submit).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(errors).toEqual([]);
});

test("anonymous support commands stay private and cannot record a request", async ({
  page,
  request,
}) => {
  await isolateExternalFonts(page);
  for (const path of ["/portal/support/command", "/staff/support/command"]) {
    const response = await request.post(path, {
      data: { action: "read" },
      headers: { origin: "http://127.0.0.1:8085" },
    });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.text()).toBe("");
  }
  await page.goto("/portal/support");
  await expect(page.getByRole("status")).toContainText("Sign in with an active invited account");
  await expect(page.getByRole("button", { name: "Request secure follow-up" })).toHaveCount(0);
});
