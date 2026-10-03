import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";

const documents = ["pilot-account-terms", "pilot-privacy-notice"].map((instrumentId, index) => ({
  publicationId: `96000000-0000-4000-8000-00000000000${index + 4}`,
  instrumentId,
  version: "1.0",
  locale: "en-ZA",
  contentHash: (index ? "b" : "a").repeat(64),
  body: `Synthetic ${instrumentId} only. Not approved for client use.`,
  effectiveAt: "2026-10-02T00:00:00Z",
}));

test("activation fails closed without proof and keeps no-store discovery controls", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  const response = await page.goto("/account/activate");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("status")).toContainText("Account setup is currently unavailable");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("exact documents precede profile; separate actions, retry and durable success are accessible", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  await page.route("**/account/activate/instruments", (route) =>
    route.fulfill({ json: { verifiedEmail: "activation@example.invalid", documents } }),
  );
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/account/activate", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: bodies.length === 1 ? 503 : 204, body: "" });
  });
  await page.goto("/account/activate");
  await expect(page.getByText(documents[1].body)).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  const savedDocument = page.waitForEvent("download");
  await page.getByRole("link", { name: "Save this exact version" }).first().click();
  const download = await savedDocument;
  expect(download.suggestedFilename()).toBe("pilot-account-terms-1.0.txt");
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  expect(readFileSync(downloadPath!, "utf8")).toBe(documents[0].body);
  await page.getByRole("button", { name: "Continue to profile" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Your minimum profile" })).toBeFocused();
  await page.getByRole("button", { name: "Set up account", exact: true }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("Given name", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(bodies).toHaveLength(0);
  await page.getByRole("link", { name: "Enter your given name (up to 100 characters)." }).click();
  await expect(page.getByLabel("Given name", { exact: true })).toBeFocused();
  await page.getByLabel("Given name", { exact: true }).fill("Synthetic");
  await page.getByLabel("Family name", { exact: true }).fill("Client");
  await page.getByLabel("Mobile or WhatsApp number (international format)").fill("+27820000000");
  const checkboxes = page.getByRole("checkbox");
  expect(await checkboxes.count()).toBe(2);
  await expect(checkboxes.nth(0)).not.toBeChecked();
  await expect(checkboxes.nth(1)).not.toBeChecked();
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Set up account", exact: true }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByRole("alert")).toContainText("could not confirm");
  await expect(page.getByRole("link", { name: "Sign in to continue" })).toHaveCount(0);
  await page.getByRole("button", { name: "Set up account", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign in to continue" })).toBeVisible();
  expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[0]).not.toHaveProperty("email");
  expect(bodies[0]).not.toHaveProperty("password");
  expect(page.url()).toBe("http://127.0.0.1:8085/account/activate");
});
