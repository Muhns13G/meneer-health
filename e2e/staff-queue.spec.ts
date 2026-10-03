import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
const id = "a3000000-0000-4000-8000-000000000010";
const row = {
  caseId: id,
  state: "onboarding_pending",
  version: 1,
  assignedOwner: id,
  createdAt: "2026-10-03T12:00:00Z",
  updatedAt: "2026-10-03T12:00:00Z",
  profileActive: true,
  emailVerified: true,
  exceptionCode: null,
  handoffReadiness: "not_evaluated",
  paymentReadiness: "not_evaluated",
};
test("private queue denies anonymous reads and remains accessible", async ({ page, request }) => {
  await isolateExternalFonts(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/staff/queue");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page.getByRole("heading", { name: "Assigned operations queue" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Sign in with staff MFA");
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByLabel("Operational state").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Apply filter / refresh" })).toBeFocused();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const r = await request.post("/staff/queue/detail", {
    headers: { origin: "http://127.0.0.1:8085" },
    form: { caseId: id },
  });
  expect(r.status()).toBe(401);
  expect((await request.get("/staff/queue/read")).status()).toBe(404);
  expect(errors).toEqual([]);
});
test("synthetic queue filter, masked detail and denied refresh never reveal raw contact", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  let denied = false;
  await page.route("**/staff/queue/read", async (route) => {
    if (denied) {
      await route.fulfill({ status: 403, body: "" });
      return;
    }
    const state = new URLSearchParams(route.request().postData() ?? "").get("state");
    await route.fulfill({ json: { cases: state === "cancelled" ? [] : [row], nextCursor: null } });
  });
  await page.route("**/staff/queue/detail", (route) =>
    route.fulfill({
      json: {
        ...row,
        profile: {
          givenName: "Synthetic",
          familyName: "Client",
          status: "active",
          maskedEmail: "***@***",
          maskedMobile: "***12",
          contactPreference: "email",
          mobileVerificationStatus: "pending",
        },
      },
    }),
  );
  await page.goto("/staff/queue");
  await expect(page.getByRole("button", { name: `View case ${id}` })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: `View case ${id}` }).click();
  await expect(page.getByText("Synthetic Client")).toBeVisible();
  await expect(page.getByRole("heading", { name: `Case ${id}` })).toBeFocused();
  await expect(page.getByText("***@***", { exact: true })).toBeVisible();
  expect(page.url()).not.toContain(id);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  denied = true;
  await page.getByRole("button", { name: "Back to assigned queue" }).click();
  await expect(page.getByRole("status")).toContainText("Access is unavailable");
  await expect(page.getByText("Synthetic Client")).toHaveCount(0);
});
