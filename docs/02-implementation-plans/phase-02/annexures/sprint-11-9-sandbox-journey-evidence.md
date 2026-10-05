---
task_id: phase-02-sprint-11-9
title: Stripe Sandbox and Hosted Journey Evidence
status: in-progress-provider-preflight-passed
last_updated: 2026-10-06
source_commit: a6382de
primary_debt: [TD-010]
---

# Task 2.11.9 — Sandbox and Hosted Journey Proof

## Mission and Authority

Prove the current R999 deposit, credited approved-product order and financial exception paths
against actual test-account objects and the deployed authenticated journey. A mocked provider,
locally generated signature or success redirect cannot stand in for an actual captured payment.
Task 11.8's engineering closure is committed at `a6382de`; the working tree was clean on `itws-I`.

The owner explicitly authorised all eight committed Sprint-11 hosted migrations, isolated
disposable synthetic tenant/identity/financial fixtures, temporary sandbox configuration and scoped
cleanup/restoration. The owner also authorised official test-payment-method transactions,
duplicate captures, refunds and dispute/failure exercises. No live credentials or real-money charge
is authorised. Deployment remains the owner's action. The real pilot must stay suspended.

## Implemented and Observed

- Added a separate current-adapter provider exercise rather than misrepresent the historical
  `test:payments:provider` consultation/bundle exercise as Sprint-11 proof.
- The new command requires explicit `uncompleted-test-checkouts-only` confirmation, a restricted
  test key and an exact independently verified standalone account. It invokes the actual
  `PilotCheckoutProvider` and `PilotRefundProvider` terminal inspector.
- Actual Stripe test-account proof passed for deposit R999, a **synthetic** credited product balance
  R751 plus R100 delivery, and zero additional balance. No confidential RRP or delivery tariff was
  invented or approved by those synthetic amounts.
- All three actual Sessions were retrieved independently, matched exact ZAR totals, line names,
  opaque-only metadata, canonical return URLs and stable idempotent retries. They remained unpaid,
  were expired and independently inspected as terminal unpaid. No payment was completed.
- Cleanup checks only this run's exact returned test Session IDs, and a failed cleanup prevents a
  successful report. Expiration does not delete Stripe's test-account history or generated
  inline-price/product objects. A creation timeout before an ID is returned requires operator
  inspection of the stable retry identity; no broad resource deletion is performed.
- Before migrations, the guarded hosted inventory passed: one suspended `meneer-pilot` tenant,
  zero Auth users, 48 exposed table resources, 18 service-unreadable resources, and only the approved
  tenant/provider-gate baseline in service-readable tables. This is not direct SQL proof of hidden
  private tables.
- The linked migration dry run listed exactly eight approved files, with no seeds or role changes.
  All eight were applied successfully; a subsequent independent dry run returned up to date with
  no pending migrations. The guarded post-application inventory matched the original baseline:
  one suspended pilot tenant, zero Auth users and unchanged service-readable application counts.
  Direct private-table/grant verification remains part of the hosted rehearsal.
- Cloudflare deployment inventory identified active Worker version
  `ac94b09c-efa8-453a-a8db-c171d1755acf`, deployed 5 October at 15:59 UTC as the disabled I8
  restoration. No Sprint-11 deployed-code equivalence is established by that inventory.

## Remaining Acceptance Matrix

Every row needs redacted results identifying its evidence class. Do not label SDK-generated test
signatures or injected event bodies as real Stripe delivery. Never submit real clinical information.

| Boundary                                | Evidence required                                                                                                                        | Current status                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Current adapter Sessions and retries    | Actual deposit, credited order and zero-balance objects; exact metadata/lines and terminal unpaid inspection                             | Passed, three Sessions expired                                |
| Hosted schema                           | Eight approved migration versions independently matched; private grants/RLS and unchanged baseline checked                               | History/service-readable baseline passed; private SQL pending |
| Deployed baseline                       | Owner-deployed Sprint-11 SHA/version, disabled modes and scoped temporary configuration                                                  | Awaiting owner deployment confirmation                        |
| Authenticated client/staff              | Disposable own-client sealed session; assigned staff AAL2 plus independent financial grant; wrong tenant/role/assignment/session denials | Not run                                                       |
| Captured deposit and paid review bridge | Test Checkout completion, actual event delivery, one authoritative deposit; no clinical/safety/dispatch advancement                      | Not run                                                       |
| Credited product and zero-balance order | Current release/acceptance, exact capped credit, separate delivery, no double allocation or inferred supply                              | Not run                                                       |
| Webhook integrity                       | Invalid signature, modified raw body, replay, conflicts, orphan and out-of-order evidence with durable acknowledgement                   | Local proof exists; hosted/provider delivery pending          |
| Failure and replacement                 | Decline, cancellation/expiry, fresh bounded replacement approval/acceptance, late original capture                                       | Local proof exists; provider/hosted proof pending             |
| Original-method refunds                 | Full/partial/unused-credit and separate duplicate capture; immutable jobs; actual settlement, uncertainty and bounded retry              | Local proof exists; provider/hosted proof pending             |
| Disputes                                | Current provider-correlated open and terminal outcomes, attributed ownership, won/lost/conflict holds                                    | Local proof exists; provider/hosted proof pending             |
| Operational independence                | Clinical rejection, dependency failure, owned exception/alert delivery, reconciliation without altering clinical/supply state            | Hosted rehearsal pending                                      |
| Restoration                             | Revoke disposable sessions, scope cleanup to exact fixtures, restore disabled modes, inspect private/public baseline                     | Not needed yet; no hosted fixtures/configuration created      |

## Operator Command

Only after approval, with the ignored restricted sandbox configuration:

```bash
PILOT_STRIPE_EXERCISE_CONFIRM=uncompleted-test-checkouts-only \
STRIPE_CHECKOUT_ACCOUNT_ID=acct_REPLACE_WITH_APPROVED_TEST_ACCOUNT \
bun --env-file=.env.production.local run test:payments:pilot-provider
```

This command does not reset local/hosted data, generate identities, send emails, publish legal
instruments, confirm payments, issue refunds, submit dispute evidence or enable a Worker. It prints
only coarse results, not keys, URLs, identifiers or raw SDK errors. It does not run in ordinary CI.

Stripe's [Session expiration API](https://docs.stripe.com/api/checkout/sessions/expire) governs
abandonment cleanup; its [line-item API](https://docs.stripe.com/api/checkout/sessions/line_items)
supports independent exact-line inspection. Stripe best-practices guidance influenced restricted
test credentials, hosted Checkout, opaque metadata and explicit evidence provenance.

## Validation and Closure

The eight new harness tests and existing Checkout/refund adapter tests passed: **20 tests / three
files**. Strict TypeScript and ESLint passed. Independent hosted migration-history and service-readable
baseline checks passed. No complete CI/build/browser matrix is claimed for this preparatory checkpoint;
the production adapter was unchanged. Final formatting and Git whitespace checks also passed.
Task 11.9 is **not complete**; TD-010 remains In progress. No new debt ID is accrued by this packet.
Hosted authenticated/payment/exception proof and restoration still determine acceptance, followed
by Task 11.10's Sprint completion report.

## File Inventory

| Category                       | Files                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| New exercise                   | `scripts/test-pilot-stripe-provider.ts`                                                         |
| New proof library/tests        | `scripts/lib/pilot-stripe-provider-proof.ts`, `scripts/lib/pilot-stripe-provider-proof.test.ts` |
| New evidence packet            | This document                                                                                   |
| Modified tooling/guidance      | `package.json`, `AGENTS.md`, Stripe operations runbook                                          |
| Modified derived/planning docs | Sprint 11 plan, technical-debt registry, RAG current state/limitations/index                    |

No application UI, marketing wording, dependency version, secret file, generated output or Git
index was changed. Hosted schema changes are owner-authorised migration application, not activation.
