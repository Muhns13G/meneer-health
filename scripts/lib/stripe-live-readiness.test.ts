import { expect, it } from "vitest";
import {
  readStripeLiveReadinessConfiguration,
  summarizeStripeLiveAccount,
} from "./stripe-live-readiness";
const account = "acct_synthetic12345";
it("requires explicit read-only confirmation and a separate live restricted key", () => {
  const input = {
    STRIPE_LIVE_READINESS_CONFIRM: "read-only-live-account",
    STRIPE_LIVE_ACCOUNT_ID: account,
    STRIPE_LIVE_RESTRICTED_KEY: "rk_live_synthetic_only",
  };
  expect(readStripeLiveReadinessConfiguration(input)).toEqual(input);
  for (const patch of [
    { STRIPE_LIVE_READINESS_CONFIRM: "" },
    { STRIPE_LIVE_RESTRICTED_KEY: "rk_test_synthetic_only" },
    { STRIPE_LIVE_RESTRICTED_KEY: "sk_live_synthetic_only" },
    { STRIPE_LIVE_ACCOUNT_ID: "" },
  ]) {
    expect(() => readStripeLiveReadinessConfiguration({ ...input, ...patch })).toThrow(
      "STRIPE_LIVE_READINESS_CONFIGURATION_INVALID",
    );
  }
});
it("returns only redacted capabilities, does not interpret enablement as activation approval", () => {
  const value = {
    id: account,
    country: "US",
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    capabilities: { card_payments: "active" },
    requirements: { pending_verification: ["private-requirement"], currently_due: [] },
    email: "private@example.invalid",
    business_profile: { name: "private-business" },
  };
  const result = summarizeStripeLiveAccount(value, account);
  expect(result).toMatchObject({
    cardPaymentsActive: true,
    pendingVerificationCount: 1,
    paymentActivationApproved: false,
  });
  expect(JSON.stringify(result)).not.toMatch(/private|acct_/);
  expect(() => summarizeStripeLiveAccount(value, "acct_other12345")).toThrow(
    "STRIPE_LIVE_READINESS_ACCOUNT_MISMATCH",
  );
  expect(() => summarizeStripeLiveAccount({ ...value, charges_enabled: "true" }, account)).toThrow(
    "STRIPE_LIVE_READINESS_RESPONSE_INVALID",
  );
});
