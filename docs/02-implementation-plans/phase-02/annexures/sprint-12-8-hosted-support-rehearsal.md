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
