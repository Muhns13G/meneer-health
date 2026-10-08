import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const token = "A".repeat(43);
test("deployed local endpoints remain fail-closed without configuration and reject scanner mutations", async ({
  request,
}) => {
  for (const action of ["redeem", "read", "bind", "decline"]) {
    const url = `/mobile-invitation/${action}`;
    const response = await request.get(url);
    expect(response.status()).toBe(404);
    const denied = await request.post(url, {
      form: {},
      headers: { origin: "https://foreign.example.invalid" },
    });
    expect(denied.status()).toBe(403);
    expect(denied.headers()["cache-control"]).toContain("no-store");
  }
  const disabled = await request.post("/mobile-invitation/redeem", {
    form: { token, requestKey: "a1460000-0000-4000-8000-000000000001" },
    headers: { origin: "http://127.0.0.1:8085" },
  });
  expect(disabled.status()).toBe(503);
  expect(disabled.headers()["set-cookie"]).toBeUndefined();
});
test("fragment is stripped before interaction, GET is inert and assets stay first-party", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const response = await page.goto(`/mobile-invitation#${token}`);
  await expect(page).toHaveURL(/\/mobile-invitation$/);
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'none'");
  expect(requests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(requests.some((url) => url.includes(token) || /redeem|\/bind|\/read/.test(url))).toBe(
    false,
  );
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  await expect(page.getByRole("textbox", { name: "Your email address" })).toBeHidden();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("deliberate exchange and email capture are accessible, no provider verification is invented", async ({
  page,
}) => {
  const posted: { action: string; body: string }[] = [];
  await page.route("**/mobile-invitation/*", async (route) => {
    const action = new URL(route.request().url()).pathname.split("/").at(-1)!;
    posted.push({ action, body: route.request().postData() ?? "" });
    await route.fulfill({
      json: {
        status: "claimed",
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        emailBound: action === "bind",
      },
    });
  });
  await page.goto(`/mobile-invitation#${token}`);
  await page.getByRole("button", { name: "Continue", exact: true }).focus();
  await page.keyboard.press("Enter");
  const email = page.getByRole("textbox", { name: "Your email address" });
  await expect(email).toBeFocused();
  await email.fill("synthetic@example.invalid");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Save email" }).click();
  await expect(page.getByRole("status")).toContainText("No account has been created");
  expect(posted.map((request) => request.action)).toEqual(["redeem", "bind"]);
  expect(new URLSearchParams(posted[0]!.body).get("token")).toBe(token);
  expect(posted[1]!.body).not.toContain(token);
  await expect(email).toBeHidden();
  expect(await page.locator("#email").inputValue()).toBe("");
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
test("scanner visits never decline; explicit confirmation is required", async ({ page }) => {
  const calls: string[] = [];
  await page.route("**/mobile-invitation/decline", async (route) => {
    calls.push(route.request().postData() ?? "");
    await route.fulfill({ json: { status: "declined" } });
  });
  await page.goto(`/mobile-invitation#${token}`);
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: "Decline invitation", exact: true }).click();
  expect(calls).toEqual([]);
  await expect(page.getByRole("button", { name: "Confirm decline" })).toBeFocused();
  await page.getByRole("button", { name: "Confirm decline" }).click();
  await expect(page.getByRole("status")).toContainText("has been declined");
  expect(calls).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
});
test("interrupted exchange retries only on explicit action using the same request key", async ({
  page,
}) => {
  const bodies: string[] = [];
  await page.route("**/mobile-invitation/redeem", async (route) => {
    bodies.push(route.request().postData()!);
    if (bodies.length === 1) await route.abort();
    else
      await route.fulfill({
        json: {
          status: "claimed",
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          emailBound: false,
        },
      });
  });
  await page.goto(`/mobile-invitation#${token}`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Try again with the same details");
  expect(bodies).toHaveLength(1);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Your email address" })).toBeVisible();
  expect(bodies[1]).toBe(bodies[0]);
});
test("expired/revoked response discloses no roster and reload resumes only by explicit cookie POST", async ({
  page,
}) => {
  const paths: string[] = [];
  await page.route("**/mobile-invitation/*", async (route) => {
    paths.push(new URL(route.request().url()).pathname);
    await route.fulfill({ json: { status: "unavailable" } });
  });
  await page.goto("/mobile-invitation");
  expect(paths).toEqual([]);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  expect(paths).toEqual(["/mobile-invitation/read"]);
  await expect(page.getByRole("status")).toContainText("cannot be used right now");
  await expect(page.getByRole("textbox", { name: "Your email address" })).toBeHidden();
});
test("claim expiry clears contact input and disables actions", async ({ page }) => {
  await page.clock.install();
  await page.route("**/mobile-invitation/redeem", async (route) => {
    const now = await page.evaluate(() => Date.now());
    await route.fulfill({
      json: {
        status: "claimed",
        expiresAt: new Date(now + 10000).toISOString(),
        emailBound: false,
      },
    });
  });
  await page.goto(`/mobile-invitation#${token}`);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const email = page.getByRole("textbox", { name: "Your email address" });
  await email.fill("synthetic@example.invalid");
  await page.clock.runFor(11000);
  await expect(page.getByRole("status")).toContainText("claim has expired");
  expect(await page.locator("#email").inputValue()).toBe("");
  await expect(page.locator('#email-form button[type="submit"]')).toBeDisabled();
});
