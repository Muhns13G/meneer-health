---
evidence_id: phase-02-sprint-08-2
title: Minimum Pilot Product and Pathway Decision
status: superseded
task: 8.2
source_commit: c0171c51ed74c7a21d2e80b8960144330079f947
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-006, TD-007]
---

# Sprint 08.2 — Minimum Pilot Product and Pathway Decision

> DR-013 supersedes this task's product-exclusion outcome. The recorded safeguards and complete
> TD-007 evidence standard remain applicable to the newly approved candidate catalogue.

## Outcome

[DR-011](../../../07-decisions/DR-011-minimum-pilot-product-pathway.md) selects the documented
scope-removal route for the minimum v1 pilot. BPC-157, TB-500 and every other product-specific
peptide transaction are excluded from Meneer's onboarding, payment, queue, hand-off and fulfilment
scope. The product hypothesis is preserved for future evidence review; it is not presented as an
approved product.

TD-007 is Verified for the minimum-pilot boundary because the proposed products and affected
product transactions are now explicitly outside scope and the current runtime already fails closed.
TD-006 remains In progress: this task does not approve, replace or withdraw the retained public
claim variants.

## Refreshed Authority Check

The official-source check on 2 October 2026 found:

- SAHPRA's public peptide information names BPC-157 and TB-500 among illegally marketed peptides
  and states that medicines intended to treat, prevent or alter bodily functions require
  registration before sale in South Africa.
- SAHPRA's current `SAHPGL-CEM-S21-02` Section 21 guideline is version 6, updated 30 October 2025.
  It describes controlled access to unregistered medicines and states that advertising and
  marketing medicines accessed through Section 21 is prohibited.
- The repository contains no restricted evidence reference for product registration, applicable
  Section 21 authority, an approved product/manufacturer, or a complete product-specific pathway.

This is a scope decision, not legal or clinical advice and not a finding about what an external
professional system may independently determine for a particular patient.

## Transactional Boundary

| Surface or datum                         | Minimum-pilot disposition                                       |
| ---------------------------------------- | --------------------------------------------------------------- |
| Product-specific peptide selection       | Excluded                                                        |
| BPC-157/TB-500 customer-facing line item | Excluded                                                        |
| Medicine-related Stripe metadata         | Prohibited                                                      |
| Protocol or health content in Meneer     | Prohibited                                                      |
| Opaque manual protocol hand-off          | Permitted after Sprint 10 controls pass                         |
| One-time non-medicine charge             | Undecided until Task 8.4 approval                               |
| `/peptides`                              | Informational, `noindex`, non-transactional                     |
| `/start`                                 | Gated until approved product-neutral onboarding replaces it     |
| Existing peptide public claims           | Retained as `pending-evidence`; not approved by this task       |
| Future product activation                | Requires a new decision and the complete authority/evidence set |

## Repository Verification

- Active `/start` and `/peptides` surfaces do not expose a routed profile, questionnaire,
  checkout, prescription, dispensing or delivery action.
- The Precise Wellness URL and local profile/acknowledgement code exist only inside an explicitly
  preserved, unrouted prototype.
- Peptide claim variants remain `pending-evidence` and publication validation cannot treat them as
  approved.
- Hosted payment and fulfilment implementations remain fail-closed behind capability and
  environment gates.
- No application, migration, provider configuration or hosted record changed in Task 8.2.

## Downstream Requirements

- Task 8.3 still owns named parties and responsibility allocation.
- Task 8.4 must approve an accurate non-medicine price/line item or keep checkout disabled.
- Tasks 8.5–8.7 still own data, consent and support inputs.
- Task 8.8 still verifies the protocol portal, but cannot reinterpret a portal capability as
  product authority.
- Sprint 10 must keep the hand-off opaque and product-neutral.
- Sprint 11 must reject product names and clinical data in payment records and metadata.

## Rollback

This documentation-only task has no hosted rollback. Reintroducing a product transaction is not an
ordinary revert: it requires a new approved decision and complete evidence under DR-011 and the
TD-007 close-out pack.
