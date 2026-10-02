---
plan_id: phase-02-sprint-10
title: Staff Operations Queue and Manual Protocol Hand-Off
status: planned
primary_debt: [TD-007, TD-009, TD-043]
depends_on: [phase-02-sprint-09, DR-001, DR-003, DR-007]
last_updated: 2026-10-02
owner: "@Muhns13G"
---

# Sprint 10 — Staff Operations Queue and Manual Protocol Hand-Off

## Mission

Give authorised Meneer operations staff a least-privilege queue for progressing pilot clients and
recording a manual, auditable minimum-data bridge to the separate protocol portal. The queue must
coordinate work without granting clinical authority or copying protocol data into Meneer.

## Commit-Sized Task Plan

| Task  | Commit-sized outcome                                                                                                                            | Gate               | Status  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------- |
| 10.1  | Freeze staff roles, queue states, assignments, allowed transitions, separation of duties and break-glass posture.                               | TD-009             | Planned |
| 10.2  | Add migrations/contracts for queue items, assignments, hand-off attempts, acknowledgements, opaque external references and exceptions.          | Data model         | Planned |
| 10.3  | Implement staff invitation, AAL2 enforcement and server-derived tenant/role/purpose context.                                                    | Workforce security | Planned |
| 10.4  | Implement the accessible staff queue with minimum necessary fields, filters and masked contact data.                                            | Operations         | Planned |
| 10.5  | Implement claimed assignment and optimistic-concurrency-safe transitions through onboarding, payment readiness and hand-off states.             | Workflow           | Planned |
| 10.6  | Implement manual protocol hand-off initiation, acknowledgement, retry, cancellation and reconciliation without transporting health information. | TD-007, TD-009     | Planned |
| 10.7  | Implement append-only audit facts and alerts for access, assignment, override, hand-off and exception events.                                   | Audit              | Planned |
| 10.8  | Add client-visible non-clinical status projection without revealing internal notes or clinical state.                                           | Client portal      | Planned |
| 10.9  | Rehearse success, duplicate, wrong-assignment, stale-state, unavailable-portal and abandoned-case scenarios.                                    | Reliability        | Planned |
| 10.10 | Reconcile evidence and issue the Sprint 10 completion report.                                                                                   | All                | Planned |

## Acceptance Gate

- Operations users cannot diagnose, prescribe, approve treatment or view protocol content.
- Every hand-off has an owner, time, opaque reference, acknowledgement and exception path.
- No health information is placed in URLs, logs, payment metadata, ordinary email or free-text
  queue fields.
- Wrong tenant, role, assignment, purpose, assurance or state fails closed and is auditable.

## Validation

Extend authorisation, workflow-command, audit and browser tests; run AAL2, concurrency,
idempotency, replay and failure exercises locally and against synthetic hosted identities. Obtain
an owner-assisted protocol-portal walkthrough without entering real patient data.
