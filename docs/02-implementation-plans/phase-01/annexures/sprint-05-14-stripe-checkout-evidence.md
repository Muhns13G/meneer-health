---
task: 5.14
title: Stripe Checkout and Payment Reconciliation Evidence
status: completed
completed_on: 2026-08-11
source_parent: 301e50b
related_debt: [TD-010, TD-014, TD-015, TD-020]
---

# Sprint 05.14 — Stripe Checkout and Payment Reconciliation Evidence

## Outcome

Task 5.14 implements an inactive, server-only Stripe test-mode payment boundary. It creates
one-time Checkout Sessions from governed server price snapshots, accepts payment truth only from a
signed webhook, and persists replay-safe audit and reconciliation evidence in local Supabase. Exact
local-only checkout and webhook POST endpoints fail closed when hosted. The standalone Meneer Health
sandbox, three reusable ZAR test Prices, and a restricted local key are exercised without completing
a payment. No customer-facing entry point, hosted webhook, production price, or live charge exists.

## Implemented Controls

- Strict `payment.checkout` and `payment.provider` version-1 contracts with stable safe failures.
- Consultation-only, medication-plus-delivery, and bundle scenarios use explicit ZAR test lines;
  browser input cannot supply an amount, price, status, or health field.
- Checkout preparation, provider creation, and session attachment are idempotent and fail closed.
- Stripe receives only opaque order and tenant identifiers; dynamic eligible payment methods remain
  provider-controlled and card data never enters the application.
- Checkout creation supplies one stable, non-secret Stripe integration identifier so idempotent
  retries remain parameter-identical. The governed catalogue reuses one sandbox Price for each
  consultation, medication, and delivery line across scenarios.
- Raw-body signature verification precedes processing. Completed, delayed-success, failed, expired,
  full-refund, partial-refund, dispute, duplicate, and unmatched events have explicit outcomes.
- Browser roles cannot read or mutate payment tables or invoke payment RPCs. RLS is enabled and
  forced; a scoped local webhook service identity has the minimum append/update boundary.
- Payment, clinical, supply, dispatch, refund, and dispute states remain independent. Partial or
  conflicting evidence enters a durable reconciliation queue instead of reporting success.

## Validation Evidence

| Check                 | Result                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| Vitest                | 37 files / 223 tests passed                                                |
| Targeted HTTP/adapter | 4 files / 53 tests passed                                                  |
| pgTAP                 | 8 files / 257 tests passed; 46 payment-specific assertions                 |
| Signed integration    | Actual local webhook route, durable paid event, replay, and tamper passed  |
| Stripe sandbox        | 3 Products/Prices; all scenarios, amounts, mode, and metadata passed       |
| Test charge scenarios | Consultation, medication/delivery, and three-line bundle sessions passed   |
| Exception states      | Failed, expired, refund, partial refund, dispute, and unmatched event pass |
| Clinical rejection    | Medication payment preparation denied before provider contact              |
| Browser return        | Attached Checkout remains pending until a verified provider event          |
| Data minimisation     | No health or raw provider-payload columns; metadata allowlist tests pass   |
| Browser regression    | 54 Playwright desktop/mobile checks passed                                 |
| Recovery              | 82 of 82 encrypted backup and recovery checks passed in 9 seconds          |
| Build and deployment  | Production build, generated routes, and Cloudflare dry run passed          |
| Dependency security   | Full and production dependency audits reported no vulnerabilities          |

## Debt Reconciliation

Task 5.14 satisfies its repository-level Stripe implementation outcome. TD-014 and TD-015 remain
**In progress** until Task 5.15 implements the partner/fulfilment commands and evidence required by
their broader acceptance criteria. TD-020 remains **In progress** until a hosted test webhook,
monitoring, alert, and reconciliation failure are provisioned and exercised. TD-010 still blocks
activation until prices, tax and merchant roles, transactional terms, Stripe account settings, and
release approvals are supplied.

## Residual Owner Actions

Follow [`stripe-checkout-webhook-runbook.md`](../../../06-operations/stripe-checkout-webhook-runbook.md).
Provision only restricted test credentials, approved test prices, and a test endpoint after the
TD-010 particulars are signed off. The current sandbox Prices and local credential are test evidence
only. Record redacted event IDs, timestamps, alert outcomes, and reconciliation results; never record
keys, payment details, patient data, or raw webhook bodies.
