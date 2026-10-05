---
evidence_id: phase-02-sprint-10-task-09
title: Sprint 10.9 Cross-Boundary Reliability Rehearsal
status: completed-local-rehearsal-with-activation-gates
last_updated: 2026-10-05
owner: "@Muhns13G"
source_baseline: 9630cfe
---

# Sprint 10.9 — Cross-Boundary Reliability Rehearsal

## Mission and Scope

Prove the implemented staff queue, manual hand-off, own-client projection and DR-018 medical
intake fail safely across their boundaries. This is a local synthetic reliability packet, not
activation of the suspended pilot or acceptance of external clinical services. Task 10.8's
implementation is complete; its hosted migration and waiting-state portal were subsequently
exercised in I8. Full local state mapping remains the authoritative automated projection proof.

## Scenario Coverage

| Scenario                                 | Evidence and expected behaviour                                                                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Successful staff journey                 | Local Auth, real TOTP/AAL2, sealed session, queue claim/release and revocation; SQL hand-off preparation, independently reconciled delivery, acknowledgement, review and outcome.              |
| Duplicate/concurrent commands            | Two real local competing claim requests yield one winner; exact replay produces one event. SQL distinguishes exact replay from changed payload and stale version.                              |
| Wrong authority                          | Fixed SQL suites deny wrong tenant, role, purpose, assignment, assurance, revoked/expired session and private-table/browser RPC access.                                                        |
| Missing commercial/provider readiness    | Production payment adapters remain unchanged and false. Positive SQL fixtures substitute only case-scoped synthetic facts inside rolled-back transactions.                                     |
| Unavailable generator and abandoned work | New queue assertions persist coded exceptions and deduplicated alerts without a hand-off, invented progress or automatic reassignment.                                                         |
| Uncertain/stale browser command          | New desktop/mobile controlled checks cover 409, 412 and transport failure: stale detail clears, no success is invented, no automatic retry, explicit refresh, no identifiers in URL/storage.   |
| Manual delivery failure                  | Existing SQL packet proves uncertainty, timeout/overdue alert deduplication, negative reconciliation, safe retry/cancellation, missing/wrong acknowledgement and self-verification denial.     |
| Medical boundaries                       | Existing intake packets prove encrypted draft/submission, independent purpose grants, safety holds, restricted review, withdrawal/rights, payment-gated manual transfer and expiry/revocation. |
| Patient boundary                         | Strict coarse status, own-scope access, audit failure and expiry denial; controlled portal/intake browser checks preserve private state-clearing behaviour.                                    |

The packet reuses nine committed rollback-only SQL suites rather than duplicating their fixtures.
`bun run test:operations:rehearsal` has a fixed local Docker target, rejects hosted configuration,
bounds lock/statement waits, requires complete passing TAP and compares table-count inventory plus
both payment-adapter definitions before/after every suite. It logs summary booleans, not row data.
This proves rollback/count restoration, not a byte-for-byte checksum of every pre-existing row.
CI runs the packet sequentially with the existing database checks.

## Verification

- Dedicated packet: **411 assertions, nine suites**; baseline counts/payment definitions unchanged.
- Full SQL regression: **1,017 assertions, 25 files**.
- Full Vitest: **673 tests, 107 files**, including 22 new packet guard/parser tests.
- Real local workforce integration: MFA/session/concurrent claim/replay/release proof passed;
  disposable fixtures removed. No emails or hosted requests were sent.
- TypeScript, ESLint, portability and discovery checks passed.
- Targeted controlled Playwright: **34 desktop/mobile checks** across queue, portal and intake,
  including all six new failure-path checks. This is not a fresh full-site browser matrix.
- Production client/server build, client-bundle canary and retired-MCP absence checks passed.
- ESLint and changed-file Prettier validation passed; generated route output remained unchanged.

One initial full SQL run exited during the existing manual-hand-off suite after 38 assertions.
The isolated suite then passed all 57 assertions and the full rerun passed 1,017. The interruption
was not reproduced or diagnosed conclusively; no production behaviour or assertion was weakened.
Retain this observation for subsequent CI review rather than assert an identified product defect.

## Decisions, Deviations and Remaining Gates

No runtime messaging, dependencies, schema migrations, payment readiness or hosted configuration
changed. Existing hosted I8 and 10.7 proofs remain separate evidence, not fresh 10.9 provider proof.
The owner already excepted the unavailable current protocol-generator walkthrough from I8; follow
the [reactivation checklist](../../../05-future-considerations/protocol-generator-reactivation-and-compatibility.md)
before launch. A simulated outage does not prove the generator works. Clinical appointments,
published instruments, provider entitlement/compatibility, lawful dispensing/custody and Sprint 11's
authoritative deposit integration remain activation gates. No new product technical debt is declared
by this test-only slice; the non-reproduced test interruption is disclosed above.

Task 10.10 still owns the full Sprint 10 completion report and final registry/RAG reconciliation.

## File Inventory

| Change                 | Files                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Created                | `scripts/lib/sprint10-rehearsal.ts`, its `.test.ts`, `scripts/test-sprint10-rehearsal.ts`, this evidence packet                |
| Modified               | `supabase/tests/database/staff_queue_commands.test.sql`, `e2e/staff-queue.spec.ts`, `package.json`, `.github/workflows/ci.yml` |
| Modified documentation | `AGENTS.md`, Phase 02 README, Sprint 10 plan, RAG current-state/limitations/index                                              |

Lesson: keep SQL persistence proof, real local Auth/concurrency proof, controlled browser behaviour
and external-provider acceptance distinct. Repeatable failure-path evidence is more useful than
another happy-path demo or an inferred claim that pre-launch gates are satisfied.
