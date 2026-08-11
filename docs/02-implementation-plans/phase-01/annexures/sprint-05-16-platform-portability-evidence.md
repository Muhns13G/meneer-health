---
task: 5.16
title: Platform Portability and Migration Rehearsal Evidence
status: completed
completed_on: 2026-08-11
related_debt: [TD-055]
---

# Sprint 05.16 — Platform Portability and Migration Rehearsal Evidence

## Outcome

Task 5.16 converts DR-004's migration policy into an executable repository boundary. The v1
catalogue records retained and retired capabilities, exact contract majors and runtime schemas,
language-neutral acceptance fixtures, database-migration provenance, and rollback classes. CI now
rejects catalogue drift. A reusable template governs future v1-to-v2 rehearsal, reconciliation,
cutover, observation, rollback, and forward repair.

This does not implement Next.js, move hosted data, activate a provider, approve a migration window,
or claim that a future candidate has passed cross-generation equivalence.

## Implemented Evidence

| Evidence             | Result                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Capability inventory | 14 retained/retired v1 capabilities with owner, authority, disposition, activation, fixtures and rollback class       |
| Contract registry    | 14 unique version-1 contracts mapped to runtime schemas, sources, generations and originating migrations              |
| Portable fixtures    | 20 synthetic JSON HTTP, contract-validation and behavioural scenarios                                                 |
| Drift control        | `bun run check:portability` validates unique ownership, exact majors, schemas, sources, evidence files and migrations |
| Equivalence harness  | Canonical comparison accepts reordered equivalent objects and flags target drift                                      |
| Migration template   | Inventory, expand, migrate, shadow/reconcile, cutover, observe, rollback/forward-repair and approvals                 |

## Acceptance Rules

- A retained capability must target Next.js v2 and own at least one acceptance fixture.
- Intentional changes and retirements require explicit rationale; unsupported majors fail closed.
- A fixture cannot silently change to match a candidate. Differences require approved catalogue and
  version impact before the candidate can pass.
- Every schema registry entry names its canonical source and originating database migration.
- Cutover moves one authority at a time. Rollback never deletes or rewrites accepted facts; an old
  reader that cannot understand new records requires a forward-compatible repair.
- Framework routes, provider SDKs, Supabase RPCs/tables, and deployment bindings remain adapters.

## Validation Evidence

| Check                               | Result                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Focused contract/portability Vitest | 2 files / 33 tests passed                                                       |
| Portability drift check             | 14 capabilities / 14 contract majors / 20 fixtures passed                       |
| TypeScript                          | Passed                                                                          |
| Full Vitest                         | 40 files / 237 tests passed                                                     |
| Database                            | Clean nine-migration reset; 9 pgTAP files / 293 assertions; lint/advisors clear |
| Browser                             | 54 desktop/mobile route, boundary and accessibility checks passed               |
| Delivery and supply chain           | Production build/client canary/Cloudflare dry-run passed; both audits clear     |

## Debt Reconciliation

TD-055 is Verified for repository migration preparation: retained behavior is inventoried, fixtures
are portable, contract/schema versions are explicit, drift is checked, and the rehearsal procedure
is defined. The future act of migration remains independently gated by an approved trigger, named
owners and window, an actual target implementation, zero unexplained mismatches, and signed
security/privacy/clinical/data/operations/release evidence.

## Authoritative Artifacts

- `contracts/capabilities.ts`
- `contracts/registry.ts`
- `contracts/portability.ts`
- `contracts/fixtures/retained-capabilities.json`
- `scripts/check-portability.ts`
- `docs/06-operations/v1-v2-migration-rehearsal-template.md`
