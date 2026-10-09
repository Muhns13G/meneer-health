import { expect, it } from "vitest";
import {
  commerceCallbackConfigured,
  commerceCheckoutConfigured,
  commerceCredentials,
  commerceOriginAllowed,
  commerceSettlementConfigured,
} from "./commerce-environment";

const live = {
  COMMERCE_CHECKOUT_MODE: "live",
  COMMERCE_WEBHOOK_MODE: "live",
  COMMERCE_REFUND_MODE: "live",
  COMMERCE_REVIEW_TENANT_ID: "a3100000-0000-4000-8000-000000000001",
  STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: "a3100000-0000-4000-8000-000000000002",
  STRIPE_LIVE_ACCOUNT_ID: "acct_syntheticlive123",
  STRIPE_CHECKOUT_ACCOUNT_ID: "acct_synthetictest123",
  STRIPE_LIVE_RESTRICTED_KEY: "rk_live_synthetic_only",
  STRIPE_RESTRICTED_KEY: "rk_test_synthetic_only",
  STRIPE_LIVE_WEBHOOK_SIGNING_SECRET: "whsec_synthetic_live_only",
  STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_synthetic_test_only",
};
it("selects only separate live credentials with explicit matching modes", () => {
  expect(commerceCheckoutConfigured(live)).toBe(true);
  expect(commerceCredentials(live, "live").key).toBe(live.STRIPE_LIVE_RESTRICTED_KEY);
  for (const patch of [
    { COMMERCE_WEBHOOK_MODE: "sandbox" },
    { COMMERCE_CHECKOUT_MODE: "sandbox" },
    { STRIPE_LIVE_RESTRICTED_KEY: live.STRIPE_RESTRICTED_KEY },
    { STRIPE_LIVE_ACCOUNT_ID: live.STRIPE_CHECKOUT_ACCOUNT_ID },
    { STRIPE_LIVE_WEBHOOK_SIGNING_SECRET: live.STRIPE_WEBHOOK_SIGNING_SECRET },
    { STRIPE_LIVE_RESTRICTED_KEY: undefined },
    { STRIPE_LIVE_ACCOUNT_ID: undefined },
    { STRIPE_LIVE_WEBHOOK_SIGNING_SECRET: undefined },
    { COMMERCE_REVIEW_TENANT_ID: "invalid" },
    { STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: "invalid" },
  ])
    expect(commerceCheckoutConfigured({ ...live, ...patch })).toBe(false);
  expect(commerceCallbackConfigured({})).toBe(false);
});
it("requires canonical HTTPS for every live payment surface", () => {
  expect(commerceOriginAllowed(new URL("https://meneerhealth.co.za/portal/order"), live)).toBe(
    true,
  );
  for (const origin of [
    "http://meneerhealth.co.za",
    "https://meneerhealth.co.za:8443",
    "http://localhost:8085",
    "https://preview.example.invalid",
    "https://meneerhealth.co.za.example.invalid",
  ])
    expect(commerceOriginAllowed(new URL(origin), live)).toBe(false);
});
it("can stop new Checkouts without stopping settlement/refunds, but never mixes environments", () => {
  const stopped = { ...live, COMMERCE_CHECKOUT_MODE: "disabled" };
  expect(commerceCheckoutConfigured(stopped)).toBe(false);
  expect(commerceSettlementConfigured(stopped)).toBe(true);
  expect(commerceSettlementConfigured({ ...stopped, COMMERCE_WEBHOOK_MODE: "disabled" })).toBe(
    false,
  );
  expect(commerceSettlementConfigured({ ...live, COMMERCE_CHECKOUT_MODE: "sandbox" })).toBe(false);
});
