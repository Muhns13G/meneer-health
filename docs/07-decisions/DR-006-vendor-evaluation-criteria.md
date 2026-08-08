---
decision_id: DR-006
title: Vendor Evaluation and Exit Criteria
status: approved
accountable_owner: Octothorp ZA architecture owner
implementation_owner: Octothorp ZA technology and operations owners
required_approvers:
  [
    architecture_owner,
    privacy_owner,
    security_owner,
    data_owner,
    commercial_owner,
    operations_owner,
    release_owner,
  ]
effective_date: 2026-08-08
supersedes: null
related_debt: [TD-012, TD-013, TD-019, TD-020, TD-045, TD-054, TD-055]
last_updated: 2026-08-08
---

# DR-006 — Vendor Evaluation and Exit Criteria

## Context and Scope

Meneer needs managed data, identity, object storage, email, payment, communications, clinical,
pharmacy, delivery, and observability capabilities before transactional activation. Existing
shortlists mention Supabase, Neon, Brevo, Stripe, and Cloudflare services, but a shortlist or product
integration is not approval.

This record defines repeatable hard gates, scoring, evidence, approval, provisioning, and exit
requirements. It does not select a vendor. Features, regions, pricing, legal terms, security claims,
and product availability must be reverified from current authoritative sources at evaluation time.

## Decision

Every vendor that may receive production data, credentials, workflow authority, or operational
dependency must pass the applicable hard gates and evidence review below. A high convenience or
price score cannot override a failed privacy, security, clinical, regulatory, portability, or
recovery gate.

Provider evaluation is service-specific. Selecting one vendor's database does not automatically
approve its identity, storage, functions, analytics, email, AI, or other products.

## Service Categories

| Category                         | Candidate purpose                                                    | Required portability boundary                                                                             |
| -------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| PostgreSQL                       | DR-005 relational system of record                                   | Standard migrations, complete export/restore, ordinary connection path, no provider-only domain authority |
| Identity                         | Patient/professional/workforce authentication and service identities | Stable internal subject mapping; export/transition plan; permissions remain server/domain owned           |
| Object storage                   | Documents and binary objects                                         | Portable objects plus metadata/checksums; lifecycle and deletion reconciliation                           |
| Transactional email/SMS/WhatsApp | Verification, recovery and generic workflow notifications            | Outbox/retry/reconciliation; message content non-authoritative and minimised                              |
| Payments                         | Payment source evidence, refunds and disputes                        | Internal commerce ledger; signed/replay-safe adapters; export and reconciliation                          |
| Video/scheduling                 | Consultation coordination                                            | Internal appointment/encounter references; provider recording disabled unless approved                    |
| Clinical/laboratory/pharmacy     | Professional evidence and fulfilment hand-offs                       | Verified authority, minimum-data contract, attribution, reconciliation and termination return             |
| Courier                          | Custody/delivery evidence                                            | Internal fulfilment state; scoped addresses/tracking; exception and deletion process                      |
| Observability/support            | Reliability and incident response                                    | Redaction, regional/retention controls, least privilege, export; no raw health payloads                   |

## Non-Negotiable Hard Gates

| Gate                         | Required evidence before production use                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legal and service authority  | Correct contracting entity, applicable licence/authority, acceptable-use fit, DPA/service terms, liability and termination review                           |
| Privacy and data map         | Documented purpose, roles, fields, data flow, subprocessors/onward transfers, approved cross-border basis, rights/deletion procedure                        |
| Security                     | Independent assurance appropriate to risk, encryption, key/secret controls, MFA/RBAC, access/audit logs, vulnerability and incident process                 |
| Isolation                    | Separate environments and credentials; tenant/subject/resource enforcement; service-role and support-access controls tested                                 |
| Portability and exit         | Complete documented export, standard formats/contracts, credential revocation, deletion certificate/process, migration assistance and tested restore/import |
| Reliability and recovery     | Published/contracted availability, backup/recovery design, status/incident communication, support escalation, failure-mode and restore evidence             |
| Clinical/professional safety | Verified professional/pharmacy authority where applicable; no vendor workflow may override clinical decision authority                                      |
| Commercial viability         | Approved pricing basis, forecast and limits, currency/tax/billing owner, overage alerts, suspension/export consequences                                     |

A gate may be marked `pass`, `conditional`, or `fail`. `Conditional` requires a named owner,
deadline, compensating control, residual-risk approval, and activation block. Production provisioning
requires every applicable gate to pass; unresolved high-impact conditions are failures.

## Weighted Comparison

After hard gates pass, compare candidates using the same evidence period and workload assumptions:

| Criterion                          | Weight | Evaluation focus                                                                           |
| ---------------------------------- | -----: | ------------------------------------------------------------------------------------------ |
| Privacy, legal and data location   |     20 | Roles, regions, transfers, subprocessors, rights, deletion, contract terms                 |
| Security and access control        |     20 | Identity, least privilege, auditability, encryption, secrets, assurance, incident response |
| Portability and exit               |     15 | Standards, exports, restore/import, provider-specific coupling, migration support          |
| Reliability, backup and recovery   |     15 | Failure modes, availability, recovery point/time evidence, status and support              |
| Product fit and integration effort |     10 | Required v1 capability, standards, Cloudflare/TanStack fit, Next.js/Laravel portability    |
| Operations and observability       |     10 | Monitoring, reconciliation, admin controls, support workflow, change management            |
| Commercial sustainability          |      5 | Pilot/public/scale cost, limits, overages, billing predictability                          |
| Performance and location           |      5 | Measured South African latency, approved region, connection behaviour and scaling          |

Score each criterion from 0–5 with linked evidence and multiply by its weight. The score informs the
decision but does not replace domain approval or hard gates. Record trade-offs and rejected options,
not merely a winner.

## Required Evaluation Pack

Each selection record must include:

1. Exact service/product, plan, region, environment, account owner, contracting entity, and intended data classes.
2. Current architecture/data-flow diagram and DR-003/DR-004/DR-005 boundary mapping.
3. Hard-gate matrix with direct authoritative evidence, review date, approver, gaps, and expiry.
4. Weighted comparison against at least one credible alternative or a justified sole-source case.
5. Current pricing/limits model for pilot, public launch, and one growth scenario.
6. Threat/failure assessment covering outage, breach, credential compromise, account suspension,
   provider change, delivery duplication/loss, and regional unavailability.
7. Synthetic proof of connection, least privilege, export, import/restore, retry, reconciliation,
   deletion, monitoring, and credential rotation where applicable.
8. Exit runbook naming export format, data/metadata completeness, cutover, rollback, revocation,
   residual copies/backups, deletion confirmation, time, cost, and owner.
9. Domain approvals and a re-evaluation date.

## Provisioning and Environment Rules

- Research and synthetic-data proof may occur before final selection in isolated non-production
  accounts. Real personal, health, clinical, payment, or private partner data may not.
- The repository owner controls provisioning approval. Production uses company-owned accounts,
  named administrators, MFA, least privilege, billing/limit alerts, and documented recovery access.
- Local, preview/staging, and production use separate projects, credentials, webhooks, storage,
  queues, sender identities, and datasets. Production credentials never enter `VITE_*`, Git, build
  logs, client bundles, screenshots, or committed fixtures.
- Infrastructure settings that affect security, privacy, data flow, or recovery are versioned as
  code where supported or captured as owner-controlled evidence when not exportable.
- Provider auto-injection, analytics, tracking, AI processing, recording, or data reuse is disabled
  unless explicitly reviewed and approved.

## Portability and Lock-In Budget

Approved convenience may use provider features, but the following remain portable:

- DR-004 contracts, identifiers, state meaning, validation, errors, idempotency, and audit semantics;
- ordinary PostgreSQL migrations and complete relational exports under DR-005;
- object bytes plus metadata, checksums, ownership, classification, and lifecycle status;
- provider-neutral notification/payment/integration ports and durable reconciliation records; and
- synthetic fixtures, contract tests, journey tests, and migration evidence.

Provider-native functions, policies, queues, branches, edge runtimes, or auth metadata require a
documented adapter and exit mapping. A proprietary feature that becomes the sole definition of a
clinical rule, permission, consent, or authoritative state fails this decision.

## Category-Specific Minimums

### PostgreSQL and storage

- Standard connection/export/restore, versioned migrations, transaction/concurrency support,
  least-privilege roles, encryption, monitored backups, recovery test, and predictable limits.
- Any browser-accessible data API or storage path is denied by default and independently authorised;
  authentication alone is not row/object authorisation.

### Identity

- Verified contact, secure recovery, session revocation, MFA for privileged roles, anti-abuse,
  audit logs, service identities, account export/deletion, and stable mapping to internal subjects.
- Vendor roles/metadata do not replace DR-007 server-side permissions.

### Transactional messaging

- SPF/DKIM/DMARC where applicable, generic content, tracking disabled unless approved, suppression
  and bounce controls, outbox/retry/reconciliation, delivery logs with bounded retention, and sender
  transition plan. Messages are never the clinical or order system of record.

### Clinical, pharmacy and fulfilment partners

- Verified legal/professional identity and scope, approved data-sharing purpose/fields, attributed
  decisions, incident/adverse-event and recall procedures, custody evidence, service expectations,
  exception handling, record return/deletion, and safe termination.

## Current Shortlist Disposition

- Supabase and Neon remain candidate PostgreSQL services; neither is approved or provisioned by this record.
- Supabase Auth or another dedicated identity provider is evaluated separately under DR-007 and this record.
- Brevo remains one candidate for generic transactional email; it is unnecessary until an approved
  journey requires email and passes the messaging gates.
- Cloudflare remains the approved v1 host, not automatic approval for database, storage, analytics,
  AI, queue, or other data services.
- Stripe direction under DR-002 still requires its own activation, security, commercial, and
  reconciliation evidence.
- A credible South African-hosted alternative should be included where available and comparable;
  location alone does not waive security, reliability, or portability requirements.

## Consequences and Risks

- No production data vendor is selected in Task 3.6; Sprint 05 provisioning remains blocked until
  the exact data map, Task 3.8 lifecycle/identity decisions, and vendor evaluation pass.
- Vendor features and terms change. Evidence expires at selection, material change, annual review,
  security incident, or framework migration and must be refreshed.
- Using fewer vendors reduces integrations but can concentrate outage, access, contractual, and
  exit risk; bundle convenience is scored, not assumed beneficial.
- Free tiers may support synthetic evaluation but do not prove production recovery, support,
  compliance, or predictable scale.

## Implementation and Verification

- Evaluation owner: Octothorp ZA architecture/data owners.
- Account/provisioning owner: repository owner until delegated through DR-008.
- Acceptance evidence: hard gates, weighted rubric, evaluation pack, environment rules, portability
  budget, category minimums, shortlist disposition, and Task 3.6 evidence.
- Rollback: do not provision or send production data; if a selected vendor later fails a gate,
  freeze expansion, preserve records, execute the approved exit plan, reconcile, revoke, and obtain
  deletion/termination evidence.

## Affected Documents

- `docs/05-future-considerations/postgres-auth-email-vendor-strategy.md`
- `docs/02-implementation-plans/phase-01/sprint-03-operating-model-architecture.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/03-platform-evolution.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`

## Approval

| Approver role                                         | Evidence/reference                                                                    | Decision                                   | Date       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------ | ---------- |
| Architecture/data/repository owner                    | Owner requested Task 3.6 implementation with portable framework evolution             | Approved evaluation method                 | 2026-08-08 |
| Privacy/security/commercial/operations/release owners | DR-008 review boundary; each actual provider requires a separate completed evaluation | Criteria approved; vendor approval pending | 2026-08-08 |

## Review Trigger

Review before any production-capable vendor is selected or provisioned, before sharing a new data
class, on material region/term/subprocessor/price/security changes, after an incident or failed exit
test, annually while active, and before Next.js or Laravel migrations.
