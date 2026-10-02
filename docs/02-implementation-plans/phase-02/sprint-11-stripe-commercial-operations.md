---
plan_id: phase-02-sprint-11
title: Stripe Sandbox and Commercial Operations
status: planned
primary_debt: [TD-010]
depends_on: [phase-02-sprint-08, phase-02-sprint-09, phase-02-sprint-10, DR-002]
last_updated: 2026-10-02
owner: "@Muhns13G"
---

# Sprint 11 — Stripe Sandbox and Commercial Operations

## Mission

Connect the existing inactive Stripe/payment foundation to the real invite-only pilot workflow in
test mode. Prove server-owned pricing, signed provider events, independent clinical/payment state,
refunds and staff reconciliation before considering any live credential or real charge.

## Commit-Sized Task Plan

| Task  | Commit-sized outcome                                                                                                 | Gate            | Status  |
| ----- | -------------------------------------------------------------------------------------------------------------------- | --------------- | ------- |
| 11.1  | Freeze approved pilot scenarios, price versions, terms versions, payment timing and exception matrix.                | TD-010          | Planned |
| 11.2  | Seed the approved test-mode price catalogue and readiness rules; reject browser-supplied amounts.                    | TD-010          | Planned |
| 11.3  | Implement the authenticated client review-and-pay boundary with explicit line items and no health metadata.          | Checkout        | Planned |
| 11.4  | Enable test-mode Checkout creation behind environment, identity, consent, workflow and release gates.                | Checkout        | Planned |
| 11.5  | Enable signed raw-body webhooks with durable idempotency, replay/conflict detection and out-of-order reconciliation. | Provider events | Planned |
| 11.6  | Implement client and staff payment status projections based only on reconciled provider evidence.                    | False success   | Planned |
| 11.7  | Implement cancellation/refund requests, automated eligible reversals and staff exception handling.                   | TD-010          | Planned |
| 11.8  | Implement reconciliation for expired, failed, duplicate, disputed and refunded test transactions.                    | Operations      | Planned |
| 11.9  | Complete no-charge Stripe sandbox exercises for success and every required failure/exception path.                   | Hosted proof    | Planned |
| 11.10 | Reconcile evidence and issue the Sprint 11 completion report; keep live mode disabled.                               | All             | Planned |

## Acceptance Gate

- The server owns price, currency, line items, terms version and internal state.
- A success redirect is never treated as payment evidence.
- Payment cannot imply treatment approval, protocol completion, dispensing or fulfilment.
- Test events reconcile exactly once, and conflicts/out-of-order events enter an owned exception
  path.
- Live keys, live prices and real charges remain outside this sprint.

## Validation

Run payment contracts, local database tests, Stripe CLI signed-webhook exercises, the explicit
no-charge provider test, client/staff browser tests, reconciliation and rollback exercises, and the
complete CI matrix. Inspect Stripe metadata and application logs for prohibited data.
