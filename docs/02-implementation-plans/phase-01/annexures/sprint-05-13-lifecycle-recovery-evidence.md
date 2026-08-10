---
task: 5.13
title: Lifecycle, Rights, Backup, and Recovery Evidence
status: completed
completed_on: 2026-08-11
source_parent: 442d6ff
related_debt: [TD-015, TD-016, TD-020]
---

# Sprint 05.13 — Lifecycle, Rights, Backup, and Recovery Evidence

## Outcome

Task 5.13 implements the provider-neutral lifecycle/recovery boundary and proves it with synthetic
local data. No hosted Supabase schema, R2 bucket, Better Stack heartbeat, schedule, secret, or real
record was created.

## Implemented Controls

- Strict portable lifecycle/recovery contracts and server-only Supabase adapter.
- Verified access-export and erasure requests with durable idempotency and hash-chained audit facts.
- Twenty-four-hour export expiry; export content is not persisted in lifecycle evidence.
- Purpose-specific legal/clinical holds with a maximum 90-day review interval and explicit release.
- Fail-closed erasure that removes contact/provider mappings, revokes access/session state, retains
  only the opaque erased subject, and cannot close before identity/storage/backup reconciliation.
- AES-256-GCM encryption of the complete logical archive, strict recovery manifests, a private-R2
  adapter carrying a 35-day retention marker, and a payload-free HTTPS heartbeat adapter.
- A real logical dump restored into an isolated temporary PostgreSQL database with deterministic
  count/checksum reconciliation and recorded recovery evidence.

## Validation Evidence

| Check                 | Result                                                                             |
| --------------------- | ---------------------------------------------------------------------------------- |
| Static validation     | Prettier, ESLint, strict TypeScript, and diff checks passed                        |
| Vitest                | 32 files / 196 tests passed                                                        |
| pgTAP                 | 7 files / 211 tests passed                                                         |
| Browser matrix        | 52 desktop/mobile Playwright and axe checks passed                                 |
| Lifecycle integration | Export, erasure, three destinations, and browser denial passed                     |
| Recovery exercise     | AES-GCM archive; 62 source/restored records; checksums equal; 13-second RTO        |
| Hold behavior         | Active hold blocked erasure; explicit release restored disposition processing      |
| Heartbeat behavior    | No payload; success only after durable storage; storage failure emitted no success |
| Release validation    | Production build, generated-route check, and Cloudflare dry run passed             |
| Dependency audit      | Full and production Bun audits reported no vulnerabilities                         |

## Debt Reconciliation

TD-016's implementation acceptance is satisfied by the complete synthetic rights request and real
isolated restore/reconciliation proof. Named legal/privacy/clinical application, hosted migration,
R2/heartbeat provisioning, and pilot go/no-go remain activation gates rather than reasons to deny
the completed repository proof. TD-015 remains in progress for future real journey coverage.
TD-020 remains in progress until the owner provisions and fail-tests production uptime and backup
heartbeat monitoring.

## Residual Owner Actions

Follow [`lifecycle-backup-recovery-runbook.md`](../../../06-operations/lifecycle-backup-recovery-runbook.md)
to provision hosted R2/Better Stack controls and record redacted evidence. Re-run the synthetic
exercise quarterly, before pilot activation, and after schema or recovery-format changes.
