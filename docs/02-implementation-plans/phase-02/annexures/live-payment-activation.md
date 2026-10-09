---
plan_id: phase-02-live-payment-activation
title: Live Payment Activation — Environment Isolation and Release Acceptance
status: local-implementation-verified-hosted-acceptance-pending
last_updated: 2026-10-09
owner: "@Muhns13G"
authority: engineering-preparation-not-live-charge-or-pilot-activation
---

# Live Payment Activation

## Latest preparation checkpoint — 9 October

Subsequent approved preparation publishes collection-only intake authority and arms the finite
live database release/service. The exact owner-ready Worker is now
`0b3fbcd9-94cb-4f55-acd5-65dbdd003ea3`, still unpromoted. This supersedes the earlier suspended/
disabled preparation below, not live settlement/refund acceptance. See the
[current release handoff](pilot-release-preparation-2026-10-09.md).

The owner approved the exact pilot terms and delegated the review-service timeframe. The selected
commitment is three working days after confirmed payment and required information. A rollback-only
hosted rehearsal passed, followed by committed publication of account/privacy instruments `1.0`
and review-deposit terms `1.0.0`. Independent readback confirms zero clients/Checkout intents,
one suspended payment service and a disabled live release. See
[the publication checkpoint](pilot-client-terms-v1.md) for authority and expiry details.

Ignored `.env.production.local` now names the real pilot tenant and service
`c7a04672-992e-44fe-918b-76209f974adb`, not the old placeholder service. Cloudflare version
`5aff8046-e188-4274-8db0-1b5a7c37e6e3` contains all three authorised live Stripe credentials
and four matching tenant/service references. It is **unpromoted**. This supersedes the earlier
credential-absence/preflight observations below; it does not assert active production values.
No activation mode was changed, SMS sent, charge created or source deployed at that checkpoint.
Medical-intake publication and finite release validation were subsequently prepared. The
owner-paid test proposal below is withdrawn in favour of the isolated sandbox acceptance
described in the release packet.

## Historical Live Acceptance Proposal and Preflight — 9 October

Superseded: the owner explicitly declined paying R999 personally for testing and approved an
isolated hosted sandbox capture/refund instead. No real charge occurred. The earlier personal
live-payment proposal is withdrawn and must not be treated as current authority or a launch
prerequisite. Use official test cards only in sandbox; retain live and sandbox credentials and
tenant/account financial histories separately. The following preflight is historical evidence.

Read-only hosted preflight finds zero account/privacy instrument publications, zero deposit-term
publications, zero Checkout releases, zero webhook service identities, zero client profiles,
zero Checkout intents and zero provider receipts. The application's own deposit path requires
current account/intake authority, a submitted non-held questionnaire, published deposit terms,
an accepted offer and an unexpired live Checkout release. No prerequisite was fabricated and
no synthetic publication or sandbox harness was repurposed as real payment evidence.

Existing-endpoint inspection using the current live restricted key fails with HTTP 403,
`more_permissions_required`. This does not prove that no endpoint exists. Inspect/create the exact
live destination through the authorised Stripe Dashboard or a suitably scoped credential;
do not broaden the runtime key indiscriminately or replace it with an unrestricted key. The
separate live signing secret was absent from the ignored local record during this preflight.

Dashboard follow-up succeeds on the existing authorised live Meneer Health account. Its event
destinations page shows no configured destinations and an account-review-in-progress banner.
After exact owner approval, the live destination **Meneer live payments** was created and verified
as **Active** on account `acct_1U32SWCBswMrhhx4`, with destination ID
`we_1UOgYmCBswMrhhx4Le291UNk`. It uses Your account / Snapshot / `2026-07-29.dahlia`,
the twelve events listed in the owner deployment sequence below, and
`https://meneerhealth.co.za/api/payments/stripe/webhook`. The dashboard reports zero event deliveries
at creation. After separate owner approval, its signing secret was saved as
`STRIPE_LIVE_WEBHOOK_SIGNING_SECRET` in ignored `.env.production.local`, with file mode `0600`;
all existing file content was preserved and the value was not printed. It has not been provisioned
to the Worker. Destination Active is not evidence of successful application
receipt or settlement. No runtime key permission was expanded to work around the inspection denial.

Next execution order: complete the actual governed publications and payer onboarding prerequisite;
provision the live webhook/service authority and finite release; have the owner release matching
bindings; then create one app-owned Checkout, let the owner pay, verify signed durable settlement,
refund that exact capture and independently reconcile its provider/database status. Retain real
financial acceptance records; do not apply disposable synthetic cleanup to real payment evidence.
The approved live webhook is the only provider object created during this follow-up. No charge,
refund, message, publication, database mutation or Worker release occurred. The payment itself
and TD-010 acceptance remain pending.

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

### Hosted Migration Checkpoint — 9 October

The owner approved applying only `20261009030522_payment_environment_isolation.sql`.
Application succeeded against the hosted Meneer project. The owner separately approved correcting
the MCP-assigned history version `20261009070826` to the committed version `20261009030522`;
the guarded transaction changed exactly one entry and the matching version/name were read back.
The account/environment table has enabled and forced RLS, with no direct SELECT permission for
anon, authenticated or service_role. The two new public wrapper functions permit service_role
execution only; the retired inner callback denies those three roles. Their empty search paths
are preserved. Payment releases, intents, receipts, refund jobs, account bindings and Auth users
remain at zero. No payment configuration, webhook, charge, refund or pilot activation occurred.

This completes the hosted migration portion of item 2 below, not live-payment acceptance or TD-010.
Earlier no-hosted-migration statements in the validation section describe its local-only checkpoint.

1. Retain the owner-selected seller/collector arrangement and verify applicable provider/business
   acceptance and pending verification. Complete exact
   seller, transaction, cancellation/refund and invoice disclosures; publish approved version/hash
   through existing governed instruments. Active API capabilities alone are not approval.
2. Obtain explicit approval for the new hosted migration/configuration, prepare the exact live webhook
   destination/events/API version, provision separate server secrets and release authority, and
   have the owner deploy/promote. Do not reuse a rehearsal service identity or synthetic legal copy.
3. Complete the approved isolated sandbox acceptance: actual onboarding, one test-card capture,
   signed durable settlement, independent refund confirmation, reconciliation, operator handling
   and disabled/stop controls. Do not require a personal real-money test; no official test card
   may be used in live mode. Returning from Checkout is not evidence.
4. Record launch approval and monitoring of legitimate live transactions separately from sandbox completion. Do not
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

### Verified Release Inventory — 9 October Follow-Up

Owner-created version `645f4bc4-e0d1-4b8c-9bcd-2c87aacc7e46` contains
`STRIPE_LIVE_WEBHOOK_SIGNING_SECRET`, but its binding inventory does **not** contain
`STRIPE_LIVE_ACCOUNT_ID` or `STRIPE_LIVE_RESTRICTED_KEY`. Existing sandbox binding names are
present; they are not substitutes for these distinct live bindings. Secret names do not prove their
values or the enabled/disabled mode values. No promotion was performed by this inspection.

Following the owner's explicit instruction to execute the upload, all three live credentials were
uploaded together to version `2753edaf-ea20-4f3e-9779-54769addb4d5`. Independent version readback
confirms `STRIPE_LIVE_ACCOUNT_ID`, `STRIPE_LIVE_RESTRICTED_KEY` and
`STRIPE_LIVE_WEBHOOK_SIGNING_SECRET` are present alongside the preserved existing bindings.
Credentials were piped directly from the ignored local file without printing values. This version
is unpromoted; no mode, database authority, production traffic or Git state was changed.
The missing account/key finding above applies to the superseded preparation version, not this one.

A fresh count-only, read-only hosted transaction confirms zero account instruments, zero intake
publications, zero order terms, zero Checkout releases, zero service identities, zero client profiles
and zero Checkout intents. The read-only Stripe readiness check passes account matching, active
card payments and charges/payouts enabled, with zero currently-due and one pending-verification item.
Therefore credential provisioning alone cannot complete the application-owned payment journey.

The next release needs the exact completed account/privacy/intake/deposit instrument text and
version/hash approval, a real tenant-bound webhook service with only payment append/update scopes,
and a finite live Checkout release bound to the approved account. Do not publish the current
bracketed notice drafts or manufacture a clinical approval, questionnaire submission or acceptance
receipt. The payer must complete the applicable onboarding and accept the actual offer.

The owner requested replacement terms. The [four-part proposed client text](pilot-client-terms-v1.md)
now covers account/privacy, questionnaire acknowledgement/collection consent and deposit terms using
recorded facts and commercial decisions. It is not yet approved/published. Its internal notes identify
the exact publication mapping, real approver references, finite service/release scope and outstanding
service timing/factual disclosures; generating wording does not settle those facts or activate payments.

Upload the three live credentials together into another **unpromoted** version, leaving every mode
unchanged. This validates the approved account and key formats before piping values directly to
Wrangler; it does not echo credentials or write a committed secret file:

```sh
set -o pipefail
bun --env-file=.env.production.local -e '
  const names = [
    "STRIPE_LIVE_ACCOUNT_ID",
    "STRIPE_LIVE_RESTRICTED_KEY",
    "STRIPE_LIVE_WEBHOOK_SIGNING_SECRET",
  ];
  const values = Object.fromEntries(names.map(name => [name, process.env[name]?.trim()]));
  if (values.STRIPE_LIVE_ACCOUNT_ID !== "acct_1U32SWCBswMrhhx4" ||
      !/^rk_live_[A-Za-z0-9]+$/.test(values.STRIPE_LIVE_RESTRICTED_KEY ?? "") ||
      !/^whsec_[A-Za-z0-9]{20,}$/.test(values.STRIPE_LIVE_WEBHOOK_SIGNING_SECRET ?? "")) {
    throw new Error("LIVE_PAYMENT_CREDENTIAL_CONFIGURATION_INVALID");
  }
  process.stdout.write(JSON.stringify(values));
' | bunx wrangler versions secret bulk \
  --name meneer-health \
  --message "Provision distinct live payment credentials - release still gated"
```

The installed Wrangler help confirms this bulk command. Return its version ID for binding/source
review, not its input JSON. Do not promote it merely because the upload succeeds.

### Prepared Owner-Run Signing Secret Provisioning

Run from the repository root. This pipes the validated local secret directly to Wrangler without
printing it and creates an **unpromoted version**, not an active deployment. The installed Wrangler
help confirms `versions secret put` and the `--name`/`--message` options. Keep all payment modes
disabled; review the returned version and its source/bindings before any separately approved promotion.

```sh
set -o pipefail
bun --env-file=.env.production.local -e '
  const value = process.env.STRIPE_LIVE_WEBHOOK_SIGNING_SECRET?.trim();
  if (!value || !/^whsec_[A-Za-z0-9]{20,}$/.test(value)) {
    throw new Error("LIVE_WEBHOOK_SIGNING_SECRET_INVALID");
  }
  process.stdout.write(value);
' | bunx wrangler versions secret put STRIPE_LIVE_WEBHOOK_SIGNING_SECRET \
  --name meneer-health \
  --message "Provision live Stripe webhook secret - payment release still gated"
```

Do not substitute `wrangler secret put`: that command can create an active deployment. This
single secret alone does not provision the live restricted key/account, webhook service authority,
publications or finite Checkout release, and does not complete payment acceptance.

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
4. After final instruments, provider acceptance and sandbox acceptance, explicitly select
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
