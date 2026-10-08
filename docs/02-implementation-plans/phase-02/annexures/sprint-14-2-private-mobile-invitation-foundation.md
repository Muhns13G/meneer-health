---
plan_id: phase-02-sprint-14-2
title: Private Mobile Invitation Storage Foundation
status: completed-local-foundation
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Task 2.14.2 — Private Mobile Invitation Foundation

## Scope

Implements the local storage boundary of the
[14.1 contract](sprint-14-1-mobile-invitation-contract.md), not an operational SMS channel.
Migration `20261008130000_mobile_invitation_foundation.sql` creates five tables in the existing
`identity_private` recovery schema: invitations, separately purgeable contacts, token digests,
claim digests and an allowlisted minimal event journal. No public RPC, provider call, application
route, hosted migration, production fixture or activation is introduced.

All five tables enable and force RLS; `anon`, `authenticated` and `service_role` have no direct
table privileges. Six trigger helpers are security-definer with an empty search path and no
execute grants to those roles or PUBLIC. Later governed commands must verify current workforce
authority; table constraints are not a substitute for AAL2 or OTP verification.

## Implemented Invariants

- Minimal normalized contacts and opaque provenance/authority references, tenant/request uniqueness,
  tenant-scoped phone reservation and composite tenant lineage. Converted phones remain reserved;
  terminal unconverted invitations release their reservation for explicit staff action.
- No raw bearer token, claim secret, email OTP, SMS body or arbitrary journal payload columns.
  Globally unique 64-hex token/claim digests, one active token and claim per invitation, and
  per-invitation claim request-key uniqueness provide collision/replay protection.
- Exactly 48-hour issued token lifetime and a maximum 15-minute claim bounded by the token expiry.
  Tokens/claims cannot reactivate after invalidation. Expired authority is rejected before sweeping.
- Versioned supersession atomically invalidates active token/claim state and clears the old email
  binding; revocation, decline, expiry and conversion also invalidate dependent authority.
  Terminal invitations cannot reopen. Corrections require a governed explicit successor/version.
- First claim freezes the normalized email digest; a later claim can resume the same email but
  cannot substitute another. Conversion requires same-tenant accepted/delivered email-invitation
  lineage, the exact accepted subject/email and an unexpired active claim. This is storage proof,
  not an implemented email-delivery/conversion service.
- Derived 30-day terminal contact purge eligibility, including erasure of related email digests;
  journal mutation is denied and deletion is allowed only after its 90-day retention window.
  Converted contacts remain subject to the separate account lifecycle.

## Validation

Final local evidence on 8 October 2026:

- `bun --no-env-file run db:reset`: complete migration/seed replay passed.
- `bun --no-env-file run db:lint`: freshly replayed schemas returned an empty error list.
- `bun --no-env-file run db:test`: 37 suites / 1,736 assertions passed, including 107 in
  `mobile_invitation_foundation.test.sql`.
- `bun --no-env-file run test:recovery:rehearsal`: six suites / 334 assertions passed; exact row,
  security and function fingerprints restored, no hosted/provider/generator contact.
- `bun --no-env-file run typecheck`, `lint` and `check:portability`: passed. Portability retained
  15 capabilities, 20 contract majors and 26 fixtures.
- Post-test database inventory: all five new tables empty; all six invitation triggers enabled.
- Changed-document formatting and `git diff --check`: passed. Application bundle/browser tests
  were not rerun for this SQL/docs-only change; runtime and UI files are unchanged.

The packet tests actual role denial, RLS/ACL/search-path metadata, same-tenant phone collision,
cross-tenant lineage, immutable digests, email replacement, claim replay, supersession/revocation,
expiry, conversion lineage, converted-phone reservation and elapsed retention.

Historical retention/expiry fixtures temporarily disable only named guards inside the local
rollback transaction, immediately restore them and never reach hosted services. Competing-write
constraints are exercised with colliding inserts; an actual multi-connection command race remains
part of later command/redemption verification. No claim of hosted or provider acceptance is made.

## Remaining Planned Boundaries

14.3 implements AAL2 staff commands/UI and transactional event emission; 14.4–14.5 implement durable
delivery and provider receipts; 14.6–14.7 implement deliberate redemption, sealed claim cookies,
email verification and conversion. The retention sweep, backup reconciliation, interruption/race
matrix and recovery handling must be wired and exercised before release; this migration supplies
their eligibility and mutation protections, not a scheduled purge job. Expiry constraints alone
do not send messages or run a sweeper. Token/claim tombstone and audit retention remain subject to
the approved final lifecycle review.

No hosted migration or SMS send was performed. Sending/spend remain disabled. Existing Sprint 13
launch blockers are unchanged; this task does not establish pilot go-live readiness. Git remains
owner-controlled: no staging, commit, branch switch, push or deployment.

## Commit Packet

Seven files: the migration and database test above; this evidence annexure; the Sprint 14 plan;
Phase 02 plan README; `docs/RAG/02-current-state.md`; and `docs/RAG/07-index.json`.
No dependencies, generated files, Worker bindings, public APIs, Auth settings or seed fixtures changed.
Task 14.2 is completed at its agreed local foundation boundary; Task 14.3 may follow after the
owner commits this packet. Later task obligations are not waived or represented as completed here.
