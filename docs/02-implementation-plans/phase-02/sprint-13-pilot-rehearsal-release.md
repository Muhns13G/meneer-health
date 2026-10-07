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
last_updated: 2026-10-07
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

| Task  | Commit-sized outcome                                                                                                                      | Gate               | Status               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------- |
| 13.1  | Freeze the rehearsal script, test identities, expected evidence, stop conditions, owners and cleanup plan.                                | Release governance | Completed (contract) |
| 13.2  | Verify exact deployed version, environment bindings, secrets, hosted migrations, RLS/advisors, monitoring, backup and rollback readiness. | Platform           | In progress          |
| 13.3  | Rehearse invite, identity verification, profile, legal acknowledgement/consent and client portal status.                                  | Onboarding         | Planned              |
| 13.4  | Rehearse staff assignment, approved test payment and reconciled status without a real charge.                                             | Operations/payment | Planned              |
| 13.5  | Rehearse manual protocol hand-off, acknowledgement, exception and client-safe status without health-data transfer.                        | Protocol bridge    | Planned              |
| 13.6  | Rehearse cancellation, refund, payment failure, notification failure, unavailable portal, session revocation and support escalation.      | Recovery           | Planned              |
| 13.7  | Reconcile audit chains, workflow/payment/handoff records, telemetry, alerts, recovery evidence and synthetic deletion.                    | Evidence           | Planned              |
| 13.8  | Run the full local and hosted-safe validation matrix and complete manual desktop/mobile accessibility walkthroughs.                       | Quality            | Planned              |
| 13.9  | Review every transferred debt item and record Verified, still-gated or scope-removed status without dilution.                             | Debt               | Planned              |
| 13.10 | Issue the Sprint 13 and Phase 02 completion reports plus explicit pilot go/no-go, rollback and first-client checklist.                    | Release            | Planned              |

## Acceptance Gate

The [13.2 platform evidence packet](annexures/sprint-13-2-platform-readiness.md) records verified
read-only checks and remaining acceptance work. Exact deployed-source provenance, monitoring refresh
and security-advisor inspection are verified. Owner-committed screenshot fixes passed both remote CI
runs. Recovery-key custody is confirmed and the Actions database connection is provisioned. Additional
local recovery corrections require owner release and provider-backed restore proof; hosted volatility
correction, responder appointments and compatible rollback acceptance remain open. Cloudflare stays
on `itws-I-preview`. Hourly recovery scheduling remains disabled and its heartbeat is Down.

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
