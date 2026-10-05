---
evidence_id: phase-02-sprint-11-4-guarded-sandbox-checkout
title: Guarded Sandbox Checkout Creation
status: completed-local-creation-boundary
task: 11.4
observed: 2026-10-05
completed: 2026-10-05
source_commit: c2dca52
owner: "@Muhns13G"
related_debt: [TD-010]
---

# Sprint 11.4 — Guarded Sandbox Checkout

## Outcome and Workflow

The current private order boundary now supports explicit test-mode Checkout creation after durable
acceptance. It reuses sealed own-patient authority, current tenant/account/instrument checks and
strict origin, size, rate and UUID idempotency guards. No browser amount, product name, metadata,
account ID or redirect destination is accepted.

`COMMERCE_CHECKOUT_MODE=sandbox` and an explicit `STRIPE_CHECKOUT_ACCOUNT_ID` are required in
addition to the existing review-mode/tenant bindings. A private, expiring, enabled database release
must match that tenant and account. Review/Checkout remain disabled in committed examples; the
real pilot stays suspended. A restricted test key is required, and the provider adapter verifies
the current standalone account through the installed SDK's `accounts.retrieveCurrent()`.
There is no Connect destination, live-key path or automatic provider-resource provisioning.

For one unambiguous own submitted case, released read preparation can create the server-owned
R999 deposit offer only after current published order terms exist. Missing/ambiguous intake,
safety/authority holds, absent release or unavailable terms fail closed. Existing valid offers are
reused; unresolved expired preparations are not silently replaced. Existing product offers retain
11.2's independent clinical, stock, pharmacy, address, custody and delivery guards.

The client sees Checkout only after acceptance and current release readiness. The separate
`checkout` command revalidates the exact current offer/receipt/readiness inside SQL before reserving
one immutable provider creation identity. Account terms or a browser checkbox cannot replace the
order receipt. No clinical/manual-transfer readiness adapter was enabled.

## Amount, Provider and Retry Contract

- R999 deposit uses one truthful review-deposit line. Later product Checkout uses the accepted net
  product balance after deposit credit plus separate delivery. Full RRP/credit/quote/version detail
  remains in the client's exact accepted offer. This uses server-owned inline `price_data`, not
  negative Prices, client discounts, reusable wallet credit or new coupon/Price provisioning.
- Product labels identify an actual product-order balance, not a disguised consultation. Actual
  provider business-model acceptance and any required specific product disclosures still require
  the recorded minimum-data/domain review before real transactions.
- ZAR amounts are frozen integer minor units; Adaptive Pricing is disabled. No subscriptions,
  automatic tax, automatic renewal, saved-card collection, promotion-code entry or hardcoded
  payment method list is introduced. Stripe Dashboard controls eligible dynamic methods.
- Only opaque intent/order and tenant references enter metadata. No profile, medical answers,
  diagnosis, product selection, prescription or clinical rejection reason is sent. Normal required
  billing data collected by hosted Checkout is not represented as zero provider data collection.
- The session must return explicit test mode, `cs_test_` identity, exact currency/amount/expiry,
  matching opaque reference, payment mode and a credential-free trusted Checkout origin. Success
  and cancel destinations are the canonical `/portal/order`, with no sensitive query fields.
- One ledger row per offer and a stable provider key `pilot-checkout:<intent UUID>` preserve retries.
  A fresh transport key for the same exact offer reuses the original intent; reuse across a
  different offer conflicts. Payload, account, acceptance and deadlines cannot be edited.
- Uncertain network/provider/storage outcomes retain `preparing`; there is no new paid flag,
  automatic credit release, blind second session or claimed failure/success. Attachment rechecks
  authority/receipt/release and stores only a matching test session as `open`, never `paid`.

Stripe's minimum session lifetime is 30 minutes, whereas the accepted-offer creation window is
15 minutes. They are separate clocks: provider expiry is frozen at one hour from intent creation,
while creation/retry must still occur before the original accepted offer/session deadline. This
keeps parameters stable and avoids retries after provider idempotency retention. It does not
promise clinical/supply readiness for that hour. Later withdrawal, late success, abandoned
sessions, release/price expiry and provider minimum-amount rejection require the 11.5/11.8 owned
reconciliation path; no extra fee is invented to satisfy a provider minimum.

The return page now says payment is **not confirmed here**, rather than asserting that no payment
was taken. It never trusts a redirect as payment evidence. The only changed client wording is this
necessary private-payment clarification and the new Checkout action; public marketing is unchanged.

## Verification

| Boundary        | Accepted evidence                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit regression | Full suite: 700 tests / 111 files pass; final focused provider/HTTP packet: 10 tests pass after independent malformed-response/expiry regressions.                                                         |
| SQL             | 1,101 assertions / 26 rollback-only packets pass, including 15 new release/account/intent/replay/attachment/closed-paid-review checks.                                                                     |
| Browser         | Eight desktop/mobile controlled checks pass: exact review/acceptance, expiry/denial clearing and strict request/navigation to an intercepted provider destination. No Stripe site or payment is contacted. |
| Build/static    | Production client/server build, canary/MCP absence, TypeScript, lint, portability (15 capabilities/20 majors/26 fixtures), discovery and unchanged generated route tree pass.                              |
| Database        | Clean local migration/seed replay, function lint and advisors pass; no warning/error advisor finding.                                                                                                      |
| Recovery        | Encrypted local exercise reconciles 57 source/restored synthetic records, with private commerce included; local Supabase is stopped afterward.                                                             |

SQL uses explicit rollback-only synthetic account/receipt/release fixtures. SDK tests inject a
mock client; HTTP tests inject service boundaries; browser responses/provider navigation are
intercepted. These are distinct engineering proofs, not a claimed continuous hosted payment
journey or an actual Stripe account verification. No hosted migration/configuration, real identity,
email, provider resource, charge, credit consumption or refund was performed.

Initial TypeScript validation caught the installed SDK requiring `retrieveCurrent()` for the own
account rather than a zero-argument `retrieve()`. It was corrected against installed SDK types.
The unavailable Stripe docs CLI hit a local configuration permission denial; official provider
documentation was used instead. Managed Playwright substitutes for unavailable `agent-browser`;
the sandbox permits its local test listeners through a bounded escalation. No tool was installed.

## File Inventory

New: `src/server/payments/pilot-checkout.ts`, its colocated test,
`supabase/migrations/20261005185825_pilot_sandbox_checkout.sql`, and this packet.
Existing implementation files: order-review HTTP/schema/tests, `OrderReviewPage.tsx`, browser packet,
environment catalogue/test/example and the medical-intake SQL packet. Plan/phase/debt/RAG/index are
updated alongside them. No dependency or generated-file changes; branch remains `itws-I` and the
owner alone stages/commits.

## Remaining Scope and Handoff

11.4 is complete at its local creation boundary. TD-010 remains In progress; no new debt ID is
introduced. A release row/approval reference is not independent domain or provider-business proof.
Real catalogue/rates, reviewed publications, private parties/authority and final release remain.

11.5 must map new private creation intents into signed provider-event/settlement evidence; the
legacy webhook's public payment-order path is not that mapping. Neither a created/open Session nor
its return URL can unlock review, transfer, credit/refund or fulfilment. Do not operationally enable
the hosted payment journey merely by setting the new bindings. Hosted application of the three
Sprint 11 migrations and actual no-real-charge provider proof require explicit bounded authority
and later-task acceptance/cleanup. Session expiry/revocation and retry uncertainty remain visible
owned reconciliation inputs, not quietly waived release conditions.

Final repository-wide formatting and whitespace checks pass; 238 local document links and 175
indexed paths with unique identifiers validate. No changes were staged; branch remains `itws-I`.

Primary references checked on 5 October 2026:

- [Stripe Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create) for
  inline server prices, canonical return URLs and the provider's expiry interval.
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) for stable parameters
  and bounded retries.
- [Supabase database functions](https://supabase.com/docs/guides/database/functions) for fixed
  search paths and explicit execution privileges.

Stripe/Supabase/React verification guidance shaped test-only account checks, immutable creation
parameters, private access, abort/expiry clearing and separated UI/HTTP/SQL/provider proof.
