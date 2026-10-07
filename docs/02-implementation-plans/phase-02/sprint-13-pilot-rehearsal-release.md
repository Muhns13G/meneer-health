---
plan_id: phase-02-sprint-13
title: End-to-End Pilot Rehearsal and Release Decision
status: in-progress
primary_debt: [TD-006, TD-007, TD-009, TD-010, TD-037, TD-038, TD-043]
depends_on:
  [
    phase-02-sprint-08,
    phase-02-sprint-09,
    phase-02-sprint-10,
    phase-02-sprint-11,
    phase-02-sprint-12,
  ]
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Sprint 13 — End-to-End Pilot Rehearsal and Release Decision

## Mission

Starting checkpoint: Sprint 12 closure is committed at `08dc68c`; the tree was clean on `itws-I`.
The [13.1 rehearsal contract](annexures/sprint-13-1-rehearsal-contract.md) is complete at its
planning boundary. Latest inspected preview CI `37586367138` failed the already locally patched
sharp advisory at an earlier preview commit; no exact-closure-commit CI was found. Reconcile/push
and verify CI before hosted execution. No hosted authority carries forward automatically.
TD-007 is included explicitly because the selected candidate product catalogue still requires
product-specific release authority. This corrects the plan's omitted gate, not product approval.

DR-018 changes the selected pilot journey to first-party medical questionnaire collection followed
by authorised manual entry into the generator. Include all eight added Sprint 10 intake tasks in
readiness and rehearsal evidence. Bloods are not required for initial submission; later clinical
requirements remain independent. Verify medical access, safety routing, consent/versioning,
manual transfer and independent reconciliation without assuming the retained external-link path
is active. No local question approval or questionnaire submission itself authorises pilot release.

Prove the complete minimum pilot with disposable synthetic data, reconcile every transferred gate,
and make an explicit owner-approved go/no-go decision. This sprint closes Phase 02 only when the
implemented journey and the operating team can recover safely from expected failures.

## Commit-Sized Task Plan

| Task  | Commit-sized outcome                                                                                                                      | Gate               | Status                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------- |
| 13.1  | Freeze the rehearsal script, test identities, expected evidence, stop conditions, owners and cleanup plan.                                | Release governance | Completed (contract)  |
| 13.2  | Verify exact deployed version, environment bindings, secrets, hosted migrations, RLS/advisors, monitoring, backup and rollback readiness. | Platform           | Completed             |
| 13.3  | Rehearse invite, identity verification, profile, legal acknowledgement/consent and client portal status.                                  | Onboarding         | Completed             |
| 13.4  | Rehearse staff assignment, approved test payment and reconciled status without a real charge.                                             | Operations/payment | Completed             |
| 13.5  | Rehearse manual protocol hand-off, acknowledgement, exception and client-safe status without health-data transfer.                        | Protocol bridge    | Completed (synthetic) |
| 13.6  | Rehearse cancellation, refund, payment failure, notification failure, unavailable portal, session revocation and support escalation.      | Recovery           | Completed (synthetic) |
| 13.7  | Reconcile audit chains, workflow/payment/handoff records, telemetry, alerts, recovery evidence and synthetic deletion.                    | Evidence           | Planned               |
| 13.8  | Run the full local and hosted-safe validation matrix and complete manual desktop/mobile accessibility walkthroughs.                       | Quality            | Planned               |
| 13.9  | Review every transferred debt item and record Verified, still-gated or scope-removed status without dilution.                             | Debt               | Planned               |
| 13.10 | Issue the Sprint 13 and Phase 02 completion reports plus explicit pilot go/no-go, rollback and first-client checklist.                    | Release            | Planned               |

## Acceptance Gate

Task [13.5 protocol bridge rehearsal](annexures/sprint-13-5-protocol-bridge-rehearsal.md) is
completed at its authorised Meneer-only synthetic boundary. Both narrow migrations are approved/
hosted; owner-deployed preparation, real intake-created case, genuine AAL2/grants/client consent,
R999 sandbox capture/signed funding, routed preparation/record/replays/409s, fault denials and
independent nonclinical reconciliation pass. The exact capture is fully refunded; all 127 baseline
fingerprints/13 rows and original triggers match, Auth users/sessions are zero, and same-source
Worker settings are disabled with the temporary medical tenant binding removed. TD-062/TD-063
are Verified in their stated scopes: **63 items — 56 Verified, seven non-Verified**. Two earlier
incomplete, fully cleaned harness attempts remain recorded honestly. Current generator access/
compatibility remains a named external gate, not substituted by synthetic acknowledgement.
Task [13.6 recovery rehearsal](annexures/sprint-13-6-recovery-rehearsal.md) is completed at its
bounded synthetic scope: 334 rollback-only SQL assertions, controlled desktop/mobile recovery,
genuine declined-payment hold, clean signed capture/routed cancellation/refund, hosted injected
notification faults/suppression/alternate escalation, and client/workforce revocation denials pass.
Both approved sandbox captures are fully refunded; independent final row/trigger/Auth/settings
restoration passes at same-source version `2d26803d-2c7b-4a9a-ac18-64c9bb2ad58d`. Stopped harness
attempts remain explicit, not relabelled passing. Task 13.7 is next. Generator reactivation remains
deferred until manual generation is needed; the real pilot is suspended and Sprint 13 is not closed.

Task [13.4 assignment/payment rehearsal](annexures/sprint-13-4-assignment-payment-rehearsal.md)
is completed at its isolated synthetic boundary. Fresh AAL2/assignment/claim/replay/conflict/denial
proof, authenticated exact R999 acceptance/Checkout, actual sandbox capture, genuine signed funding
and client/assigned-staff confirmed projections pass. The explicitly approved migration closes
TD-061 for this one queue RPC. One exact successful R999 provider refund and removal of the webhook,
Auth fixtures and application evidence are independently verified; all 125 baseline fingerprints,
13 rows and original trigger states match, Auth users/sessions are zero, and the real pilot remains
suspended. Same-source final Worker `26678aba-8b3d-4e58-85a2-cc57016c31f8` restores all commerce
modes disabled plus the owner-approved saved Stripe/suspended-tenant baseline. Earlier verifier/
cleanup defects and expired unpaid Session are retained honestly in the packet. Stripe retains
the refunded sandbox transaction. Task 13.5 is next, not pilot activation or Sprint 13 closure.

Task [13.3 onboarding rehearsal](annexures/sprint-13-3-onboarding-rehearsal.md) is completed at its
isolated synthetic boundary. Real email Auth/session/profile/receipt evidence and the corrected
hosted questionnaire draft/replay/409/submission/denial packet pass. Approved migration
`20261007180000` is applied; TD-060 is Verified. All 125 table fingerprints and trigger states
are restored, Auth users/sessions are zero and intake is disabled again. No payment, generator
action or real-pilot activation occurred. Released browser/AT review remains Task 13.8 and other
RPC conflict-code reconciliation remains Task 13.9; historical approvals do not carry forward.

The [completed 13.2 platform evidence packet](annexures/sprint-13-2-platform-readiness.md) records
exact deployed-source provenance, database restrictions/advisor review, approved hosted volatility
correction, passing CI on all three branches and provider-backed production R2 restore proof.
Offline key custody and primary/alternate responders are confirmed. The current verified immutable
Worker is the compatible fallback baseline for subsequent releases; no live rollback was performed.
Cloudflare stays on `itws-I-preview`; hourly recovery on `main` is enabled. First unattended schedule
evidence, Auth/private-Storage coverage and later rehearsal/activation gates are not waived.

- One synthetic invitee completes the full minimum journey with durable, reconcilable evidence.
- Each failure leaves an honest recoverable state and reaches the correct owner.
- Synthetic data and provider artefacts are safely removed after evidence is captured.
- No transferred debt is marked Verified without its original acceptance evidence.
- Pilot activation requires a separate explicit owner go decision; Phase 02 completion alone does
  not enable public registration, live payment, public launch or unsupported peptide transactions.

## Validation

Use an exact deployed commit and record CI, browser, database, Auth, payment, notification,
monitoring, recovery, security-header, rate/WAF, accessibility and rollback evidence. Confirm the
repository and RAG corpus match the released behaviour before admitting any real pilot client.
