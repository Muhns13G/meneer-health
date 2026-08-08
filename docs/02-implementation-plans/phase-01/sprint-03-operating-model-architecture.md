---
plan_id: phase-01-sprint-03
title: Operating Model and Architecture Decisions
status: in-progress
primary_debt: [TD-009, TD-010, TD-011, TD-012, TD-013, TD-016, TD-050, TD-054]
depends_on: [phase-01-sprint-01, phase-01-sprint-02]
last_updated: 2026-08-08
owner: "@Muhns13G"
---

# Sprint 03 — Operating Model and Architecture Decisions

## Mission

Replace implicit promises and framework-shaped assumptions with approved ownership, commercial, data, identity, lifecycle, and portable architecture decisions. Establish the constraints Sprint 05 must implement and future Next.js/Laravel generations must preserve.

## Intended Outcome

Named accountable owners have approved who provides the service, who controls and processes each data class, which roles may perform each action, how records and integrations are bounded, and how the v1 pilot architecture remains portable. No implementation team must guess clinical authority, commercial responsibility, tenancy, identity, or retention rules.

## Delivery Contract

Sprint 03 is documentation and decision work. Unknown legal, clinical, pharmacy, commercial, or
personal particulars must use an explicit `[TBC — owner role — release gate]` marker. Drafts must
not invent identities, registration numbers, approvals, prices, or authority, and an unresolved
placeholder must never be represented as verified or patient-facing approval.

| Task | Commit-sized outcome                                                                               | Primary debt                                | Status    |
| ---- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------- |
| 3.1  | Refresh the plan; establish decision-record governance, templates, and evidence ownership.         | All Sprint 03 debt                          | Completed |
| 3.2  | Approve the operating model, responsibility matrix, and accountable-domain ownership.              | TD-009, TD-050                              | Completed |
| 3.3  | Approve the commercial, payment, fulfilment, and exception model.                                  | TD-010                                      | Completed |
| 3.4  | Approve platform boundaries and authoritative workflow-state ownership.                            | TD-011                                      | Completed |
| 3.5  | Approve framework-neutral domain, API, event, compatibility, and migration contracts.              | TD-054                                      | Completed |
| 3.6  | Approve the data, tenancy, lifecycle, migration, and vendor-evaluation architecture.               | TD-012                                      | Completed |
| 3.7  | Approve identity, session, role, permission, privileged-access, and service-identity requirements. | TD-013 decision portion                     | Completed |
| 3.8  | Validate lifecycle, permissions, responsibilities, states, threats, and required scenarios.        | TD-016 decision portion; all Sprint 03 debt | Completed |
| 3.9  | Obtain approvals and reconcile the registry, RAG corpus, blueprint, and completion report.         | All Sprint 03 debt                          | Planned   |

Each task is reviewed and committed separately by the repository owner. A task may prepare a draft,
but only recorded domain approval changes a decision record to `approved`.

### Implementation-evidence boundary

Sprint 03 owns the decision portions of TD-013 and TD-016. Their registry acceptance criteria also
require running-system evidence that this sprint's non-goals prohibit:

- TD-013 remains open after its architecture is approved until Sprint 05 implements server-side
  permissions and verifies horizontal and vertical access boundaries.
- TD-016 remains open after its lifecycle schedule and procedures are approved until Sprint 05
  demonstrates a staging backup restore and a complete synthetic data-subject request.

Sprint 05 owns that implementation follow-through. This allocation preserves the registry's current
acceptance standard; it does not weaken it or prematurely close either item.

## Scope

Primary debt: TD-009–TD-013, TD-016, TD-050, and TD-054.

### Workstream 1 — Operating and responsibility model

1. Decide whether Meneer is the healthcare provider, intermediary, or technology/marketing layer.
2. Identify the contracting entity and responsible/operator relationships for every data category and workflow stage.
3. Define condition-specific decision authority: Precise Wellness's proposed questionnaire and
   dispensing mechanism for verified peptide products, and authorised clinician approval for
   testosterone and any other pathway that requires it.
4. Document who owns the peptide questionnaire, eligibility outcome, exclusions, escalation,
   adverse-event response, audit record, and patient communication; verify the product-level legal
   and regulatory basis rather than treating a questionnaire as evidence by itself.
5. Define clinician, pharmacy, laboratory, courier, support, and technology responsibilities, including exceptions and escalation.
6. Define the Precise Wellness supply-to-Meneer-hub hand-off, inventory/custody, dispatch, delivery,
   failed-delivery, return, and reconciliation responsibilities.
7. Produce a responsibility matrix separating clinical authority from product and operations authority.
8. Name product, clinical, legal/privacy, security, operations, content, data, and release approvers.

### Workstream 2 — Commercial model

1. Approve consultation fees, treatment pricing, subscriptions, payment timing, cancellation, refunds, failed payment, and fulfilment responsibility.
2. Define consultation-only, medication-plus-delivery, and bundled commercial scenarios with
   explicit line items and rules for clinical rejection, partial fulfilment, cancellation, and refund.
3. Confirm the standalone Meneer Stripe account and merchant-of-record model; record activation,
   restricted-business review, statement descriptor, settlement, tax, dispute, and access ownership.
4. Define what may be displayed or charged before eligibility or clinical approval.
5. Identify payment, supply, hub, delivery, reconciliation, dispute, and manual exception owners.
6. Define the start event and evidence basis for the provisional 3–5-business-day fulfilment target.
7. Record which commercial elements, including EFT, are outside the v1 pilot.

### Workstream 3 — Portable system boundaries

1. Define public acquisition, patient, clinical, operations, integration, and governance boundaries.
2. Identify authoritative state transitions and the service responsible for each.
3. Define versioned contracts for identity, consent, intake, triage, clinical decisions, prescriptions, payments, orders, fulfilment, support, and audit events.
4. Establish rules preventing React components, TanStack/Next.js routes, or Vercel functions from becoming the sole definition of domain behaviour.
5. Record expected v1-to-v2 and v2-to-v3 compatibility, migration, reconciliation, and rollback boundaries.

### Workstream 4 — Data and tenancy architecture

1. Approve a portable datastore approach and schema/migration ownership.
2. Define data classes, entities, identifiers, relationships, tenant/client boundaries, and isolation requirements.
3. Map storage location, encryption, backup, export, deletion, correction, retention, legal hold, and recovery requirements by data class.
4. Define how pilot data is migrated, retained, anonymised, or destroyed after the pilot.
5. Assess vendor portability, POPIA, residency, contractual, and failure-recovery requirements before provisioning.

### Workstream 5 — Identity and authorisation

1. Define patient, clinician, operations, support, auditor, and administrator roles.
2. Approve contact verification, authentication, recovery, session, MFA, and privileged-access requirements.
3. Create an action/resource permission matrix and rules for emergency/break-glass access.
4. Define service identities and downstream token/credential boundaries.

## Required Decision Records

- Operating model and responsibility matrix.
- Commercial model.
- Platform boundary and authoritative-state architecture.
- Data model, tenancy, lifecycle, and migration strategy.
- Identity and authorisation architecture.
- Vendor evaluation criteria rather than unreviewed product selections.
- Governance ownership and approval workflow.

Each record must identify context, options, decision, rationale, consequences, approvers, effective date, implementation owner, affected documents, and review trigger.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| TD-009 | Approved provider/entity/partner responsibility model matches intended patient-facing representation.                        |
| TD-010 | Approved commercial and exception model reconciles pricing, payment, cancellation, refund, and fulfilment copy.              |
| TD-011 | Architecture diagrams and state-ownership records cover all target platform boundaries.                                      |
| TD-012 | Approved portable data/tenancy model includes versioned schema, migration, backup, and rollback ownership.                   |
| TD-013 | Role/action matrix and identity decision cover verification, MFA, recovery, sessions, and server enforcement.                |
| TD-016 | Approved lifecycle schedule and procedures cover retention, access, correction, export, deletion, hold, backup, and restore. |
| TD-050 | Named accountable owners and review paths exist for every sensitive domain.                                                  |
| TD-054 | Versioned framework-neutral domain/API/event contracts and migration boundaries are approved.                                |

## Validation

- Walk at least one happy path, rejection path, urgent path, failed-payment path, fulfilment exception, support escalation, data-subject request, and incident through the responsibility and state models.
- Threat-model identity, tenancy, privileged access, integration credentials, data exports, and framework migrations.
- Confirm every data class has purpose, owner, lawful/approved handling basis, storage, access, retention, deletion, and recovery treatment.
- Confirm every contract has versioning, validation, error, idempotency, compatibility, and ownership semantics.
- Obtain recorded approval from the accountable domain owners; implementation-team agreement alone is insufficient.

## Non-Goals

- Provisioning vendors or production infrastructure before decisions are approved.
- Implementing the full backend, UI, or integrations.
- Treating this plan as legal or clinical approval.
- Choosing Laravel early without a measured scale trigger.

## Risks and Rollback

The primary risk is premature architecture built on unresolved legal or operating assumptions. Use time-boxed decisions with explicit unknowns; disable affected capabilities rather than silently assuming responsibility. Decision changes must create superseding records and migration impact assessments instead of rewriting history.

## Documentation and RAG Updates

- Store approved architecture and operating-model decision records in a dedicated, indexed directory.
- Update the blueprint if approved responsibilities or boundaries change target scope.
- Update TD-009–TD-013, TD-016, TD-050, and TD-054 only after approvals are evidenced.
- Refresh `docs/RAG/01-project-context.md`, `03-platform-evolution.md`, `04-domain-glossary.md`, `05-decision-register.md`, `06-known-limitations.md`, and `07-index.json`.
- Produce `docs/03-completion-reports/phase-01/sprint-03-operating-model-architecture.md`.
