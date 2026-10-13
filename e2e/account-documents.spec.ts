import { expect, test } from "@playwright/test";
import { checkClientFormPresentation, checkKeyboardReachability } from "./client-form-checks";
import { isolateExternalFonts } from "./helpers";

const documents = {
  verifiedEmail: "review@example.invalid",
  documents: [
    {
      publicationId: "f9200000-0000-4000-8000-000000000001",
      instrumentId: "pilot-account-terms",
      version: "1.2",
      locale: "en-ZA",
      contentHash: "a".repeat(64),
      body: "Synthetic new-company account terms",
      effectiveAt: "2026-10-13T00:00:00Z",
    },
    {
      publicationId: "f9200000-0000-4000-8000-000000000002",
      instrumentId: "pilot-privacy-notice",
      version: "1.2",
      locale: "en-ZA",
      contentHash: "b".repeat(64),
      body: "Synthetic new-company privacy notice",
      effectiveAt: "2026-10-13T00:00:00Z",
    },
  ],
};

test("current document review requires genuine actions and remains accessible", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await isolateExternalFonts(page);
  const commands: URLSearchParams[] = [];
  await page.route("**/account/documents/current", (route) => route.fulfill({ json: documents }));
  await page.route("**/account/documents", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    commands.push(new URLSearchParams(route.request().postData() ?? ""));
    await route.fulfill({ status: commands.length === 1 ? 503 : 204 });
  });
  const initialRead = page.waitForResponse((response) =>
    response.url().endsWith("/account/documents/current"),
  );
  await page.goto("/account/documents");
  await initialRead;
  await expect(page.getByText("Verified email: review@example.invalid")).toBeVisible();
  await checkClientFormPresentation(page);
  await checkKeyboardReachability(page);
  const actions = page.getByRole("checkbox");
  await expect(actions.nth(0)).not.toBeChecked();
  await expect(actions.nth(1)).not.toBeChecked();
  const save = page.getByRole("button", { name: "Save and continue" });
  await expect(save).toBeDisabled();
  await actions.nth(0).check();
  await expect(save).toBeDisabled();
  await actions.nth(1).check();
  await save.click();
  await expect(page.getByRole("status")).toContainText("could not confirm");
  await expect(page.getByRole("link", { name: "Open your private account" })).toHaveCount(0);
  await save.click();
  await expect(page.getByRole("link", { name: "Open your private account" })).toHaveAttribute(
    "href",
    "/portal",
  );
  await expect(page.getByRole("status")).toContainText("no additional email code");
  expect(commands).toHaveLength(2);
  expect(commands[0].get("requestKey")).toBe(commands[1].get("requestKey"));
  expect(commands[1].get("termsHash")).toBe("a".repeat(64));
  expect(commands[1].get("privacyHash")).toBe("b".repeat(64));
});

test("expired review access shows a recovery route without accepting documents", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  await page.route("**/account/documents/current", (route) => route.fulfill({ status: 401 }));
  const initialRead = page.waitForResponse((response) =>
    response.url().endsWith("/account/documents/current"),
  );
  await page.goto("/account/documents");
  await initialRead;
  await expect(page.getByRole("status")).toContainText("Sign in again");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to sign-in" })).toHaveAttribute(
    "href",
    "/account/sign-in",
  );
});
