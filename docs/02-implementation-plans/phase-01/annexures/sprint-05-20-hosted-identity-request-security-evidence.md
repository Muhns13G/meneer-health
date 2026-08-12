---
task: 5.20
status: completed
date: 2026-08-12
related_debt: [TD-013, TD-017, TD-020]
---

# Sprint 05.20 — Hosted Identity and Request-Security Evidence

## Verified Outcome

The twelve repository migrations are applied to hosted Supabase project `gibfpolrdjotwvewgfsz` in
London. Thirty-three public application tables have RLS enabled. Browser roles retain no direct
table policy, and the existing `public.rls_auto_enable()` event-trigger helper is executable only
by `postgres`; the former anonymous/authenticated SECURITY DEFINER warnings are removed.
The hosted migration ledger versions match all twelve repository filenames, preventing a later CLI
push from treating the applied schema as unapplied.

The deliberate no-policy notices represent deny-all browser access, not missing customer policies.
Anonymous requests to `tenants` and `rls_auto_enable()` return PostgreSQL `42501`. Performance
Advisor's unindexed-foreign-key notices require a later query/index review and do not weaken this
access boundary.

## Repository Changes

- `20260812005710_hosted_security_hardening.sql` preserves automatic RLS and revokes RPC execution
  from `public`, `anon`, `authenticated`, and `service_role`.
- `20260812105236_relink_returning_auth_identity.sql` and
  `20260812110104_relink_unconfirmed_returning_auth_identity.sql` preserve the stable internal
  subject when Supabase recreates a provider identity for an existing verified email, including
  Auth's insert-before-confirmation sequence.
- The Supabase Auth, contextual-authorisation, and security-evidence integrations can target local
  services by default or an explicitly opted-in `hosted-synthetic` environment with an all-or-none
  credential set.
- `test:security:hosted` performs payload-free public-read and inactive-endpoint denial checks.
  It requires `HOSTED_SECURITY_EXERCISE_CONFIRM=inactive-routes-only` and an HTTPS base URL.

## Validation

| Check                                                            | Result                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Fresh local migration reset and pgTAP                            | Pass; 12 migrations, 9 files / 296 assertions                            |
| Local Auth, authorisation, security evidence                     | Pass                                                                     |
| Hosted migration count                                           | Pass; 12                                                                 |
| Public tables with RLS                                           | Pass; 33 of 33                                                           |
| Auto-RLS helper browser execution                                | Denied; only `postgres` retains execute                                  |
| Hosted anonymous table/RPC access                                | Denied with `42501`                                                      |
| Hosted Auth lifecycle integration                                | Pass; synthetic user removed                                             |
| Hosted contextual authorisation integration                      | Pass                                                                     |
| Hosted denial and disabled break-glass evidence                  | Pass; two append-only audit events retained                              |
| Public deployment read                                           | `200`                                                                    |
| Unregistered mutation, cross-origin preflight, inactive checkout | Hidden `404`; no CORS; no-store                                          |
| Brevo sender and domain                                          | Verified sender; authenticated `meneerhealth.co.za` domain               |
| Supabase custom SMTP                                             | Enabled with Brevo host, port 587, verified sender, and encrypted secret |
| Synthetic password recovery                                      | Accepted and received in Gmail after returning-identity relink           |
| Synthetic invitation                                             | Delivered after alias verification and stale suppression removal         |
| Synthetic cleanup                                                | Pass; zero Auth users and non-audit workflow/identity fixtures           |

## Hosted Auth Configuration

Owner-approved production restrictions are now saved: public signup, anonymous sign-in, and
manual identity linking are disabled; email confirmation remains required. Secure email change,
recent-session password changes, current-password verification, a 12-character minimum, and the
recommended mixed-character password policy are enabled. The Site URL and sole redirect URL are
`https://meneerhealth.co.za`, access tokens expire after 900 seconds, refresh-token replay
detection remains enabled, and TOTP/AAL2 remains available. Supabase Free does not expose provider
session time-box or inactivity controls, so the application session ledger remains authoritative.

Brevo custom SMTP is enabled with the verified `sales@meneerhealth.co.za` sender, authenticated
`meneerhealth.co.za` domain, `smtp-relay.brevo.com`, and port 587. Supabase stores the SMTP secret
encrypted; neither the SMTP login nor key is copied into tracked documentation. Brevo reports the
dedicated `meneer-health` SMTP key as active.

The modern server secret is stored only in ignored `.env.production.local` with mode `0600`; no
secret was copied into tracked files or evidence.

## Completion Position

Task 5.20 is complete. The hosted Auth, contextual-authorisation, disabled break-glass, and
inactive request-security exercises pass. Supabase accepted an approved synthetic invitation to
`support@meneerhealth.co.za` and password recovery to `sales@meneerhealth.co.za`; Brevo delivered
the recovery message, but hard-bounced the invitation because the recipient account did not exist.
Both temporary Auth users were removed and the hosted Auth user count returned to zero without
following or recording either token-bearing link. After the owner added the mailbox aliases, a
second approved invitation was accepted by Supabase. Brevo recorded it as Sent and briefly
Delivered before its final Hard bounce with the same “email account ... does not exist” reason. The
attempted repeat recovery did not run because Supabase returned a user-creation error after sending
the invitation; the earlier delivered recovery remains the accepted recovery proof. Cleanup again
returned hosted Auth users to zero. The owner then proved normal external delivery to the support
alias, Brevo's stale hard-bounce suppression was removed, and one final approved Supabase
invitation reached Brevo's final Delivered status at 12:40. Its temporary Auth user was deleted and
the hosted Auth user count remained zero. Neither token-bearing link was followed or recorded.

Brevo's dashboard exposes anonymous tracking rather than a true no-rewrite SMTP setting. Direct
provider Auth links remain activation-gated. FC-001 records the future Meneer-owned `/auth/confirm`
`TokenHash` or deliberate OTP boundary required before any customer identity journey is enabled;
this does not block completion of the current disabled-capability evidence.

The recovery retry exposed and corrected a stable-identity defect: deleting a Supabase Auth user
correctly retained its internal subject/contact, but recreating that email initially attempted a
duplicate subject and failed the unique verified-contact constraint. The two relinking migrations
now resolve the retained contact during Auth's initial unconfirmed insert. A hosted retry created
the returning identity, requested recovery, reused one stable subject/contact, and deleted the
temporary Auth user successfully. Exact guarded cleanup then removed that synthetic subject,
contacts and provider identities; hosted Auth users and `sales@` synthetic identity rows returned
to zero. After the stale Brevo suppression on `sales@` was removed, the final approved recovery
request reached Gmail at 13:12. The message was observed without opening or recording its
token-bearing link. A clean local reset then applied all twelve migrations and passed all nine
pgTAP files / 296 assertions before Supabase was stopped cleanly.

The cleanup retains one synthetic tenant and three synthetic subjects only because two immutable
audit events reference them: `RELATIONSHIP_REQUIRED` and `BREAK_GLASS_DISABLED`. All other hosted
synthetic identity, workflow, assignment, session, recovery, invitation, and service-identity rows
were removed by exact identifier. These retained audit dependencies contain no real-person data.

No WAF/Turnstile rule is activated while every mutation route remains hidden and no public form
exists; route-specific WAF/rate proof remains an activation gate for the first enabled mutation.
