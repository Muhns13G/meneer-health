---
annexure_id: phase-02-sprint-10-2-staff-queue-persistence
title: Sprint 10.2 — Staff Queue and Hand-Off Persistence
status: verified-local
last_updated: 2026-10-03
owner: "@Muhns13G"
---

# Sprint 10.2 — Staff Queue and Hand-Off Persistence

## Mission and Scope

Implement the local persistence and portable record boundary fixed by the
[Task 10.1 contract](sprint-10-1-staff-queue-handoff-contract.md), committed at `112e061`.
This task supplies records and structural constraints, not an operational queue, staff API,
clinical decision, provider delivery or pilot activation.

## Implemented Boundary

Migration `20261003193924_staff_queue_handoff_records.sql` adds eight tables:

| Table                      | Purpose                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `operations_cases`         | Tenant/patient-scoped DR-017 state and administrative outcome/version.                                 |
| `operations_assignments`   | Bounded operations-purpose assignee with independent grantor.                                          |
| `operations_claims`        | Exclusive unreleased processing reservation tied to its assignment.                                    |
| `handoff_authorisations`   | Immutable case/recipient-bound accepted receipt, destination digest/version and maximum 30-day expiry. |
| `handoff_attempts`         | Separate delivery state, request key/digest, opaque external UUID and scoped retry link.               |
| `handoff_acknowledgements` | Immutable opaque evidence for a delivered attempt; not clinical approval.                              |
| `operations_exceptions`    | Append-only bounded exception/resolution evidence.                                                     |
| `operations_events`        | Append-only versioned case-event evidence.                                                             |

Composite foreign keys prevent cross-tenant, cross-patient and cross-assignee references.
Partial unique indexes reject concurrent active claims and competing unresolved/delivered attempts
for the same authorisation. Receipt guards reject wrong recipients, withdrawn or inactive authority;
acknowledgement guards require a delivered attempt and consistent chronology. Append-only triggers
protect authorisations, acknowledgements, exceptions and events.

All eight tables enable and force RLS with **no permissive policies**. Explicit grants are revoked
from `PUBLIC`, `anon`, `authenticated` and `service_role`. No scoped command or table-access grant
is added. Private trigger functions are invoker functions, not privileged application entry points.
Queue/FK indexes support the later scoped repository. Existing recovery exports already include
the `public` schema; no additional recovery schema is introduced.

`operations.record@1` validates eight strict, provider-independent record variants. It excludes
health/protocol content, product/payment fields, URLs, credentials and free-text notes. It retains
separate operational and delivery states, opaque references, timestamps and positive versions.
CAP-005 and PORT-023/024 bind the new contract to portable capability validation.

## Validation and Evidence

- Local SQL iteration, schema lint and CLI-generated schema diff reviewed for explicit ACLs.
- Clean local reset replayed all 22 migrations; hosted migrations were not applied.
- `bun run db:test`: 641 assertions across 17 files passed; 146 belong to this task, including
  96 direct read/write denial checks across the three application roles.
- Portable contract tests cover all eight shapes, excluded fields, administrative outcomes,
  expiry, self-grant/retry/resolution and chronology.
- `bun run test`: 466 tests across 78 files passed, including 23 new contract tests.
- `bun run test:identity:security`: 157 rollback-only assertions passed.
- `bun run typecheck`, `bun run lint`, `bun run build` and `bun run check:generated` passed;
  production build also passed client-bundle and retired-MCP checks.
- `bun run check:portability`: 14 capabilities, 19 contract majors and 24 fixtures passed.
- Browser checks were not rerun: no page, route or browser behaviour changed in this task.

The exercise is rollback-only and uses fixed synthetic fixtures. No real client identity,
publication, email, payment, protocol or external delivery was created.

## Decisions, Deviations and Remaining Work

No mission deviation or new technical-debt ID. Supabase skill guidance informed composite scope
keys, narrow indexes, explicit privileges and migration replay. Generated diffs do not substitute
for ACL review; the committed migration explicitly preserves deny-default access.

Database constraints do **not** prove current membership/assignment validity, AAL2, permitted
state transitions, optimistic update checks, payload-bound command idempotency, independent
recipient authority or atomic audit delivery. Tasks 10.3–10.7 implement those command boundaries;
10.8 supplies client projection and 10.9 supplies workflow rehearsals. No clinical outcome can be
inferred from an administrative completion code. Break glass stays unavailable.

The hosted checkpoint remains the previously verified 21-migration baseline; this new migration
requires separate hosted approval and evidence. TD-009 remains In progress and TD-043 Open.

## File Inventory

| Change                        | Files                                                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New implementation/tests      | `contracts/operations.ts`, `contracts/operations.test.ts`, `supabase/migrations/20261003193924_staff_queue_handoff_records.sql`, `supabase/tests/database/staff_queue_handoff_records.test.sql` |
| Modified contract integration | `contracts/index.ts`, `contracts/registry.ts`, `contracts/portability.ts`, `contracts/capabilities.ts`, `contracts/fixtures/retained-capabilities.json`, `contracts/README.md`                  |
| New evidence                  | This annexure.                                                                                                                                                                                  |
| Modified tracking             | Sprint 10 plan, Phase 02 README, debt registry, RAG current state/limitations/index.                                                                                                            |

Public routes, messaging, metadata, dependencies, seeds and deployment configuration are unchanged.
