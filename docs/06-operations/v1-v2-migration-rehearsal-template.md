---
title: v1-to-v2 Migration Rehearsal, Cutover, and Rollback Template
status: approved-template
owner: architecture-and-release-owner
last_updated: 2026-08-11
related_debt: [TD-055]
---

# v1-to-v2 Migration Rehearsal, Cutover, and Rollback Template

Copy this template for each rehearsal. Completing it is evidence; this blank template is not.
Never use production patient data, credentials, or provider payloads in a rehearsal record.

## Rehearsal Identity

| Field                                                | Value        |
| ---------------------------------------------------- | ------------ |
| Rehearsal ID and date                                | `[required]` |
| v1 source commit/version                             | `[required]` |
| v2 candidate commit/version                          | `[required]` |
| Schema migration range                               | `[required]` |
| Architecture/data/security/operations/release owners | `[required]` |
| Approved synthetic dataset and checksum              | `[required]` |
| Observation and rollback windows                     | `[required]` |

## 1. Inventory and Freeze

- Record the revision and checksum of `contracts/fixtures/retained-capabilities.json`.
- Attach `bun run check:portability` and full v1 validation results.
- List every retained, intentionally changed, and retired capability from
  `contracts/capabilities.ts`; approve every intentional difference.
- Freeze contract majors, consumers, database migrations, routes, jobs, environment bindings,
  provider gates, counts, invariants, known exceptions, RPO, and RTO.
- Stop if any accepted v1 behavior has no fixture, owner, authority, or rollback classification.

## 2. Expand and Migrate

| Item                                                       | Owner        | Restart/checkpoint rule | Result/evidence |
| ---------------------------------------------------------- | ------------ | ----------------------- | --------------- |
| Compatible schema/reader added first                       | `[required]` | `[required]`            | `[pending]`     |
| Deterministic data transform/backfill                      | `[required]` | `[required]`            | `[pending]`     |
| Identifiers, versions, timestamps and provenance preserved | `[required]` | `[required]`            | `[pending]`     |
| Old authority unchanged during rehearsal                   | `[required]` | n/a                     | `[pending]`     |

Apply versioned migrations to an isolated target and reconcile migration history before testing.
Do not rewrite accepted facts or use dual writes unless one authority and durable repair ownership
are explicitly recorded.

## 3. Shadow and Reconcile

Run every portable HTTP, contract-validation, and behavioural fixture against v1 and v2. Compare
stable status, redirects, cache class, accepted/rejected majors, error codes, projections, state
meaning, record counts, checksums, audit correlation, replay behavior, and privacy exclusions.

| Metric                                       | Required result                                | Observed    | Evidence |
| -------------------------------------------- | ---------------------------------------------- | ----------- | -------- |
| Portable fixtures                            | 100% equivalent or approved intentional change | `[pending]` | `[link]` |
| Unexplained data/state mismatches            | 0                                              | `[pending]` | `[link]` |
| Security/privacy/clinical regressions        | 0                                              | `[pending]` | `[link]` |
| Recovery objectives                          | Within approved RPO/RTO                        | `[pending]` | `[link]` |
| Error, latency and reconciliation thresholds | Within approved limits                         | `[pending]` | `[link]` |

Any unexplained mismatch is a stop condition. Record corrections; never edit the baseline fixture
merely to make the candidate pass.

## 4. Cutover

Cut over one named authority at a time. Confirm approved change window, owner presence, backups,
target migration history, environment/secret separation, provider gates, monitoring, support and
rollback readiness. Record the routing/configuration change and immutable source/target versions.

## 5. Rollback Decision

- **Route/provider/configuration change only:** restore the prior compatible adapter/version and
  verify the same fixtures and reconciliation checks.
- **Target accepted records the old version understands:** restore routing, keep accepted facts,
  reconcile writes produced during the window, and reverify counts/checksums.
- **Target accepted records the old version cannot understand:** do not roll schema/data backward.
  Stop new writes, preserve evidence, and execute an approved forward-compatible repair.
- Never delete or rewrite accepted patient, clinical, consent, payment, fulfilment, lifecycle, or
  audit facts to create the appearance of rollback success.

Record trigger, decision time, authority, data consequences, actions, checks, observed recovery,
and remaining reconciliation. A failed rollback or threshold breach invokes the incident runbook.

## 6. Approval and Closure

| Gate                                 | Approver             | Decision/date | Evidence |
| ------------------------------------ | -------------------- | ------------- | -------- |
| Contract and behavioural equivalence | Architecture/product | `[pending]`   | `[link]` |
| Data and reconciliation              | Data/privacy         | `[pending]`   | `[link]` |
| Security and recovery                | Security/operations  | `[pending]`   | `[link]` |
| Clinical meaning, where applicable   | Clinical             | `[pending]`   | `[link]` |
| Cutover and rollback readiness       | Release owner        | `[pending]`   | `[link]` |

Close only after the observation window, zero unexplained mismatches, verified recovery, consumer
sign-off, and updated blueprint, debt registry, completion report, RAG documents, and catalogue.
