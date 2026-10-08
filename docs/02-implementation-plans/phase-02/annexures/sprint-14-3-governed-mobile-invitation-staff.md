---
plan_id: phase-02-sprint-14-3
title: Governed Mobile Invitation Staff Commands and Register
status: completed-local-staff-boundary
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Task 2.14.3 — Governed Staff Invitation Preparation

## Boundary and Authority

Builds on committed Task 14.2 at `26ecbe2` and the
[14.1 contract](sprint-14-1-mobile-invitation-contract.md). This task implements local staff
preparation, not an operational invitation channel. `/staff/mobile-invitations` loads a bounded
private register through POST-only read/command endpoints. No participant details are embedded
in the route's initial HTML. Only current `operations` role/purpose, tenant-level `identity_contact`
assignment and genuine workforce AAL2 can read or mutate. Support, administrator and clinician
roles receive no implicit invitation permission. Staff confirmation concerns contact authority
before sending, not a new staff identity-approval step for participants.

The database rechecks authority after the tenant advisory lock, locks its source records and
uses wall-clock expiry checks. Client-supplied tenant, role, payment, health answers, email and
token fields are rejected. Anonymous/authenticated database roles cannot execute these RPCs;
service-role execution still requires the verified provider/application session context.

## Implemented Commands

- Create saves only names, E.164 phone and opaque provenance/contact-authority UUID references.
  One active/reserved phone per tenant remains enforced; no automatic duplicate merge/correction.
- Review records the current version's staff review before a send reservation. It sends nothing.
- Send reserves one reviewed current draft version. Resend explicitly increments the version,
  invalidates previous token/claim authority atomically and reserves the successor version.
  Neither command generates a raw token or contacts Telnyx in this task.
- Revoke records a terminal state and invalidates dependent authority. Stale versions, terminal
  records, changed idempotency requests and wrong-tenant targets fail closed.
- Exact actor/request/payload replay returns the original opaque receipt without another mutation,
  audit fact or reservation. Current authority is rechecked even on replay.
- Tenant reservations serialize under a transaction lock: missing/zero policy means disabled;
  positive policy caps rolling 24-hour reservations, with at most three per invitation in that
  window. Draft creation is additionally capped at ten per staff actor/hour.
- Every successful command has a minimal invitation event and central audit fact in the same
  transaction; audit failure rolls back the mutation. Commands/reservations are append-only.

The three additional tables are private, forced-RLS and without direct service-role table access.
They remain in the existing `identity_private` recovery schema. No policy rows or grants are seeded.
These are reservation limits, **not yet proof of provider spend enforcement**: exact segment/cost
limits, durable dispatch intents, token issuance and uncertain-send handling belong to 14.4.

## UI and Request Safety

The register exposes names, phone suffix only, status/version, review/reservation and expiry, with
25-row cursor pagination. No raw phone, mailbox, token/digest, SMS body or private documents appear
in that projection. Contact form input lives only in component memory and clears on each request,
failure, expiry or page exit; it is not written to browser storage or URLs. Commands use opaque
request keys/current versions and never retry automatically. An uncertain command requires refresh.

POST requests enforce canonical origin, method, bounded body, duplicate/unknown-field rejection,
request/session rate limits and current workforce proof. Responses are no-store, no-referrer and
noindex. The UI also requires the server's session deadline, clears stale details at expiry and
provides labelled fields, keyboard controls and live/focused status announcements. Review/send
requires explicit contact-authority confirmation. Reservation labels explicitly state no SMS.

## Local Evidence

Evidence on 8 October 2026:

- Full local migration/seed replay passed; database lint returned an empty error list.
- Full SQL matrix: 38 suites / 1,800 assertions, including 52 new staff-command checks.
- Recovery rehearsal: six suites / 334 assertions; exact row/security/function restoration.
- Focused contract, repository, HTTP and component packet: four files / 44 tests passed.
- Full deterministic Vitest regression: 143 files / 1,003 tests passed.
- Desktop/mobile browser packet: ten checks passed, including keyboard review, axe, 320px reflow,
  masked projections, denial clearing, no automatic retry and actual anonymous endpoint denial.
- Typecheck, ESLint, portability and discovery checks passed; production build and its client-bundle
  configuration/MCP-absence checks passed. Repository-wide Prettier and diff whitespace checks passed.
- Local post-test inventory: invitations, policies, commands and reservations empty; both new
  append-only triggers enabled. Local Supabase was stopped after testing.

The first browser run timed out during dev-server startup. A subsequent run exposed a cold-route
hydration timing assumption in the test; its initial review assertion now waits for the private-read
response rather than treating initial SSR loading as a ready register. The corrected packet passed
both profiles. No production setting or hosted key was changed to address this local test timing.

All fixtures use synthetic `.invalid` email and fake international numbers, and SQL suites roll back.
No hosted configuration, provider recipient, real identity or participant data is used. Browser
positive paths use synthetic intercepted responses; SQL verifies database mutations independently,
and handler/adapter tests cover their contract. This is not a hosted end-to-end AAL2 journey claim.

Actual multi-connection races and the full manual assistive-technology acceptance matrix remain
the planned 14.8 boundary; this task proves transactional locking, collision/replay rejection,
rolling budgets, atomic invalidation and rollback behaviour locally, not handset delivery.

## Commit Packet and Next Task

Existing files changed: `src/components/StaffQueuePage.tsx`, `src/server.ts`,
`src/server/security/request-security.ts`, `src/lib/public-route-policy.ts`, generated
`src/routeTree.gen.ts`, Sprint 14 plan, Phase 02 README and RAG current-state/index.

New files: mobile-invitation application contract/test, Supabase repository/test, HTTP handler/test,
staff register component/test, route, browser test, migration
`20261008143000_mobile_invitation_staff_commands.sql`, SQL test and this annexure.
The packet contains nine modified files and thirteen new files. The generated route-tree change
contains only the new staff route and was regenerated by Vite, not edited manually.

No dependency, environment file, Worker binding, provider setting, public sitemap, seed or existing
migration changes. Git remains owner-controlled; no staging, commit, branch switch, push or deployment.
14.4 may follow after this packet is committed. Sending/spend stay off and prior launch blockers
remain unchanged. Hosted migrations and controlled delivery proof require later explicit approval.
