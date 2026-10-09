---
plan_id: phase-02-live-payment-activation
title: Live Payment Activation — Environment Isolation and Release Acceptance
status: local-implementation-verified-hosted-acceptance-pending
last_updated: 2026-10-09
owner: "@Muhns13G"
authority: engineering-preparation-not-live-charge-or-pilot-activation
---

# Live Payment Activation

## Scope and Facts

The owner requests live payments for the initial cohort of fewer than ten participants. Retain the
approved R999 review deposit, capped first-order product credit, original-method unused-deposit
refund, schedule RRP and separately approved delivery. Catalogue display is not clinical approval,
product Checkout, prescribing, dispensing or generator transfer. No new charge, forfeiture or fee
is authorised by this engineering request.

The separately provisioned restricted live key remains only in ignored `.env.production.local`.
It is separate from the existing sandbox account/key and has not been provisioned to Cloudflare.
Do not log either credential. The live signing secret must also be separately provisioned; the
sandbox signing secret cannot authenticate live release acceptance.

A read-only live Accounts retrieval on 9 October verified the configured account ID, US account
country, `charges_enabled=true`, `payouts_enabled=true`, submitted details, active card payments,
no current disabled reason or currently-due items, and **one pending verification item**.
These facts do not establish provider acceptance of the actual consultation/product business.
An additional read-only retrieval confirms the US account's company is **Octothorp LLC**, with
**Meneer Health** as merchant display name. The owner confirms Meneer Health branding and reports
Stripe acceptance; no private business-acceptance reference was inspected. The current seller
contract names **OCTOTHORP ZA**. On 9 October the owner explicitly selected arrangement A:
**OCTOTHORP ZA remains the seller; Octothorp LLC collects its payments under the owner-confirmed
arrangement.** Retain Meneer Health branding. This resolves the entity-choice decision; it is not
independent inspection of an intercompany agreement or Stripe's acceptance of that arrangement.
Final transaction disclosures must reflect the seller and payment collector accurately. Do not
replace the contracting entity or treat the merchant display name as evidence of the arrangement.
Do not conceal the actual commercial activity behind generic descriptions.

## Completed Engineering Preparation

- Checkout/refund providers accept an explicitly selected `live` environment. Their default remains
  `sandbox`; commerce routes now explicitly select the configured environment. Restricted-key prefixes, account retrieval,
  strict Session ID syntax and provider object `livemode` must agree with the selected environment.
- Signed receipt normalisation accepts explicitly selected live events and rejects test events,
  foreign accounts, inconsistent nested modes, invalid signatures and wrong Session environment.
  The HTTP webhook selects the matching receipt schema and durable environment-bound RPC.
- Forward migration `20261009030522_payment_environment_isolation.sql` preserves historical sandbox
  records and binds each provider account permanently to one environment. Release and intent modes,
  Session prefixes and settlement authority must agree. Retired inner callback ACLs remain closed.
  A tenant with financial history cannot adopt a different account/environment; use a separately
  approved live release/tenant instead of reclassifying sandbox evidence. Existing legacy sandbox
  contract schemas and callback entrypoint remain sandbox-only.
- Live routes require exact canonical HTTPS production origin, distinct live key/account/signing
  secret, tenant/service authority and consistent modes. There is no sandbox fallback. Disabling new
  Checkouts can leave signed settlement and original-method refunds running for existing captures.
- Local migration, rollback-only negative paths and existing reconciliation/refund packets adapted
  to explicit synthetic live facts pass. These do not contact Stripe or prove hosted live payments.
- `check:payments:live-readiness` performs only Accounts retrieval and outputs redacted capability
  flags/counts. It creates no Checkout, customer, PaymentIntent, webhook or refund. All errors are
  generic; account/contact/requirement contents and credentials are never printed.

Run the guarded read-only inspection outside CI:

```sh
STRIPE_LIVE_READINESS_CONFIRM=read-only-live-account \
  bun --env-file=.env.production.local run check:payments:live-readiness
```

## Remaining Implementation and Acceptance — Not Completed

1. Retain the owner-selected seller/collector arrangement and verify applicable provider/business
   acceptance and pending verification. Complete exact
   seller, transaction, cancellation/refund and invoice disclosures; publish approved version/hash
   through existing governed instruments. Active API capabilities alone are not approval.
2. Obtain explicit approval for the new hosted migration/configuration, prepare the exact live webhook
   destination/events/API version, provision separate server secrets and release authority, and
   have the owner deploy/promote. Do not reuse a rehearsal service identity or synthetic legal copy.
3. Obtain separate bounded approval for a real-payment acceptance test: exact amount, payer,
   original-method refund and provider fees. No official test card on live mode. Verify signed
   durable settlement, independent refund confirmation, reconciliation, operator handling and
   disabled/stop controls on the exact deployed release. Returning from Checkout is not evidence.
4. Record live acceptance and launch approval separately from earlier sandbox completion. Do not
   mark TD-010 Verified or activate the pilot until the applicable gates actually pass.

The protocol generator stays inactive and private uploads deferred. Existing invitation/intake,
clinical safety, party/notice, operating coverage and recovery gates are not waived by payment work.
The owner retains staging, commit, push, deployment, promotion and rollback control.

## References

- [Owner launch scope](pilot-activation-owner-approval-packet.md)
- [Commercial payment contract](sprint-11-1-commercial-payment-contract.md)
- [Stripe key isolation and restricted-key guidance](https://docs.stripe.com/keys-best-practices)
- [Stripe live checklist](https://docs.stripe.com/get-started/checklist/go-live)

The Stripe skill informed restricted-key and environment isolation; Supabase guidance informed the
forward-migration/review boundary. This document is a preparation packet, not hosted acceptance.

## Validation and File Accounting

The final sequential application regression passed **1,150 tests in 155 files**, including added
HTTP/live refund stop-control and fixed SQL-runner regression checks. The focused
payment/configuration packet passed 89 tests in 12 files at its earlier checkpoint.
Fresh local migration/reset and the full database matrix passed **2,044 assertions in 43 files**.
The no-provider live-mode financial rehearsal passed **126 assertions in two rollback-only suites**,
with exact baseline restoration. Local security advisors report no issues. Final TypeScript and
ESLint checks passed on Node 22. All **314 desktop/mobile Playwright/axe checks passed** on Node 22.
Production build, client configuration-canary/MCP-absence checks, Cloudflare upload dry-run,
formatting, portability, discovery, generated-file and Worker type checks pass. An overlapping run
had two existing stepped-flow UI failures under resource contention; their isolated retry and the
fresh full run pass. The initial browser run hit sandbox port permissions and its interrupted retry
timed out under overlapping load; the final complete sequential browser run is green.
No hosted migration, live charge, refund, webhook resource or live release has been performed.

Added files cover environment selection/tests, read-only account readiness/tests, guarded live SQL
rehearsal/tests, this activation packet and the forward migration/database test. Changed files cover
Worker dispatch, Checkout/webhook/refund HTTP boundaries, provider tests, CI, package commands, catalogue
and environment example, AGENTS guidance and current-state/limitation/owner packets. Earlier owner
scope documentation remains preserved. No dependency or generated source change is intended.
The tree remains unstaged for owner review; no commit, push, deployment or branch change is performed.

## Owner Deployment Sequence — Keep Disabled Until Acceptance

1. Commit reviewed source and deploy it with payment modes still `disabled`.
   Source deployment is safe preparation, not permission to accept real money.
2. Separately approve/apply the new hosted migration and review its account/environment associations.
   Provision an approved live tenant release and webhook service identity through existing governed
   release controls; do not reuse disposable rehearsal authority or synthetic instruments.
3. Provision `STRIPE_LIVE_ACCOUNT_ID`, `STRIPE_LIVE_RESTRICTED_KEY` and a new
   `STRIPE_LIVE_WEBHOOK_SIGNING_SECRET` server-side. Keep sandbox variables unchanged.
   Register the live account webhook at `https://meneerhealth.co.za/api/payments/stripe/webhook`
   with API version `2026-07-29.dahlia`, subscribing to `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`,
   `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, `refund.created`,
   `refund.updated` and `refund.failed`. Scope restricted-key permissions to the existing adapter's
   required operations; never put keys into public build variables.
4. After final instruments, provider acceptance and bounded real-test approval, explicitly select
   `live` for Checkout/webhook/refund modes with exact `COMMERCE_REVIEW_TENANT_ID` and
   `STRIPE_WEBHOOK_SERVICE_IDENTITY_ID`. Verify the actual deployed journey before cohort activation.
5. Stop new purchases with `COMMERCE_CHECKOUT_MODE=disabled`; retain live callbacks/refunds as
   required for unsettled captures. Disabling all modes is not a safe substitute for reconciliation.

### Review Inventory

This inventory includes preserved owner-scope work as well as the payment implementation; all are
unstaged. The owner chooses the final commit grouping.

- `.env.example`
- `.github/workflows/ci.yml`
- `AGENTS.md`
- `config/environment-catalogue.ts`
- `docs/02-implementation-plans/phase-02/README.md`
- `docs/02-implementation-plans/phase-02/annexures/sprint-13-pre-release-gap-remediation.md`
- `docs/03-completion-reports/phase-02/phase-02-minimum-pilot-enablement.md`
- `docs/03-completion-reports/phase-02/sprint-14-mobile-pilot-invitations.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/06-operations/mobile-invitations-release-runbook.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`
- `package.json`
- `src/config/environment.test.ts`
- `src/server.ts`
- `src/server/payments/order-review-http.test.ts`
- `src/server/payments/order-review-http.ts`
- `src/server/payments/pilot-checkout.test.ts`
- `src/server/payments/pilot-checkout.ts`
- `src/server/payments/pilot-refund.ts`
- `src/server/payments/pilot-webhook.test.ts`
- `src/server/payments/pilot-webhook.ts`
- `src/server/payments/refund-dispatch.test.ts`
- `src/server/payments/refund-dispatch.ts`
- `src/server/payments/refund-http.test.ts`
- `src/server/payments/refund-http.ts`
- `docs/02-implementation-plans/phase-02/annexures/live-payment-activation.md`
- `docs/02-implementation-plans/phase-02/annexures/pilot-activation-owner-approval-packet.md`
- `scripts/check-stripe-live-readiness.ts`
- `scripts/lib/live-commerce-rehearsal.test.ts`
- `scripts/lib/live-commerce-rehearsal.ts`
- `scripts/lib/stripe-live-readiness.test.ts`
- `scripts/lib/stripe-live-readiness.ts`
- `scripts/test-live-commerce-rehearsal.ts`
- `src/server/payments/commerce-environment.test.ts`
- `src/server/payments/commerce-environment.ts`
- `src/server/payments/stripe-payment-environment.test.ts`
- `src/server/payments/stripe-payment-environment.ts`
- `supabase/migrations/20261009030522_payment_environment_isolation.sql`
- `supabase/tests/database/payment_environment_isolation.test.sql`
