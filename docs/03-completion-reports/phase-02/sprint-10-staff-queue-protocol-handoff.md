---
report_id: phase-02-sprint-10-completion
title: Sprint 10 — Staff Queue, Medical Intake and Manual Protocol Hand-Off
status: completed-with-activation-gates
last_updated: 2026-10-05
implementation_checkpoint: 14a965a
inventory_baseline: 1b41ed4
owner: "@Muhns13G"
---

# Sprint 10 — Completion Report

## Outcome and Mission

Sprint 10 delivers the least-privilege workforce queue and auditable manual protocol bridge,
expanded by owner-approved DR-018 to include protected first-party medical intake. Tasks 10.1–10.10
and I1–I8 are complete at their recorded engineering/synthetic acceptance boundaries, with the
explicit current-generator exception. This report closes the sprint, not the pilot release.

Implementation through 10.9 is committed at `14a965a`; this 10.10 closure batch awaits the owner's
commit. No exact-commit GitHub result, deployment, live client, charge, clinical approval or generator
compatibility is inferred. The last independently verified hosted checkpoint, from I8 on 5 October,
is 36 matching migrations, one suspended pilot tenant, 12 original provider gates and otherwise empty
governed application data. Intake and operations-alert modes were restored disabled. This is
inherited evidence, not a new hosted inventory taken by 10.10.

## Delivered Work and Decisions

| Task  | Delivered outcome                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.1  | Individual workforce AAL2, roles/purposes, assignments/claims, DR-017 states, separation of duties, unavailable break glass and negative-path contract.           |
| 10.2  | Eight deny-default operations/hand-off tables and portable strict records; no direct browser/service table grants.                                                |
| 10.3  | Staff invitation journal, first-party code/MFA entry, sealed workforce sessions, server context, renewal and revocation.                                          |
| 10.4  | Assigned paginated queue and masked minimum detail; no unassigned browse or health-answer access.                                                                 |
| 10.5  | Exclusive claims, expected versions, payload-bound replay, atomic audit, coded exceptions and guarded cancellation.                                               |
| 10.6  | Intent/delivery/acknowledgement/outcome separation; independently verified recipient/evidence, safe uncertainty/retry and retained private-portal channel.        |
| 10.7  | Chained read/mutation/denial audit, owned private alerts, bounded Brevo dispatch, explicit AAL2 acknowledgement/resolution; actual hosted Cron and mailbox proof. |
| 10.8  | Audited own-client three-field coarse administrative status; no internal reasons, protocol, payment or treatment inference.                                       |
| I1    | Exact 24-item/eight-section source catalogue and field/branch/access/safety/lifecycle contract; separate owner-approved, unselected sex extension.                |
| I2    | Encrypted private intake/version/submission storage and portable medical records, separate from the non-clinical profile.                                         |
| I3    | Own-session draft/save/resume/submit/amend/export commands, exact receipts, version/replay and request guards.                                                    |
| I4    | Private accessible eight-section questionnaire, conditional categories, review and durable receipt; no mandatory initial blood upload.                            |
| I5    | Persisted safety holds, generic routed notices, clinical acknowledgement/review and fail-closed missing/failed response handling.                                 |
| I6    | Independent field/version/purpose medical grants, deliberate manual transfer and separate reconciliation; payment adapters stay closed.                           |
| I7    | Amendment history, restriction/retention/disposition and provider-copy evidence; encrypted recovery with offline quarantine/current-ledger reconciliation.        |
| I8    | Approved hosted migration/Auth/AAL2/HTTP/browser/mailbox/expiry proof, TD-058 correction and scoped cleanup; current generator explicitly excepted.               |
| 10.9  | Repeatable nine-suite rollback-only CI packet, outage/abandonment assertions, real local concurrency and desktop/mobile command-failure checks.                   |
| 10.10 | This report, exact inventory, debt/RAG/plan reconciliation and Sprint 11 prerequisite handoff.                                                                    |

Authoritative detail is in the [Sprint 10 plan](../../02-implementation-plans/phase-02/sprint-10-staff-queue-protocol-handoff.md)
and its linked task annexures, especially the [intake progress/hosted proof](../../02-implementation-plans/phase-02/annexures/sprint-10-intake-implementation-progress.md)
and [10.9 rehearsal](../../02-implementation-plans/phase-02/annexures/sprint-10-9-cross-boundary-rehearsal.md).
The dedicated medical key remains server-only; no secret, answered questionnaire, private roster or
source DOCX was committed. Public marketing wording was preserved.

## Deviations from the Original Plan

1. **Owner-approved scope expansion:** DR-018 replaces external-only questionnaire collection with
   first-party medical intake and eight explicit added tasks, without disguising them as audit work.
   The older private-link path is retained inactive, not required for the selected manual-transfer path.
2. **Provider-controlled generator:** fresh login reaches the lapsed-subscription gate. The owner
   explicitly excepted its current walkthrough from I8 engineering closure. The
   [reactivation checklist](../../05-future-considerations/protocol-generator-reactivation-and-compatibility.md)
   remains mandatory before real transfer; historical generation is not current compatibility proof.
3. **Clinical field provenance:** the sex extension has separate owner approval and no default.
   Original question approval is not represented as clinical approval of the added field.
4. **Payment sequencing:** free draft/submission and no initial blood requirement remain. R999
   paid-review/manual-transfer readiness awaits Sprint 11; positive payment-dependent SQL fixtures
   are visibly case-scoped and rollback-only. No production paid bypass was added.
5. **Transport/authority corrections:** the deployed Brevo adapter's unsupported redirect mode was
   corrected and retested; restricted safety review ordering was corrected through TD-058.
   Neither fix weakens redirection, access, restriction, audit or session checks.
6. **Evidence boundaries:** intercepted browser success is not real hosted Auth or provider delivery.
   Local full state mapping, hosted patient waiting-state display, scripted staff HTTP and actual
   patient browser/expiry evidence remain individually identified, not an invented single live journey.

## Validation and Evidence

| Evidence                           | Accepted result and limitation                                                                                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final 10.9 Vitest                  | 673 tests, 107 files passed.                                                                                                                                                                                    |
| Final 10.9 SQL                     | 1,017 assertions, 25 packets passed; nine-suite packet separately passes 411.                                                                                                                                   |
| Actual local workforce integration | Real TOTP/AAL2, competing claims, exact replay, release and revocation passed; fixtures removed.                                                                                                                |
| I8 full controlled browser matrix  | 180 desktop/mobile checks passed after clean rerun; previous interrupted attempts were not accepted.                                                                                                            |
| Final 10.9 targeted browser packet | 34 queue/portal/intake checks, including six new desktop/mobile failure-path checks; not a new full-site run.                                                                                                   |
| Production integration at 10.9     | Client/server build, canary, MCP absence, generated routes, TypeScript, lint/format, portability and discovery passed.                                                                                          |
| I7 recovery                        | 54 synthetic records encrypted, restored and reconciled, including private intake; offline quarantine/current-ledger boundary tested.                                                                           |
| Hosted 10.7                        | Actual MFA/routed administrator response/revocation, corrected Cron delivery and separately owner-confirmed mailbox receipt; disabled restoration/cleanup.                                                      |
| Hosted I8                          | Real patient OTP/browser sections, persisted resume/submission, mobile layout and wall-clock expiry; workforce AAL2/grants/restricted review and revocation; actual generic mailbox visibility; scoped cleanup. |
| 10.10 fresh checks                 | Dependency audits: no advisories. TypeScript, ESLint, portability (15 capabilities/20 majors/26 fixtures) and discovery passed. Formatting/inventory/link verification is recorded below after final edits.     |
| Exact-commit CI / release          | Owner-controlled after this batch; not claimed by this report.                                                                                                                                                  |

One 10.9 full SQL attempt stopped in the existing hand-off suite after 38 assertions; isolated
57-assertion and full 1,017-assertion reruns passed. The cause is not established. Preserve the
observation and inspect recurrence in CI; do not label it a diagnosed production defect or hide it.
Hosted advisors' no-browser-policy notices reflect intentional deny-default tables; unused/missing
index candidates require query/volume evidence, not blind schema changes. The pre-existing implicit
SQL initialisation warning and index candidates remain documented review observations.

## Technical Debt and Remaining Launch Requirements

The registry has **58 items: 51 Verified and seven non-Verified**. Sprint 10 targets TD-009 and
TD-043 but does not falsely close their wider external/operational acceptance. The intake amendment
also supplies evidence for TD-037/TD-038 without substituting automated checks for released-flow
assistive-technology acceptance.

| Item                     | Status      | What remains / destination                                                                                                                                                                                                 |
| ------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-006                   | In progress | Required evidence and domain approval of public claims; launch go/no-go.                                                                                                                                                   |
| TD-007                   | In progress | Product-specific authority, clinical/pharmacy/custody/courier and provider compatibility; before affected transactions.                                                                                                    |
| TD-009                   | In progress | Actual provider/professional appointments, contracts/privacy allocation, reviewed publications/recipient mapping, current generator and operational rights handling. Engineering profile/intake/manual controls now exist. |
| TD-010                   | In progress | Private pricing/delivery/terms approval, authoritative deposit/credit/refund and sandbox exceptions; Sprint 11.                                                                                                            |
| TD-037                   | Open        | Released-flow keyboard and assistive-technology review; Sprint 12.                                                                                                                                                         |
| TD-038                   | Open        | Released stepped/pending/success/failure announcement review; Sprint 12.                                                                                                                                                   |
| TD-043                   | Open        | Private primary/fallback clinical/support ownership, after-hours/escalation/failure routing and complete operational/accessibility proof; Sprint 12/release.                                                               |
| TD-058 (new this sprint) | Verified    | Restricted intake safety review checked authority after clearing its hold; approved corrective migration, four regressions, actual hosted AAL2 review/access-denial and cleanup resolved it.                               |

No other new confirmed defect ID accrued. TD-057 was resolved before Sprint 10 entry and is not a
new Sprint 10 discovery. TD-058 is committed in `9630cfe`; hosted acceptance is in I8, while this
report does not invent a later CI result. Non-reproduced interruptions and informational schema
observations are explicitly retained rather than converted into unsubstantiated product debts.

Before real intake/transfer, independently approve rendered collection/declarations (including the
sex extension), reviewing/transcribing parties and purpose grants, primary/fallback safety roster,
acknowledgement deadline/after-hours guidance, processing/retention allocation, generator compatibility,
authoritative payment readiness and owner release. The general 24-hour reply target is not a clinical
SLA. Collection, payment, safety clearance, transfer, acknowledgement and prescribing remain distinct.

## Lessons Learned

- Persist intent and independently reconcile delivery; uncertain delivery must not trigger blind retry.
- Check authority after locks and before a transition invalidates its own narrowly permitted access.
- Provider acceptance, reported delivery, visible mailbox receipt and human response are different facts.
- Real browser expiry/resume and database receipts reveal gaps that intercepted UI tests cannot prove.
- Keep clinical answers encrypted and outside the queue, email, telemetry, analytics and Stripe metadata.
- Scope expansions need explicit contracts and numbering; preserve original public/source wording.
- Stop shared database services before heavy browser runs; never weaken safeguards to hide test failures.

## Exact File Inventory

Git comparison: `git diff --name-status 1b41ed4..14a965a`, beginning immediately before 10.1.
It contains **174 paths: 119 created, 55 existing modified, zero deleted/renamed**. Files created then
modified within the sprint appear once as created. TD-057's remediation code is outside this range;
its evidence/report reconciliation inside 10.1 is included. The source DOCX, ignored secrets, temporary
hosted fixtures, provider records and generated test/build artifacts are excluded.

### Existing Files Modified

| File                                                                                 | Purpose                                                |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `.env.example`                                                                       | Configuration, generated output or integration wiring. |
| `.github/workflows/ci.yml`                                                           | Configuration, generated output or integration wiring. |
| `AGENTS.md`                                                                          | Configuration, generated output or integration wiring. |
| `config/environment-catalogue.ts`                                                    | Configuration, generated output or integration wiring. |
| `contracts/README.md`                                                                | Portable strict contract and domain orchestration.     |
| `contracts/capabilities.ts`                                                          | Portable strict contract and domain orchestration.     |
| `contracts/fixtures/retained-capabilities.json`                                      | Portable strict contract and domain orchestration.     |
| `contracts/index.ts`                                                                 | Portable strict contract and domain orchestration.     |
| `contracts/portability.ts`                                                           | Portable strict contract and domain orchestration.     |
| `contracts/registry.ts`                                                              | Portable strict contract and domain orchestration.     |
| `docs/00-blueprints/master-blueprint-v1.md`                                          | Contract, evidence, runbook or derived status.         |
| `docs/01-audits/td-057-dependency-remediation-2026-10-03.md`                         | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/README.md`                                    | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/sprint-09-identity-profile-consent.md`        | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/sprint-10-staff-queue-protocol-handoff.md`    | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/sprint-11-stripe-commercial-operations.md`    | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/sprint-12-support-accessibility-readiness.md` | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/sprint-13-pilot-rehearsal-release.md`         | Contract, evidence, runbook or derived status.         |
| `docs/03-completion-reports/phase-02/sprint-09-identity-profile-consent.md`          | Contract, evidence, runbook or derived status.         |
| `docs/04-technical-debt/technical-debt-registry-v1.md`                               | Contract, evidence, runbook or derived status.         |
| `docs/06-operations/audit-integration-evidence-runbook.md`                           | Contract, evidence, runbook or derived status.         |
| `docs/07-decisions/DR-014-minimum-client-profile-data-rights.md`                     | Contract, evidence, runbook or derived status.         |
| `docs/07-decisions/DR-015-pilot-transactional-instruments.md`                        | Contract, evidence, runbook or derived status.         |
| `docs/07-decisions/DR-017-protocol-portal-manual-handoff-boundary.md`                | Contract, evidence, runbook or derived status.         |
| `docs/07-decisions/README.md`                                                        | Contract, evidence, runbook or derived status.         |
| `docs/RAG/01-project-context.md`                                                     | Contract, evidence, runbook or derived status.         |
| `docs/RAG/02-current-state.md`                                                       | Contract, evidence, runbook or derived status.         |
| `docs/RAG/03-platform-evolution.md`                                                  | Contract, evidence, runbook or derived status.         |
| `docs/RAG/04-domain-glossary.md`                                                     | Contract, evidence, runbook or derived status.         |
| `docs/RAG/05-decision-register.md`                                                   | Contract, evidence, runbook or derived status.         |
| `docs/RAG/06-known-limitations.md`                                                   | Contract, evidence, runbook or derived status.         |
| `docs/RAG/07-index.json`                                                             | Contract, evidence, runbook or derived status.         |
| `e2e/discovery.spec.ts`                                                              | Synthetic regression and failure-path evidence.        |
| `e2e/patient-portal.spec.ts`                                                         | Synthetic regression and failure-path evidence.        |
| `package.json`                                                                       | Configuration, generated output or integration wiring. |
| `public/robots.txt`                                                                  | Configuration, generated output or integration wiring. |
| `scripts/run-synthetic-recovery-exercise.ts`                                         | Bounded synthetic verification/recovery tooling.       |
| `src/adapters/identity/supabase/supabase-managed-identity-provider.ts`               | Provider/persistence boundary.                         |
| `src/adapters/identity/supabase/supabase-patient-portal-repository.test.ts`          | Synthetic regression and failure-path evidence.        |
| `src/adapters/identity/supabase/supabase-patient-portal-repository.ts`               | Provider/persistence boundary.                         |
| `src/adapters/recovery/hosted-recovery-support.ts`                                   | Provider/persistence boundary.                         |
| `src/application/identity/managed-identity-provider.ts`                              | Portable strict contract and domain orchestration.     |
| `src/components/PatientPortalPage.tsx`                                               | Private staff/client interface.                        |
| `src/config/environment.test.ts`                                                     | Synthetic regression and failure-path evidence.        |
| `src/domain/identity/patient-portal.ts`                                              | Configuration, generated output or integration wiring. |
| `src/lib/public-route-policy.ts`                                                     | Configuration, generated output or integration wiring. |
| `src/routeTree.gen.ts`                                                               | Configuration, generated output or integration wiring. |
| `src/server.ts`                                                                      | Configuration, generated output or integration wiring. |
| `src/server/identity/patient-session-http.ts`                                        | Server-only transport, encryption or request controls. |
| `src/server/security/request-security.ts`                                            | Server-only transport, encryption or request controls. |
| `src/server/security/response-policy.ts`                                             | Server-only transport, encryption or request controls. |
| `src/test/patient-portal-fixture.ts`                                                 | Configuration, generated output or integration wiring. |
| `supabase/tests/database/patient_portal_projection.test.sql`                         | Rollback-only database regression.                     |
| `worker-configuration.d.ts`                                                          | Configuration, generated output or integration wiring. |
| `wrangler.jsonc`                                                                     | Configuration, generated output or integration wiring. |

### Newly Created Files

| File                                                                                          | Purpose                                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `content/medical-intake-catalogue.json`                                                       | Portable strict contract and domain orchestration.     |
| `contracts/fixtures/medical-intake-synthetic.ts`                                              | Portable strict contract and domain orchestration.     |
| `contracts/medical-intake.test.ts`                                                            | Synthetic regression and failure-path evidence.        |
| `contracts/medical-intake.ts`                                                                 | Portable strict contract and domain orchestration.     |
| `contracts/operations.test.ts`                                                                | Synthetic regression and failure-path evidence.        |
| `contracts/operations.ts`                                                                     | Portable strict contract and domain orchestration.     |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-1-staff-queue-handoff-contract.md` | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-2-staff-queue-persistence.md`      | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-3-workforce-security.md`           | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-4-assigned-queue-projection.md`    | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-5-claimed-queue-commands.md`       | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-6-manual-handoff-commands.md`      | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-7-operations-audit-alerts.md`      | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-8-client-case-progress.md`         | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-9-cross-boundary-rehearsal.md`     | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-i1-medical-intake-contract.md`     | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-i1-question-catalogue-v1.json`     | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-intake-implementation-progress.md` | Contract, evidence, runbook or derived status.         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-10-medical-intake-amendment.md`       | Contract, evidence, runbook or derived status.         |
| `docs/05-future-considerations/protocol-generator-reactivation-and-compatibility.md`          | Contract, evidence, runbook or derived status.         |
| `docs/06-operations/medical-intake-release-recovery-runbook.md`                               | Contract, evidence, runbook or derived status.         |
| `docs/06-operations/private-portal-handoff-runbook.md`                                        | Contract, evidence, runbook or derived status.         |
| `docs/07-decisions/DR-018-meneer-hosted-medical-intake.md`                                    | Contract, evidence, runbook or derived status.         |
| `e2e/medical-intake.spec.ts`                                                                  | Synthetic regression and failure-path evidence.        |
| `e2e/staff-alerts.spec.ts`                                                                    | Synthetic regression and failure-path evidence.        |
| `e2e/staff-queue.spec.ts`                                                                     | Synthetic regression and failure-path evidence.        |
| `e2e/workforce.spec.ts`                                                                       | Synthetic regression and failure-path evidence.        |
| `scripts/lib/sprint10-rehearsal.test.ts`                                                      | Synthetic regression and failure-path evidence.        |
| `scripts/lib/sprint10-rehearsal.ts`                                                           | Bounded synthetic verification/recovery tooling.       |
| `scripts/test-hosted-medical-intake.ts`                                                       | Bounded synthetic verification/recovery tooling.       |
| `scripts/test-sprint10-rehearsal.ts`                                                          | Bounded synthetic verification/recovery tooling.       |
| `scripts/test-supabase-workforce-integration.ts`                                              | Bounded synthetic verification/recovery tooling.       |
| `src/adapters/identity/supabase/supabase-workforce-context-repository.test.ts`                | Synthetic regression and failure-path evidence.        |
| `src/adapters/identity/supabase/supabase-workforce-context-repository.ts`                     | Provider/persistence boundary.                         |
| `src/adapters/intake/supabase-intake-repository.ts`                                           | Provider/persistence boundary.                         |
| `src/adapters/persistence/supabase/supabase-queue-repository.test.ts`                         | Synthetic regression and failure-path evidence.        |
| `src/adapters/persistence/supabase/supabase-queue-repository.ts`                              | Provider/persistence boundary.                         |
| `src/application/identity/workforce-session-service.test.ts`                                  | Synthetic regression and failure-path evidence.        |
| `src/application/identity/workforce-session-service.ts`                                       | Portable strict contract and domain orchestration.     |
| `src/application/intake/medical-intake-service.test.ts`                                       | Synthetic regression and failure-path evidence.        |
| `src/application/intake/medical-intake-service.ts`                                            | Portable strict contract and domain orchestration.     |
| `src/application/operations/alert-projection.ts`                                              | Portable strict contract and domain orchestration.     |
| `src/application/operations/handoff-boundary.test.ts`                                         | Synthetic regression and failure-path evidence.        |
| `src/application/operations/handoff-boundary.ts`                                              | Portable strict contract and domain orchestration.     |
| `src/application/operations/handoff-command.test.ts`                                          | Synthetic regression and failure-path evidence.        |
| `src/application/operations/handoff-command.ts`                                               | Portable strict contract and domain orchestration.     |
| `src/application/operations/queue-command.test.ts`                                            | Synthetic regression and failure-path evidence.        |
| `src/application/operations/queue-command.ts`                                                 | Portable strict contract and domain orchestration.     |
| `src/application/operations/queue-projection.test.ts`                                         | Synthetic regression and failure-path evidence.        |
| `src/application/operations/queue-projection.ts`                                              | Portable strict contract and domain orchestration.     |
| `src/components/ClientCaseProgress.test.tsx`                                                  | Synthetic regression and failure-path evidence.        |
| `src/components/ClientCaseProgress.tsx`                                                       | Private staff/client interface.                        |
| `src/components/MedicalIntakePage.test.tsx`                                                   | Synthetic regression and failure-path evidence.        |
| `src/components/MedicalIntakePage.tsx`                                                        | Private staff/client interface.                        |
| `src/components/MedicalWorkPage.test.tsx`                                                     | Synthetic regression and failure-path evidence.        |
| `src/components/MedicalWorkPage.tsx`                                                          | Private staff/client interface.                        |
| `src/components/PortalHandoffPanel.test.tsx`                                                  | Synthetic regression and failure-path evidence.        |
| `src/components/PortalHandoffPanel.tsx`                                                       | Private staff/client interface.                        |
| `src/components/StaffAlertsPage.test.tsx`                                                     | Synthetic regression and failure-path evidence.        |
| `src/components/StaffAlertsPage.tsx`                                                          | Private staff/client interface.                        |
| `src/components/StaffDestinationApprovalPanel.test.tsx`                                       | Synthetic regression and failure-path evidence.        |
| `src/components/StaffDestinationApprovalPanel.tsx`                                            | Private staff/client interface.                        |
| `src/components/StaffHandoffControls.test.tsx`                                                | Synthetic regression and failure-path evidence.        |
| `src/components/StaffHandoffControls.tsx`                                                     | Private staff/client interface.                        |
| `src/components/StaffHandoffEvidencePanel.test.tsx`                                           | Synthetic regression and failure-path evidence.        |
| `src/components/StaffHandoffEvidencePanel.tsx`                                                | Private staff/client interface.                        |
| `src/components/StaffQueuePage.test.tsx`                                                      | Synthetic regression and failure-path evidence.        |
| `src/components/StaffQueuePage.tsx`                                                           | Private staff/client interface.                        |
| `src/components/WorkforceSignInPage.test.tsx`                                                 | Synthetic regression and failure-path evidence.        |
| `src/components/WorkforceSignInPage.tsx`                                                      | Private staff/client interface.                        |
| `src/routes/portal.intake.tsx`                                                                | Private staff/client interface.                        |
| `src/routes/staff.alerts.tsx`                                                                 | Private staff/client interface.                        |
| `src/routes/staff.intake.tsx`                                                                 | Private staff/client interface.                        |
| `src/routes/staff.queue.tsx`                                                                  | Private staff/client interface.                        |
| `src/routes/staff.sign-in.tsx`                                                                | Private staff/client interface.                        |
| `src/server/identity/workforce-http.test.ts`                                                  | Synthetic regression and failure-path evidence.        |
| `src/server/identity/workforce-http.ts`                                                       | Server-only transport, encryption or request controls. |
| `src/server/identity/workforce-session-cookie.ts`                                             | Server-only transport, encryption or request controls. |
| `src/server/intake/intake-envelope.test.ts`                                                   | Synthetic regression and failure-path evidence.        |
| `src/server/intake/intake-envelope.ts`                                                        | Server-only transport, encryption or request controls. |
| `src/server/intake/patient-intake-http.test.ts`                                               | Synthetic regression and failure-path evidence.        |
| `src/server/intake/patient-intake-http.ts`                                                    | Server-only transport, encryption or request controls. |
| `src/server/intake/safety-dispatch.test.ts`                                                   | Synthetic regression and failure-path evidence.        |
| `src/server/intake/safety-dispatch.ts`                                                        | Server-only transport, encryption or request controls. |
| `src/server/intake/staff-intake-http.ts`                                                      | Server-only transport, encryption or request controls. |
| `src/server/operations/alert-dispatch.test.ts`                                                | Synthetic regression and failure-path evidence.        |
| `src/server/operations/alert-dispatch.ts`                                                     | Server-only transport, encryption or request controls. |
| `src/server/operations/alert-http.test.ts`                                                    | Synthetic regression and failure-path evidence.        |
| `src/server/operations/alert-http.ts`                                                         | Server-only transport, encryption or request controls. |
| `src/server/operations/handoff-channel.test.ts`                                               | Synthetic regression and failure-path evidence.        |
| `src/server/operations/handoff-channel.ts`                                                    | Server-only transport, encryption or request controls. |
| `src/server/operations/portal-handoff-http.test.ts`                                           | Synthetic regression and failure-path evidence.        |
| `src/server/operations/portal-handoff-http.ts`                                                | Server-only transport, encryption or request controls. |
| `src/server/operations/queue-http.test.ts`                                                    | Synthetic regression and failure-path evidence.        |
| `src/server/operations/queue-http.ts`                                                         | Server-only transport, encryption or request controls. |
| `supabase/migrations/20261003193924_staff_queue_handoff_records.sql`                          | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261003205329_workforce_security_context.sql`                           | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261003213627_staff_queue_projection.sql`                               | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261003221821_staff_queue_commands.sql`                                 | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261003225641_manual_handoff_commands.sql`                              | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261003233901_private_portal_handoff_delivery.sql`                      | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261004083827_operations_audit_alerts.sql`                              | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261005074014_patient_case_status_projection.sql`                       | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261005090216_medical_intake_foundation.sql`                            | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261005111451_medical_intake_governance.sql`                            | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261005114504_medical_intake_rights_recovery.sql`                       | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261005115138_medical_intake_safety_restriction.sql`                    | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261005115607_medical_intake_restriction_grants.sql`                    | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261005120137_medical_intake_exact_audit.sql`                           | Versioned schema, authority and command boundary.      |
| `supabase/migrations/20261005134411_restricted_medical_safety_review_completion.sql`          | Versioned schema, authority and command boundary.      |
| `supabase/tests/database/manual_handoff_commands.test.sql`                                    | Rollback-only database regression.                     |
| `supabase/tests/database/medical_intake_foundation.test.sql`                                  | Rollback-only database regression.                     |
| `supabase/tests/database/medical_intake_transfer_rights.test.sql`                             | Rollback-only database regression.                     |
| `supabase/tests/database/medical_intake_workforce.test.sql`                                   | Rollback-only database regression.                     |
| `supabase/tests/database/private_portal_handoff_delivery.test.sql`                            | Rollback-only database regression.                     |
| `supabase/tests/database/staff_queue_commands.test.sql`                                       | Rollback-only database regression.                     |
| `supabase/tests/database/staff_queue_handoff_records.test.sql`                                | Rollback-only database regression.                     |
| `supabase/tests/database/staff_queue_projection.test.sql`                                     | Rollback-only database regression.                     |
| `supabase/tests/database/workforce_security_context.test.sql`                                 | Rollback-only database regression.                     |

### Task 10.10 Closure Batch

| Change    | Files                                                                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New       | This completion report                                                                                                                                                                                |
| Modified  | Sprint 10 plan; intake amendment; 10.8 annexure; Phase 02 README; technical-debt registry; master blueprint; RAG project-context/current-state/platform-evolution/decision-register/limitations/index |
| Unchanged | Application code, migrations, dependencies, hosted configuration and Git index                                                                                                                        |

The closure table is additional to the committed checkpoint inventory; it must not be represented as
already committed. After adding this report, the cumulative sprint inventory is 175 paths
(120 created and 55 existing modified), assuming no unrelated owner edits.

## Handoff

Final 10.10 documentation checks: all 174 committed inventory paths occur in the report;
relative links in the changed Markdown resolve; the RAG index parses; Git whitespace checks pass.
Changed files were formatted with Prettier. TypeScript, ESLint, portability, discovery and both
dependency audits pass in this closure turn. No runtime/SQL/browser suite was rerun by 10.10:
the dated 10.9/I8 results above are inherited acceptance evidence, not fresh test claims.
The working branch remains `itws-I`, the Git index is untouched, and the 13-file closure batch
(12 existing documents plus this new report) is left unstaged for owner review.

Sprint 10 is **completed with activation gates and the explicit provider exception**. Phase 02 is
not closed and the system is not yet pilot-activated. After owner commit and CI review, reconcile
Sprint 11.1 before implementation: DR-013's candidate RRP catalogue and DR-018's free submission →
R999 paid review/manual transfer must supersede obsolete product-exclusion assumptions. The current
Sprint 11 plan's non-medicine-only wording needs explicit scenario clarification; it is not blanket
approval to transact regulated products before TD-007 evidence. Sprints 12 and 13 retain support,
accessibility, full-journey rehearsal and go/no-go ownership.

No branch switch, Git staging/commit/push, deployment, hosted mutation, email, charge or generator
purchase was performed by Task 10.10.
