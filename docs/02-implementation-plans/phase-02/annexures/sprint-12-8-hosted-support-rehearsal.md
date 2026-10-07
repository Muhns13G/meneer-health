---
plan_id: phase-02-sprint-12-8
title: Hosted Support Rehearsal Evidence
status: in-progress
last_updated: 2026-10-07
owner: "@Muhns13G"
---

# Task 2.12.8 — Hosted support rehearsal

## Authorised boundary

The owner approved isolated synthetic client/staff fixtures, generic emails only to
support@meneerhealth.co.za, temporary synthetic-only notification configuration and a
dedicated webhook secret if necessary. Restore disabled settings, revoke test sessions and
remove only identified fixtures using guarded transactional cleanup. No real pilot activation,
real client data, charges, Git staging or agent deployment is authorised.

## Evidence collected

| Check                                 | Result                                                                   | Scope                                                              |
| ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Three committed Sprint-12 migrations  | Applied; subsequent CLI dry-run up to date                               | No seeds or roles applied                                          |
| Hosted baseline before rehearsal      | Zero Auth users, support cases and notification intents; pilot suspended | Redacted aggregate evidence only                                   |
| Updated support command endpoint      | Anonymous POST returns 401                                               | Confirms handler is reachable, not authenticated flow proof        |
| Brevo support sender                  | Present and active after owner configuration                             | Sender metadata only                                               |
| Generic support-template sender check | HTTP 201 accepted; owner confirmed actual inbox receipt                  | Sender readiness and inbox delivery only; not durable outbox proof |

The readiness email used the committed `support-v1` subject/text and fixed first-party sign-in
destination. No health information, identity/profile, protocol, case reference, financial amount
or attachment was sent. Provider acceptance is not delivery or human acknowledgement.

## Remaining acceptance evidence

### Authenticated checkpoint and blocking defect

The isolated hosted rehearsal proved client sign-in, genuine staff TOTP/AAL2, email-only
staff denial, authenticated emergency no-case/no-notification behaviour, complaint creation,
same-request replay containment and wrong-purpose denial. The attempted resolution before
acknowledgement correctly failed the SQL business guard, but returned HTTP 503 rather than 409.
Direct RPC returned 504; the database guard reported SQLSTATE `40001`.

Supabase documents that using `40001` for custom RPC business errors causes transaction retries:
[official troubleshooting guidance](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).
The append-only `20261007033744_support_business_conflict_status.sql` changes only the seven
intentional conflicts in the three support command functions to `PT409`, with guarded definition
counts and unchanged owner, ACL, security-definer and search-path metadata. The HTTP adapter
recognises `PT409`; existing conflict compatibility remains. Local verification passed both
rollback-only support SQL suites (120 checks), the HTTP suite (nine tests), and TypeScript.
This migration has **not** been applied to hosted Supabase; the HTTP change has **not** been
deployed. Owner approval for the migration and owner deployment are required before resuming.

Each completed hosted attempt revoked its test sessions, removed the isolated fixtures and
verified the original empty support/Auth baseline with the real pilot still suspended. No
production support coverage or durable transport acceptance is claimed. The guarded
`scripts/test-hosted-support-rehearsal.ts` currently covers authenticated command boundaries,
not notification transport; transport/failure/retry and alternate-owner completion remain below.

The repeatable anonymous preflight is
`HOSTED_SUPPORT_DENIALS_CONFIRM=canonical-anonymous-only bun run scripts/test-hosted-support-denials.ts`.
Its five hosted checks passed: client read/request and staff command/follow-up deny anonymous
access with 401; the disabled callback returns 404. All replies were no-store and had no CORS
grant. The urgent anonymous denial is authentication evidence only, not the authenticated
emergency no-case proof. The script creates no fixture, sends no email and does not read secrets.

- Isolated authenticated client request and emergency no-case/no-notification boundary.
- Durable intent, attributed provider delivery and duplicate/replay containment.
- Controlled failure, bounded retry, uncertainty/suppression and owned staff follow-up.
- Fresh staff AAL2 acknowledgement, resolution ordering, alternate escalation and wrong-purpose
  denial; synthetic clinical roles do not appoint real clinicians.
- Restored disabled configuration, revoked sessions, scoped fixture cleanup and baseline check.

Task 12.8 and TD-043 remain open. The sender readiness check does not substitute for these
end-to-end boundaries or authorise real support coverage.
