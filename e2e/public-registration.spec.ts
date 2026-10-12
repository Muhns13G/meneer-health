import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { isolateExternalFonts } from "./helpers";
for (const destination of ["activation", "ready"] as const) {
  test(`public entry verifies one email code and continues (${destination})`, async ({ page }) => {
    await isolateExternalFonts(page);
    await page.route("**/account/sign-up/availability", (route) => route.fulfill({ status: 204 }));
    const actions: string[] = [];
    await page.route("**/account/sign-up", (route) => {
      const body = new URLSearchParams(route.request().postData() ?? "");
      actions.push(body.get("action")!);
      return route.fulfill({
        status: body.get("action") === "request" ? 202 : 204,
        headers: { "X-Meneer-Session": destination },
      });
    });
    await page.goto("/start");
    await expect(page.getByRole("heading", { name: "Start your private account" })).toBeVisible();
    await page.getByLabel("Email address", { exact: true }).fill("public@example.invalid");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByLabel("Six-digit code")).toBeFocused();
    await page.getByLabel("Six-digit code").fill("123456");
    await page.getByRole("button", { name: "Verify email" }).click();
    await expect(
      page.getByRole("link", {
        name:
          destination === "activation" ? "Continue to account setup" : "Open your private account",
      }),
    ).toHaveAttribute("href", destination === "activation" ? "/account/activate" : "/portal");
    expect(actions).toEqual(["request", "verify"]);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
test("disabled public registration retains returning-client access without sending", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  await page.route("**/account/sign-up/availability", (route) => route.fulfill({ status: 412 }));
  await page.goto("/start");
  await expect(page.getByRole("status")).toContainText(
    "New account signup is currently unavailable",
  );
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Already have an account? Sign in" }),
  ).toHaveAttribute("href", "/account/sign-in");
});
