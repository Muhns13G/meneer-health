import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
const id = "a1000000-0000-4000-8000-000000000001";
test("restricted alerts require explicit human response, remain private and keyboard operable", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  let acknowledged = false;
  let resolved = false;
  await page.route("**/staff/session", (route) =>
    route.fulfill({
      json: { role: "admin", expiresAt: new Date(Date.now() + 600_000).toISOString() },
    }),
  );
  await page.route("**/staff/alerts/read", (route) =>
    route.fulfill({
      json: {
        alerts: [
          {
            id,
            code: "ACCESS_DENIED",
            severity: "critical",
            owner: "security",
            recorded_at: "2026-10-04T09:00:00Z",
            delivery: "accepted",
            acknowledged,
            resolved,
          },
        ],
      },
    }),
  );
  await page.route("**/staff/alerts/respond", async (route) => {
    const fields = new URLSearchParams(route.request().postData() ?? "");
    expect([...fields.keys()].sort()).toEqual(["action", "alertId", "requestKey"]);
    expect(fields.get("alertId")).toBe(id);
    if (fields.get("action") === "acknowledged") acknowledged = true;
    else {
      expect(acknowledged).toBe(true);
      resolved = true;
    }
    await route.fulfill({ json: { responseId: id } });
  });
  const response = await page.goto("/staff/alerts");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await page.getByRole("button", { name: "Load alerts" }).click();
  await expect(page.getByText("Awaiting acknowledgement")).toBeVisible();
  await page.getByRole("button", { name: "Acknowledge alert" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Confirm resolution" }).click();
  await expect(page.getByText("Resolved", { exact: true })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(page.url()).not.toContain(id);
  expect(
    await page.evaluate(
      () => Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
  ).toBe(0);
});
test("anonymous alert endpoints reject disclosure and response", async ({ request, page }) => {
  await isolateExternalFonts(page);
  await page.goto("/staff/alerts");
  await page.getByRole("button", { name: "Load alerts" }).click();
  await expect(page.getByText(/Access unavailable/)).toBeVisible();
  const read = await request.post("/staff/alerts/read", {
    headers: { origin: "http://127.0.0.1:8085" },
    form: {},
  });
  expect(read.status()).toBe(401);
  expect((await request.get("/staff/alerts/read")).status()).toBe(404);
});
