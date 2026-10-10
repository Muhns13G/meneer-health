import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { isolateExternalFonts } from "./helpers";
import {
  evidenceFixtureId as id,
  productEvidenceFixture,
} from "../src/test/product-evidence-fixture";

for (const role of ["operations", "clinician"] as const) {
  test(`${role} records and revokes exact synthetic evidence`, async ({ page }) => {
    await isolateExternalFonts(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const target = role === "clinician" ? { intakeId: id } : { caseId: id };
    if (role === "operations") {
      const row = {
        caseId: id,
        state: "onboarding_pending",
        version: 1,
        assignedOwner: id,
        createdAt: "2026-10-10T01:00:00Z",
        updatedAt: "2026-10-10T01:00:00Z",
        profileActive: true,
        emailVerified: true,
        exceptionCode: null,
        handoffReadiness: "not_evaluated",
        paymentReadiness: "not_evaluated",
      };
      await page.route("**/staff/queue/read", (r) =>
        r.fulfill({ json: { cases: [row], nextCursor: null } }),
      );
      await page.route("**/staff/queue/detail", (r) =>
        r.fulfill({
          json: {
            ...row,
            claim: "unclaimed",
            profile: null,
            readiness: {
              profileActive: true,
              accountActive: true,
              emailVerified: true,
              instrumentsCurrent: false,
              authorisationCurrent: false,
              paymentReadiness: "integration_pending",
              recipientReadiness: "integration_pending",
              ready: false,
            },
          },
        }),
      );
      await page.goto("/staff/queue");
      await page.getByRole("button", { name: `View case ${id}` }).click();
      await page.getByText("Product approval evidence", { exact: true }).click();
    } else {
      await page.route("**/staff/intake/command", (r) =>
        r.fulfill({
          json:
            r.request().postDataJSON().action === "list"
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
                  expiresAt: new Date(Date.now() + 300000).toISOString(),
                }
              : {
                  intakeId: id,
                  snapshotId: id,
                  version: 1,
                  state: "submitted",
                  safetyHold: false,
                  fields: {},
                  expiresAt: new Date(Date.now() + 300000).toISOString(),
                },
        }),
      );
      await page.goto("/staff/intake");
      await page.getByRole("button", { name: "Load granted work" }).click();
      await page.getByRole("button", { name: /Open intake/ }).click();
      await page.getByText("Exact product approval", { exact: true }).click();
    }
    const kind = role === "clinician" ? "clinical" : "provider_stock";
    let current = true,
      records = 0,
      revocations = 0;
    await page.route("**/staff/products/evidence", (r) => {
      const c = r.request().postDataJSON();
      expect(c.target).toEqual(target);
      if (c.action === "record") {
        records++;
        expect(c.kind).toBe(kind);
        expect(c.draftId).toBe(id);
        expect(c.evidenceReference).toBe(id);
        expect(c.requestKey).toBe(r.request().headers()["idempotency-key"]);
      }
      if (c.action === "revoke") {
        revocations++;
        current = false;
        expect(c.evidenceId).toBe(id);
      }
      return r.fulfill({
        json: {
          ...productEvidenceFixture(role),
          evidence: records
            ? [
                {
                  id,
                  kind,
                  expiresAt: new Date(Date.now() + 3600000).toISOString(),
                  current,
                  canRevoke: true,
                },
              ]
            : [],
        },
      });
    });
    const panel = page.getByRole("region", { name: "Independent product evidence" });
    await panel.getByRole("button", { name: "Load / reconcile product evidence" }).click();
    await expect(panel.getByText("Synthetic item × 2")).toBeVisible();
    await panel.getByLabel("Private source evidence reference").fill(id);
    await panel.getByRole("checkbox").check();
    const button = panel.getByRole("button", {
      name:
        role === "clinician"
          ? "Record exact clinical approval"
          : "Record independent provider evidence",
    });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(panel.getByRole("status")).toContainText("Attributed evidence recorded");
    expect(records).toBe(1);
    await panel.getByLabel("Private source evidence reference").fill(id);
    await panel
      .getByRole("button", { name: `Revoke ${kind.replaceAll("_", " ")} evidence` })
      .click();
    await expect(panel.getByText(/not current/)).toBeVisible();
    expect(revocations).toBe(1);
    expect(
      (
        await new AxeBuilder({ page })
          .include('section[aria-label="Independent product evidence"]')
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await panel.screenshot({
      path: `/tmp/meneer-product-evidence-${role}-${test.info().project.name}.png`,
    });
    expect(page.url()).not.toContain(id);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect(panel.getByLabel("Private source evidence reference")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
test("anonymous disabled evidence endpoint returns no private projection", async ({ request }) => {
  const r = await request.post("/staff/products/evidence", {
    headers: { origin: "http://127.0.0.1:8085", "Idempotency-Key": id },
    data: { action: "read", target: { caseId: id } },
  });
  expect([401, 412]).toContain(r.status());
  expect(r.headers()["cache-control"]).toContain("no-store");
});
