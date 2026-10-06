---
plan_id: phase-02-sprint-11
title: Stripe Sandbox and Commercial Operations
status: completed-with-activation-gates
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
last_updated: 2026-10-06
owner: "@Muhns13G"
---

# Sprint 11 — Stripe Sandbox and Commercial Operations

## Completed Engineering Boundary — 6 October 2026

Tasks 11.1–11.10 are complete at the recorded engineering/synthetic sandbox boundary. The
[completion report](../../03-completion-reports/phase-02/sprint-11-stripe-commercial-operations.md)
reconciles committed checkpoint `7db0e0c`, all decisions/corrections, genuine provider versus
rollback-only evidence, 100 committed paths and this closure batch. The report supersedes the
historical incomplete checkpoints below; TD-010 retains actual commercial/publication/release
approval. Real payment modes remain disabled and the pilot suspended. Sprints 12–13 remain.
Owner commit and exact-commit CI for 11.10 are separate from accepted implementation evidence.

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
Task 11.4 is complete at the [guarded local sandbox creation boundary](annexures/sprint-11-4-guarded-sandbox-checkout.md):
released case preparation, current acceptance/release checks, immutable retry identity and verified
test-only provider response attachment. No hosted/provider activation is claimed.
Task 11.5 is complete at the [local signed-receipt/settlement boundary](annexures/sprint-11-5-signed-receipts-settlement.md):
raw signature verification, scoped append-only receipts, replay/conflict handling, independent
money facts and pending orphan/refund/dispute reconciliation. No hosted/provider activation is claimed.
Task 11.6 is complete at the [local payment-projection boundary](annexures/sprint-11-6-payment-status-projections.md):
own-client and assigned AAL2 operations reads, strict coarse facts, audited scope/expiry checks,
private portal/queue panels and local regression proof. No payment or clinical activation is implied.
Task 11.7 is complete at the [local cancellation/refund boundary](annexures/sprint-11-7-cancellation-refund-commands.md):
own-client requests, independently authorised staff dispositions, original-source refund reservations,
automatic unused-deposit jobs and default-off sandbox dispatch. Provider responses do not confirm
refund settlement or cancel clinical/supply workflows. Task 11.8 is completed at the
[local reconciliation boundary](annexures/sprint-11-8-payment-reconciliation.md): exact signed
refund settlement, verified-failure refund retries, provider-checked unpaid credit release,
content-free owned exceptions and the native deposit-readiness bridge. Genuine duplicate-capture
full refunds, attributed final dispute resolution and safe replacement deposit offers with fresh
acceptance are locally verified. Task 11.9 is
[completed at the sandbox/hosted boundary](annexures/sprint-11-9-sandbox-journey-evidence.md).
The following paragraphs preserve earlier verification checkpoints, not current open work:
actual current-adapter uncompleted
test Sessions, exact line items, retry identity and unpaid expiration inspection passed. Genuine
hosted signed-expiry transport and invalid-signature denial also passed with scoped restoration.
Authenticated synthetic patient/staff scope checks, actual R999 funding, the paid-review bridge and
R100 delivery capture after R800 capped credit subsequently passed. Test captures/fixtures were
refunded/removed and disabled configuration restored. The approved confirmed-remainder SQL fix is
hosted; the owner deployed the Worker request-body fix and repeat hosted operational refund commands
plus genuine signed R199/R800/R100 original-method confirmation passed.
The approved restricted-ACL follow-up is now applied hosted and independently verified. A newer
owner deployment was restored forward with disabled configuration-only modes, unchanged source
checksum and full private/public baseline. Duplicate/uncertain refund and remaining
failure/dispute/exception acceptance is still pending.
Task 11.10 remains planned.
The approved duplicate aggregate-refund migration and hosted repeat now prove full duplicate refund
once, unchanged original funding and restored readiness. Owned generic alert receipt, AAL2 response
and wrong-role denial passed. Independent follow-up verified disabled source-preserving restoration
and the protected empty baseline after an immediate assertion failed. Uncertainty/retry,
late-original capture and clinical/dependency independence still keep Task 11.9 In progress.
Actual R0 completion exposed a paid/no-PaymentIntent status mismatch; the narrow zero-total
migration is now owner-approved/applied hosted with independent history/ACL and successful genuine
R0/no-PaymentIntent/credit-once proof. SDK-signed synthetic hosted webhook adversarial checks passed.
Genuine decline/expiry/fresh replacement capture and refunds passed. The actual sandbox Dispute
exposed `du_` IDs rejected by `dp_`-only validators. The owner deployed the narrow source fix;
genuine open/terminal won and lost delivery, attributed independent reconciliation and synthetic
contradictory terminal holds now pass. Exact cleanup and disabled restoration passed. Duplicate,
uncertain refund, late-original capture and operational-independence acceptance remain open.
TD-010 remains In progress.

Connect the existing inactive Stripe/payment foundation to the real invite-only pilot workflow in
test mode. Prove server-owned pricing, signed provider events, independent clinical/payment state,
refunds and staff reconciliation before considering any live credential or real charge.

## Commit-Sized Task Plan

Current acceptance supersedes the historical progress paragraphs above: Task 11.9's complete
synthetic sandbox/hosted matrix is accepted in its evidence packet, including genuine pending/full
duplicate refund, uncertainty/bounded retry, late-original and operational-independence rollback
proof, and exact disabled/empty restoration. No live release is implied. TD-010 retains actual
reviewed publications, commercial/tax/operations approval and release obligations. Task 11.10
is completed by the linked Sprint report; the historical checkpoints above are retained for audit.

| Task  | Commit-sized outcome                                                                                                 | Gate            | Status                          |
| ----- | -------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------- |
| 11.1  | Freeze approved pilot scenarios, price versions, terms versions, payment timing and exception matrix.                | TD-010          | Completed at contract level     |
| 11.2  | Seed the approved test-mode price catalogue and readiness rules; reject browser-supplied amounts.                    | TD-010          | Completed locally               |
| 11.3  | Implement the authenticated client review-and-pay boundary with explicit line items and no health metadata.          | Checkout        | Completed locally               |
| 11.4  | Enable test-mode Checkout creation behind environment, identity, consent, workflow and release gates.                | Checkout        | Completed locally               |
| 11.5  | Enable signed raw-body webhooks with durable idempotency, replay/conflict detection and out-of-order reconciliation. | Provider events | Completed locally               |
| 11.6  | Implement client and staff payment status projections based only on reconciled provider evidence.                    | False success   | Completed locally               |
| 11.7  | Implement cancellation/refund requests, automated eligible reversals and staff exception handling.                   | TD-010          | Completed locally               |
| 11.8  | Implement reconciliation for expired, failed, duplicate, disputed and refunded test transactions.                    | Operations      | Completed locally               |
| 11.9  | Complete no-charge Stripe sandbox exercises for success and every required failure/exception path.                   | Hosted proof    | Completed at sandbox boundary   |
| 11.10 | Reconcile evidence and issue the Sprint 11 completion report; keep live mode disabled.                               | All             | Completed with activation gates |

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
