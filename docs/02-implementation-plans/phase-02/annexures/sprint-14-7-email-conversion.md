---
plan_id: phase-02-sprint-14-7
title: Mobile Claim Email Verification and Governed Activation
status: completed-local-conversion-boundary
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Task 2.14.7 — Email Conversion

## Completion Boundary

Implemented on `itws-I`, following committed Task 14.6 at `c1567e1`. This is a local
implementation and verification result, not hosted acceptance or pilot activation. No staging,
commit, branch change, push, deployment, hosted migration, credential provisioning or real email/SMS
occurred. The owner retains those controls. All sending, redemption and email modes remain disabled
by default; budget defaults remain zero. No dependencies or generated files changed.

The Supabase and email guidance informed private RPC access, serialized reservation, actual provider
verification and conservative handling of uncertain sends. The original approved binding remains
the unique SMS bearer plus independently verified email. This does not prove civil identity or that
a forwarded link is held by the intended roster participant. Existing-account, changed-email/phone,
shared/recycled/forwarded-number exceptions remain staff-reviewed; no automatic relink or merge.

## Implemented Flow

After the explicit 14.6 claim and immutable normalized email binding, a separate button requests
the email code. `prepare_mobile_email_exchange` serializes against revoke/resend, rechecks tenant,
token, version and both deadlines, rejects existing provider/application accounts, and creates one
private durable send lease plus the existing governed patient invitation. Reservation and audit
are atomic. A tenant ceiling of ten new email leases/hour supplements HTTP rate controls.

Only that reservation can call the existing managed Auth invitation adapter. Reserved or uncertain
leases never blindly resend; delivered leases resume without another provider call. Here “delivered”
is the existing provider-acceptance state, not proof of mailbox receipt. Failed/late completion
cannot revive a revoked or superseded claim. The fixed redirect contains no bearer, email or record ID.

The participant submits a six-digit code through a strict same-origin protected POST. Managed
Auth verifies the invitation OTP; the server verifies its session, re-reads the same invitation and
requires the exact provider/email/session binding. SQL requires a fresh provider session created
after reservation and records it against the still-live claim. Invalid code, expiry, wrong tenant,
wrong contact, revoked session and intervening revocation fail closed. A rejected post-OTP result
attempts local provider-session revocation and issues no application authority.

Local Auth remains configured for six digits and **900 seconds**; the 48-hour SMS lifetime does
not extend an email code, current claim or preactivation deadline. A verified result issues only the
existing encrypted, Secure/HttpOnly/SameSite=Strict preactivation cookie, bounded to at most ten
minutes and the earlier claim/invitation/provider deadline. JSON contains no provider tokens or
contact/record fields. It does not issue the normal patient session or skip terms/profile activation.

The browser proceeds to `/account/activate`. Existing activation primitives are preserved privately
behind service-only wrappers. Direct old verification cannot bypass the current mobile/session
guard. The roster phone must match. Existing exact published-document acceptance, profile creation,
membership, email invitation acceptance and mobile conversion/token consumption occur in one
transaction, including audit. A late audit failure rolls everything back. Exact lost-response retry
does not create another profile, receipt or conversion; changed replay is denied.

## Register Retention and Limits

A service-only bounded sweep expires overdue invitations, purges unconverted register contact
rows after the existing 30-day terminal boundary and removes elapsed 90-day minimal mobile journal
rows. It clears register/claim email digests through existing guards. Each category processes at most
100 rows/invocation. The existing Worker schedule invokes it only with email mode explicitly enabled
and an exact tenant. It returns counts only; converted records follow the separate account lifecycle.

This is **not** blanket erasure of Auth users, application identity contacts, immutable domain audit
or encrypted backups. Provider-created, never-converted identities and uncertain/resend exceptions
require provenance-scoped retention/recovery. **TD-066** records that release obligation; keep real
mobile email disabled until resolved or a reviewed bounded operating control is approved. Existing
TD-065 identity/private-object recovery and all Sprint 13 launch gates remain unchanged.

## Verification Evidence

- Complete local migration replay passed in filename order. The new CLI-created migration is
  ordered immediately after the previously committed future-dated 14.6 migration; no history repair.
- Full Vitest run: **149 files / 1,098 tests passed** before the additional retention unit file.
  Final focused email/retention/environment run: **3 files / 45 tests passed**, including its three
  new retention tests. No final full-suite total is inferred from those separate runs.
- Complete database packet: **42 files / 2,013 assertions passed**, including **61 new conversion
  assertions** covering ACL/RLS, reservations, actual session binding, revoked sessions, roster-phone
  denial, terms, atomic rollback, retry, supersession and 30-/90-day pruning. Database lint: no errors.
- `test:mobile:conversion`: eight competing requests produced **one** invitation. Local Auth
  `generateLink` supplied a code without email; the real adapter verified that OTP/session, HTTP
  issued separate preactivation, existing activation created one profile/two receipts and consumed
  the link. Session revocation, exact fixture cleanup and table fingerprints restored the baseline.
- Existing `test:mobile:redemption`: eight claims, one winner, safe retry, immutable email,
  revocation and exact baseline restoration passed. Six recovery suites: **334 assertions passed**,
  preserving row/security/function fingerprints.
- Final controlled Playwright/axe packet: **18 desktop/mobile checks passed**. It uses synthetic
  response mocks for browser flows; it is separate from the actual local Auth proof above. Pending
  code status is marked busy, input clears on failure/expiry/page hide, and successful verification
  redirects only to existing activation. Manual assistive-technology acceptance remains 14.8.
- TypeScript, ESLint, production build/client-secret/MCP checks, portability and discovery passed.
  Local tooling is Bun 1.3.14/Node 24; repository Node 22 build/CI policy is unchanged. Exact-commit
  GitHub CI and actual deployed provider delivery are not claimed here.

The local fixture runner rejects inherited hosted/provider variables, fixes local loopback/Docker
targets, disables dotenv at both command layers and requires an empty mobile/Auth baseline. Its
cleanup locks only the enumerated tables, removes manifested synthetic rows (including profile
notification intent), restores named guards before commit and verifies original fingerprints.
No notification dispatcher runs, and no email is sent.

## File Accounting

New files:

- `supabase/migrations/20261008200100_mobile_invitation_email_conversion.sql`
- `supabase/tests/database/mobile_invitation_email_conversion.test.sql`
- `src/server/identity/mobile-invitation-email-service.ts` and its `.test.ts`
- `src/server/identity/mobile-invitation-retention.ts` and its `.test.ts`
- `scripts/test-mobile-invitation-conversion.ts`
- this completion annexure.

Modified files:

- `src/server/identity/mobile-invitation-redemption-http.ts`, `mobile-invitation-page.ts`,
  `src/server/security/request-security.ts`, `src/server.ts`
- `e2e/mobile-invitation-redemption.spec.ts`, `src/config/environment.test.ts`
- `.env.example`, `config/environment-catalogue.ts`, `package.json`, `.github/workflows/ci.yml`,
  `AGENTS.md`
- Sprint 14 plan, Task 14.6 successor note, technical-debt registry and RAG current-state,
  limitations and index.

No removals, lockfile changes, secret changes or generated-output edits. Next: 14.8 complete
security/manual acceptance (including TD-066 design), then explicitly authorised 14.9 hosted
phone/mail rehearsal and 14.10 release reconciliation. Task completion does not close Sprint 14.
