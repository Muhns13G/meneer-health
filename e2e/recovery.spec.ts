import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { portalAccountFixture } from "../src/test/patient-portal-fixture";
import { isolateExternalFonts } from "./helpers";

test("unavailable portal recovers without retaining private information after revocation", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  let status = 503;
  await page.route("**/portal/account", (route) =>
    route.fulfill(
      status === 200
        ? {
            json: {
              account: portalAccountFixture,
              expiresAt: new Date(Date.now() + 60000).toISOString(),
            },
          }
        : { status, body: "" },
    ),
  );
  await page.route("**/account/session/renew", (route) => route.fulfill({ status: 204 }));
  await page.goto("/portal/profile");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("status")).toContainText("temporarily unavailable");
  await expect(page.getByRole("heading", { name: "Your minimum profile" })).toHaveCount(0);
  status = 200;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Your minimum profile" })).toBeVisible();
  status = 401;
  await page.getByRole("button", { name: "Refresh account and session" }).click();
  await expect(page.getByRole("status")).toContainText("Sign in with an active invited account");
  await expect(page.getByRole("heading", { name: "Your minimum profile" })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(page.url()).toBe("http://127.0.0.1:8085/portal/profile");
});

test("uncertain support request retries the same key and exposes no false acknowledgement", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  await page.route("**/portal/account", (route) =>
    route.fulfill({
      json: {
        account: portalAccountFixture,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    }),
  );
  const keys: string[] = [];
  await page.route("**/portal/support/command", (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "read") {
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
    }
    expect(Object.keys(body).sort()).toEqual(["action", "purpose", "requestKey", "urgent"]);
    expect(body.urgent).toBe(false);
    expect(route.request().headers()["idempotency-key"]).toBe(body.requestKey);
    keys.push(body.requestKey);
    return keys.length === 1
      ? route.fulfill({ status: 503, body: "" })
      : route.fulfill({
          json: { outcome: "received", reference: "c8000000-0000-4000-8000-000000000001" },
        });
  });
  await page.goto("/portal/support");
  await page.waitForLoadState("networkidle");
  const refresh = page.getByRole("button", { name: "Refresh support availability and status" });
  const submit = page.getByRole("button", { name: "Request secure follow-up" });
  const region = page.getByRole("region", { name: "Secure support requests" });
  await refresh.click();
  await submit.click();
  await expect(region.getByRole("status")).toContainText("do not assume it was received");
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("link", { name: "General support", exact: true })).toHaveAttribute(
    "href",
    "mailto:support@meneerhealth.co.za",
  );
  await refresh.click();
  await submit.click();
  await expect(region.getByRole("status")).toContainText("not human acknowledgement");
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  await page.getByRole("checkbox").check();
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("112, 10177");
  expect(keys).toHaveLength(2);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
