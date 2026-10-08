import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
const id = "a1430000-0000-4000-8000-000000000001";
const row = {
  id,
  version: 1,
  status: "draft",
  expiresAt: null,
  givenName: "Synthetic",
  familyName: "Participant",
  maskedPhone: "***01",
  reviewed: false,
  sendReserved: false,
};
test("staff invitation review is version-bound, masked and accessible", async ({ page }) => {
  await isolateExternalFonts(page);
  let reviewed = false;
  await page.route("**/staff/mobile-invitations/read", (route) =>
    route.fulfill({
      headers: { "X-Session-Expires-At": new Date(Date.now() + 600_000).toISOString() },
      json: {
        invitations: [{ ...row, reviewed }],
        nextId: null,
        reservationEnabled: false,
        sendingEnabled: false,
      },
    }),
  );
  await page.route("**/staff/mobile-invitations/command", async (route) => {
    const fields = Object.fromEntries(new URLSearchParams(route.request().postData() ?? ""));
    expect(fields).toEqual({
      action: "review",
      invitationId: id,
      expectedVersion: "1",
      requestKey: expect.stringMatching(/^[a-f0-9-]{36}$/),
    });
    reviewed = true;
    await route.fulfill({
      json: { invitationId: id, version: 1, status: "draft", action: "review", smsSent: false },
    });
  });
  const initialRead = page.waitForResponse(
    (response) =>
      response.url().endsWith("/staff/mobile-invitations/read") && response.status() === 200,
  );
  await page.goto("/staff/mobile-invitations");
  await initialRead;
  const review = page.getByRole("button", { name: "Review invitation for Synthetic" });
  await expect(review).toBeDisabled();
  await page.getByRole("checkbox").check();
  await review.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("No SMS was sent");
  await expect(page.getByText(/Phone \*\*\*01/)).toBeVisible();
  expect(page.url()).not.toContain(id);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
for (const status of [409, 429, 403])
  test(`staff invitation denial ${status} clears private records without retry`, async ({
    page,
  }) => {
    await isolateExternalFonts(page);
    let commands = 0;
    await page.route("**/staff/mobile-invitations/read", (route) =>
      route.fulfill({
        headers: { "X-Session-Expires-At": new Date(Date.now() + 600_000).toISOString() },
        json: {
          invitations: [row],
          nextId: null,
          reservationEnabled: false,
          sendingEnabled: false,
        },
      }),
    );
    await page.route("**/staff/mobile-invitations/command", (route) => {
      commands++;
      return route.fulfill({ status, body: "" });
    });
    await page.goto("/staff/mobile-invitations");
    await page.getByRole("button", { name: "Revoke invitation for Synthetic" }).click();
    await expect(page.getByText("Synthetic Participant")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Refresh invitation register" })).toBeEnabled();
    expect(commands).toBe(1);
  });
test("anonymous staff invitation endpoints remain private", async ({ request }) => {
  for (const path of ["read", "command"]) {
    const response = await request.post(`/staff/mobile-invitations/${path}`, {
      headers: { origin: "http://127.0.0.1:8085" },
      form: { afterId: "" },
    });
    expect([401, 422]).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
