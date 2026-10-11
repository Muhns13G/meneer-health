import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
const id = "a1510000-0000-4000-8000-000000000001";
test("explicit email fallback uses the existing participant and hides the send action after acceptance", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  let sent = false;
  let attempts = 0;
  await page.route("**/staff/mobile-invitations/read", (route) =>
    route.fulfill({
      headers: { "X-Session-Expires-At": new Date(Date.now() + 600000).toISOString() },
      json: {
        invitations: [
          {
            id,
            version: sent ? 2 : 1,
            status: "issued",
            expiresAt: new Date(Date.now() + 172800000).toISOString(),
            givenName: "Synthetic",
            familyName: "Fallback",
            maskedPhone: "***01",
            reviewed: true,
            sendReserved: true,
            emailDelivery: sent ? "accepted" : "not_attempted",
          },
        ],
        nextId: null,
        reservationEnabled: false,
        sendingEnabled: false,
        emailSendingEnabled: true,
      },
    }),
  );
  await page.route("**/staff/mobile-invitations/email", async (route) => {
    attempts++;
    const fields = Object.fromEntries(new URLSearchParams(route.request().postData() ?? ""));
    expect(fields).toEqual({
      invitationId: id,
      expectedVersion: "1",
      requestKey: expect.stringMatching(/^[a-f0-9-]{36}$/),
      email: "recipient@example.invalid",
    });
    sent = true;
    await route.fulfill({ json: { outcome: "accepted" } });
  });
  await page.goto("/staff/mobile-invitations");
  const send = page.getByRole("button", { name: "Send one email invitation for Synthetic" });
  await expect(send).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByLabel("Participant email for Synthetic").fill("recipient@example.invalid");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await send.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("not confirmed receipt");
  await expect(send).toHaveCount(0);
  await expect(page.getByText(/Email invitation: accepted/)).toBeVisible();
  expect(attempts).toBe(1);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("anonymous email sends are rejected by the real HTTP boundary", async ({ request }) => {
  const result = await request.post("/staff/mobile-invitations/email", {
    headers: { origin: "http://127.0.0.1:8085" },
    form: {
      invitationId: id,
      expectedVersion: "1",
      requestKey: id,
      email: "recipient@example.invalid",
    },
  });
  expect(result.status()).toBe(401);
  expect(result.headers()["cache-control"]).toContain("no-store");
});
