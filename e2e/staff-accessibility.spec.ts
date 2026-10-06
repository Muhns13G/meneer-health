import { expect, test, type Page } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
import { checkClientFormPresentation, checkKeyboardReachability } from "./client-form-checks";

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
const readiness = {
  profileActive: true,
  accountActive: true,
  emailVerified: true,
  instrumentsCurrent: false,
  authorisationCurrent: false,
  paymentReadiness: "integration_pending",
  recipientReadiness: "integration_pending",
  ready: false,
};
const profile = {
  givenName: "Synthetic",
  familyName: "Client",
  status: "active",
  maskedEmail: "***@***",
  maskedMobile: "***12",
  contactPreference: "email",
  mobileVerificationStatus: "pending",
};
async function isolate(page: Page) {
  await isolateExternalFonts(page);
  // Catch unexpected writes before adding the specific synthetic responses below.
  await page.route("**/staff/**", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, body: "" })
      : route.continue(),
  );
}
for (const surface of [
  "queue",
  "queue-handoff",
  "support",
  "alerts",
  "intake",
  "sign-in",
  "sign-in-session",
] as const) {
  test(`staff ${surface} has keyboard, reflow and accessible presentation`, async ({ page }) => {
    test.setTimeout(120_000);
    await isolate(page);
    const expiresAt = new Date(Date.now() + 600_000).toISOString();
    await page.route("**/staff/session", (route) =>
      route.fulfill({
        json: {
          role: surface === "support" ? "auditor" : "admin",
          purpose: surface === "sign-in-session" ? "security_administration" : "privacy_review",
          expiresAt,
        },
      }),
    );
    await page.route("**/staff/queue/read", (route) =>
      route.fulfill({ json: { cases: [row], nextCursor: null } }),
    );
    await page.route("**/staff/queue/detail", (route) =>
      route.fulfill({
        json: {
          ...row,
          claim: surface === "queue-handoff" ? "yours" : "unclaimed",
          readiness,
          profile,
          ...(surface === "queue-handoff"
            ? {
                state: "handed_off",
                handoff: {
                  attemptId: id,
                  attemptState: "delivered",
                  authorisationId: id,
                  exceptionId: null,
                },
              }
            : {}),
        },
      }),
    );
    await page.route("**/staff/support/followup", (route) =>
      route.fulfill({
        json: {
          cases: [
            {
              reference: id,
              purpose: "privacy",
              state: "escalated",
              recordedAt: "2026-10-06T00:00:00Z",
              canRespond: false,
            },
          ],
          notifications: [
            {
              reference: id,
              template: "account-v1",
              state: "uncertain",
              reason: "TRANSPORT_UNCERTAIN",
              recordedAt: "2026-10-06T00:00:00Z",
              reviewState: "unreviewed",
              canResend: false,
            },
          ],
          coverage: [],
        },
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
              acknowledged: false,
              resolved: false,
            },
          ],
        },
      }),
    );
    await page.route("**/staff/intake/command", (route) =>
      route.fulfill({
        json:
          route.request().postDataJSON().action === "list"
            ? {
                items: [
                  {
                    intakeId: id,
                    snapshotId: id,
                    version: 1,
                    state: "submitted",
                    safetyHold: false,
                  },
                ],
                expiresAt,
              }
            : {
                intakeId: id,
                snapshotId: id,
                version: 1,
                state: "submitted",
                safetyHold: false,
                fields: { full_name: "Synthetic protected client" },
                expiresAt,
              },
      }),
    );
    await page.goto(
      `/staff/${surface === "queue-handoff" ? "queue" : surface === "sign-in-session" ? "sign-in" : surface}`,
    );
    if (surface === "queue" || surface === "queue-handoff") {
      // Cold Vite hydration is separate from the rendered SSR placeholder.
      await expect(page.getByRole("button", { name: `View case ${id}` })).toBeVisible({
        timeout: 30_000,
      });
      const original = page.viewportSize()!;
      await checkClientFormPresentation(page);
      await page.setViewportSize({ width: 320, height: 800 });
      const table = page.getByRole("region", { name: "Assigned cases table" });
      await table.focus();
      await expect(table).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await page.setViewportSize(original);
      await page.getByRole("button", { name: `View case ${id}` }).click();
      await expect(page.getByRole("heading", { name: `Case ${id}` })).toBeFocused();
      await expect(page.getByText("***@***", { exact: true })).toBeVisible();
    } else if (surface === "support") {
      await page.getByRole("button", { name: "Load support queues" }).click();
      await expect(page.getByRole("heading", { name: "Notification follow-up" })).toBeVisible();
    } else if (surface === "alerts") {
      await page.getByRole("button", { name: "Load alerts" }).click();
      await expect(page.getByText("Awaiting acknowledgement")).toBeVisible();
    } else if (surface === "intake") {
      await page.getByRole("button", { name: "Load granted work" }).click();
      await page.getByRole("button", { name: /^Intake / }).click();
      await expect(page.getByText("Synthetic protected client")).toBeVisible();
    } else if (surface === "sign-in-session") {
      await page.getByRole("button", { name: "Resume existing session" }).click();
      await expect(page.getByRole("region", { name: "Staff session" })).toBeVisible();
    }
    await checkClientFormPresentation(page);
    await checkKeyboardReachability(page);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    expect(page.url()).not.toContain(id);
  });
}
test("staff masked detail expires, focuses recovery and rejects expanded contact", async ({
  page,
}) => {
  await isolate(page);
  const start = new Date();
  await page.clock.install({ time: start });
  let deadline = new Date(start.getTime() + 600_000).toISOString();
  let raw = false;
  await page.route("**/staff/queue/read", (route) =>
    route.fulfill({ json: { cases: [row], nextCursor: null } }),
  );
  await page.route("**/staff/queue/detail", (route) =>
    route.fulfill({
      headers: { "X-Session-Expires-At": deadline },
      json: {
        ...row,
        claim: "unclaimed",
        readiness,
        profile: { ...profile, maskedEmail: raw ? "private@synthetic.invalid" : "***@***" },
      },
    }),
  );
  await page.goto("/staff/queue");
  await page.getByRole("button", { name: `View case ${id}` }).click();
  await expect(page.getByText("***@***", { exact: true })).toBeVisible();
  const status = page.locator('main > p[role="status"]');
  await page.clock.fastForward(600_001);
  await expect(status).toContainText("Sign in with staff MFA");
  await expect(status).toBeFocused();
  await expect(page.getByText("***@***", { exact: true })).toHaveCount(0);
  raw = true;
  deadline = new Date(start.getTime() + 1_200_000).toISOString();
  await page.getByRole("button", { name: "Apply filter / refresh" }).click();
  await page.getByRole("button", { name: `View case ${id}` }).click();
  await expect(page.getByRole("region", { name: "Assigned case detail" })).toHaveCount(0);
  await expect(page.getByText("private@synthetic.invalid", { exact: true })).toHaveCount(0);
  await expect(status).toContainText("unavailable");
  await expect(status).toBeFocused();
});
test("stalled alert load expires without private restoration or automatic retry", async ({
  page,
}) => {
  await isolate(page);
  let finish!: () => void;
  let reads = 0;
  await page.route("**/staff/session", (route) =>
    route.fulfill({
      json: { role: "admin", expiresAt: new Date(Date.now() + 1500).toISOString() },
    }),
  );
  await page.route("**/staff/alerts/read", async (route) => {
    reads++;
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    await route.fulfill({ json: { alerts: [] } }).catch(() => {});
  });
  await page.goto("/staff/alerts");
  await page.getByRole("button", { name: "Load alerts" }).click();
  await expect(page.getByRole("status")).toContainText("Checking live");
  await expect(page.getByRole("status")).toContainText("Session expired");
  await expect(page.getByRole("status")).toBeFocused();
  finish();
  await expect(page.getByRole("button", { name: "Load alerts" })).toBeEnabled();
  expect(reads).toBe(1);
});

for (const surface of ["support", "intake"] as const) {
  test(`staff ${surface} clears private work on expiry and focuses recovery`, async ({ page }) => {
    await isolate(page);
    const start = new Date();
    await page.clock.install({ time: start });
    const expiresAt = new Date(start.getTime() + 600_000).toISOString();
    await page.route("**/staff/session", (route) =>
      route.fulfill({ json: { role: "auditor", purpose: "privacy_review", expiresAt } }),
    );
    await page.route("**/staff/support/followup", (route) =>
      route.fulfill({
        json: {
          cases: [
            {
              reference: id,
              purpose: "privacy",
              state: "escalated",
              recordedAt: "2026-10-06T00:00:00Z",
              canRespond: false,
            },
          ],
          notifications: [],
          coverage: [],
        },
      }),
    );
    await page.route("**/staff/intake/command", (route) =>
      route.fulfill({
        json:
          route.request().postDataJSON().action === "list"
            ? {
                items: [
                  {
                    intakeId: id,
                    snapshotId: id,
                    version: 1,
                    state: "submitted",
                    safetyHold: false,
                  },
                ],
                expiresAt,
              }
            : {
                intakeId: id,
                snapshotId: id,
                version: 1,
                state: "submitted",
                safetyHold: false,
                fields: { full_name: "Synthetic protected client" },
                expiresAt,
              },
      }),
    );
    await page.goto(`/staff/${surface}`);
    await page
      .getByRole("button", {
        name: surface === "support" ? "Load support queues" : "Load granted work",
      })
      .click();
    if (surface === "intake") {
      await page.getByRole("button", { name: /^Intake / }).click();
      await expect(page.getByText("Synthetic protected client")).toBeVisible();
    } else {
      await expect(
        page.getByText("Alternate-owner follow-up required", { exact: true }),
      ).toBeVisible();
    }
    await page.clock.fastForward(600_001);
    await expect(page.getByRole("status")).toContainText(/expired|hidden/i);
    await expect(page.getByRole("status")).toBeFocused();
    await expect(page.getByText("Synthetic protected client")).toHaveCount(0);
    await expect(page.getByText("Alternate-owner follow-up required", { exact: true })).toHaveCount(
      0,
    );
    if (surface === "intake") {
      // The fixed fixture is now expired; a fresh list response must not briefly expose its items.
      await page.getByRole("button", { name: "Load granted work" }).click();
      await expect(page.getByRole("status")).toContainText("No information is displayed");
      await expect(page.getByRole("button", { name: /^Intake / })).toHaveCount(0);
      await expect(page.getByRole("status")).toBeFocused();
    }
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  });
}
