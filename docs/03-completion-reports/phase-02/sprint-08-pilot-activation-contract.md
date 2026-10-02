---
report_id: phase-02-sprint-08-completion
title: Sprint 08 Pilot Activation Contract and Hosted Baseline
status: completed-with-activation-gates
date: 2026-10-02
implementation_checkpoint: 3950b15
owner: "@Muhns13G"
---

# Sprint 08 Completion Report — Pilot Activation Contract and Hosted Baseline

## Mission and Outcome

Sprint 08 established the minimum pilot operating, commercial, profile, instrument, support and
protocol contracts and a clean hosted database baseline. Tasks 8.1–8.10 are complete within the
approved decision/evidence scope; Task 8.2's initial product exclusion was superseded by DR-013.
The sprint closes with seven existing activation gates. Sprint 09 can begin contract and
implementation work; customer activation still requires the applicable external schedules and
rendered approvals. Phase 02 remains in progress.

The implementation checkpoint is `3950b15`, containing committed Tasks 8.1–8.9. This report and
its synchronized closure documents form Task 8.10 and await the owner's commit and CI result.

## Delivered Work and Decisions

| Task | Delivered outcome                                                                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1  | Froze the repository/hosted baseline, globally continuous numbering, minimum pilot and non-goals.                                                                                                                                                                   |
| 8.2  | Recorded DR-011's initial product-neutral scope; preserved its history after DR-013 superseded exclusion.                                                                                                                                                           |
| 8.3  | Assigned OCTOTHORP ZA's non-clinical service, operations and privacy responsibilities under DR-012; external clinical authority remains separately verified.                                                                                                        |
| 8.4  | Approved the confidential Precise Wellness schedule RRP, R999 review deposit credited to the first approved order, VAT-inclusive planning, separate delivery, Meneer merchant brand, OCTOTHORP ZA seller/invoice issuer and manual order/refund rules under DR-013. |
| 8.5  | Approved given/family name, verified managed email, mobile/contact preference and server-owned lifecycle facts under DR-014; health data and free text remain outside the profile.                                                                                  |
| 8.6  | Approved distinct versioned account terms, privacy acknowledgement, order terms and recipient-specific hand-off authorisation under DR-015.                                                                                                                         |
| 8.7  | Approved three dedicated aliases and qualified 24-hour response target; Brevo accepted three synthetic messages and the owner confirmed receipt under DR-016.                                                                                                       |
| 8.8  | Exercised synthetic external intake, protocol generation, review/editor and PDF controls; retained manual audited hand-off under DR-017 because no supported API/webhook was visible.                                                                               |
| 8.9  | Reset hosted synthetic state, replayed 16 migrations without local seed, established one suspended pilot tenant and verified inactive boundaries and advisors.                                                                                                      |
| 8.10 | Reconciled current authority, debt, RAG routing, file inventory and sprint closure.                                                                                                                                                                                 |

The portal retains the synthetic pending protocol from the authorised exercise. No protocol was
approved, sent or used for a real person. Portal credentials, private links and confidential
pricing/source documents remain outside the repository.

## Deviations from the Original Plan

- Owner-supplied commercial evidence replaced the initial product exclusion with a gated candidate
  catalogue. DR-013 supersedes DR-011's exclusion and provisional benchmark prices; product
  authority remains a required input before transactions.
- Tasks 8.3, 8.6 and 8.7 completed the responsibility/instrument/channel contracts with explicit
  external activation requirements rather than all final named appointments, rendered approvals
  and routed support exercises. Those requirements transfer to Sprints 09–13 and the existing
  debts; the original plan's full external-input intention is not claimed as satisfied.
- Protocol investigation expanded into authorised synthetic generation. PDF controls succeeded,
  but binary contents, notifications, permission isolation and approval/send were not verified.
- Hosted reseeding used a committed suspended-tenant migration and `--no-seed` rather than the
  local synthetic seed. An orphan audit sequence interrupted the first reset; narrow removal and
  a successful complete replay resolved it, as recorded in Task 8.9 evidence.

## Lessons Learned

- Business approval of a price or responsibility model must remain distinguishable from a rendered
  offer, provider appointment or functioning customer journey.
- Pricing authority must come from the approved supplier schedule, with private evidence
  fingerprints; competitor and provisional benchmarks cannot silently become chargeable prices.
- Portal UI capabilities do not establish an integration contract or clinical correctness.
  Reconcile the underlying record when dashboard summaries conflict.
- Hosted rebuilds need migration parity and post-reset counts. Local seed fixtures should be
  explicitly excluded, and an inactive pilot tenant should fail closed.
- Empty-workload advisor notices require planned reassessment, not speculative index changes.

## Existing Debt and Remaining Ownership

The registry remains at **49 Verified and seven non-Verified items**.

| Debt   | Status      | Remaining work and owner sprint                                                                                                                                                     |
| ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-006 | In progress | Verify or withdraw retained claim variants and record domain/publication approvals before affected claims are approved for activation.                                              |
| TD-007 | In progress | Verify each candidate product's authority and the clinical/pharmacy/custody/courier pathway; resolve observed dosing inconsistency with provider and clinician before product use.  |
| TD-009 | In progress | Verify external parties, contracts, privacy allocation and publication schedules; implement profile/receipts in Sprint 09 and governed manual hand-off/reconciliation in Sprint 10. |
| TD-010 | In progress | Implement private versioned catalogue/rates, rendered approved commercial instruments, Stripe sandbox and credit/refund/dispute proof in Sprint 11.                                 |
| TD-037 | Open        | Implement the routed profile and complete live keyboard/assistive-technology review in Sprints 09/12.                                                                               |
| TD-038 | Open        | Implement durable stepped/asynchronous journeys and verify focus, status, refusal and failure behavior in Sprints 09/12.                                                            |
| TD-043 | Open        | Verify primary/alternate and clinical ownership; exercise support acknowledgement, failure, escalation and fallback in Sprint 12.                                                   |

## New or Discovered Debt and Follow-up

No new repository technical-debt ID is introduced. Two newly observed provider defects extend
existing obligations: inconsistent dose rounding under TD-007 and dashboard/library status mismatch
under TD-009. Provider credential rotation, individual access and permission verification remain
pre-pilot requirements under DR-017/TD-009. These are unresolved evidence, not verified fixes.

Task 8.9 found informational RLS-without-policy and index notices with no warning/error. Retain
deny-all controls and reassess indexes against representative Sprint 09–13 queries. The resolved
orphan-sequence reset interruption is an operational lesson; future reset attempts must inspect
failures before rerunning.

## Validation

Task 8.9 records 16-migration local replay, 338 pgTAP assertions, 324 Vitest tests, all nine synthetic
database/identity/security/payment/fulfilment/measurement integrations, database lint/advisors,
formatting, ESLint, TypeScript and portability passing. Hosted migration parity, zero Auth users,
redacted baseline counts, anonymous denial and request-security/measurement/MCP negative probes
passed. Hosted security/performance advisors returned informational findings only.

The earlier Task 8.1 application baseline also passed 118 desktop/mobile Playwright/axe checks.
Those browser results are inherited evidence: Sprint 08 did not change customer-facing runtime
code. Task 8.10 validates formatting, JSON/path routing, registry counts and the Git diff. The
owner's commit/CI supplies exact closure-commit evidence; no new remote CI run is claimed here.

## Existing Files Modified

Inventory is derived from `git diff --name-status 966d362..3950b15`, with Task 8.10 changes included.
Every row below names an existing file; no existing file was deleted.

| File                                                                              | Sprint change                                               |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `AGENTS.md`                                                                       | Documented hosted baseline verification.                    |
| `docs/00-blueprints/master-blueprint-v1.md`                                       | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/02-implementation-plans/phase-02/README.md`                                 | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/02-implementation-plans/phase-02/sprint-08-pilot-activation-contract.md`    | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/02-implementation-plans/phase-02/sprint-09-identity-profile-consent.md`     | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/02-implementation-plans/phase-02/sprint-10-staff-queue-protocol-handoff.md` | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/02-implementation-plans/phase-02/sprint-11-stripe-commercial-operations.md` | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/02-implementation-plans/phase-02/sprint-13-pilot-rehearsal-release.md`      | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/04-technical-debt/technical-debt-registry-v1.md`                            | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/05-future-considerations/td-006-td-007-claims-peptide-closure.md`           | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/07-decisions/DR-001-operating-model-responsibility.md`                      | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/07-decisions/DR-002-commercial-fulfilment-model.md`                         | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/07-decisions/DR-005-data-tenancy-lifecycle-migration.md`                    | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/07-decisions/DR-007-identity-authorisation-architecture.md`                 | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/07-decisions/DR-009-free-tier-pilot-provider-stack.md`                      | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/07-decisions/README.md`                                                     | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/RAG/01-project-context.md`                                                  | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/RAG/02-current-state.md`                                                    | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/RAG/04-domain-glossary.md`                                                  | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/RAG/05-decision-register.md`                                                | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/RAG/06-known-limitations.md`                                                | Reconciled sprint decisions, evidence and downstream scope. |
| `docs/RAG/07-index.json`                                                          | Reconciled sprint decisions, evidence and downstream scope. |
| `package.json`                                                                    | Registered guarded hosted baseline command.                 |
| `supabase/tests/database/tenancy_foundation.test.sql`                             | Added assertions for the suspended pilot tenant.            |

## Newly Created Files

| File                                                                                                 | Purpose                                                                 |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `docs/02-implementation-plans/phase-02/annexures/sprint-08-1-pilot-activation-baseline.md`           | Task decision and verification evidence.                                |
| `docs/02-implementation-plans/phase-02/annexures/sprint-08-2-product-pathway-decision.md`            | Task decision and verification evidence.                                |
| `docs/02-implementation-plans/phase-02/annexures/sprint-08-3-responsibility-allocation.md`           | Task decision and verification evidence.                                |
| `docs/02-implementation-plans/phase-02/annexures/sprint-08-4-commercial-pricing-benchmark.md`        | Task decision and verification evidence.                                |
| `docs/02-implementation-plans/phase-02/annexures/sprint-08-5-minimum-client-profile.md`              | Task decision and verification evidence.                                |
| `docs/02-implementation-plans/phase-02/annexures/sprint-08-6-transactional-instrument-set.md`        | Task decision and verification evidence.                                |
| `docs/02-implementation-plans/phase-02/annexures/sprint-08-7-support-channel-activation-contract.md` | Task decision and verification evidence.                                |
| `docs/02-implementation-plans/phase-02/annexures/sprint-08-8-protocol-portal-capability-evidence.md` | Task decision and verification evidence.                                |
| `docs/02-implementation-plans/phase-02/annexures/sprint-08-9-hosted-pilot-baseline-evidence.md`      | Task decision and verification evidence.                                |
| `docs/07-decisions/DR-011-minimum-pilot-product-pathway.md`                                          | Approved decision with scope and activation requirements.               |
| `docs/07-decisions/DR-012-minimum-pilot-responsibility-allocation.md`                                | Approved decision with scope and activation requirements.               |
| `docs/07-decisions/DR-013-pilot-product-commercial-fulfilment-amendment.md`                          | Approved decision with scope and activation requirements.               |
| `docs/07-decisions/DR-014-minimum-client-profile-data-rights.md`                                     | Approved decision with scope and activation requirements.               |
| `docs/07-decisions/DR-015-pilot-transactional-instruments.md`                                        | Approved decision with scope and activation requirements.               |
| `docs/07-decisions/DR-016-pilot-support-escalation-channels.md`                                      | Approved decision with scope and activation requirements.               |
| `docs/07-decisions/DR-017-protocol-portal-manual-handoff-boundary.md`                                | Approved decision with scope and activation requirements.               |
| `scripts/test-hosted-pilot-baseline.ts`                                                              | Guarded redacted hosted baseline verification.                          |
| `supabase/migrations/20261002155857_pilot_tenant_baseline.sql`                                       | Rebuildable suspended pilot tenant baseline.                            |
| `docs/03-completion-reports/phase-02/sprint-08-pilot-activation-contract.md`                         | Sprint closure, deviations, debt ownership and complete file inventory. |

## Handoff

Begin Sprint 09.1 by reconciling DR-014/DR-015 with the clean suspended tenant and existing identity
ports. Define expiring invitations, versioned profile/receipt contracts and route/security behavior.
Keep unverified publication schedules explicit throughout implementation. Sprints 10–13 then
deliver staff hand-off, sandbox commerce, support/accessibility and the complete release rehearsal.
