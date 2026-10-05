---
plan_id: phase-02-sprint-11
title: Stripe Sandbox and Commercial Operations
status: in-progress
primary_debt: [TD-010]
depends_on:
  [
    phase-02-sprint-08,
    phase-02-sprint-09,
    phase-02-sprint-10,
    DR-002,
    DR-011,
    DR-012,
    DR-013,
    DR-015,
    DR-018,
  ]
last_updated: 2026-10-05
owner: "@Muhns13G"
---

# Sprint 11 — Stripe Sandbox and Commercial Operations

## Mission

DR-018's first-party medical intake and manual generator transfer are implemented and synthetically
verified by the completed Sprint 10. Reconcile I1's
questionnaire/submission/transfer timing with the deposit contract before Checkout activation;
do not infer payment approval from submitted medical answers or make bloods an initial submission
prerequisite. Questionnaire content must never enter Stripe line items, metadata or URLs.
The expanded Sprint 10 intake stream must be reflected in the synthetic journey proof.

The [readiness handoff](annexures/sprint-11-readiness-handoff.md) records the committed Sprint 10
baseline, retained activation gates and existing payment-foundation gaps. Start with Task 11.1;
this handoff is preparation, not permission to enable payments. Task 11.1 is now complete at the
[commercial contract boundary](annexures/sprint-11-1-commercial-payment-contract.md), including
owner-approved capped credit/unused-deposit refund and staff-reviewed unresolved exceptions.
Task 11.2 is complete at the [local private preparation boundary](annexures/sprint-11-2-private-commerce-preparation.md):
synthetic catalogue, bounded arithmetic, immutable offers and locked credit reservation, with
local SQL/build/recovery proof. Task 11.3 is complete at the
[local order-review/acceptance boundary](annexures/sprint-11-3-order-review-acceptance.md), including
sealed-session HTTP, immutable exact-order receipts, SQL and desktop/mobile proof.
Tasks 11.4–11.10 remain planned; TD-010 remains In progress.

Connect the existing inactive Stripe/payment foundation to the real invite-only pilot workflow in
test mode. Prove server-owned pricing, signed provider events, independent clinical/payment state,
refunds and staff reconciliation before considering any live credential or real charge.

## Commit-Sized Task Plan

| Task  | Commit-sized outcome                                                                                                 | Gate            | Status                      |
| ----- | -------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------- |
| 11.1  | Freeze approved pilot scenarios, price versions, terms versions, payment timing and exception matrix.                | TD-010          | Completed at contract level |
| 11.2  | Seed the approved test-mode price catalogue and readiness rules; reject browser-supplied amounts.                    | TD-010          | Completed locally           |
| 11.3  | Implement the authenticated client review-and-pay boundary with explicit line items and no health metadata.          | Checkout        | Completed locally           |
| 11.4  | Enable test-mode Checkout creation behind environment, identity, consent, workflow and release gates.                | Checkout        | Planned                     |
| 11.5  | Enable signed raw-body webhooks with durable idempotency, replay/conflict detection and out-of-order reconciliation. | Provider events | Planned                     |
| 11.6  | Implement client and staff payment status projections based only on reconciled provider evidence.                    | False success   | Planned                     |
| 11.7  | Implement cancellation/refund requests, automated eligible reversals and staff exception handling.                   | TD-010          | Planned                     |
| 11.8  | Implement reconciliation for expired, failed, duplicate, disputed and refunded test transactions.                    | Operations      | Planned                     |
| 11.9  | Complete no-charge Stripe sandbox exercises for success and every required failure/exception path.                   | Hosted proof    | Planned                     |
| 11.10 | Reconcile evidence and issue the Sprint 11 completion report; keep live mode disabled.                               | All             | Planned                     |

## Acceptance Gate

- The server owns price, currency, line items, terms version and internal state.
- DR-013 supersedes the historical non-medicine-only scope: prove the R999 review deposit and
  separately accepted, clinically approved RRP orders with deposit credit and separate delivery.
  Product authority, availability and supply gates remain independent; synthetic proof is not
  approval to sell. Keep medical answers and unnecessary health/product identifiers out of Stripe
  metadata, URLs and logs. Task 11.1 must define the truthful client/provider line-item boundary
  without disguising the nature of a transaction.
- A success redirect is never treated as payment evidence.
- Payment cannot imply treatment approval, protocol completion, dispensing or fulfilment.
- Test events reconcile exactly once, and conflicts/out-of-order events enter an owned exception
  path.
- Live keys, live prices and real charges remain outside this sprint.

## Validation

Run payment contracts, local database tests, Stripe CLI signed-webhook exercises, the explicit
no-charge provider test, client/staff browser tests, reconciliation and rollback exercises, and the
complete CI matrix. Inspect Stripe metadata and application logs for prohibited data.
