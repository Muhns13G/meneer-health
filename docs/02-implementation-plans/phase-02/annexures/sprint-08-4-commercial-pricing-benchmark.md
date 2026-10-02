---
evidence_id: phase-02-sprint-08-4-pricing-benchmark
title: Pilot Commercial Pricing and Fulfilment Decision
status: completed
task: 8.4
source_commit: 5937ca1667eab027010a896ecef8f8c80f4d09d2
observed: 2026-10-02
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-007, TD-009, TD-010]
---

# Sprint 08.4 — Pilot Commercial Pricing and Fulfilment Decision

## Outcome

The repository owner approved the pilot commercial model in
[DR-013](../../../07-decisions/DR-013-pilot-product-commercial-fulfilment-amendment.md): free
eligibility/intake, a once-off R999 review deposit credited in full to the first approved order,
Precise Wellness schedule RRP pricing, VAT-inclusive planning, separately charged delivery,
manual one-time purchases/refills and defined refund treatment.

Task 8.4 is complete at the decision/evidence level. This task does not activate checkout, approve
medicine claims or verify the pharmacy and fulfilment pathway. Those remain downstream
implementation and release gates under TD-007, TD-009 and TD-010.

## Source Authority and Confidentiality

The owner confirmed that `Master Pricing Schedule Practitioner.pdf` is the Precise Wellness
practitioner schedule supplied to Meneer. It contains practitioner prices and recommended retail
prices for pre-filled pens and lyophilised vials. Every listed item may enter the pilot's candidate
catalogue, subject to product-specific clinical, authority, availability and release controls.

The source remains outside Git because it contains confidential wholesale pricing. Its approved
version is identified by SHA-256:

`6fb2afe26b479f3affa2ca3ca98a66d20d6c18406621e7e4e52d810826a41736`

Exact practitioner costs must never be exposed to clients, public routes, browser code, Stripe
metadata, logs or ordinary email. Customer-facing RRPs will later be imported into a private,
versioned, effective-dated, server-owned catalogue.

The older Noventra catalogue and AndroLab public model remain dated research benchmarks only. They
do not override the Precise Wellness schedule or DR-013.

| Owner-supplied source                      | SHA-256                                                            | Use in this task                                      |
| ------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------- |
| `Master Pricing Schedule Practitioner.pdf` | `6fb2afe26b479f3affa2ca3ca98a66d20d6c18406621e7e4e52d810826a41736` | Confidential Precise Wellness RRP authority           |
| `Mamba Onboarding Process Flow.pdf`        | `1c77652166670b834e2974c25de3452bfd26b2da483e20cbe456927f44274fc3` | Historical workflow input; superseded where noted     |
| `mamba financial model.xlsx`               | `c3de593d734571370ee28e631b7d23bad85e85af5fa326df436f1bb1aa254d53` | Non-authoritative planning and assumption cross-check |

The original owner-supplied email identifies the schedule, financial model and process flow as one
commercial planning bundle and expressly warns that the financial inputs were not yet accurate.
The files and email remain outside Git.

## Approved Commercial Rules

| Topic                  | Approved pilot rule                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Entry                  | Invite-only eligibility and intake are free.                                                         |
| Review                 | R999 once-off review deposit; not a membership fee.                                                  |
| Credit                 | R999 credited in full to the first clinically approved order.                                        |
| Product price          | Precise Wellness schedule RRP, treated as VAT inclusive for the pilot.                               |
| Delivery               | Separate, disclosed server-owned rate/quote; not included in RRP.                                    |
| Merchant presentation  | Meneer customer-facing Stripe merchant brand.                                                        |
| Legal seller/invoicing | OCTOTHORP ZA until Meneer has its own juristic identity.                                             |
| Stripe structure       | Normal standalone account inside the owner's Stripe organisation; not Connect.                       |
| Supply and custody     | Precise Wellness dispenses to Meneer; Meneer/OCTOTHORP arranges governed courier delivery to client. |
| Blood tests            | Client obtains and pays for required results; missing/unacceptable results pause the journey.        |
| Purchase cadence       | Manual one-time orders and refills only; no subscription or automatic renewal.                       |
| Amount authority       | Server-owned catalogue, credit and delivery calculation; browser-supplied amounts are rejected.      |

## Approved Refund and Exception Rules

The R999 review deposit is refunded in full to the original payment method when:

- no review occurs;
- the client is clinically unsuitable or rejected;
- the clinical decision expires;
- the hand-off fails; or
- the provider cannot complete the review.

If the review is completed, an order is approved and the client voluntarily declines it, the
review deposit is earned and retained. Duplicate payments are fully refunded. Product charging
occurs only after clinical approval and confirmed availability. Payment, clinical approval,
dispensing, custody and delivery remain independent states and may not imply one another.

## Evidence Reconciliation

The owner-supplied onboarding flow supports consent before collection, intake, contraindication
screening, account creation, payment, client-supplied pathology, asynchronous clinical review and
delivery. Its FNB Pay, bundled laboratory and original custody assumptions are superseded by the
approved Stripe, client-funded blood-test and Precise-Wellness-to-Meneer custody decisions.

The supplied financial model is a planning artefact rather than price authority. Its inputs were
explicitly described as not yet accurate; it also assumes subscriptions, delivery cost and broad
conversion behaviour that are not approved pilot terms. It must not determine Stripe Prices,
forecasts represented as fact or client charges.

## Retained Activation Gates

| Gate                                                        | Current effect                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Product-specific authority and complete pathway (TD-007)    | Candidate catalogue cannot transact until independently verified.            |
| Verified Precise Wellness/pharmacy parties and agreements   | No dispensing or custody hand-off.                                           |
| Clinical review and blood-result requirements               | No approval or product charge.                                               |
| Courier, storage/cold-chain, returns and recall controls    | No dispatch or delivery promise.                                             |
| Private versioned product catalogue and delivery rate table | No server-authoritative quote or Stripe Price.                               |
| Customer terms, privacy instruments and domain approvals    | No client acceptance or commercial release.                                  |
| Stripe sandbox implementation and exception proof           | Hosted checkout remains disabled until Sprint 11 and the Sprint 13 decision. |

## Completion Rule

Task 8.4 is Completed because the owner has approved every commercial-policy question within its
scope and DR-013 preserves those answers authoritatively. TD-010 intentionally remains In progress:
the downstream catalogue, legal/tax/operations approvals, terms, Stripe sandbox implementation and
end-to-end exception evidence are deliverables of later Phase 02 tasks, not reasons to keep this
decision task open.
