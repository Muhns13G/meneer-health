---
evidence_id: phase-02-sprint-15-1-product-order-contract
title: Private Product Ordering Contract
status: completed-at-contract-level
authority: owner-approved-direction
task: 15.1
observed: 2026-10-10
owner: "@Muhns13G"
related_debt: [TD-007, TD-009, TD-010]
---

# Task 2.15.1 — Product Ordering Contract

The owner approves [Sprint 15](../sprint-15-product-orders-manual-fulfilment.md) as the bounded
extension from onboarding/deposit to product orders. This task freezes the contract, not a
working shop, permission to prescribe, publication of real prices or live sales release.

## Flow and Responsibilities

1. An active onboarded client may browse a private versioned customer-RRP catalogue and register
   interest. The server binds identity/tenant; interest grants no clinical/payment/supply authority.
2. A qualified authorised clinician records independent approval for exact products and quantities,
   based on the applicable current intake. Mansoer/Mikhail operations roles cannot make that decision.
3. Assigned operations staff prepare a quote using price IDs, bounded quantities, current delivery
   quote, private address snapshot and clinical-approval reference. Server authority rechecks all
   references; merely supplying their IDs proves nothing. Stock, pharmacy and custody readiness
   remain independently attributed prerequisites for issuing a payable quote.
4. The client sees exact order lines, RRP, capped deposit credit, separate delivery, payable balance,
   applicable unused refund and versioned product terms. Acceptance starts unchecked. Reuse the
   existing own-client receipt/Checkout path; no second deposit or generic manual Payment Link.
5. Signed settlement confirms payment. Staff separately record provider order, dispensing evidence,
   receipt at Meneer, courier dispatch, delivery or exceptions. No automatic progression from money
   to dispensing. Required generator output remains unavailable until its separate reactivation.

## Portable Input Boundaries

`product-order-commands.ts` adds strict schemas for `register_interest` and `prepare_quote`.
Interest accepts product/request IDs only. Quote preparation reuses `pilotOfferSelectionSchema`
for case, product-price IDs, quantities, delivery reference and request key, restricts its scenario
to `approved_product_order`, and requires expected case version, address snapshot and clinical
approval IDs. Unknown caller fields—including identity/tenant, totals and approval/paid flags—are
rejected. Actual product/quantity approval, ownership, replay, audit and database locking belong to
later governed handlers and persistence; Zod parsing does not establish them.

The existing commercial calculation/refund contract is unchanged. Prices remain synthetic-only
until 15.2 deliberately adds reviewed real provenance. No real source PDF or practitioner costs
are copied into this task. Client/provider outputs require separately minimal schemas; these
internal commands are not a browser catalogue response or registered public API contract.

## Acceptance and Handoff

15.1 requires strict-schema regressions plus existing credit/calculation tests, TypeScript,
focused lint, formatting and documentation-link/index consistency. Its file inventory is the
Sprint-15 plan, this annexure, two domain files, Phase-02 README and current-state/RAG index.
No endpoint, schema migration, dependency, hosted change, message or provider record is introduced.
Next is 15.2: provenance/import and private records, including exact clinical/address binding.
Source deployment/hosted acceptance and whole-sprint completion remain future evidence.

Validation on 10 October: two domain test files / 28 tests pass, including the new strict
commands and unchanged commercial calculation/credit regressions. TypeScript, focused ESLint,
Prettier and whitespace checks pass. No browser, database or provider exercise is claimed for
this unrouted contract-only slice. Tasks 15.2–15.10 remain planned.
