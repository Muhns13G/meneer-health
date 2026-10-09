import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import catalogue from "../content/medical-intake-catalogue.json" with { type: "json" };
import { completeSyntheticAnswers } from "../contracts/fixtures/medical-intake-synthetic";
import { checkClientFormPresentation, checkKeyboardReachability } from "./client-form-checks";
import { isolateExternalFonts } from "./helpers";
const id = "d3000000-0000-4000-8000-000000000001";
const fixtureLifetime =
  process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic" ? 3600000 : 600000;
// Controlled presentation proof only. Provider-backed persistence/authority is proved separately.
test("questionnaire notice, all source sections, branching, review and hidden-state safety", async ({
  page,
}) => {
  test.setTimeout(
    process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic" ? 0 : 180000,
  );
  await isolateExternalFonts(page);
  await page.route("http://127.0.0.1:8085/**", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, body: "" })
      : route.continue(),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let answers: unknown = {};
  let version = 0;
  let state = "draft";
  let failNextSave = false;
  const publication = {
    id,
    catalogueHash: "a".repeat(64),
    privacy: "Synthetic medical-intake notice only",
    reviewDeclaration: "Synthetic reviewed doctor declaration only",
    recipientReference: id,
    urgentGuidance: "Synthetic urgent guidance",
    afterHoursGuidance: "Synthetic after-hours guidance",
    transferNotice: "Synthetic disclosure notice only",
  };
  await page.route("**/portal/intake/command", async (route) => {
    const command = route.request().postDataJSON();
    if (command.action === "save" && failNextSave) {
      failNextSave = false;
      return route.fulfill({ status: 503, body: "" });
    }
    if (command.action !== "read") {
      answers = command.answers;
      version++;
      state = command.action === "submit" ? "submitted" : "draft";
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        command.action === "read"
          ? {
              record: version
                ? {
                    id,
                    caseId: id,
                    version,
                    snapshotId: id,
                    state,
                    hasSubmitted: state === "submitted",
                    safetyHold: false,
                    expiresAt: new Date(Date.now() + fixtureLifetime).toISOString(),
                    answers,
                  }
                : null,
              publication,
              contact: {
                email: "intake@example.invalid",
                mobile: "+27820000000",
                profileVersion: 1,
              },
              expiresAt: Date.now() + fixtureLifetime,
            }
          : {
              intakeId: id,
              caseId: id,
              version,
              snapshotId: id,
              state,
              safetyHold: false,
              expiresAt: new Date(Date.now() + 60000).toISOString(),
            },
      ),
    });
  });
  await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/portal/intake/command",
    ),
    page.goto("/portal/intake"),
  ]);
  await expect(page.getByText(publication.privacy)).toBeVisible();
  await checkKeyboardReachability(page);
  await checkClientFormPresentation(page);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("checkbox", { name: /acknowledge this medical-intake/ }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Sex", exact: true })).toHaveValue("");
  await checkKeyboardReachability(page);
  await checkClientFormPresentation(page);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await page
    .getByLabel(catalogue.items.find((i) => i.id === "full_name")!.prompt, { exact: true })
    .fill(completeSyntheticAnswers.full_name);
  await page
    .getByLabel(catalogue.items.find((i) => i.id === "date_of_birth")!.prompt, { exact: true })
    .fill(completeSyntheticAnswers.date_of_birth);
  await page.getByLabel("Height (cm)").fill("180");
  await page.getByLabel("Weight (kg)").fill("80");
  await page.getByRole("combobox", { name: "Sex", exact: true }).selectOption("male");
  failNextSave = true;
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("save could not be confirmed");
  await expect(page.getByRole("status")).toBeFocused();
  // Touch activation need not focus a button. Explicitly establish keyboard focus before
  // checking that a pending disabled action restores it after the successful retry.
  await page.getByRole("button", { name: "Save draft", exact: true }).focus();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator("[data-sonner-toast]")).toHaveText(/Your draft is saved/);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeFocused();
  for (let section = 2; section <= 8; section++) {
    await page.getByRole("button", { name: "Next section" }).click();
    await expect(
      page.getByRole("heading", { name: catalogue.sections[section - 1]!.title, exact: true }),
    ).toBeFocused();
    await expect(page.getByRole("progressbar", { name: "Questionnaire progress" })).toHaveAttribute(
      "aria-valuenow",
      String(section),
    );
    if (section === 7) await page.getByRole("checkbox", { name: "Peptides", exact: true }).check();
    if (section === 2) {
      await page
        .getByLabel(catalogue.items.find((item) => item.id === "health_history")!.prompt, {
          exact: true,
        })
        .selectOption("provided");
      await page
        .getByRole("textbox", {
          name: catalogue.items.find((item) => item.id === "health_history")!.prompt,
          exact: true,
        })
        .fill("Synthetic accessibility details only.");
      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("Changing this response will remove its previous text");
        await dialog.accept();
      });
    }
    await checkKeyboardReachability(page);
    await checkClientFormPresentation(page);
    for (const item of catalogue.items.filter((i) => i.section === section)) {
      if (item.id.startsWith("category_") && item.id !== "category_peptides") continue;
      if (item.id === "diagnosed_conditions")
        await page.getByRole("combobox", { name: "Response", exact: true }).selectOption("none");
      else if (item.id === "mental_safety" || item.id === "sti_symptoms")
        await page.getByLabel(item.prompt, { exact: true }).selectOption("no");
      else if (item.id === "accuracy_declaration")
        await page.getByRole("checkbox", { name: item.prompt, exact: true }).check();
      else if (item.id === "doctor_review_consent")
        await page.getByRole("checkbox", { name: publication.reviewDeclaration }).check();
      else if (item.id === "signature")
        await page.getByLabel(item.prompt, { exact: true }).fill("Synthetic Client");
      else
        await page.getByRole("combobox", { name: item.prompt, exact: true }).selectOption("none");
    }
  }
  await page.getByRole("button", { name: "Review answers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review your answers", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Confirm and submit questionnaire" }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Confirm and submit questionnaire" }).click();
  await expect(
    page.getByRole("heading", { name: "Questionnaire received", exact: true }),
  ).toBeFocused();
  expect(page.url()).toMatch(/\/portal\/intake$/);
  await expect(page.getByRole("link", { name: "Continue to deposit review" })).toHaveAttribute(
    "href",
    "/portal/order",
  );
  const download = page.getByRole("button", {
    name: "Download my questionnaire and submitted history",
    exact: true,
  });
  const restriction = page.getByRole("button", { name: "Restrict questionnaire access" });
  await expect(download).toHaveClass(/action-secondary/);
  await expect(restriction).toHaveClass(/action-caution/);
  for (const control of [download, restriction]) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await control.focus();
    await expect(control).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/meneer-action-intake-${test.info().project.name}.png` });
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  expect(errors).toEqual([]);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect(page.getByText(/Questionnaire information has been hidden/)).toBeVisible();
});
