import { expect, test } from "@playwright/test";
import { checkClientFormPresentation, checkKeyboardReachability } from "./client-form-checks";
import { isolateExternalFonts } from "./helpers";
const id = "d3000000-0000-4000-8000-000000000001";
test("successor medical actions keep saved questionnaire identity and retry safely", async ({
  page,
}) => {
  // Four axe/display-mode passes are slower under mobile emulation on the local review host.
  test.setTimeout(90_000);
  await isolateExternalFonts(page);
  let acknowledged = false;
  const commands: Record<string, unknown>[] = [];
  await page.route("**/portal/intake/command", async (route) => {
    const command = route.request().postDataJSON();
    if (command.action === "acknowledge_notice") {
      commands.push(command);
      if (commands.length === 1) return route.fulfill({ status: 503 });
      acknowledged = true;
      return route.fulfill({ json: { recorded: true } });
    }
    await route.fulfill({
      json: {
        record: {
          id,
          caseId: id,
          version: 1,
          snapshotId: id,
          state: "draft",
          hasSubmitted: false,
          safetyHold: false,
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          answers: {
            health_history: { disposition: "provided", text: "Synthetic retained answer" },
          },
        },
        publication: {
          id,
          catalogueHash: "a".repeat(64),
          privacy: "Synthetic original privacy",
          reviewDeclaration: "Synthetic original declaration",
          recipientReference: id,
          urgentGuidance: "Synthetic urgent guidance",
          afterHoursGuidance: "Synthetic fallback",
          transferNotice: null,
        },
        contact: { email: "medical@example.invalid", mobile: "+27820000000", profileVersion: 1 },
        expiresAt: Date.now() + 600000,
        noticeTransition: {
          publicationId: "d3000000-0000-4000-8000-000000000099",
          privacy: "Synthetic current-company privacy",
          reviewDeclaration: "I consent to synthetic current-company review",
          privacyHash: "b".repeat(64),
          reviewHash: "c".repeat(64),
          acknowledged,
        },
      },
    });
  });
  // Wait for the mocked read, not a fixed delay: cold Vite hydration can exceed five seconds.
  const initialRead = page.waitForResponse(
    (response) => response.url().endsWith("/portal/intake/command") && response.ok(),
  );
  await page.goto("/portal/intake");
  await initialRead;
  await expect(page.getByRole("heading", { name: "Updated questionnaire notices" })).toBeVisible();
  await checkClientFormPresentation(page);
  await checkKeyboardReachability(page);
  const save = page.getByRole("button", { name: "Save notices and continue" });
  await expect(save).toBeDisabled();
  for (const checkbox of await page.getByRole("checkbox").all()) {
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
  }
  await save.click();
  await expect(page.getByRole("status")).toContainText("could not confirm your notice actions");
  await save.click();
  await expect(page.getByRole("heading", { name: "Updated questionnaire notices" })).toHaveCount(0);
  expect(commands).toHaveLength(2);
  expect(commands[0].requestKey).toBe(commands[1].requestKey);
  expect(commands[1].intakeId).toBe(id);
  expect(commands[1]).not.toHaveProperty("answers");
});
