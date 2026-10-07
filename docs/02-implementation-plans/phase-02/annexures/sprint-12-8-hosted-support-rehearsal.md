---
plan_id: phase-02-sprint-12-8
title: Hosted Support Rehearsal Evidence
status: verified-synthetic-completion
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

## Final acceptance — 2026-10-07

Task 12.8 is complete within its authorised isolated synthetic boundary. The final guarded run
exited successfully with `notificationTransportProved: true`, followed by
`restored: true` and `sessionsRevoked: true`.

| Boundary                   | Verified result                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and authority     | Genuine staff TOTP/AAL2; email-only and wrong-purpose denial                                                                                                                                         |
| Support                    | Emergency creates no case/notification; request replay is deduplicated; resolution requires acknowledgement; alternate handles revoked-primary absence                                               |
| Transport and staff review | Injected retryable, uncertain and definite failure; real backoff retained; uncertain resend denied; suppression cannot be overridden; owned review/requeue                                           |
| Actual delivery            | Two generic support emails matched to their exact Brevo accepted message references; owner separately confirmed inbox receipt                                                                        |
| Hosted receipt             | Missing authentication rejected; tracking event rejected; exact delivery ingestion and replay both succeed; staff view shows two deliveries and database retains exactly two provider-delivery facts |
| Business conflicts         | Changed completion and message binding return HTTP 409/PT409 rather than transaction retry/timeouts                                                                                                  |
| Restoration                | Notification mode disabled; temporary tenant binding and dedicated webhook secret removed; test sessions revoked and scoped fixtures removed                                                         |

The verification harness now uses an exact-reference, bounded provider-report window rather than
inferred mailbox delivery. It probes live callback readiness after configuration publication and
can refresh the existing authorised CLI OAuth session on HTTP 401. A separate no-email readiness
probe proved the deployed callback transitions from disabled 404 to unauthenticated 401. These
were verification/configuration corrections, not a new source deployment.

Local evidence: 192 rollback-only SQL checks, 54 focused support/notification tests, TypeScript,
ESLint and formatting. Independent aggregate-only hosted baseline verification checks 22 tables,
zero rehearsal rows, empty Auth, one suspended pilot, enabled triggers, forced private-table RLS
and restricted command execution. No row content, provider identifiers or secrets are recorded.
The wider read-only hosted baseline also passes: 48 public table resources inventoried, 18
service-unreadable resources reported, only the suspended tenant and 12 provider gates nonempty,
zero Auth users and anonymous tenant reads denied. Hosted migration dry-run is up to date.

Reproduction is not ordinary CI and needs fresh bounded owner authorisation for hosted fixtures,
generic messages, temporary configuration and scoped cleanup:

```sh
HOSTED_SUPPORT_REHEARSAL_CONFIRM=isolated-synthetic-with-cleanup \
HOSTED_SUPPORT_TRANSPORT_CONFIRM=two-generic-emails-temporary-config \
bun --env-file=.env.production.local run scripts/test-hosted-support-rehearsal.ts
```

The hosted callback was exercised by replaying exact provider-verified delivery projections.
No automatic Brevo webhook was installed; this is not proof of unattended provider push. Before
real activation, privately appoint actual purpose owners/alternates and clinical coverage,
configure the authenticated provider webhook, verify quota/headroom, and complete release/debt
reconciliation. TD-043 remains Open for those wider operational criteria. Tasks 12.9 and 12.10 remain.

## Historical acceptance checkpoints

The pending statements below document earlier attempts and are superseded by final acceptance above.

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
Following explicit owner approval, the migration was applied to hosted Supabase without seeds or
roles. The owner confirmed source deployment. The subsequent hosted run passed the corrected HTTP
409 denial, genuine TOTP/AAL2, wrong-purpose denial, alternate-owner acknowledgement and resolution,
emergency no-case/no-notification behaviour and exact request replay. Sessions were revoked and
the original empty support/Auth baseline restored with the real pilot suspended.

Each completed hosted attempt revoked its test sessions, removed the isolated fixtures and
verified the original empty support/Auth baseline with the real pilot still suspended. No
production support coverage or durable transport acceptance is claimed. The guarded
`scripts/test-hosted-support-rehearsal.ts` covers authenticated command boundaries. Its separately
guarded `scripts/hosted-support-transport.ts` packet exercises transport faults, real retry backoff,
owned follow-up and at most two generic support emails. Temporary callback configuration is restored
to disabled; Cloudflare settings retain omitted secrets, so cleanup explicitly deletes only the
new dedicated webhook secret. Transport acceptance is still pending a successful complete run.

The two notification binding/completion functions contained the same intentional `40001`
business-conflict defect. The separately owner-approved
`20261007073348_notification_business_conflict_status.sql` is now hosted, replacing only their
six conflict raises with `PT409` and preserving security metadata. All three local rollback-only
notification/support SQL suites pass (192 checks); the focused HTTP/notification suite passes
54 tests. No seed, role, source upload or real pilot activation accompanied either migration.

The controlled transport packet proved retryable/uncertain/definite-failure classification, owned
review, uncertainty resend denial and synthetic suppression denial. Two real generic support
emails were accepted; one had immediate exact-message delivery evidence. The second lookup timed
out conservatively, and the packet cleaned up rather than inventing a receipt. A subsequent
recipient event report showed two recent deliveries, and the owner confirmed both actual emails
arrived. Exact attributed hosted receipt ingestion/replay remains the final packet checkpoint.

The owner separately confirmed both new rehearsal emails arrived. Subsequent bounded transport
attempts again passed the conflict/replay, uncertainty and suppression guards but stopped at
`PROVIDER_DELIVERY_NOT_CONFIRMED`; mailbox delivery does not replace exact accepted-message
attribution. No receipt was fabricated and no complete transport pass is claimed.

Independent read-only verification using `scripts/sql/sprint-12-hosted-support-baseline.sql`
checked 22 tables: zero rehearsal rows, no Auth users, exactly one suspended pilot tenant,
enabled triggers, forced RLS on the checked private tables and restricted command execution.
Further transport investigation must retain the exact accepted reference in memory until its
provider event is matched, then prove hosted ingestion, duplicate containment and staff projection.
Do not repeatedly send more emails without a targeted diagnostic change.

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

Task 12.8 is now verified complete at synthetic rehearsal scope. TD-043 remains Open; this does
not authorise real support coverage or pilot activation.
