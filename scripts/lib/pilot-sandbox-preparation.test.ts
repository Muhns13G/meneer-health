import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "operations/pilot-launch/prepare-sandbox.mjs";
// Deliberately omit provider configuration despite the generated ambient ProcessEnv requirements.
const strippedEnvironment = (): NodeJS.ProcessEnv =>
  ({ PATH: process.env.PATH }) as unknown as NodeJS.ProcessEnv;
function run(args: string[], overrides: Record<string, string | undefined> = {}) {
  return spawnSync("bun", ["--no-env-file", path, ...args], {
    env: { ...strippedEnvironment(), ...overrides },
    encoding: "utf8",
    timeout: 5000,
  });
}
const environment = {
  PILOT_SANDBOX_CONFIRM: "isolated-one-sms-test-capture-refund-cleanup",
  SUPABASE_URL: "https://gibfpolrdjotwvewgfsz.supabase.co",
  SUPABASE_DB_URL: "postgresql://synthetic.invalid/gibfpolrdjotwvewgfsz",
  STRIPE_CHECKOUT_ACCOUNT_ID: "acct_1U32UbFfj16Nnr1i",
  STRIPE_RESTRICTED_KEY: "rk_test_synthetic_invalid_not_a_credential",
};
describe("bounded current-pilot sandbox preparation", () => {
  it.each(["sandbox-onboarding.mjs", "sandbox-conversion.mjs"])(
    "keeps %s no-network without an explicit action",
    (file) => {
      const result = spawnSync("bun", ["--no-env-file", `operations/pilot-launch/${file}`], {
        env: strippedEnvironment(),
        encoding: "utf8",
        timeout: 5000,
      });
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ mode: "no-network-plan", charges: 0 });
    },
  );
  it("records the single dispatch before network and leaves historical guards intact", () => {
    const source = readFileSync("operations/pilot-launch/sandbox-onboarding.mjs", "utf8");
    const dispatch = source.indexOf('"/staff/mobile-invitations/dispatch"');
    expect(dispatch).toBeGreaterThan(0);
    expect(source.indexOf("m.dispatched = true")).toBeLessThan(dispatch);
    expect(source).toContain("OPERATOR_CLEANUP_VALIDATION_FAILED");
    expect(readFileSync("scripts/sql/sprint-13-onboarding-cleanup.sql", "utf8")).toContain(
      "status='suspended'",
    );
  });
  it("keeps fixture preparation no-network by default", () => {
    const result = spawnSync(
      "bun",
      ["--no-env-file", "operations/pilot-launch/sandbox-fixtures.mjs"],
      {
        env: strippedEnvironment(),
        encoding: "utf8",
        timeout: 5000,
      },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      mode: "no-network-plan",
      seedsClients: false,
      seedsQuestionnaires: false,
      seedsFinancialEvidence: false,
      sends: 0,
      charges: 0,
    });
  });
  it("defaults to a no-network plan even without any credentials", () => {
    const result = run([]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      stage: "no-network-plan",
      maximumSms: 1,
      maximumCaptures: 1,
      ownerPromotionRequired: true,
      sends: 0,
      charges: 0,
    });
  });
  it.each([
    { PILOT_SANDBOX_CONFIRM: "" },
    { CI: "true" },
    { SUPABASE_URL: "https://wrong-project.invalid" },
    { STRIPE_RESTRICTED_KEY: "rk_live_synthetic_invalid_not_a_credential" },
    { STRIPE_CHECKOUT_ACCOUNT_ID: "acct_wrong_synthetic" },
  ])("rejects unsafe inputs before provider access: %j", (overrides) => {
    const result = run(["--inspect"], { ...environment, ...overrides });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("SANDBOX_GUARD_REJECTED");
    expect(result.stdout).toBe("");
  });
  it("never promotes, sends, captures or replaces live-key bindings", () => {
    const source = readFileSync(path, "utf8");
    expect(source).not.toMatch(/wrangler\(\["(?:deploy|rollback)"/);
    expect(source).not.toContain('"versions", "deploy"');
    expect(source).not.toContain("STRIPE_LIVE_");
    expect(source).not.toMatch(/checkout\.sessions\.create|refunds\.create|\/v2\/messages/);
    expect(source).toContain('flag: manifest.saved ? "w" : "wx"');
    expect(source).toContain("LIVE_CHECKOUT_NOT_PAUSED");
    expect(source).toContain("CONFIGURATION_CHANGED_SOURCE");
  });
});
