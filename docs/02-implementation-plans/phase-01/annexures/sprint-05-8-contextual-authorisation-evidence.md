---
evidence_id: phase-01-sprint-05-task-08
title: Sprint 05.8 Contextual Authorisation Foundation
status: verified-task-evidence
date: 2026-08-10
source_parent: 54550ec
owner: "@Muhns13G"
related_debt: [TD-013]
---

# Sprint 05.8 Contextual Authorisation Foundation

## Mission and Boundary

Implement the approved deny-default server authorisation boundary and prove horizontal and vertical
isolation across tenant, subject, role, action, assignment, purpose, workflow state, authentication
assurance, suspension and expiry. This task does not activate an authenticated route, migrate the
hosted Supabase project, implement break glass or audit persistence, or enable a transaction.

## Implemented Outcome

- A provider-neutral, versioned policy engine evaluates eight human roles against eleven governed
  resource classes and explicit create/read/update/transition/assign/export/approve/administer/append
  actions. Missing cells and relationships deny access.
- Every decision requires an active subject, tenant, time-bounded membership and session, matching
  tenant, approved purpose/state, required assurance and either ownership or a current assignment.
- Resource context carries a non-serialisable server-resolution marker; raw client-shaped owner,
  workflow or purpose data is rejected before policy evaluation.
- The decision returns only the approved projection (`own`, `status`, `clinical`, `dispensing`,
  `operations`, `support`, `evidence` or `configuration`), not a general data grant.
- Service identities require a current unrevoked 32-byte credential digest plus an exact tenant,
  environment, purpose and resource/action scope. Human and provider claims do not become domain
  authority.
- A server-only Supabase repository resolves sessions, subjects, tenants, memberships, assignments
  and service scopes. Provider failures become one stable application error.
- The third migration adds workforce membership validity/approval evidence and a constrained,
  indexed assignment registry. RLS remains forced; `anon` and `authenticated` have no privileges or
  policies, while `service_role` can only read assignments.
- CI runs the live synthetic authorisation proof after the existing managed-identity lifecycle.

## Verification

| Gate                                                               | Result             |
| ------------------------------------------------------------------ | ------------------ |
| Frozen Bun install                                                 | Pass               |
| Fresh three-migration reset and deterministic synthetic seed       | Pass               |
| pgTAP schema, constraints, RLS, grants and assignment controls     | Pass (89/89)       |
| Database lint plus Supabase security/performance advisors          | No issues found    |
| Existing managed-identity lifecycle regression                     | Pass               |
| Live contextual authorisation and browser-denial lifecycle         | Pass               |
| Vitest policy, adapter, horizontal and vertical boundary suite     | Pass (115/115)     |
| TypeScript, ESLint and Prettier                                    | Pass               |
| Production build, route-tree canary and Cloudflare upload dry run  | Pass               |
| Bun dependency audits (all and production)                         | No vulnerabilities |
| Playwright desktop/mobile route, boundary and accessibility matrix | Pass (50/50)       |
| Hosted Supabase and customer-facing routes                         | Unchanged          |

The live proof allows an own patient read and an assigned operations update, then denies a
cross-subject read, cross-tenant context, patient clinical approval, missing assignment,
cross-environment service use and direct browser access to assignment evidence.

## Debt Disposition

- Task 5.8 is **Completed** with local/synthetic server-authorisation evidence.
- TD-013 remains **In progress** only for separately planned privileged break-glass, persistent
  decision-audit, abuse-control and activation evidence. The ordinary role/action/contextual matrix
  and horizontal/vertical boundary requirement are implemented.
- No authenticated customer journey, provider-backed preview or hosted migration is activated.

## References

- [Sprint 05 plan](../sprint-05-data-security-operations.md)
- [DR-007 identity and authorisation architecture](../../../07-decisions/DR-007-identity-authorisation-architecture.md)
- [Task 5.7 identity evidence](sprint-05-7-managed-identity-evidence.md)
- [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
