---
evidence_id: phase-01-sprint-03-task-03
title: Sprint 03 Task 3.3 Commercial Model Evidence
status: verified-local
owner: "@Muhns13G"
date: 2026-08-08
related_debt: [TD-010]
---

# Sprint 03 Task 3.3 — Commercial Model Evidence

## Outcome

DR-002 defines the approved commercial, payment, cancellation, refund, fulfilment, exception, and
reconciliation boundary. The business owner approved its recommendations as conservative v1 pilot
policies after confirming that the complete model is not a universal global industry standard.

## Source Reconciliation

| Existing source                                                                  | Treatment in DR-002                                                                                 |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/components/Doctor.tsx`: no consultation charge when treatment is unsuitable | Approved clinical-rejection rule requires no charge or a full automatic reversal                    |
| `src/components/Benefits.tsx`: “Cancel whenever”                                 | Approved digital cancellation interpretation with stage-based consequences disclosed before payment |
| Website terms/privacy                                                            | Remain informational and explicitly require new transactional versions before payment               |
| DIR-014                                                                          | Preserves standalone Meneer Stripe account inside the parent Stripe Organization; not Connect       |
| DIR-015                                                                          | Defines consultation-only, medication-plus-delivery, and explicit-line-item bundle scenarios        |
| DIR-016                                                                          | Preserves Precise Wellness supply to the Meneer hub and separates pharmacy/hub/courier states       |
| DIR-017                                                                          | Defines the approved measurement clock from `eligible_for_fulfilment_at` to verified delivery       |

No public copy was changed. The decision neither validates the retained claims nor authorises payment.

## Approved Controls

- One-time ZAR payments only; subscriptions, automatic renewals, EFT, cash, buy-now-pay-later,
  insurance claims, stored value, and marketplace/Connect payments are outside v1.
- Consultation, medication, delivery, discount, refund, and adjustment remain explicit line items.
- Clinical, payment, order, pharmacy, custody, delivery, cancellation, refund, dispute, and support
  states remain independent.
- No medication/delivery charge before clinical approval and operational prerequisites.
- No charge or full reversal on clinical rejection, preserving the retained consultation promise.
- No partial fulfilment in v1; exceptions pause and route to an owned recovery/refund decision.
- Stripe receives opaque references only and no unnecessary health information.

## Approval Boundary

The business owner approved DR-002 on 8 August 2026. Commercial, legal/tax, operations, and release
approval of the gated particulars remains mandatory before publication, payment, fulfilment, or
pilot activation. Exact prices and private/undecided particulars may stay TBC until the company is
ready, but no TBC price or term may reach checkout.

## Validation

- Reconciled all current source matches for consultation, cancellation, subscription, pricing,
  payment, refund, delivery, Stripe, and fulfilment terms.
- Checked DR-002 against DR-001 responsibilities and the controlled-pilot charter.
- Compared the model with current official Stripe fulfilment, line-item, and metadata guidance,
  current Hims and Ro cancellation/commercial terms, and South African consumer legislation.
- Confirmed the technical-debt registry and RAG documents distinguish approved policy from gated
  particulars and live implementation.
- Confirmed Markdown formatting, RAG JSON parsing, and repository diff checks pass.

## Debt Disposition

TD-010 remains **In progress**. It cannot be Verified until the gated facts are approved, all
public/transactional copy and terms are reconciled, and the implemented scenarios pass evidence
review. Task 3.3 is **Completed** as the commercial decision task.
