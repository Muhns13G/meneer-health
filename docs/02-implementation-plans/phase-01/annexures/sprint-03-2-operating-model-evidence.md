---
evidence_id: phase-01-sprint-03-task-02
title: Sprint 03 Task 3.2 Operating Model and Governance Evidence
status: verified-local
owner: "@Muhns13G"
date: 2026-08-08
related_debt: [TD-009, TD-050]
---

# Sprint 03 Task 3.2 — Operating Model and Governance Evidence

## Outcome

DR-001 approves the layered operating boundary and responsibility matrix. DR-008 approves
accountable domain roles, approval paths, stop authority, review workflow, and repository ownership.
The records use role-based ownership and explicit activation gates without publishing private role
holders or inventing undecided company, professional, pharmacy, commercial, or fulfilment details.

## Approved Boundary

- Meneer Health is the working customer-facing brand, not a juristic clinical or pharmacy actor.
- OCTOTHORP ZA is the website operator and technology, marketing, general-support, release, and
  operations-coordination layer.
- Precise Wellness is the owner-confirmed intended peptide clinical/pharmacy service identity;
  verified professionals and pharmacy parties retain their independent authority.
- General support remains separate from urgent or clinical escalation.
- Contracting, invoicing, information-responsibility, professional, pharmacy, urgent-channel, hub,
  and courier particulars remain explicit activation gates.

## Repository and Public-Surface Reconciliation

| Surface                               | Result                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/privacy.tsx`              | Names OCTOTHORP ZA as current pre-transactional website operator and uses the approved general-support address                               |
| `src/routes/terms.tsx`                | Names OCTOTHORP ZA and limits terms to the current informational website                                                                     |
| `src/routes/contact.tsx`              | Uses the approved general-support address and rejects sensitive/urgent use                                                                   |
| Campaign footers                      | Name OCTOTHORP ZA and its owner-confirmed enterprise number                                                                                  |
| `src/lib/compliance/pilot-profile.ts` | Uses the owner-confirmed Precise Wellness identity while retaining pharmacy registration and responsible-pharmacist placeholders as blockers |
| `.github/CODEOWNERS`                  | Assigns `@Muhns13G` current review ownership across the repository and sensitive paths                                                       |

No established marketing wording was changed. The compliance-profile identity correction does not
remove any activation blocker or present a licence or professional registration as verified.

## Debt Disposition

- **TD-009 — In progress:** the layered operating model, RACI, current operator, and general-support
  representation are approved and reconciled. The gated particulars listed in DR-001 are still
  required before the complete entity/partner responsibility model can be Verified.
- **TD-050 — Verified:** accountable domain roles, approval/stop paths, repository review rules, and
  CODEOWNERS now exist. Private role-holder appointments and enforceable branch protection remain
  release/access gates; they do not negate the completed governance design.

## Validation

- Reconciled DR-001 with the approved controlled-pilot charter and current public policy/contact
  source.
- Confirmed each responsibility-matrix activity has exactly one accountable boundary.
- Confirmed DR-008 covers clinical, pharmacy, legal/privacy, security, data, commercial, operations,
  content, technology, support, release, and repository ownership.
- Confirmed every sensitive change class has an approval path and stop authority.
- Ran repository formatting, TypeScript, production build, JSON-index, and diff checks recorded at
  Task 3.2 close-out.

## Residual Work

Complete the explicit DR-001 gates when the business is ready to supply or approve those details.
Task 3.3 next owns the commercial and fulfilment exception model. No health-information collection
or transaction is authorised by this task.
