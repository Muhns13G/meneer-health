---
evidence_id: phase-02-sprint-08-9-hosted-pilot-baseline-evidence
title: Hosted Pilot Baseline and Migration Reconciliation Evidence
status: completed
task: 8.9
source_commit: 5364cdb
observed: 2026-10-02
completed: 2026-10-02
owner: "@Muhns13G"
---

# Sprint 08.9 — Hosted Pilot Baseline Evidence

## Outcome

The repository owner authorised a hosted synthetic reset after a redacted inventory proved that the
linked Supabase project contained no public user or client data. The reset replayed all 16 committed
migrations without the local seed. Hosted state now contains one suspended `meneer-pilot` tenant,
the 12 migration-defined fulfilment provider gates, and no Auth users, subjects, contacts,
memberships, workflows, payments, orders, fulfilment records, measurement records or audit events.
No person, health, protocol, payment or delivery data was created.

## Authority and Safety Boundary

- Project: `meneer-health` (`gibfpolrdjotwvewgfsz`), West Europe (London).
- The owner authorised destructive reset only after confirming that any stored rows were synthetic.
- Pre-reset inventory found zero Auth users and contacts. The only subjects used the three expected
  synthetic fixture identifiers; the remaining rows were migration/fixture governance evidence.
- `supabase db reset --linked --no-seed` was used so local test fixtures could not enter hosted
  state. Credentials and row contents were excluded from command output and committed evidence.
- The pilot tenant is deliberately `suspended`; a later release task must explicitly activate it.

## Reset Deviation

The first replay stopped after migration four because an orphaned `public.audit_event_sequence`
survived the provider reset cleanup. Read-only inspection confirmed it was a PostgreSQL-owned
sequence with no application data attached and that the partial reset had left all application and
Auth tables empty. The sequence alone was dropped with `CASCADE`, then the same controlled reset
was rerun successfully through all 16 migrations. No broader manual schema repair was performed.

This exposes a provider-reset edge case, not application data loss. The committed migrations remain
the complete rebuild authority, and linked local/remote migration versions now match exactly.

## Hosted Verification

| Check                             | Result                                                           |
| --------------------------------- | ---------------------------------------------------------------- |
| Local/remote migration parity     | 16 of 16 exact                                                   |
| Auth users                        | 0                                                                |
| Suspended pilot tenants           | 1 (`meneer-pilot`)                                               |
| Service-readable non-empty tables | `tenants: 1`, `fulfilment_provider_gates: 12`                    |
| Operational and audit records     | 0                                                                |
| Anonymous tenant read             | Denied with 401/403                                              |
| Inactive checkout/API mutations   | Hidden with 404; no CORS                                         |
| Measurement endpoints             | Default-off; no cookie, CORS or echoed canary                    |
| Retired MCP surface               | Five probes returned ordinary/stable denial; no protocol payload |

The guarded `test:baseline:hosted` command validates the exact project hostname, redacted counts,
tenant identity/status, zero Auth identities and anonymous denial. It does not log row content.

## Advisor Review

Supabase security advisors returned no warning or error. Thirty-seven informational
`rls_enabled_no_policy` notices reflect the intentional server-owned, deny-all browser posture:
every application table has RLS enabled, while public client policies remain absent until an
approved journey needs one.

Performance advisors returned informational notices for 20 unindexed foreign keys and 31 unused
indexes. With no users or workload, removing indexes or adding speculative indexes would not be
evidence-based. Re-run the advisors after the Sprint 09–13 access paths and representative query
plans exist; promote a notice into technical debt only when a measured workload or query plan
demonstrates a problem.

## Validation Evidence

- Local database replay: 16 migrations plus synthetic seed passed.
- pgTAP: 11 files, 338 assertions passed.
- Database lint and local database advisors: no errors.
- Synthetic Auth, authorisation, commands, audit, security-evidence, lifecycle, payments,
  fulfilment and measurement integrations: passed.
- Vitest: 58 files, 324 tests passed.
- Formatting, ESLint, strict TypeScript, portability and diff checks: passed.
- Hosted baseline, request-security, default-off measurement and MCP-absence exercises: passed.

## Residual Boundary

This task supplies a clean database baseline only. It does not enable public signup, profiles,
consent, client/staff access, payments, provider callbacks, measurement or protocol integration.
Sprint 09 must create the first approved identity/profile path with its own RLS and hosted evidence.
The external product, legal, clinical and operational gates recorded elsewhere remain unchanged.
