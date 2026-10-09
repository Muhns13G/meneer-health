import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";

test("approved role selection follows MFA and clears on sign-out", async ({ page }) => {
  await isolateExternalFonts(page);
  const tenantId = "a1000000-0000-4000-8000-000000000001";
  let selected = false;
  await page.route("**/staff/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET" && path !== "/staff/session") return route.continue();
    if (path === "/staff/sign-in") return route.fulfill({ json: { enrollment: null } });
    if (path === "/staff/mfa")
      return route.fulfill({
        json: {
          contexts: [{ subjectId: tenantId, tenantId, role: "auditor", purpose: "privacy_review" }],
        },
      });
    if (path === "/staff/context") {
      const fields = new URLSearchParams(request.postData() ?? "");
      expect([...fields.keys()].sort()).toEqual(["role", "tenantId"]);
      expect(fields.get("role")).toBe("auditor");
      expect(fields.get("tenantId")).toBe(tenantId);
      selected = true;
      return route.fulfill({ status: 204 });
    }
    if (path === "/staff/session")
      return route.fulfill({
        json: { role: "auditor", purpose: "privacy_review", expiresAt: "2030-01-01T00:00:00Z" },
      });
    if (path === "/staff/sign-out") return route.fulfill({ status: 204 });
    throw new Error(`Unexpected intercepted staff request: ${path}`);
  });
  await page.goto("/staff/sign-in");
  await page.getByLabel("Staff email address").fill("staff@example.invalid");
  await page.getByRole("button", { name: "I already have an invitation code" }).click();
  await page.getByLabel("Six-digit email code").fill("123456");
  await page.getByRole("button", { name: "Verify email" }).click();
  await page.getByLabel("Authenticator code").fill("654321");
  await page.getByRole("button", { name: "Verify authenticator" }).click();
  const choice = page.getByLabel("Approved work context");
  await expect(choice).toBeFocused();
  await expect(page.getByRole("button", { name: "Renew session" })).toHaveCount(0);
  await expect(choice.getByRole("option")).toHaveCount(2);
  expect(selected).toBe(false);
  const analysis = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(analysis.violations).toEqual([]);
  await choice.selectOption("0");
  await page.getByRole("button", { name: "Use approved context" }).click();
  await expect(page.getByRole("button", { name: "Renew session" })).toBeVisible();
  expect(selected).toBe(true);
  const support = page.getByRole("link", { name: "Open assigned support work" });
  await expect(support).toHaveAttribute("href", "/staff/support");
  await expect(support).toHaveClass(/action-secondary/);
  expect((await support.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Staff email address")).toBeVisible();
  await expect(choice).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Renew session" })).toHaveCount(0);
});

test("private workforce entry loads without granting access", async ({ page, request }) => {
  await isolateExternalFonts(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/staff/sign-in");
  await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
  await expect(page.getByLabel("Staff email address")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send code" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Renew session" })).toHaveCount(0);
  await page.getByLabel("Staff email address").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Send code" })).toBeFocused();
  const analysis = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(analysis.violations).toEqual([]);
  expect(errors).toEqual([]);
  const session = await request.get("/staff/session");
  expect(session.status()).toBe(401);
  expect(session.headers()["cache-control"]).toContain("no-store");
});
