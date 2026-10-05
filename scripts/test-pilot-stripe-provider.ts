import Stripe from "stripe";
import { PilotCheckoutProvider } from "../src/server/payments/pilot-checkout";
import { PilotRefundProvider } from "../src/server/payments/pilot-refund";
import {
  provePilotStripeUncompletedCheckouts,
  readPilotStripeProofConfiguration,
} from "./lib/pilot-stripe-provider-proof";

// Validate consent/test-key/account before constructing any network consumer.
try {
  const configuration = readPilotStripeProofConfiguration(process.env);
  const key = configuration.STRIPE_RESTRICTED_KEY;
  const account = configuration.STRIPE_CHECKOUT_ACCOUNT_ID;
  const client = new Stripe(key, {
    apiVersion: "2026-07-29.dahlia",
    maxNetworkRetries: 2,
    timeout: 10000,
    telemetry: false,
  });
  const checkout = new PilotCheckoutProvider(key, account, client);
  const inspection = new PilotRefundProvider(key, account, client);
  const result = await provePilotStripeUncompletedCheckouts(account, {
    account: async () => (await client.accounts.retrieveCurrent()).id,
    create: (intent) => checkout.create(intent),
    retrieve: (id) => client.checkout.sessions.retrieve(id),
    lines: (id) => client.checkout.sessions.listLineItems(id, { limit: 10 }),
    expire: (id) => client.checkout.sessions.expire(id),
    inspectTerminal: (input) => inspection.inspectTerminal(input),
  });
  console.log(JSON.stringify(result));
} catch {
  // Never print SDK responses, Checkout URLs, opaque identifiers or environment values.
  console.error("PILOT_STRIPE_PROVIDER_PROOF_FAILED; inspect redacted operator evidence.");
  process.exitCode = 1;
}
