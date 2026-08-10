---
evidence_id: phase-01-sprint-05-task-06
title: Sprint 05.6 Persistence and Tenancy Foundation
status: verified-task-evidence
date: 2026-08-10
source_parent: 35e2afc
owner: "@Muhns13G"
related_debt: [TD-014, TD-016, TD-019]
---

# Sprint 05.6 Persistence and Tenancy Foundation

## Mission and Boundary

Implement the first portable persistence boundary and prove a deny-default, tenant-aware PostgreSQL
foundation using local Supabase and synthetic data. This task does not deploy a hosted migration,
activate authentication, grant browser data access, implement state-changing workflows, or process
pilot data.

## Implemented Outcome

- `AccessRepository` defines provider-neutral tenant, subject, external-identity and membership
  reads. Domain models contain no Supabase, TanStack, Cloudflare or route types.
- `SupabaseAccessRepository` is a server-only adapter. It maps provider rows into domain models,
  disables client-side session persistence and hides provider errors behind the stable
  `PERSISTENCE_UNAVAILABLE` application error.
- The versioned migration creates `tenants`, `subjects`, `external_identities` and
  `tenant_memberships` with opaque UUID primary keys, constrained lifecycle/role values, explicit
  tenant scope, foreign keys and supporting indexes.
- All four exposed tables enable and force RLS. `anon` and `authenticated` have no table access and
  no policy exists yet. The server service role has read-only access; Tasks 5.7–5.9 must add identity,
  authorisation and writes deliberately.
- Deterministic fixtures contain two fictional tenants, subjects, identities and non-crossing
  memberships. No contact, credential, health, patient or partner data is present.
- Supabase CLI configuration and Bun scripts provide reproducible local start, reset, pgTAP and
  schema-lint commands. CI runs a PostgreSQL-only synthetic stack and always stops it; no hosted
  credential is present. Local sign-up is disabled until Task 5.7.

## Environment and Release Safety

`SUPABASE_URL` and `SUPABASE_SECRET_KEY` are catalogued as an optional all-or-none server pair.
Preview is excluded, HTTPS is required, values remain uncommitted, partial configuration fails
closed, and the production bundle scan proves both names remain outside client output. The hosted
London project remains unchanged and synthetic-only; the owner retains migration and deployment
authority.

## Verification

| Gate                                                     | Result                                          |
| -------------------------------------------------------- | ----------------------------------------------- |
| Local migration reset and synthetic seed                 | Pass                                            |
| pgTAP schema, UUID, FK, RLS, privilege and fixture suite | 26/26 pass                                      |
| Supabase database lint at error level                    | Pass                                            |
| ESLint and strict TypeScript                             | Pass                                            |
| Vitest repository suite                                  | 11 files, 58 tests pass                         |
| Playwright desktop/mobile regression matrix              | 50/50 pass                                      |
| Production build and client-bundle secret-name scan      | Pass                                            |
| Production dependency audit                              | No vulnerabilities found                        |
| Formatting and whitespace                                | Pass after generated `supabase/.temp` exclusion |

## Debt Disposition

- Task 5.6 is Completed. TD-014 remains **In progress** because no approved state-changing command,
  transaction, idempotency or concurrency implementation exists; Task 5.9 owns that proof.
- TD-016 remains **In progress** because hosted migration, lifecycle workflows, off-site exports,
  restore/reconciliation and a complete synthetic data-subject exercise remain Task 5.13 work.
- TD-019 remains **Verified** for the extended optional Supabase boundary. No credential was added
  to Git, documentation, logs or browser output.

## Revalidation Finding

The initial full local Supabase stack exhausted Docker resources after applying and seeding the
migration. A clean PostgreSQL-only rerun proved the database work was intact, but a direct privilege
query exposed Supabase default `service_role` grants beyond `SELECT`. Before commit, the migration
was tightened to revoke every service-role object privilege and re-grant only `SELECT`; pgTAP now
checks the complete `anon`, `authenticated`, and `service_role` privilege matrix. The reduced stack
is also the CI path, avoiding unnecessary services while preserving the Task 5.6 proof boundary.

## References

- [Sprint 05 plan](../sprint-05-data-security-operations.md)
- [Environment and secret runbook](../../../06-operations/environment-secrets-runbook.md)
- [Supabase local development](https://supabase.com/docs/guides/local-development)
- [Supabase database testing](https://supabase.com/docs/guides/local-development/testing/overview)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
