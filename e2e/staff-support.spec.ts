import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
const id = "f1400000-0000-4000-8000-000000000001";
test("staff review keeps receipt and delivery separate, re-reads and clears on denial", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let denied = false;
  await page.route("**/staff/session", (route) =>
    route.fulfill(
      denied
        ? { status: 401, body: "" }
        : {
            json: {
              role: "auditor",
              purpose: "privacy_review",
              expiresAt: new Date(Date.now() + 600000).toISOString(),
            },
          },
    ),
  );
  const commands: Record<string, string>[] = [];
  let reviewed = false;
  await page.route("**/staff/support/followup", (route) => {
    const command = route.request().postDataJSON();
    commands.push(command);
    if (command.action !== "read") {
      reviewed = true;
      expect(command).toEqual({
        action: "acknowledged",
        reference: id,
        requestKey: expect.any(String),
        reason: "review_started",
      });
      expect(route.request().headers()["idempotency-key"]).toBe(command.requestKey);
      return route.fulfill({ json: id });
    }
    return route.fulfill({
      json: {
        cases: [
          {
            reference: id,
            purpose: "privacy",
            state: "escalated",
            recordedAt: "2026-10-06T00:00:00Z",
            canRespond: false,
          },
        ],
        notifications: [
          {
            reference: id,
            template: "account-v1",
            state: "uncertain",
            reason: "TRANSPORT_UNCERTAIN",
            recordedAt: "2026-10-06T00:00:00Z",
            reviewState: reviewed ? "acknowledged" : "unreviewed",
            canResend: false,
          },
        ],
        coverage: [],
      },
    });
  });
  await page.goto("/staff/support");
  await expect(page.getByRole("heading", { name: "Support and delivery follow-up" })).toBeVisible();
  expect(commands).toHaveLength(0);
  await page.getByRole("button", { name: "Load support queues" }).click();
  await expect(page.getByText("Uncertain send; independent reconciliation required")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Queue confirmed non-acceptance retry" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Acknowledge support request" })).toHaveCount(0);
  const acknowledge = page.getByRole("button", { name: "Acknowledge delivery review" });
  await acknowledge.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Confirm secure follow-up completed" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("outcomes remain separate");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `/private/tmp/meneer-staff-support-${test.info().project.name}.png`,
    fullPage: true,
  });
  denied = true;
  await page.getByRole("button", { name: "Load support queues" }).click();
  await expect(page.getByRole("status")).toContainText("could not be confirmed");
  await expect(page.getByRole("heading", { name: "Notification follow-up" })).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(errors).toEqual([]);
});
test("anonymous staff follow-up is private and cannot send or acknowledge", async ({
  page,
  request,
}) => {
  await isolateExternalFonts(page);
  const response = await request.post("/staff/support/followup", {
    data: { action: "read" },
    headers: { origin: "http://127.0.0.1:8085" },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.text()).toBe("");
  await page.goto("/staff/support");
  await page.getByRole("button", { name: "Load support queues" }).click();
  await expect(page.getByRole("status")).toContainText("could not be confirmed");
  await expect(page.getByRole("button", { name: "Acknowledge delivery review" })).toHaveCount(0);
});
