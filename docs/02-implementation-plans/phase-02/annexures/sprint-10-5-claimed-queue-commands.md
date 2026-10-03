---
plan_id: phase-02-sprint-10-task-05
status: verified-local-gated
last_updated: 2026-10-04
primary_debt: [TD-009, TD-043]
---

# Task 2.10.5 — Claimed Queue Commands

## Mission and Boundary

Add a single-owner reservation and version-checked administrative command boundary to the assigned
queue. This is local implementation evidence, not permission to enable hosted staff or pilot intake.
The owner committed Task 10.4 at `6c16603`; work stayed on `itws-I` without staging or Git mutations.

## Work and Decisions

- Protected `POST /staff/queue/command` accepts only claim, release, mark-ready, coded pause and
  pre-delivery cancellation. Scope comes from live provider/application AAL2 and reviewed membership,
  never submitted roles, tenants, payment flags or arbitrary target states.
- SQL rechecks current assignment under locks, serialises the case and tenant-scoped replay key,
  checks the expected version and current claimant, and commits the case, immutable event and
  payload-hashed command receipt atomically. Exact replay returns its original result after current
  authority verification. Changed payload/actor, competing claim, stale version or terminal mutation
  fails without partial writes. Audit failure rolls back claim and version changes too.
- Only an assigned claimant may release, pause or cancel. Assignment is independently granted;
  claiming never grants permission or steals a reservation after assignment revocation.
- Detail calculates active profile/account, verified email, exact current account/privacy receipts
  and unused current hand-off authorisation from stored facts. Payment and recipient integrations
  explicitly remain pending; `mark_ready` cannot advance a case while either is unavailable.
- Staff controls use opaque IDs/version/request keys, no free-text clinical notes or URL fields.
  Each successful command is followed by a live detail read. Conflicts/denials clear private data;
  uncertain network results require refresh and are not automatically retried. Contacts stay masked.
- No hand-off, provider acknowledgement/outcome, exception resumption or in-flight cancellation is
  fabricated. Task 10.6 owns delivery-boundary reconciliation; Sprint 11 owns the authoritative
  deposit/credit/refund gate. Cancellation refuses unresolved or delivered attempts rather than
  falsely claiming their external effects were undone. No raw contact or provider link is sent.

## Verification

Local clean replay, SQL lint/ACL tests, rollback-only database tests, unit/component/repository/HTTP
tests, strict TypeScript, formatting/lint, build/client-bundle/MCP checks, discovery/portability,
Worker types, dependency audits and controlled desktop/mobile browser checks cover this boundary.
The real disposable local Supabase Auth/TOTP exercise concurrently submits two claim requests and
duplicate replays, verifies one reservation/event and explicit release, then removes only its test
fixtures. Synthetic browser responses prove interaction/accessibility, not hosted authenticated UI.
The final matrix passes 526 tests across 87 unit/component files, 166 desktop/mobile Playwright
checks, the 157-assertion identity security packet and real local concurrent Auth/AAL2 exercise.
The production build and Cloudflare upload dry-run pass; no deployment is performed. Worker types
are current and both dependency audits report no advisories. All 25 migrations replay cleanly;
745 pgTAP assertions across 20 files pass, including 31 command checks and a wall-clock expiry
regression. SQL lint reports no errors and the public/identity-private schema diff reports no drift.
Local migration history matches all 25 filenames. No hosted schema or migration history was changed.

## Sequencing, Lessons and Debt

The command boundary is implemented locally; end-to-end ready-for-hand-off and later provider
transitions are not operational yet. This is the approved split with Task 10.6/Sprint 11, not a
payment override or an assertion of whole-sprint completion. Their authoritative fact adapters and
success/denial proof must replace the explicit pending gate before activation.
Supabase concurrency/security guidance informed ordered locking, explicit function privileges,
private append-only replay storage and atomic audit; React/browser guidance informed private-data
cleanup and refreshed projections. Replay success is historical evidence, not current authority.
Test fixture mistakes were corrected without weakening tenant/session constraints.

No new debt ID. TD-009 remains In progress and TD-043 Open. All four Sprint 10 migrations require
separate hosted approval/proof; the previously recorded hosted baseline is not reverified by this
local task. Tasks 10.6–10.10, commercial activation and live assistive-technology review remain.

## Files

| Kind     | Files / boundary                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| New      | `queue-command.ts`/tests; `20261003221821_staff_queue_commands.sql`; `staff_queue_commands.test.sql`; this annexure. |
| Modified | Queue projection/repository/HTTP handler and tests; `StaffQueuePage.tsx`/tests; `e2e/staff-queue.spec.ts`.           |
| Modified | `scripts/test-supabase-workforce-integration.ts`, server routing, request-security registration and route policy.    |
| Modified | Sprint/phase plan, debt registry and RAG current state/limitations/index.                                            |

No dependency change, public-copy change, hosted migration, live provider operation or deployment.
The owner retains branch, staging, commit and deployment control.
