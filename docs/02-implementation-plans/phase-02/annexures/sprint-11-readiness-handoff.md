---
evidence_id: phase-02-sprint-11-readiness
title: Sprint 11 Readiness and Commit-Sized Handoff
status: ready-for-contract-task
observed: 2026-10-05
source_commit: 5c7a0a0
owner: "@Muhns13G"
related_debt: [TD-010]
---

# Sprint 11 — Readiness Handoff

## Starting Point

Sprint 10 closes engineering Tasks 10.1–10.10 and I1–I8 with activation gates. Its closure is
committed at `5c7a0a0`, following implementation checkpoint `14a965a`. The working tree was clean
on `itws-I` before this preparation. No fresh exact-commit CI, deployment or database inventory
is claimed. Reuse the [completion report](../../../03-completion-reports/phase-02/sprint-10-staff-queue-protocol-handoff.md)
for accepted local and hosted evidence, including scoped cleanup and disabled restoration.

The lapsed generator subscription is the owner's explicit I8 exception, not unfinished Sprint 10
engineering or a prerequisite for local payment implementation. Its
[reactivation checklist](../../../05-future-considerations/protocol-generator-reactivation-and-compatibility.md)
still applies before actual manual transfer.

## Reconciled Commercial Boundary

- DR-013 replaces the historical product exclusion: R999 review deposit, full credit towards the
  first clinically approved order, confidential schedule RRP, VAT-inclusive planning and separate
  delivery. No membership, subscription or automatic renewal is intended.
- DR-015 requires a published, immutable order instrument and transaction-specific acceptance;
  account acceptance or an arbitrary `termsVersion` string is insufficient.
- DR-018/I1 keep questionnaire draft/submission free, without mandatory initial bloods. Reconciled
  payment is required before paid provider review/manual transfer, not before submission or urgent
  safety handling. Payment never clears clinical/safety holds.
- Product payment follows independent clinical approval and confirmed availability. Preserve price,
  credit, delivery and terms snapshots; never disclose questionnaire/protocol content to Stripe.
- Meneer is the merchant brand on a standalone account, not Connect. OCTOTHORP ZA is the current
  legal seller/invoice issuer. VAT-inclusive planning does not prove tax registration.
- Approved refund reasons remain DR-013's no-review, rejection/unsuitability, expired decision,
  failed hand-off/provider completion and duplicate payment. Completed approved review followed by
  voluntary decline retains the earned deposit. Never infer those facts from a browser redirect.

## Existing Code: Reuse, Do Not Mistake for Activation

`contracts/payments.ts` currently models consultation-only, medication/delivery and bundle scenarios;
it has no explicit review-deposit scenario. Existing services, private persistence and the Stripe
adapter already provide server-owned preparation, price references, signatures and replay controls.
Extend these with focused regressions rather than replace them wholesale.

`src/server/payments/payment-runtime.server.ts` is explicitly localhost-only, uses bearer-token
identity and labels its provider/repository environment `local`. It is not the sealed first-party
patient payment journey or an enabled hosted payment runtime. Existing paid-review/hand-off
readiness adapters remain false until the authoritative deposit ledger is implemented.

## Ten Commit-Sized Tasks

| Task  | Outcome before owner commit                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------- |
| 11.1  | Freeze deposit/order scenarios, timing, private catalogue versioning, exact terms/receipt binding and exception matrix. |
| 11.2  | Implement approved synthetic catalogue/readiness and server-only amount, credit and delivery calculation.               |
| 11.3  | Add authenticated review-and-pay disclosure and transaction-specific acceptance.                                        |
| 11.4  | Connect guarded test-mode Checkout to current patient authority and independent workflow release.                       |
| 11.5  | Prove signed raw-body events, durable idempotency, conflicts and out-of-order handling.                                 |
| 11.6  | Add own-client and permitted staff provider-backed payment projections.                                                 |
| 11.7  | Implement cancellation, eligible refunds and owned exceptions with durable provider evidence.                           |
| 11.8  | Reconcile abandoned/expired, failed, duplicate, disputed and refunded transactions.                                     |
| 11.9  | Run expressly authorised no-real-charge Stripe and hosted journey/exception rehearsals with cleanup.                    |
| 11.10 | Issue completion report, exact file inventory and debt/RAG reconciliation; keep live mode disabled.                     |

## Inputs to Settle in 11.1

Do not invent confidential prices or delivery tariffs. A clearly synthetic version can prove the
calculation boundary without publishing the private schedule. Freeze handling of orders below the
R999 credit, zero payable totals, stock failure after an earned review, and any no-show/late or
post-release cancellation exceptions not resolved by existing decisions. Do not silently adopt a
credit balance, forfeit money, add a fee or select a new refund policy.

Define accurate client-visible order lines separately from the minimum necessary provider data;
generic labels must not conceal a product sale or evade provider review. Real catalogue, rendered
terms, account/business-model acceptance, delivery/custody schedules and release approvals remain
activation inputs. None blocks writing/testing the bounded engineering contract.

## Readiness and Validation

Ready to begin 11.1, not to enable Checkout or claim TD-010 Verified. Seven transferred activation
debts remain unchanged. Later tasks require local payment/SQL tests, current session/receipt denials,
desktop/mobile review-and-pay tests, provider exception proof and CI. Hosted migrations, fixtures,
emails, Stripe resources and configuration changes require their own explicit authority.

Preparation was checked against the committed report, DR-002/013/015/018, I1 and current payment
contracts/services/runtime. No runtime, schema, public copy, secrets, account settings or Git state
was changed. The Stripe best-practices review supports retaining hosted Checkout, server-only keys,
signed events and independent provider evidence; it introduces no SDK upgrade or new provider.
