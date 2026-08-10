---
evidence_id: phase-01-sprint-05-task-10
title: Sprint 05.10 Audit and Integration Evidence
status: verified-task-evidence
date: 2026-08-10
source_parent: 3ccea7f
owner: "@Muhns13G"
related_debt: [TD-015]
---

# Sprint 05.10 Audit and Integration Evidence

## Mission and Boundary

Implement append-only audit facts, transactional inbox/outbox evidence, safe correlation,
purpose-bound review and tamper detection without enabling a customer route, provider callback,
delivery worker or hosted database migration. Task 5.12 separately owns scheduled monitoring and
incident alerts; Tasks 5.13–5.15 own lifecycle/export and real gated provider evidence.

## Implemented Outcome

- Portable `audit.fact`, `workflow.transitioned`, and `integration.received` version-1 contracts
  define minimum safe facts independently of TanStack, Supabase and provider payloads.
- The audited workflow RPC wraps Task 5.9's internal state primitive. Workflow state, idempotency
  receipt, hash-chained audit fact and minimum outbox event commit or roll back together. Exact
  replay creates no duplicate audit or outbox evidence.
- Audit facts carry tenant, actor/service, role, assurance, action, opaque subject/resource,
  purpose, policy version, outcome, safe reason, correlation, causation and timestamps. Metadata is
  size-limited, flat and allow-listed; questionnaire, message, credential, payment and provider
  payload content is rejected.
- Each tenant's audit append serializes through a chain head. Ordinary update/delete operations are
  blocked; recomputation detects a privileged storage change. This is tamper evidence, not an
  external WORM guarantee.
- Inbox receipts retain only provider/event identity, environment, payload fingerprint, service
  identity, correlation and safe metadata. Exact replay deduplicates and changed replay conflicts.
- Audit evidence has no direct table grant. A server-resolved, assigned auditor with
  `privacy_review` purpose and AAL2 may request at most 100 safe facts; the review and chain result
  are themselves appended as evidence. Browser roles remain denied.
- The runbook defines daily/next-business-day/weekly/monthly review gates, DR-005 retention,
  incident handling and current export/lifecycle limitations.

## Verification

| Gate                                                               | Result             |
| ------------------------------------------------------------------ | ------------------ |
| Fresh five-migration reset and deterministic synthetic seed        | Pass               |
| pgTAP schema, atomicity, replay, privilege and tamper suite        | Pass (184/184)     |
| Database lint plus Supabase security/performance advisors          | No issues found    |
| Live audit, inbox, outbox, AAL2 review and browser-denial run      | Pass               |
| Existing identity, authorisation and command integrations          | Pass               |
| Vitest contract, service and adapter suite                         | Pass (144/144)     |
| TypeScript, ESLint and Prettier                                    | Pass               |
| Production build, route-tree canary and Cloudflare upload dry run  | Pass               |
| Bun dependency audits (all and production)                         | No vulnerabilities |
| Playwright desktop/mobile route, boundary and accessibility matrix | Pass (50/50)       |
| Hosted Supabase and customer-facing routes                         | Unchanged          |

## Decision and Deviation

The original plan uses “immutable audit” as a desired property. PostgreSQL privileges,
append-blocking triggers and a serialized SHA-256 chain provide strong application-level
append-only and tamper-detection controls, but cannot truthfully guarantee immutability against a
database superuser who can rewrite the entire chain and head. The runbook records this limit and
keeps external anchoring/WORM as a risk-based activation decision.

No outbox delivery worker or raw provider callback was added. Creating either before an approved
provider contract, signature boundary, rate controls and observability would cross Tasks
5.11–5.15. The current outbox is durable pending evidence; the inbox is a synthetic
fingerprint-only receipt boundary.

## Debt Disposition

- Task 5.10 is **Completed** with local/synthetic audit, review, inbox and outbox evidence.
- TD-015 becomes **In progress** rather than Verified. Every future enabled consent, clinical,
  payment, administrative, export and partner action must emit approved evidence. Tasks 5.12–5.15
  must add monitoring, lifecycle/export and real provider scenarios before closure.
- No public route or hosted Supabase state changed.

## References

- [Sprint 05 plan](../sprint-05-data-security-operations.md)
- [Audit and integration evidence runbook](../../../06-operations/audit-integration-evidence-runbook.md)
- [DR-004 framework-neutral contracts](../../../07-decisions/DR-004-framework-neutral-contracts-migration.md)
- [DR-005 data, retention and audit](../../../07-decisions/DR-005-data-tenancy-lifecycle-migration.md)
- [DR-007 identity and audit access](../../../07-decisions/DR-007-identity-authorisation-architecture.md)
- [Task 5.9 command evidence](sprint-05-9-validated-workflow-commands-evidence.md)
