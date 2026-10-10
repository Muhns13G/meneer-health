import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { clientProductsFixture } from "../src/test/client-products-fixture";
import { isolateExternalFonts } from "./helpers";
test("private catalogue, exact-version interest, keyboard, reflow and hidden state", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let interested = false;
  await page.route("**/portal/products/command", (route) => {
    const c = route.request().postDataJSON();
    expect(route.request().method()).toBe("POST");
    if (c.action === "register_interest") {
      expect(c.catalogueId).toBe(clientProductsFixture().catalogueId);
      expect(Object.keys(c).sort()).toEqual(["action", "catalogueId", "productId", "requestKey"]);
      interested = true;
    }
    const v = clientProductsFixture();
    v.items[0]!.interested = interested;
    return route.fulfill({ json: v });
  });
  const [, r] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/portal/products/command",
    ),
    page.goto("/portal/products"),
  ]);
  expect(r?.headers()["cache-control"]).toContain("no-store");
  await expect(page.getByRole("heading", { name: "Synthetic item one" })).toBeVisible();
  await expect(page.getByText(/synthetic items and prices only/)).toBeVisible();
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize(viewport);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  const button = page.getByRole("button", { name: "Express interest: Synthetic item one" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("interest is recorded");
  await expect(
    page.getByRole("button", { name: "Interest recorded: Synthetic item one" }),
  ).toBeDisabled();
  expect(page.url()).toBe("http://127.0.0.1:8085/portal/products");
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  await page.screenshot({ path: `/tmp/meneer-products-${test.info().project.name}.png` });
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(page.getByRole("heading", { name: "Synthetic item one" })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("anonymous and disabled command paths never expose product data", async ({
  request,
  page,
}) => {
  const r = await request.post("/portal/products/command", {
    data: { action: "read" },
    headers: { Origin: "http://127.0.0.1:8085", "Idempotency-Key": crypto.randomUUID() },
  });
  expect([401, 412]).toContain(r.status());
  await isolateExternalFonts(page);
  await page.goto("/portal/products");
  await expect(page.getByRole("status")).toContainText("Product browsing is not available yet");
  await expect(page.getByRole("heading", { level: 2, name: "Synthetic item one" })).toHaveCount(0);
});
