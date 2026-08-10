---
evidence_id: phase-01-sprint-05-task-07
title: Sprint 05.7 Managed Identity and Session Foundation
status: verified-task-evidence
date: 2026-08-10
source_parent: a069392
owner: "@Muhns13G"
related_debt: [TD-013, TD-019]
---

# Sprint 05.7 Managed Identity and Session Foundation

## Mission and Boundary

Integrate the selected managed identity provider behind portable server contracts and prove stable
internal subjects, verified contact, bounded sessions, recovery, workforce MFA and scoped service
identities. This task does not open a customer account route, grant browser database access, migrate
the hosted project, or claim the contextual authorisation owned by Task 5.8.

## Implemented Outcome

- `ManagedIdentityProvider` and `IdentitySessionRepository` keep authentication and session semantics
  outside Supabase, TanStack and Cloudflare types.
- The server-only Supabase adapter provides cohort invitation, non-creating passwordless sign-in,
  generic recovery requests, OTP verification, signed-token/user verification, provider revocation,
  and TOTP enrollment/challenge/verification. User-editable metadata is never read for authority.
- Verified Supabase users map through a private, locked-down trigger to opaque internal subjects and
  verified contacts. Provider deletion cannot silently reuse the internal identifier.
- Patient, workforce and privileged sessions enforce 30m/12h, 15m/8h and 10m/4h idle/absolute
  maxima. Refresh and MFA elevation preserve the original absolute origin; idle-expired sessions
  cannot be touched back to life. Workforce/privileged contexts require AAL2, and step-up tightens
  the existing provider session instead of duplicating or relaxing it.
- Application governance repositories now bind provider invitations to cohort records, persist
  bounded recovery cases, require separate workforce approval, and require session-revocation
  evidence at completion. The provider-facing patient recovery response remains generic.
- Service principals are environment/purpose scoped, accept explicit actions only, store SHA-256
  digests rather than credentials, and have application operations for scope assignment, bounded
  credential overlap and revocation without human accounts.
- `anon` and `authenticated` retain zero table privileges and no RLS policy exists. The server role
  receives only `SELECT`, `INSERT`, and `UPDATE` on identity-governance tables; delete/truncate and
  the private function schema remain unavailable.

## Provider and Free-Tier Decisions

TOTP is the free Supabase MFA mechanism; paid phone MFA remains disabled. Supabase Free does not
provide native time-box/inactivity controls, so the portable application session registry enforces
DR-007's stricter limits. JWT lifetime is 15 minutes, refresh rotation stays enabled, open signup and
anonymous login stay disabled, OTP expires after 15 minutes, email changes require dual confirmation,
and secure password change remains enabled as defence in depth.

## Verification

| Gate                                                                  | Result             |
| --------------------------------------------------------------------- | ------------------ |
| Frozen Bun install                                                    | Pass               |
| Fresh two-migration reset and deterministic synthetic seed            | Pass               |
| pgTAP schema, RLS, grants, trigger, session/recovery/service controls | Pass (67/67)       |
| Database lint at error level                                          | Pass               |
| Supabase security and performance advisors                            | No issues found    |
| Vitest, including identity/session/governance adapters                | Pass (76/76)       |
| Live local Auth and governance lifecycle                              | Pass               |
| TypeScript, ESLint and Prettier                                       | Pass               |
| Production build, route-tree canary and Cloudflare upload dry run     | Pass               |
| Bun dependency audits (all and production)                            | No vulnerabilities |
| Playwright desktop/mobile route, boundary and accessibility matrix    | Pass (50/50)       |
| Hosted Supabase and customer-facing routes                            | Unchanged          |

The revised live proof uses only local PostgreSQL, Auth, gateway and Data API containers. It creates
a random `.invalid` identity, binds and accepts its cohort invitation, verifies passwordless Auth,
proves the session origin survives TOTP elevation, completes recovery after revocation, exercises a
scoped service credential and deletes the provider user. CI runs the same synthetic path and always
stops the stack. The corrected database/Auth proof passed on 2026-08-10, and the temporary local
stack was stopped after validation.

Required closure sequence:

```bash
bun run db:start:test
bun run db:reset
bun run db:test
bun run db:lint
bun run test:auth
bun run db:stop
```

## Debt Disposition

- Task 5.7 is **Completed** with corrected local database/Auth lifecycle evidence.
- TD-013 remains **In progress**. Task 5.8 must implement the complete deny-default contextual
  authorisation matrix and horizontal/vertical negative evidence. Break glass, audit and abuse
  controls remain later Sprint 05 tasks.
- TD-019 remains **Verified**. The existing optional server-only Supabase pair now serves persistence
  and identity; preview remains excluded and bundle canaries still apply.

## References

- [Sprint 05 plan](../sprint-05-data-security-operations.md)
- [DR-007 identity and authorisation architecture](../../../07-decisions/DR-007-identity-authorisation-architecture.md)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [Supabase sessions](https://supabase.com/docs/guides/auth/sessions)
