---
task: 7.2
status: completed
date: 2026-08-13
related_debt: [TD-040]
debt_status: in-progress
authority: owner-approved
---

# Sprint 07.2 — Canonical Journey Model

## Outcome

The repository owner approves one five-phase canonical public journey with controlled
channel-specific summaries. The model separates service phases, interface progress, authoritative
workflow state, and cross-cutting support/exception handling. It changes no public wording or
runtime behaviour; Tasks 7.3–7.6 own schema implementation, migration, and consistency evidence.

## Canonical Five-Phase Journey

| ID                          | Canonical phase                                                           | Required meaning                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pathway-and-intake`        | Choose a pathway and complete private intake                              | Entry and minimum required information; it is not eligibility, approval, or a clinical decision.                                 |
| `screening-and-review`      | Screening and clinical review, including tests where required             | Submitted information and required evidence are reviewed by the authorised pathway; tests are conditional.                       |
| `consultation-and-decision` | Consultation where required, followed by an authorised treatment decision | Consultation is pathway-dependent; only an authorised party may approve treatment or prescribe.                                  |
| `price-and-payment`         | Accept the approved price and pay only for applicable items               | Versioned terms and line items apply; payment timing follows the approved scenario and never implies clinical approval.          |
| `pharmacy-and-delivery`     | Pharmacy fulfilment and discreet delivery where treatment is approved     | Supply and delivery require every applicable clinical, payment, stock, pharmacy, address, consent, and operational prerequisite. |

The order is canonical at public-content level, but Phase 4 remains scenario-aware: a real
consultation may be charged at booking, while medication and delivery are chargeable only after the
authorised decision and required operational checks. The model does not collapse the independent
clinical, payment, pharmacy, custody, dispatch, delivery, cancellation, or refund states defined by
DR-002 and DR-003.

## Permitted Channel Projections

| Projection                   | Permitted treatment                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three-step marketing summary | May group intake; screening/consultation/decision; and approved payment/fulfilment/delivery. It must not turn conditional treatment or delivery into a guarantee.                                 |
| Four-event journey summary   | May present intake, clinical interaction/decision, approved pharmacy hand-off, and delivery. Commercial detail may link to the applicable terms but must not imply zero cost or automatic supply. |
| Intake progress              | May number interface screens independently. It must be labelled as form/progress steps and must not be presented as the complete service journey.                                                 |
| Detailed confirmation        | May expand tests, review, consultation, decision, pharmacy, and delivery events. Optional events must be identified and no event may be shown as completed from browser state alone.              |
| Campaign or metadata summary | May use shorter approved variants, but cannot introduce a new sequence, guarantee, timing meaning, eligibility outcome, or unsupported claim.                                                     |

Channel summaries may omit detail for comprehension, not material conditions needed to prevent a
misleading interpretation. Task 7.3 will encode projection identifiers; Task 7.4 will govern exact
claim variants; Task 7.5 will migrate the existing representations without ad hoc rewriting.

## Pathway Variations

- The five phase IDs remain stable across treatments.
- The intended peptide variation may use the Precise Wellness questionnaire and partner pathway.
  The exact authorised reviewer/decision-maker, pharmacy basis, data hand-off, escalation, and
  product authority remain TD-007 activation inputs and cannot be inferred from this model.
- Other treatment pathways may use the Meneer doctor-led consultation route after their own
  protocol and activation evidence passes.
- Consultation, blood work, prescription, payment, pharmacy fulfilment, and delivery are conditional
  where the pathway or patient outcome does not require them.
- A rejected, unsuitable, abandoned, expired, cancelled, payment-failed, pharmacy-rejected, or
  delivery-failed journey follows its explicit state and recovery path rather than advancing to the
  next marketing phase.

## Timing Semantics

| Retained timing family       | Approved semantic boundary                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Five minutes                 | An estimate for completing the initial intake only; not total service time or guaranteed eligibility.                                                           |
| Within 48 hours              | Target for initial clinical contact or review after a complete intake and required information; not guaranteed dosing, approval, pharmacy release, or delivery. |
| Three to five business days  | Provisional delivery target from `eligible_for_fulfilment_at` to verified delivery, subject to measured performance and disclosed exceptions.                   |
| Evening/weekend availability | A staffing-dependent availability claim, not a guaranteed completion or delivery clock.                                                                         |

The current “Booked & dosed inside 48 hours” and two-to-three-business-day delivery variants do not
match these approved semantics. They remain unchanged in Task 7.2 and must receive a fail-closed
claim disposition in Task 7.4 before Task 7.5 changes or derives any public representation.

## Cross-Cutting Concerns

Cancellation, refund, general support, clinical escalation, privacy requests, complaints, adverse
events, payment exceptions, pharmacy exceptions, and delivery recovery are not numbered journey
phases. They attach to the applicable authoritative state and must expose the approved owner,
channel, consequence, and fallback without implying that one state reverses another.

“Cancel whenever” retains DR-002's meaning: a person may request cancellation digitally without a
mandatory telephone call, while refundability and fulfilment consequences depend on what has already
been performed, paid, released, or dispatched.

## Frozen Derivation Rules

1. Public representations derive from the five stable phase IDs after Task 7.3; they do not define
   authoritative workflow state.
2. A condensed channel may group phases but cannot reorder them or make conditional events certain.
3. Interface step numbers are independent from service-phase counts and must be labelled as such.
4. No browser confirmation or payment-return page proves clinical approval, payment, pharmacy
   release, dispatch, or delivery.
5. Timing variants must identify their start event, end event, qualifiers, and evidence state.
6. Pathway-specific summaries may change actors or optional steps only through approved variants.
7. Support, cancellation, refund, and exception handling remain available across phases and derive
   consequences from authoritative state.
8. Existing wording remains preserved until the content schema and claim lifecycle can migrate it
   deliberately, traceably, and reversibly.

## Decision and Debt Boundary

The owner approved this model and its channel, pathway, timing, and cross-cutting rules on
13 August 2026. This completes Task 7.2 and moves TD-040 to **In progress**. TD-040 cannot become
Verified until Tasks 7.3–7.6 implement the governed source, migrate retained representations, and
prove consistency and rollback.

The decision does not close TD-006 or TD-007, approve a public claim, activate a transaction,
appoint a regulated party, or replace missing clinical/legal/privacy/commercial/operations
evidence.

## Validation

- Reconciled the model against the Sprint 7.1 drift inventory and DR-001–DR-003.
- Preserved independent clinical, payment, fulfilment, cancellation, and refund states.
- Recorded explicit mappings for three-step, four-event, intake-progress, detailed-confirmation,
  campaign, and metadata representations.
- Defined timing meanings without changing current customer-facing copy.
- Markdown formatting, RAG JSON parsing, and repository whitespace checks pass.
