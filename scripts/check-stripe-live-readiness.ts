import Stripe from "stripe";
import {
  readStripeLiveReadinessConfiguration,
  summarizeStripeLiveAccount,
} from "./lib/stripe-live-readiness";

try {
  const configuration = readStripeLiveReadinessConfiguration(process.env);
  const client = new Stripe(configuration.STRIPE_LIVE_RESTRICTED_KEY, {
    apiVersion: "2026-07-29.dahlia",
    maxNetworkRetries: 0,
    timeout: 10000,
    telemetry: false,
  });
  // GET only: no Checkout, PaymentIntent, customer, webhook or refund creation.
  const account = await client.accounts.retrieveCurrent();
  console.log(
    JSON.stringify(summarizeStripeLiveAccount(account, configuration.STRIPE_LIVE_ACCOUNT_ID)),
  );
} catch {
  console.error("STRIPE_LIVE_READINESS_CHECK_FAILED; no provider payload or credential logged.");
  process.exitCode = 1;
}
