---
report_id: phase-01-sprint-03-completion
title: Sprint 03 Operating Model and Architecture Decisions
status: verified-completion
date: 2026-08-08
owner: "@Muhns13G"
---

# Sprint 03 Completion Report — Operating Model and Architecture Decisions

## Mission and Outcome

Sprint 03 replaced implicit operating promises and framework-shaped assumptions with approved,
portable decisions for responsibility, commerce, workflow state, contracts, data, vendors,
identity, lifecycle, and governance. Tasks 3.1–3.9 are complete as documentation and decision work.
The sprint does not claim that its target backend, workflows, vendors, or controls are implemented.

## Work and Decisions

- Established the decision-record lifecycle, templates, approval boundaries, repository ownership,
  and `CODEOWNERS` review routing.
- Approved Meneer as the working brand, OCTOTHORP ZA as the technology/marketing/support/operations
  layer, and verified independent clinical and pharmacy parties as professional authorities.
- Approved a conservative one-time ZAR commercial model with explicit line items, independent
  clinical/commercial/fulfilment states, stage-aware cancellation, and no v1 subscription or EFT.
- Approved channel-specific interfaces over an authenticated application/API boundary and a
  framework-neutral modular core with explicit authoritative-state ownership.
- Approved versioned commands, queries, results, events, errors, audit facts, compatibility,
  idempotency, reconciliation, cutover, and rollback rules across TanStack, Next.js, and Laravel.
- Approved portable managed PostgreSQL plus encrypted object storage, logical data ownership,
  tenant scope, lifecycle states, migrations, backups, restores, and provider-independent exits.
- Approved vendor hard gates and evidence-based comparison without selecting Supabase, Neon,
  Brevo, Cloudflare data products, or another service prematurely.
- Approved stable internal identities, deny-default server authorisation, workforce MFA, bounded
  sessions, recovery, break glass, service identities, and a role/action matrix.
- Validated all eight records across nine required scenarios and adopted conservative lifecycle,
  rights, backup, RPO, and RTO targets, while preserving named approval and implementation gates.
- Updated `Precise Wellness — legal name pending` to `Precise Wellness` in the central pilot profile;
  its registration and responsible-pharmacist particulars remain explicit unverified placeholders.

## Deviations from the Plan

- The original sprint was delivered as nine separately reviewable, owner-committed tasks.
- Exact private, partner, contracting, commercial, and professional particulars were not invented;
  the approved records retain them as pre-launch gates, leaving TD-009 and TD-010 In progress.
- No service provider was selected or provisioned. Sprint 03 approved provider-neutral architecture
  and evaluation criteria because provisioning was a stated non-goal.
- TD-013 and TD-016 were not prematurely marked Verified. Their decision portions are approved,
  while their server-enforcement, access-boundary, staging-restore, and synthetic-rights evidence
  remains assigned to Sprint 05.
- Task 3.8 converted the previously open lifecycle dates into an approved conservative baseline,
  subject to final named-domain application, rather than leaving every period undefined.

## Lessons Learned

- Decision approval, operational particulars, implementation, and runtime proof are separate gates.
- Framework portability depends on stable state, identity, contract, data, and migration semantics;
  choosing a framework or bundled vendor does not provide that portability.
- Cross-record scenario walkthroughs expose gaps that isolated decisions miss, especially around
  rejection, urgent escalation, payment exceptions, fulfilment, rights, incidents, and migration.
- Explicit `[TBC]` release gates preserve honest progress when private or externally verified facts
  are unavailable.
- Public wording should remain unchanged unless evidence requires a correction; architecture work
  should not become an unapproved messaging rewrite.

## Technical Debt and Residual Risk

No new technical-debt ID was created. TD-011, TD-012, TD-050, and TD-054 are Verified. TD-009 and
TD-010 remain In progress until their named operating/commercial gates are supplied, approved, and
reconciled. TD-013 and TD-016 remain In progress until Sprint 05 implements and tests authorisation,
recovery, restore, and data-subject workflows. Other Sprint 05 implementation debt remains open.

Sprint closure does not activate the pilot, enable health-data collection or transactions, select
vendors, or verify placeholder professional and pharmacy particulars.

## Existing Files Modified

| File                                                                              | Sprint change                                                                                        |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `docs/00-blueprints/master-blueprint-v1.md`                                       | Reconciled approved operating, platform, contract, data, identity, lifecycle, and closure direction. |
| `docs/02-implementation-plans/phase-01/README.md`                                 | Recorded the Sprint 03 closure and residual evidence allocation.                                     |
| `docs/02-implementation-plans/phase-01/sprint-03-operating-model-architecture.md` | Split delivery into Tasks 3.1–3.9, defined evidence boundaries, and recorded completion.             |
| `docs/02-implementation-plans/phase-01/sprint-05-data-security-operations.md`     | Assigned TD-013/TD-016 implementation proof and aligned the Cloudflare runtime boundary.             |
| `docs/04-technical-debt/technical-debt-registry-v1.md`                            | Reconciled all eight Sprint 03 debts to their verified or gated disposition.                         |
| `docs/05-future-considerations/postgres-auth-email-vendor-strategy.md`            | Replaced premature vendor preference with DR-006 evaluation and exit gates.                          |
| `docs/RAG/01-project-context.md` through `06-known-limitations.md`                | Reconciled context, current capability, evolution, terminology, decisions, and limitations.          |
| `docs/RAG/07-index.json`                                                          | Indexed decision records, task evidence, completion status, and retrieval routes.                    |
| `src/lib/compliance/pilot-profile.ts`                                             | Recorded the confirmed Precise Wellness name while retaining unverified particulars as placeholders. |

## Files Created

| File                                                                                                           | Purpose                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `.github/CODEOWNERS`                                                                                           | Routes repository and sensitive-domain reviews to the current repository owner. |
| `docs/07-decisions/README.md`                                                                                  | Governs and indexes the authoritative decision-record set.                      |
| `docs/07-decisions/DR-001-operating-model-responsibility.md` through `DR-008-governance-ownership-approval.md` | Records the eight approved Sprint 03 decisions.                                 |
| `docs/07-decisions/templates/decision-record-template.md`                                                      | Standardises future decision records.                                           |
| `docs/07-decisions/templates/responsibility-matrix-template.md`                                                | Standardises accountable ownership and hand-offs.                               |
| `docs/02-implementation-plans/phase-01/annexures/sprint-03-1-decision-governance-evidence.md`                  | Records Task 3.1 governance evidence.                                           |
| `docs/02-implementation-plans/phase-01/annexures/sprint-03-2-operating-model-evidence.md`                      | Records Task 3.2 operating-model evidence.                                      |
| `docs/02-implementation-plans/phase-01/annexures/sprint-03-3-commercial-model-evidence.md`                     | Records Task 3.3 commercial-model evidence.                                     |
| `docs/02-implementation-plans/phase-01/annexures/sprint-03-4-platform-boundary-evidence.md`                    | Records Task 3.4 platform-boundary evidence.                                    |
| `docs/02-implementation-plans/phase-01/annexures/sprint-03-5-contract-migration-evidence.md`                   | Records Task 3.5 contract/migration evidence.                                   |
| `docs/02-implementation-plans/phase-01/annexures/sprint-03-6-data-vendor-evidence.md`                          | Records Task 3.6 data/vendor evidence.                                          |
| `docs/02-implementation-plans/phase-01/annexures/sprint-03-7-identity-authorisation-evidence.md`               | Records Task 3.7 identity/authorisation evidence.                               |
| `docs/02-implementation-plans/phase-01/annexures/sprint-03-8-architecture-validation-evidence.md`              | Records Task 3.8 scenario and lifecycle validation.                             |
| `docs/03-completion-reports/phase-01/sprint-03-operating-model-architecture.md`                                | This completion and residual-gate record.                                       |

## Validation and Next Boundary

DR-001–DR-008 are approved, indexed, cross-reconciled, and scenario-validated. The implementation
plan, blueprint, debt registry, RAG summaries, decision register, limitations, and retrieval index
agree on the closure boundary. Targeted Prettier checks, relative Markdown links, RAG JSON parsing,
TypeScript, production build, and `git diff --check` pass. The build retains the known upstream
Wrangler `punycode`/sandbox log warning. Full lint retains the pre-existing 21 formatting errors and
7 Fast Refresh warnings in application files; Sprint 3.9 adds none.

Sprint 04 may begin after owner review and manual commit of this closure task. Sprint 05 must use
the approved records as constraints; it must not infer activation from Sprint 03 completion.
