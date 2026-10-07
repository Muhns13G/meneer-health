---
plan_id: phase-02-sprint-12-9
title: Sprint 12 Debt Acceptance Reconciliation
status: completed-reconciliation
last_updated: 2026-10-07
owner: "@Muhns13G"
depends_on: [phase-02-sprint-12-8]
---

# Task 2.12.9 — Debt Reconciliation

Baseline: Task 12.8 committed at `c724e96`; working tree clean at task start. This task
reconciles evidence against the existing debt criteria. Completing reconciliation does not
waive missing acceptance, activate the pilot or require every reviewed debt to become Verified.

## Acceptance matrix

| Debt                                | Implemented and accepted evidence                                                                                                                                                                                                                                                                  | Remaining evidence                                                                                                                                                                                                                                                                                                                                                                                              | Result       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| TD-037 — form accessibility         | Task 12.5 inventories actual routed client forms, all eight questionnaire sections, conditional controls, keyboard/axe/reflow/preferences; owner accepts representative local VoiceOver labels/states and actual zoom. Task 12.7 adds separate staff acceptance.                                   | Released exact-code review of the routed private form inventory, including questionnaire/declarations, rights, order acknowledgement and staff controls; record supported browser/AT, surfaces, outcomes and retests. Provider-owned Checkout review is separate. A representative local pass is not exhaustive released acceptance.                                                                            | Remains Open |
| TD-038 — stepped/asynchronous flows | Task 12.6 implements persistent pending/results, step/result focus, section progress, input isolation and hydration-safe controls; deterministic/browser checks and owner-confirmed representative spoken transitions. Task 12.7 covers staff expiry and late responses.                           | Released-flow transition review across invitation/recovery, activation, medical sections/review, rights, order/payment uncertainty, support and staff authority loss; record spoken pending/results, validation, retry and expiry without interpreting receipts as settlement.                                                                                                                                  | Remains Open |
| TD-043 — accountable support        | Task 12.8 proves actual generic inbox delivery, exact provider attribution, authenticated callback/replay, failure/backoff, uncertainty/suppression, real staff AAL2 acknowledgement, alternate handling and emergency no-case/no-notice. Disabled settings and empty synthetic baseline restored. | Privately appoint actual purpose-specific primary/alternate and clinical owners; approve deadlines, coverage/after-hours and escalation/fallback. Configure authenticated unattended Brevo push and verify provider quota/headroom, then exercise the approved real configuration with synthetic content and complete released accessibility acceptance. Synthetic roster references are not real appointments. | Remains Open |

Evidence sources: [12.5](sprint-12-5-client-form-accessibility.md),
[12.6](sprint-12-6-journey-announcements.md), [12.7](sprint-12-7-staff-accessibility.md),
[12.8](sprint-12-8-hosted-support-rehearsal.md) and the
[registry](../../../04-technical-debt/technical-debt-registry-v1.md).
Source inspection confirms persistent polite status regions/focus in `SupportPanel` and
`AccountCodePage`, authority-expiry handling in `StaffSupportPage`, private support routing and
restricted notification-delivery RPCs. Source inspection does not prove spoken output or appointments.

## Execution boundary and next acceptance packet

1. Owner identifies the released commit and supported browser/assistive-technology matrix.
2. Use expressly approved isolated synthetic identities/data for private released pages, not real
   client records. Existing local confirmations remain valid locally; do not repeat them merely
   to relabel them as hosted evidence.
3. Review the routed inventory above, record failures and retest any corrected implementation.
   Do not invent reviewer/version details absent from the earlier representative confirmations.
4. Record real support appointments and approvals privately, retaining only opaque evidence
   references in engineering documentation. Generic support is not an emergency/clinical service.
5. With separate owner authorisation, install the authenticated provider callback and exercise
   actual unattended delivery, failure and escalation; restore suspended/disabled state until
   release approval. Do not treat 12.8's provider-verified manual receipt replay as automatic push.
6. Reconcile each original criterion independently before changing a registry row to Verified.

No new unresolved debt ID is established by this reconciliation. The support/notification
`40001` conflict defects discovered in 12.8 were corrected and verified within that task.
The provider-report window, callback-readiness and OAuth-refresh harness corrections likewise
have passing bounded rehearsal evidence. They are not newly deferred runtime defects.

Totals remain **58 debts, 51 Verified, seven non-Verified**: TD-006, TD-007, TD-009, TD-010,
TD-037, TD-038 and TD-043. No debt status, acceptance threshold, clinical wording, dependency,
schema or hosted configuration changes. Task 12.10 still owns sprint completion reporting and
the final validation matrix; sprint closure must retain these explicit activation gates.

## Validation

The initial fresh deterministic run passed 828/829 checks but observed questionnaire text before
its passive section-focus effect settled. The five-test intake suite passed in isolation. The
regression now uses `waitFor` for the same required heading focus, without arbitrary sleeps,
weakened assertions or runtime changes. This is a settled-state harness correction; it is not
proof that a missing accessibility feature can be ignored.

Evidence/implementation reconciliation and document-link/format checks are performed in this
task. Prior task test counts remain dated evidence, not fresh browser or hosted runs. Any fresh
regression result is recorded separately before handoff; no blanket production certification is
claimed. No Git staging, commit, branch change, deployment, hosted fixture or email is performed.

Fresh validation: **129 files / 829 tests passed** in the complete deterministic rerun after the
settled-focus correction. Strict TypeScript, ESLint, portability (15 capabilities, 20 contract
majors, 26 fixtures), public discovery and formatting pass. All 300 relative links in the six
changed Markdown files and all 189 indexed document paths resolve; the JSON index parses.
Registry counting includes 57 tabular entries plus the separately recorded Verified TD-058,
not just the main table. No new browser, spoken-output or hosted acceptance is inferred from
this regression run.

Files: new reconciliation annexure; updated sprint plan, Phase 02 overview, registry, RAG current
state/limitations/index; one narrow `MedicalIntakePage.test.tsx` settled-focus assertion correction.
No application source or production configuration changed. All work is left unstaged for owner
review and commit.
