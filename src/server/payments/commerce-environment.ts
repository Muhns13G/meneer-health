import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { StripePaymentEnvironment } from "./stripe-payment-environment";

export type CommerceEnvironmentBindings = {
  COMMERCE_CHECKOUT_MODE?: unknown;
  COMMERCE_WEBHOOK_MODE?: unknown;
  COMMERCE_REFUND_MODE?: unknown;
  COMMERCE_REVIEW_TENANT_ID?: unknown;
  STRIPE_WEBHOOK_SERVICE_IDENTITY_ID?: unknown;
  STRIPE_CHECKOUT_ACCOUNT_ID?: unknown;
  STRIPE_RESTRICTED_KEY?: unknown;
  STRIPE_WEBHOOK_SIGNING_SECRET?: unknown;
  STRIPE_LIVE_ACCOUNT_ID?: unknown;
  STRIPE_LIVE_RESTRICTED_KEY?: unknown;
  STRIPE_LIVE_WEBHOOK_SIGNING_SECRET?: unknown;
};

export function paymentMode(value: unknown): StripePaymentEnvironment | null {
  return value === "sandbox" || value === "live" ? value : null;
}

export function commerceCredentials(
  bindings: CommerceEnvironmentBindings,
  environment: StripePaymentEnvironment,
) {
  return {
    account:
      environment === "live"
        ? bindings.STRIPE_LIVE_ACCOUNT_ID
        : bindings.STRIPE_CHECKOUT_ACCOUNT_ID,
    key:
      environment === "live" ? bindings.STRIPE_LIVE_RESTRICTED_KEY : bindings.STRIPE_RESTRICTED_KEY,
    secret:
      environment === "live"
        ? bindings.STRIPE_LIVE_WEBHOOK_SIGNING_SECRET
        : bindings.STRIPE_WEBHOOK_SIGNING_SECRET,
  };
}

export function commerceCallbackConfigured(bindings: CommerceEnvironmentBindings) {
  const mode = paymentMode(bindings.COMMERCE_WEBHOOK_MODE);
  if (!mode) return false;
  const { account, key, secret } = commerceCredentials(bindings, mode);
  if (
    !z.uuid().safeParse(bindings.STRIPE_WEBHOOK_SERVICE_IDENTITY_ID).success ||
    typeof secret !== "string" ||
    !secret.startsWith("whsec_")
  )
    return false;
  // Sandbox providers validate their own credentials; live also requires complete isolated bindings.
  return (
    mode === "sandbox" ||
    (z.uuid().safeParse(bindings.COMMERCE_REVIEW_TENANT_ID).success &&
      typeof account === "string" &&
      /^acct_[A-Za-z0-9]{8,64}$/.test(account) &&
      account !== bindings.STRIPE_CHECKOUT_ACCOUNT_ID &&
      typeof key === "string" &&
      key.startsWith("rk_live_") &&
      secret !== bindings.STRIPE_WEBHOOK_SIGNING_SECRET)
  );
}

export function commerceCheckoutConfigured(bindings: CommerceEnvironmentBindings) {
  return (
    paymentMode(bindings.COMMERCE_CHECKOUT_MODE) !== null &&
    bindings.COMMERCE_CHECKOUT_MODE === bindings.COMMERCE_WEBHOOK_MODE &&
    commerceCallbackConfigured(bindings)
  );
}

export function commerceSettlementConfigured(bindings: CommerceEnvironmentBindings) {
  // Stopping new Checkouts must not stop signed callbacks or original-method refunds.
  return (
    commerceCallbackConfigured(bindings) &&
    (bindings.COMMERCE_CHECKOUT_MODE === "disabled" ||
      bindings.COMMERCE_CHECKOUT_MODE === bindings.COMMERCE_WEBHOOK_MODE)
  );
}

export function commerceOriginAllowed(url: URL, bindings: CommerceEnvironmentBindings) {
  if (
    [
      bindings.COMMERCE_CHECKOUT_MODE,
      bindings.COMMERCE_WEBHOOK_MODE,
      bindings.COMMERCE_REFUND_MODE,
    ].includes("live")
  )
    return url.origin === "https://meneerhealth.co.za";
  return ["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname);
}
