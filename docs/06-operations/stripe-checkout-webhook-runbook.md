---
runbook_id: meneer-stripe-checkout-webhook
title: Stripe Checkout and Webhook Operations Runbook
status: inactive-until-approved
last_updated: 2026-10-06
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Stripe Checkout and Webhook Operations Runbook

## Current Boundary

Sprint 11 now supplies protected `/portal/payments/*` and `/staff/payments/*` commerce boundaries,
plus the guarded `/api/payments/stripe/webhook` callback. The
[11.1 contract](../02-implementation-plans/phase-02/annexures/sprint-11-1-commercial-payment-contract.md)
owns the R999 review deposit, separately accepted approved RRP order, capped product credit,
unused-deposit original-method refund and separate delivery charge. The legacy three-price exercise
below is historical foundation proof, not proof of these current pilot scenarios.

Task [11.8](../02-implementation-plans/phase-02/annexures/sprint-11-8-payment-reconciliation.md)
is completed locally. Signed exact-refund confirmation, bounded verified-failure retries,
provider-checked unpaid credit release and native deposit readiness are implemented. Separate
duplicate-capture full refunds, final dispute resolution and immutable replacement deposit offers
are locally verified. Task 11.9's actual uncompleted-provider Session preflight now passes, and the
eight approved schema migrations have been applied hosted without seed data. Authenticated
hosted/captured-payment acceptance and activation are not claimed; TD-010 stays In progress.

### Reconciliation Controls Before Hosted Release

- Assigned current AAL2 financial staff need an independently approved, expiring case grant.
  Use **Reconcile verified payment evidence**; the server independently retrieves the exact current
  test-account Session/PaymentIntent or Dispute before recording an opaque observation. Browser
  amounts, provider IDs and force-confirm flags are not accepted.
- Restrict the test key to required account/Checkout/PaymentIntent/Dispute reads and refund writes.
  Include signed `charge.dispute.updated` alongside created/closed and the existing refund events
  in the separately approved endpoint configuration. Do not turn on live mode to satisfy a read.
- A duplicate capture is a distinct captured PaymentIntent, not a repeated event. Reconciliation
  reserves its full refund to the original method; dispatch remains sandbox-only and default-off.
  Keep uncertainty held. Only independently verified failure can reserve one retry per failed job.
- Take ownership of an open dispute, then handle its response/evidence in the Stripe Dashboard.
  The ownership control does not submit provider evidence. Reconcile the exact terminal outcome;
  won/warning-closed can release only otherwise clean funding, while lost or conflicting funds
  remain unavailable. Review associated refunds and credit before any progression.
- To replace a failed/expired deposit, independently inspect terminal unpaid money first, then
  **Authorise replacement deposit Checkout**. Approval and observation last 15 minutes. An unused
  expired approval requires fresh inspection/authorisation; never edit old evidence. The client
  reviews and accepts the distinct current offer before Checkout. Late original payment blocks
  replacement or requires a full duplicate refund if replacement was already paid.
- Eight local Sprint 11 migrations require separate hosted approval. Preserve the real pilot's
  suspended state, use isolated synthetic fixtures, verify provider permissions and receipt routes,
  and restore the approved baseline during Task 11.9. No real charge or refund is authorised here.

### Historical Phase 01 Foundation

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

### Current Sprint 11 Controls

- Keep Checkout, webhook and refund environment modes disabled outside an explicitly approved
  sandbox release. Current expiring database/account releases and independent financial grants are
  additional requirements, not substitutes for environment modes.
- Subscribe the approved test callback to `refund.created`, `refund.updated` and `refund.failed`
  as well as the existing Checkout, PaymentIntent failure, cumulative refund and dispute events.
  Provisioning and delivery proof remain Task 11.9; this document does not assert they occurred.
- Refund metadata contains only the opaque immutable job reference. Exact account, original
  PaymentIntent, amount and currency must match independently signed evidence before confirming a
  job. A create-refund response, success redirect or cumulative charge total alone cannot confirm it.
- Reconcile through the assigned AAL2 staff control with a current independent financial grant.
  Retain pending/uncertain reservations. Retry only a signed terminal failed/canceled job, with one
  durable replacement reference. Never retry a confirmed job or change its original destination.
- Before releasing unpaid reserved credit, the server reads the current approved test account,
  exact Checkout Session and associated PaymentIntent. It rejects open, processing, captured,
  mismatched, foreign-account or ambiguous evidence. Required restricted-key permissions include
  account, Checkout and PaymentIntent reads in addition to the existing refund dispatch permissions.
- Newly journalled provider exceptions create content-free owned alerts; staff views expose only
  opaque references, coded reasons and state. Alert records are not evidence of delivered email.
- Never force-clear conflicting captures or disputes. Preserve their evidence and holds until the
  current provider/hosted outcomes are independently verified. Do not refund an unrelated
  PaymentIntent merely because a valid event names a known order.
- A clean native review deposit can supply monetary readiness; identity, consent, medical safety,
  approval, pharmacy, custody and delivery controls remain independent. Paid never means dispensed.

### Historical Foundation Exception Store

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

For the **current Sprint-11 adapter**, use the separately approved
[`test:payments:pilot-provider` packet](../02-implementation-plans/phase-02/annexures/sprint-11-9-sandbox-journey-evidence.md).
It creates uncompleted deposit, credited-order/delivery and zero-balance Sessions, verifies actual
provider objects/retries/lines/metadata, expires only its returned Sessions and checks terminal unpaid
state. It neither resets a database nor confirms payments. Task 11.9 still requires captured-payment,
authenticated hosted, exception and restoration evidence; do not use this narrower command to close
TD-010. Test-account history and inline catalogue artifacts remain visible to the account owner.
