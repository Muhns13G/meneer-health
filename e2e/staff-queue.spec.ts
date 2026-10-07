import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
const id = "a3000000-0000-4000-8000-000000000010";
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
for (const scenario of [
  { name: "stale claim", status: 409, message: "The case changed or is already claimed." },
  {
    name: "unavailable readiness",
    status: 412,
    message: "Readiness or delivery reconciliation is incomplete.",
  },
  { name: "uncertain transport", status: 0, message: "Command result uncertain." },
]) {
  test(`rehearsal ${scenario.name} clears stale detail and never automatically retries`, async ({
    page,
  }) => {
    await isolateExternalFonts(page);
    let requests = 0;
    await page.route("**/staff/queue/read", (route) =>
      route.fulfill({ json: { cases: [row], nextCursor: null } }),
    );
    await page.route("**/staff/queue/detail", (route) =>
      route.fulfill({ json: { ...row, claim: "unclaimed", readiness, profile: null } }),
    );
    await page.route("**/staff/queue/command", async (route) => {
      requests++;
      if (scenario.status === 0) await route.abort("failed");
      else await route.fulfill({ status: scenario.status, body: "" });
    });
    await page.goto("/staff/queue");
    await page.getByRole("button", { name: `View case ${id}` }).click();
    await page.getByRole("button", { name: "Claim case" }).click();
    await expect(page.getByRole("status")).toContainText(scenario.message);
    await expect(page.getByRole("button", { name: "Release claim" })).toHaveCount(0);
    await expect(page.getByText("State: onboarding pending. Record version: 1.")).toHaveCount(0);
    await page.getByRole("button", { name: "Apply filter / refresh" }).click();
    await expect(page.getByRole("button", { name: `View case ${id}` })).toBeVisible();
    expect(requests).toBe(1);
    expect(page.url()).not.toContain(id);
    expect(
      await page.evaluate(
        () => Object.keys(localStorage).length + Object.keys(sessionStorage).length,
      ),
    ).toBe(0);
  });
}
test("synthetic hand-off acknowledgement uses opaque evidence and re-reads live detail", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  let state = "handed_off";
  let version = 6;
  const handoff = {
    attemptId: id,
    attemptState: "delivered",
    authorisationId: id,
    exceptionId: null,
  };
  await page.route("**/staff/queue/read", (route) =>
    route.fulfill({ json: { cases: [{ ...row, state, version }], nextCursor: null } }),
  );
  await page.route("**/staff/queue/detail", (route) =>
    route.fulfill({
      json: { ...row, state, version, claim: "yours", readiness, profile: null, handoff },
    }),
  );
  await page.route("**/staff/queue/handoff", async (route) => {
    const fields = new URLSearchParams(route.request().postData() ?? "");
    expect(Object.fromEntries(fields)).toEqual({
      action: "acknowledge",
      caseId: id,
      expectedVersion: "6",
      requestKey: expect.stringMatching(/^[a-f0-9-]{36}$/),
      attemptId: id,
      evidenceId: id,
    });
    state = "provider_acknowledged";
    version++;
    await route.fulfill({
      json: { caseId: id, state, version, attemptId: id, attemptState: "delivered" },
    });
  });
  await page.goto("/staff/queue");
  await page.getByRole("button", { name: `View case ${id}` }).click();
  await page.getByLabel("Hand-off action").selectOption("acknowledge");
  await expect(page.getByLabel("attempt Id")).toHaveValue(id);
  await page.getByLabel("evidence Id").fill(id);
  await page.getByRole("button", { name: "Record hand-off command" }).click();
  await expect(page.getByText("State: provider acknowledged. Record version: 7.")).toBeVisible();
  expect(page.url()).not.toContain(id);
  expect(
    await page.evaluate(
      () => Object.keys(sessionStorage).length + Object.keys(localStorage).length,
    ),
  ).toBe(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
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
  expect(
    (
      await request.post("/staff/queue/handoff", {
        headers: { origin: "http://127.0.0.1:8085" },
        form: {
          caseId: id,
          action: "prepare",
          expectedVersion: "1",
          requestKey: id,
          authorisationId: id,
        },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/staff/queue/command", {
        headers: { origin: "http://127.0.0.1:8085" },
        form: { caseId: id, action: "claim", expectedVersion: "1", requestKey: id },
      })
    ).status(),
  ).toBe(401);
  expect(errors).toEqual([]);
});
test("synthetic claim/release is versioned, refreshes live detail and keeps readiness blocked", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  let version = 1;
  let claim = "unclaimed";
  await page.route("**/staff/queue/read", (route) =>
    route.fulfill({ json: { cases: [row], nextCursor: null } }),
  );
  await page.route("**/staff/queue/detail", (route) =>
    route.fulfill({ json: { ...row, version, claim, readiness, profile: null } }),
  );
  await page.route("**/staff/queue/command", async (route) => {
    const fields = new URLSearchParams(route.request().postData() ?? "");
    expect(fields.get("caseId")).toBe(id);
    expect(fields.get("expectedVersion")).toBe(String(version));
    expect(fields.get("requestKey")).toMatch(/^[a-f0-9-]{36}$/);
    expect([...fields.keys()].sort()).toEqual([
      "action",
      "caseId",
      "expectedVersion",
      "requestKey",
    ]);
    version++;
    claim = fields.get("action") === "claim" ? "yours" : "unclaimed";
    await route.fulfill({ json: { caseId: id, version, state: row.state, claim, readiness } });
  });
  await page.goto("/staff/queue");
  await page.getByRole("button", { name: `View case ${id}` }).click();
  await page.getByRole("button", { name: "Claim case" }).click();
  await expect(page.getByRole("button", { name: "Release claim" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark ready for hand-off" })).toBeDisabled();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Release claim" }).click();
  await expect(page.getByRole("button", { name: "Claim case" })).toBeVisible();
  expect(version).toBe(3);
  expect(page.url()).not.toContain(id);
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
        claim: "unclaimed",
        readiness,
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
