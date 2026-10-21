import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import catalogue from "../content/medical-intake-catalogue.json" with { type: "json" };
import { submittedIntake, type IntakeAnswers } from "../contracts/medical-intake";
import { createIntakeFlow } from "../src/lib/intake-flow";
const { intakeSteps } = createIntakeFlow(catalogue);
import { portalAccountFixture } from "../src/test/patient-portal-fixture";
import { expectOnlyRouterScrollStorage, isolateExternalFonts } from "./helpers";

const manualReview = process.env.CLIENT_FORM_MANUAL_REVIEW === "voiceover-local-synthetic";
async function reviewCheckpoint(page: Page, label: string) {
  if (!manualReview) return;
  if (process.env.CI || new URL(page.url()).origin !== "http://127.0.0.1:8085")
    throw new Error("Sprint 16 manual review is local-only.");
  console.info(`Sprint 16 synthetic review: ${label}. Resume in Inspector when checked.`);
  await page.pause();
}

// Integrated real-page presentation test with a controlled transport, not hosted/provider proof.
test("one-code public signup, genuine account choices, durable draft resume and questionnaire completion", async ({
  page,
}) => {
  test.setTimeout(manualReview ? 0 : 120000);
  await isolateExternalFonts(page);
  const id = "d3000000-0000-4000-8000-000000000001";
  const actions: string[] = [];
  const writes: Record<string, unknown>[] = [];
  let version = 0;
  let answers: IntakeAnswers = {};
  let state: "draft" | "submitted" = "draft";
  const publication = {
    id,
    catalogueHash: "a".repeat(64),
    privacy: "Synthetic questionnaire privacy notice.",
    reviewDeclaration: "Synthetic separate doctor review declaration.",
    recipientReference: id,
    urgentGuidance: "Synthetic urgent guidance.",
    afterHoursGuidance: "Synthetic after-hours guidance.",
    transferNotice: "Synthetic separate disclosure notice.",
  };
  await page.route("**/account/sign-up/availability", (route) => route.fulfill({ status: 204 }));
  await page.route("**/account/sign-up", (route) => {
    const action = new URLSearchParams(route.request().postData() ?? "").get("action")!;
    actions.push(action);
    return route.fulfill({
      status: action === "request" ? 202 : 204,
      headers: { "X-Meneer-Session": "activation" },
    });
  });
  await page.route("**/account/activate/instruments", (route) =>
    route.fulfill({
      json: {
        verifiedEmail: "onboarding@example.invalid",
        documents: portalAccountFixture.instruments.map(
          ({ action: _action, recordedAt: _recorded, ...document }) => document,
        ),
      },
    }),
  );
  await page.route("**/account/activate", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const input = route.request().postDataJSON();
    expect(input.termsAccepted).toBe(true);
    expect(input.privacyAcknowledged).toBe(true);
    return route.fulfill({ status: 204, headers: { "X-Meneer-Session": "ready" } });
  });
  await page.route("**/account/session/renew", (route) => route.fulfill({ status: 204 }));
  await page.route("**/portal/intake/command", (route) => {
    const command = route.request().postDataJSON();
    if (command.action !== "read") {
      expect(command.expectedVersion).toBe(version);
      if (command.action === "submit") submittedIntake(command.answers);
      writes.push(command);
      answers = command.answers;
      version++;
      state = command.action === "submit" ? "submitted" : "draft";
    }
    const lifetime = manualReview ? 3600000 : 600000;
    const expiresAt = new Date(Date.now() + lifetime).toISOString();
    return route.fulfill({
      json:
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
                    expiresAt,
                    answers,
                  }
                : null,
              publication,
              contact: {
                email: "onboarding@example.invalid",
                mobile: "+27820000000",
                profileVersion: 1,
              },
              expiresAt: Date.now() + lifetime,
            }
          : {
              intakeId: id,
              caseId: id,
              version,
              snapshotId: id,
              state,
              safetyHold: false,
              expiresAt,
            },
    });
  });
  await page.goto("/start");
  await page.getByLabel("Email address", { exact: true }).fill("onboarding@example.invalid");
  await page.getByRole("button", { name: "Send code", exact: true }).click();
  await page.getByLabel("Six-digit code").fill("123456");
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await page.getByRole("link", { name: "Continue to account setup" }).click();
  await page.getByRole("button", { name: "Read Account and service terms" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Read Account and service terms" })).toBeFocused();
  await page.getByLabel("Given name", { exact: true }).fill("Synthetic");
  await page.getByLabel("Family name", { exact: true }).fill("Onboarding");
  await page.getByLabel("Mobile or WhatsApp number (international format)").fill("+27820000000");
  for (const checkbox of await page.getByRole("checkbox").all()) {
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
  }
  await page.getByRole("button", { name: "Set up account", exact: true }).click();
  await page.getByRole("link", { name: "Continue to questionnaire" }).click();
  await page.getByRole("checkbox", { name: /acknowledge this medical-intake/ }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Treatment interests", exact: true }),
  ).toBeFocused();
  await page.getByRole("checkbox", { name: "Peptides", exact: true }).check();
  await page.locator("#category_peptides-disposition").selectOption("provided");
  const peptidePrompt = catalogue.items.find((item) => item.id === "category_peptides")!.prompt;
  await page
    .getByRole("textbox", { name: peptidePrompt, exact: true })
    .fill("Synthetic written history only.");
  await expect(page.getByText("Draft saved.", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `/tmp/meneer-sprint16-interests-${test.info().project.name}.png`,
    fullPage: true,
  });
  await reviewCheckpoint(
    page,
    "treatment first, written answer, section selector and saved feedback",
  );
  await page.getByRole("button", { name: "Next section", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Synthetic Onboarding");
  await page.getByLabel("Date of birth", { exact: true }).fill("1990-01-01");
  await page.getByRole("combobox", { name: "Sex", exact: true }).selectOption("male");
  await page.getByLabel("Height (cm)").fill("180");
  await page.getByLabel("Weight (kg)").fill("80");
  await expect(page.getByText("Draft saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resume at first unanswered section" }).click();
  await expect(page.getByRole("heading", { name: "Your health today", exact: true })).toBeFocused();
  await page.screenshot({
    path: `/tmp/meneer-sprint16-resume-${test.info().project.name}.png`,
    fullPage: true,
  });
  await reviewCheckpoint(page, "saved draft resumed at the first unanswered section");
  for (let step = 3; step <= intakeSteps.length; step++) {
    const { section, title } = intakeSteps[step - 1]!;
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    for (const item of catalogue.items.filter((item) => item.section === section)) {
      if (item.id === "diagnosed_conditions")
        await page.getByRole("combobox", { name: "Response", exact: true }).selectOption("none");
      else if (item.id === "mental_safety" || item.id === "sti_symptoms")
        await page.locator(`#${item.id}`).selectOption("no");
      else if (item.id === "accuracy_declaration" || item.id === "doctor_review_consent")
        await page.locator(`#${item.id}`).check();
      else if (item.id === "signature")
        await page.locator("#signature").fill("Synthetic Onboarding");
      else if (await page.locator(`#${item.id}-disposition`).count())
        await page.locator(`#${item.id}-disposition`).selectOption("none");
    }
    await expect(page.getByText("Draft saved.", { exact: true })).toBeVisible();
    if (step < intakeSteps.length)
      await page.getByRole("button", { name: "Next section", exact: true }).click();
  }
  await page.getByRole("button", { name: "Review answers", exact: true }).click();
  await page.getByRole("button", { name: "Confirm and submit questionnaire", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Questionnaire received", exact: true }),
  ).toBeFocused();
  await expect(page.getByText(/Your questionnaire is complete and saved/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to deposit review" })).toHaveAttribute(
    "href",
    "/portal/order",
  );
  expect(actions).toEqual(["request", "verify"]);
  expect(writes.filter((write) => write.action === "submit")).toHaveLength(1);
  expect(answers.category_peptides).toEqual({
    disposition: "provided",
    text: "Synthetic written history only.",
  });
  await expectOnlyRouterScrollStorage(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `/tmp/meneer-sprint16-complete-${test.info().project.name}.png`,
    fullPage: true,
  });
  await reviewCheckpoint(page, "questionnaire received and separate deposit next step");
  if (manualReview) {
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await reviewCheckpoint(page, "private fields hidden and sign-in/session recovery actions");
  }
});
