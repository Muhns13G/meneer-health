---
evidence_id: phase-01-sprint-05-task-09
title: Sprint 05.9 Validated Workflow Commands
status: verified-task-evidence
date: 2026-08-10
source_parent: 6cbb58f
owner: "@Muhns13G"
related_debt: [TD-014]
---

# Sprint 05.9 Validated Workflow Commands

## Mission and Boundary

Implement the approved server command, state-machine, idempotency, replay, concurrency and
false-success controls without activating a customer route or implying that pilot transactions are
available. Task 5.10 separately owns append-only audit and inbox/outbox evidence; Tasks 5.14–5.15
own real payment and partner commands after their external gates pass.

## Implemented Outcome

- `workflow.transition` major version 1 is a strict framework-neutral command contract. It rejects
  unsupported versions, unknown transitions, extra authoritative fields, malformed actors and raw
  client-shaped execution context.
- A provider-neutral command service resolves the workflow, actor and observation time server-side,
  verifies the envelope subject, invokes the Task 5.8 contextual policy, binds the canonical payload
  to a SHA-256 idempotency fingerprint, and returns only stable safe outcomes.
- Clinical, payment, supply, hub receipt, dispatch, delivery, cancellation and refund remain
  separate states. Paid never implies clinical approval, readiness, dispatch or delivery.
- PostgreSQL owns optimistic versions and transition prerequisites. One atomic function locks the
  aggregate, commits its new version and durable receipt together, and returns success only after
  both writes succeed.
- Exact replays return the original committed result; changed payloads using the same key, stale
  versions, impossible transitions and missing prerequisites fail without a receipt or state change.
- RLS is forced. Browser roles cannot read the tables or execute the command function. The service
  role can read minimum projections and invoke that function, but cannot mutate either table
  directly.
- Local/CI seed data is synthetic. No hosted Supabase migration, public API, form, payment, clinical
  decision or fulfilment route is activated.

## Verification

| Gate                                                                | Result             |
| ------------------------------------------------------------------- | ------------------ |
| Fresh four-migration reset and deterministic synthetic seed         | Pass               |
| pgTAP schema, state, privilege, replay and false-success suite      | Pass (136/136)     |
| Database lint plus Supabase security/performance advisors           | No issues found    |
| Live idempotency, concurrency, stale-version and browser-denial run | Pass               |
| Existing managed-identity and contextual-authorisation regressions  | Pass               |
| Vitest contract, service and adapter suite                          | Pass (133/133)     |
| TypeScript, ESLint and Prettier                                     | Pass               |
| Production build, route-tree canary and Cloudflare upload dry run   | Pass               |
| Bun dependency audits (all and production)                          | No vulnerabilities |
| Playwright desktop/mobile route, boundary and accessibility matrix  | Pass (50/50)       |
| Hosted Supabase and customer-facing routes                          | Unchanged          |

## Decision and Deviation

The plan asks for commands for every enabled operation. No customer mutation is enabled, so this
task implements and proves the shared command boundary using an inactive synthetic workflow rather
than prematurely creating registration, consent, booking, payment, prescription or order routes.
This is deliberate containment, not a reduced durability standard.

PostgreSQL serialization code `40001` was rejected for ordinary optimistic conflict signalling
after live testing showed that PostgREST retried it to an upstream timeout. The function now returns
an immediate stable procedural exception token that the adapter translates to `CONFLICT`.

## Debt Disposition

- Task 5.9 is **Completed** with local/synthetic transaction evidence.
- TD-014 remains **In progress** until Tasks 5.14–5.15 implement and prove the real gated payment
  and partner commands. Any newly enabled command must use this validation, authorisation,
  idempotency, concurrency and false-success boundary.
- Task 5.10 still owns audit facts, inbox/outbox delivery records and tamper evidence.

## References

- [Sprint 05 plan](../sprint-05-data-security-operations.md)
- [DR-003 authoritative state](../../../07-decisions/DR-003-platform-boundaries-authoritative-state.md)
- [DR-004 framework-neutral contracts](../../../07-decisions/DR-004-framework-neutral-contracts-migration.md)
- [DR-005 data and tenancy](../../../07-decisions/DR-005-data-tenancy-lifecycle-migration.md)
- [Task 5.8 authorisation evidence](sprint-05-8-contextual-authorisation-evidence.md)
