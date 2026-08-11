---
runbook_id: meneer-stripe-checkout-webhook
title: Stripe Checkout and Webhook Operations Runbook
status: inactive-until-approved
last_updated: 2026-08-11
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Stripe Checkout and Webhook Operations Runbook

## Current Boundary

The repository contains a local/test-mode payment foundation only. Exact local POST boundaries exist
at `/api/payments/checkout` and `/api/payments/stripe/webhook`; hosted requests fail closed and no
customer-facing control links to them. Three reusable ZAR sandbox Prices and a least-privilege test
key are configured locally. No production price, hosted webhook, live credential, completed charge,
or public payment journey is active. TD-010 approval and a reviewed release remain prerequisites.

## Test-Mode Provisioning

1. Before public activation, confirm the accountable account owner, MFA, merchant/tax allocation,
   production ZAR prices, line descriptions, terms, refunds, and support/reconciliation owners.
2. The sandbox catalogue reuses one consultation, medication, and delivery Price across the three
   approved test scenarios. Record only `price_*` identifiers in the governed server catalogue—never
   accept a browser-supplied Price or amount.
3. Use a restricted test key limited to the required Checkout read/create operations. Provision it as
   `STRIPE_RESTRICTED_KEY`; `sk_test_*` and all live keys are deliberately rejected.
4. Create a test webhook endpoint and provision its signing secret as
   `STRIPE_WEBHOOK_SIGNING_SECRET`. Keep both values server-only and out of Git, logs, screenshots,
   RAG, previews, and client bundles.
5. Keep previews provider-disabled. Apply migrations and test configuration only through the
   repository-owner release process.

## Checkout and Webhook Rules

- Create one-time Checkout Sessions only after the internal order and immutable line snapshots are
  durable. Use the internal retry key as Stripe's idempotency key.
- Send only opaque `orderId` and `tenantId` metadata. Never send a name, contact detail, symptom,
  diagnosis, questionnaire answer, prescription, product-specific health inference, or raw note.
- Do not treat the Checkout success URL as payment evidence. Only a verified, durably applied
  provider event may change payment state.
- Verify the signature against the unmodified request body. Reject missing, oversized, modified,
  live-mode, unsupported, or invalid events before any durable state change.
- Acknowledge success only after the event, payment projection, reconciliation outcome, and audit
  evidence commit. Provider retry is required after a durable failure.

## Reconciliation and Incident Response

Monitor Checkout completion, delayed success/failure, expiration, refunds, disputes, duplicate
delivery, unmatched references, and payment-intent conflicts. Partial refunds and ambiguous events
enter `payment_reconciliation_exceptions`; they must not trigger supply or dispatch. The operations
owner resolves the provider ledger against internal order lines and records safe identifiers,
outcome, correlation, and audit evidence.

For signing-key exposure, revoke and replace the secret, disable the endpoint, preserve redacted
evidence, and follow the incident runbook. For restricted-key exposure, revoke it immediately and
review Checkout creation activity. Never log the raw body or credential while investigating.

## Required Activation Exercise

Before enabling any customer route, use Stripe test mode to prove all three scenarios plus invalid
signature, modified body, duplicate, delayed success/failure, expired session, clinical rejection,
full and partial refund, dispute, unmatched event, dependency failure, alert delivery, and manual
reconciliation. Confirm clinical and fulfilment states never change from payment evidence alone.
Record only redacted IDs/timestamps and the reviewed result.

## Local Verification

With the synthetic Supabase stack active, run:

```bash
bun run db:reset
bun run db:test
bun run test:payments
```

These checks use reserved synthetic values and an SDK-generated test signature; they make no Stripe
network request and do not prove hosted account activation.

With the ignored local Stripe sandbox configuration loaded, additionally run:

```bash
bun --env-file=.env.production.local run test:payments:provider
```

This creates no-charge Checkout Sessions for all three scenarios, validates the remote sandbox
objects and opaque metadata, and applies a signed webhook to reset local Supabase data. It does not
complete a payment, deploy an endpoint, or prove live/hosted readiness.
