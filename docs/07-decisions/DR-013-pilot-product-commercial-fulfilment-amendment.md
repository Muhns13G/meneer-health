---
decision_id: DR-013
title: Pilot Product, Commercial and Fulfilment Amendment
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA commercial, technology and operations owner
required_approvers: [business_owner, repository_owner]
effective_date: 2026-10-02
last_updated: 2026-10-05
supersedes: [DR-011-product-exclusion, DR-012-product-fulfilment-exclusion]
related_debt: [TD-006, TD-007, TD-009, TD-010, TD-043]
---

# DR-013 — Pilot Product, Commercial and Fulfilment Amendment

## Context

DR-011 closed TD-007 only by excluding product-specific transactions, and DR-012 therefore left
pharmacy, custody, courier and product fulfilment unassigned. The owner has since supplied Precise
Wellness's confidential practitioner pricing schedule and approved a bounded product pilot. The
schedule remains outside Git; its SHA-256 fingerprint is
`6fb2afe26b479f3affa2ca3ca98a66d20d6c18406621e7e4e52d810826a41736`.

This decision amends the minimum-pilot scope. It approves the commercial policy needed to complete
Task 8.4, but it does not establish medicine authority, approve claims, appoint verified
professionals or activate checkout, dispensing or fulfilment.

## Decision

1. **Candidate catalogue:** every product listed in the fingerprinted Precise Wellness schedule is
   eligible to enter the invite-only pilot catalogue. Listing is not a public offer, clinical
   recommendation, guaranteed availability or authority to transact. Each order still requires the
   applicable product, professional, clinical, pharmacy, supply and release gates to pass.
2. **Price authority:** the schedule's recommended retail price is the approved pilot product price.
   Prices are treated as VAT inclusive for pilot planning. The confidential schedule and
   practitioner costs remain outside Git; a future private, versioned, effective-dated,
   server-owned catalogue must reproduce only the approved customer-facing data.
3. **Free entry and review deposit:** eligibility and intake are free. Meneer may charge one R999
   review deposit before review. It is not a membership fee and is credited in full to the client's
   first clinically approved order.
4. **Refund treatment:** the R999 deposit is refunded in full to the original payment method if no
   review occurs, the client is clinically unsuitable or rejected, the decision expires, the
   hand-off fails, or the provider cannot complete the review. If a completed review approves an
   order and the client then voluntarily declines it, the review deposit is earned and retained.
   Duplicate payments are refunded in full.
5. **Product and delivery charges:** the product line uses the approved RRP less the R999 credit.
   Delivery is a separate line item, disclosed before payment, and is not included in RRP. Its
   amount must come from an approved server-owned rate or quote; the browser cannot supply or alter
   any amount.
6. **Merchant and legal counterparty:** Meneer is the customer-facing Stripe merchant brand using a
   normal standalone Stripe account within the owner's Stripe organisation. This is not Stripe
   Connect. Until Meneer has its own juristic identity, OCTOTHORP ZA remains the legal operator,
   seller/invoice issuer and accountable commercial counterparty; customer documents must not imply
   otherwise.
7. **Dispensing and custody direction:** the intended operating model is that Precise Wellness
   dispenses to Meneer, after which OCTOTHORP ZA/Meneer assumes governed custody and arranges courier
   delivery to the client. Activation still requires verified party identities and authority,
   contracts, prescription/dispensing basis, chain of custody, packaging, storage/cold-chain where
   applicable, courier controls, reconciliation, returns, recall and adverse-event procedures.
8. **Blood results:** the client obtains and pays for required blood tests. The responsible clinical
   provider defines acceptable tests, age and result criteria. Missing, outdated or unacceptable
   results pause the journey; Meneer does not infer clinical sufficiency.
9. **Purchase cadence:** pilot purchases and refills are manual, one-time transactions. There is no
   subscription, automatic renewal, membership charge or automatic repeat dispensing.
10. **Transactional integrity:** clinical approval, payment, dispensing, custody and delivery are
    independent states. Product charging occurs only after approval and confirmed availability.
    Failed, cancelled, disputed, replayed or inconsistent events must reconcile without false
    success. Refunds return to the original payment method.
11. **Activation:** Stripe remains in sandbox/test mode until Sprint 11 and the final Sprint 13
    release decision. No price, product or delivery route becomes public or chargeable merely
    because this commercial decision is approved.

## Task 11.1 Owner Clarifications — 5 October 2026

The owner explicitly approved capped product credit where the first approved order's RRP subtotal
is below R999: refund the unused deposit to the original method and charge delivery separately.
There is no future wallet balance or silent forfeiture. The
[11.1 contract](../02-implementation-plans/phase-02/annexures/sprint-11-1-commercial-payment-contract.md)
defines atomic credit reservation/consumption, unused-refund reconciliation and original-funding
allocation. This is a commercial clarification, not executed refund or payment evidence.

The owner also approved staff review of unresolved no-show/late-cancellation and
post-pharmacy-release refund cases, with no automatic forfeiture or invented fee. Existing explicit
full-refund reasons remain automatic. Exact monetary exceptions require reviewed terms and
attributed authority; staff review cannot waive applicable rights or infer voluntary decline.
Final rendered transactional publication must include these meanings with traceable versioning.

## Effect on Earlier Decisions and Debt

- DR-011 remains historical evidence for the safe scope-removal decision, but its prohibition on
  product transactions is superseded by this record. TD-007 therefore returns to **In progress**
  until the product-specific authority and complete clinical/pharmacy/fulfilment pathway are
  independently verified.
- DR-012 remains authoritative for its non-clinical, data, support and external-protocol boundaries.
  Its statement that pharmacy, custody, courier and product fulfilment are not applicable is
  superseded by the intended allocation above; the allocation remains an activation gate, not a
  verified appointment.
- DR-002's conservative one-time-payment model remains authoritative and is refined by the exact
  R999 deposit, RRP, VAT, merchant, credit, delivery and refund decisions in this record.
- Task 8.4 is complete at the decision/evidence level. TD-010 remains In progress until the private
  catalogue, delivery rates, customer terms, legal/tax/operations approvals, Stripe sandbox
  implementation and end-to-end exception tests exist.
- DR-015 subsequently fixes the order-specific terms and acceptance contract. It does not supply
  unresolved supplier/channel schedules, final rendered domain approval, rates or implementation.

## Security, Privacy and Clinical Implications

- Product choice, blood results, questionnaire answers, diagnosis, protocol and prescription must
  not enter URLs, Stripe metadata, ordinary email, public logs or analytics.
- Prices, credits, delivery and payable totals are computed and revalidated server-side from
  versioned records. Client-supplied amounts fail closed.
- Payment never proves clinical approval or authorises dispensing. Clinical users do not gain
  payment administration rights, and operations users do not gain clinical decision rights.
- Product availability or RRP must not be published as a therapeutic claim.

## Review Triggers

Review before changing a price or VAT basis, registering Meneer as a juristic entity, changing the
seller/invoice issuer, enabling live Stripe mode, appointing or changing a pharmacy/courier,
altering the R999 credit/refund policy, introducing subscriptions, adding a product not in the
fingerprinted schedule, or changing the custody route.

## Affected Documents

- `docs/07-decisions/DR-002-commercial-fulfilment-model.md`
- `docs/07-decisions/DR-011-minimum-pilot-product-pathway.md`
- `docs/07-decisions/DR-012-minimum-pilot-responsibility-allocation.md`
- `docs/02-implementation-plans/phase-02/sprint-08-pilot-activation-contract.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/05-future-considerations/td-006-td-007-claims-peptide-closure.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`
