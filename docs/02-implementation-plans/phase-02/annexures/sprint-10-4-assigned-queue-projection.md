---
annexure_id: phase-02-sprint-10-4-assigned-queue-projection
title: Sprint 10.4 — Assigned Staff Queue and Masked Detail
status: verified-local
last_updated: 2026-10-03
owner: "@Muhns13G"
---

# Sprint 10.4 — Assigned Staff Queue and Masked Detail

## Mission and Scope

Implement the accessible minimum-data queue fixed by Task 10.1/DR-014 on the committed
Task 10.3 boundary (`a19edd1`). This task is a read-only list/detail implementation, not a
staff provisioning, patient-invitation, claim, transition, hand-off or payment activation task.
Public messaging, metadata, dependencies, seeds and hosting configuration are unchanged.

## Work and Decisions

- `/staff/queue` renders an accessible private shell. Operations users get a link from their
  completed staff session; other roles do not receive routine operations access.
- Same-origin, bounded, rate-limited POST `/staff/queue/read` and `/staff/queue/detail` read an
  encrypted staff proof. Every request verifies the live provider/app AAL2 session and server-derived
  tenant/role/purpose. The database independently repeats context and current assignment checks.
  Revocation, expiry, wrong scope and pending MFA fail closed. Reads do not renew sessions.
- `read_operations_queue` is the only new server-only RPC. Browser roles cannot execute it and
  direct operations-table privileges remain denied. Its empty search path and explicit ACLs retain
  the narrow privileged boundary. No tenant-wide count, unassigned browse or arbitrary search exists.
- State filters and oldest-first 25-row keyset pages use timestamp/UUID ordering. List fields are
  opaque case/owner IDs, state/version, timestamps, profile/email facts and a coded unresolved
  exception. Detail adds only approved names, masked contacts, preference and account/mobile status.
  Email is `***@***`; mobile reveals only its last two digits, masked **inside SQL**.
- Profile/email facts are not commercial or recipient authority. Hand-off and payment readiness
  explicitly remain `not_evaluated` until their authoritative command/ledger boundaries exist.
- Strict projections reject expanded payloads. No case/contact fields enter URLs or browser storage.
  No-store/no-referrer/noindex responses, abort/stale-response guards, cleared previous data,
  bounded expiry clearing, focus placement, labelled filters and live status protect the private UI.

## Validation

- Clean replay of 24 local migrations; CLI schema diff reports no drift and SQL lint has no errors.
- 714 pgTAP assertions across 19 files pass, including 29 queue projection checks for masking,
  exact fields, pagination, wrong tenant/assignee, revocation, expiry and pending-MFA denial.
- All 517 unit/component/repository/HTTP tests across 86 files pass. The 157-assertion identity
  security packet and disposable real local workforce Auth/TOTP/session exercise pass.
- TypeScript, lint/format, production build/client-bundle/MCP checks, discovery/portability,
  Worker types, Cloudflare upload dry-run and dependency audits pass. No dependency advisory is reported.
- All 164 desktop/mobile Playwright checks pass. Visible local browser checks confirm private rendering, anonymous denial and unchanged homepage
  navigation. Controlled desktop/mobile Playwright checks include real anonymous endpoint denials
  and separately mocked synthetic projections for table/detail accessibility, focus and stale-data
  removal. These are not hosted authenticated staff or live screen-reader acceptance.

## Deviations, Lessons and Debt

No mission deviation or new debt ID. Corrected the previous 10.3 annexure's unsupported attribution
of a new patient-invitation UI to this read-only task; the governed Sprint 9 helper remains intact.
Supabase/Postgres guidance informed explicit privileges, server masking and stable bounded reads;
React/browser guidance informed minimal serialisation, focus and private-data cleanup.
The first database run found old synthetic fixture contamination and one incorrect field-count
assertion; clean replay and corrected fixtures pass without weakening application constraints.

TD-009 remains In progress and TD-043 Open. Tasks 10.5–10.10 own claims/transitions, hand-off,
append-only access audit/alerts, client status, reliability rehearsals and sprint closure. Hosted
retains the previously recorded 21-migration checkpoint; all three Sprint 10 migrations require
separate approval and hosted proof. No real staff, client, email, payment or clinical workflow was
activated. Live assistive-technology and existing Phase 02 release gates remain.

## File Inventory

| Kind      | Files / boundary                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| New       | `src/application/operations/queue-projection.ts`/tests; Supabase queue repository/tests; queue HTTP handler/tests. |
| New       | `StaffQueuePage.tsx`/tests, `staff.queue.tsx`, `e2e/staff-queue.spec.ts`.                                          |
| New       | `20261003213627_staff_queue_projection.sql`, `staff_queue_projection.test.sql`, this annexure.                     |
| Modified  | Workforce sign-in link/service factory, server routing, request-security registration and discovery policy.        |
| Modified  | Sprint/phase plan, corrected 10.3 annexure, debt registry, RAG current state/limitations/index.                    |
| Generated | `src/routeTree.gen.ts` through the framework build.                                                                |

The owner retains branch, staging, commit and deployment control.
