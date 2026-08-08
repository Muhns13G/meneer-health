---
decision_id: DR-005
title: Data, Tenancy, Lifecycle, and Migration Model
status: approved
accountable_owner: Octothorp ZA data owner
implementation_owner: Octothorp ZA technology owner
required_approvers:
  [data_owner, privacy_owner, security_owner, clinical_owner, operations_owner, release_owner]
effective_date: 2026-08-08
supersedes: null
related_debt: [TD-012, TD-015, TD-016, TD-054, TD-055]
last_updated: 2026-08-08
---

# DR-005 — Data, Tenancy, Lifecycle, and Migration Model

## Context and Scope

The current application has no datastore, schema, tenancy enforcement, backup, or data-subject
workflow. DR-003 defines state ownership and DR-004 defines portable contracts. This record chooses
the durable storage model, logical schemas, isolation rules, lifecycle states, and migration/restore
ownership that later implementation must follow.

This decision does not select Supabase, Neon, Cloudflare, an identity provider, or an email vendor.
DR-006 governs provider selection. Task 3.8 adds a conservative internal lifecycle baseline grounded
in current primary sources; it does not claim that the baseline exhausts every legal, professional,
contractual, dispute, or partner-specific obligation.

### Explicit Unknowns and Gates

- `[TBC — owner: PRIVACY OWNER — gate: transactional activation]`: responsible party/operator
  allocation, lawful-purpose register, provider-specific cross-border basis, and confirmation that
  the approved baseline applies to the final data map and parties.
- `[TBC — owner: CLINICAL OWNER — gate: transactional activation]`: confirmation of the baseline and
  any longer clinical-record, prescription, questionnaire, adverse-event, professional-record, or
  hold requirement for the final pathway.
- `[TBC — owner: DATA/SECURITY OWNERS — gate: provider selection]`: approved region, encryption/key
  controls, backup type, evidence that the approved recovery objectives are achievable, availability,
  support, and breach terms.
- `[TBC — owner: BUSINESS/PRIVACY OWNERS — gate: partner activation]`: tenant/client definition and
  data-controller/operator roles if Meneer later serves multiple businesses or clinical partners.

## Options Considered

| Option                                                        | Benefits                                                                               | Costs and risks                                                                              | Disposition                   |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------- |
| Browser/local state or documents as system of record          | Minimal setup                                                                          | No durability, isolation, concurrency, audit, recovery, or credible migration                | Rejected                      |
| Provider-specific document/edge database as the primary model | Fast provider integration                                                              | Greater lock-in and weaker fit for relational workflow integrity and later Laravel migration | Rejected as primary authority |
| Portable PostgreSQL plus encrypted object storage             | Relational integrity, transactions, migrations, exportability, broad framework support | Requires careful access design, operations, and separate binary storage                      | Approved                      |

## Decision

Meneer's transactional system of record will use a supported, managed **PostgreSQL-compatible
database**. Large binary objects that do not belong in relational rows use approved encrypted object
storage; PostgreSQL retains their metadata, ownership, classification, integrity reference, and
lifecycle state. Secrets use an approved secret manager and never the application database.

Caches, analytics, email, payment processors, identity providers, pharmacy systems, couriers, and
other partner systems are projections or source-evidence systems. They do not replace Meneer's
authoritative workflow records defined by DR-003.

Provider selection remains open. Any provider must pass DR-006 and preserve ordinary PostgreSQL
migrations, export/restore, canonical identifiers, and the DR-004 contracts.

## Logical Data Boundaries

Physical schema names may change during implementation, but ownership and cross-boundary rules may
not be weakened without superseding this record.

| Logical namespace    | Owns                                                                                  | Representative records                                                   |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `identity_access`    | Subjects, verified contacts, account status, tenant membership references             | subject, verified contact, membership, access state                      |
| `consent_governance` | Versioned notices, purposes, consent/withdrawal evidence                              | notice version, consent record, withdrawal, publication approval         |
| `intake_triage`      | Questionnaire versions, patient responses, submissions, corrections, routing outcomes | episode, questionnaire, response set, submission, triage outcome         |
| `clinical`           | Professionally authored encounters, decisions, prescriptions, follow-up facts         | encounter, attributed decision, prescription, amendment, follow-up       |
| `commerce`           | Versioned prices, payment attempts/evidence, ledger facts, refunds/disputes           | catalogue version, line item, payment reference, ledger entry, refund    |
| `orders_fulfilment`  | Orders, prerequisites, pharmacy hand-offs, stock/custody, shipments and exceptions    | order, order line, release evidence, custody event, shipment             |
| `support`            | Purpose-scoped cases, messages, assignments and escalation                            | support case, message reference, assignment, escalation                  |
| `integration`        | Idempotent inbox/outbox, provider references, delivery attempts and reconciliation    | inbound evidence, outbound message, checkpoint, reconciliation exception |
| `audit_governance`   | Append-only access, decision, command, configuration and privileged-change evidence   | audit event, review evidence, correlation reference                      |

Modules access another namespace through DR-004 commands/queries or approved read projections. They
must not update another module's private tables directly. Database roles and tests enforce this
boundary where the selected provider permits it.

## Core Entity and Identifier Rules

- Every durable entity has an opaque, globally unique, immutable internal identifier and explicit
  creation/update versions. Display labels, email addresses, phone numbers, provider IDs, and
  mutable business references are not primary identity.
- A patient subject is distinct from an authentication credential/account, clinician identity,
  partner identity, and tenant membership.
- External identifiers are stored as provider-scoped references with environment and provenance;
  they never replace internal identifiers.
- Monetary values use integer minor units plus ISO currency; timestamps are timezone-aware UTC with
  the original business timezone retained when legally or operationally material.
- Clinical and consent amendments append attributed versions or correction events. Accepted history
  is not overwritten.
- Soft deletion is not a universal substitute for approved deletion. Each class follows its
  lifecycle outcome, including irreversible erasure or approved de-identification where applicable.

## Tenancy and Isolation

v1 may operate one business tenant, but all tenant-scoped records must support an explicit immutable
`tenant_id` or equivalent scope from first transactional implementation. A later client, employer,
brand, clinical partner, or pharmacy relationship is not automatically a tenant and requires an
approved data-role and isolation decision.

1. The server derives tenant scope from authenticated membership/service identity, never from a
   trusted client-supplied field alone.
2. Every scoped command, query, index, uniqueness rule, repository operation, export, background
   job, and audit event carries and enforces tenant scope.
3. Shared reference data is explicitly classified as global; absence of `tenant_id` never silently
   means global access.
4. Cross-tenant access is denied by default. Privileged support or clinical access requires a
   purpose, permission, audit event, and the DR-007 break-glass rules where applicable.
5. Provider credentials, storage prefixes, cache keys, queues, logs, backups, and analytics must
   prevent cross-tenant disclosure, not merely database rows.
6. Automated tests must prove horizontal isolation before any second tenant/client is enabled.

## Data Classification and Storage Treatment

| Class                          | Examples                                                    | Required treatment                                                                             |
| ------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Public                         | Approved pages, policy publications, public metadata        | Versioned publication source; cache allowed; no private joins                                  |
| Internal                       | Operational configuration and non-patient planning          | Role limited; change history where release relevant                                            |
| Account/contact                | Name, contact, verification and account state               | Encrypted in transit/at rest; minimal projections; masked support access                       |
| Special personal/health intake | Symptoms, history, medication, questionnaire responses      | Strict purpose/field access; no public cache, analytics, email body, or general logs           |
| Clinical/professional          | Notes, decisions, prescriptions, attribution                | Clinical authority, append/correction history, strongest access and audit controls             |
| Commercial/payment             | Prices, line items, processor references, refunds           | No raw card data; financial integrity and reconciliation; separated from clinical payloads     |
| Operational/fulfilment         | Address, custody, delivery, support and exceptions          | Minimum role-specific projection; clinical details excluded unless explicitly required         |
| Audit/security                 | Access, command outcomes, privileged changes, correlations  | Append only, tamper evident, tightly restricted; safe metadata only                            |
| Secret/credential              | API keys, private keys, provider secrets, recovery material | Approved secret manager only; never source, database fixtures, logs, events, or client bundles |

## Lifecycle Model

Each record class moves only through approved lifecycle states:

`active` → `restricted` or `archived` → `pending_disposition` → `deleted` or
`irreversibly_deidentified`, with `legal_or_clinical_hold` able to pause disposition. A hold is
purpose-specific, authorised, reviewed, and audited; it is not indefinite storage by default.

The Task 3.8 baseline below is an internal release rule, not a universal legal conclusion. The
longest applicable legal, clinical, contractual, dispute, investigation, or approved hold period
controls. The privacy/clinical/legal owners must confirm the precise application to Meneer's final
roles and services before transactional activation.

| Data family                                       | Approved v1 trigger and period                                                                                                             | End-of-period treatment                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Public/versioned governance                       | Current version plus six years after supersession/withdrawal                                                                               | Preserve approved publication evidence; delete obsolete drafts unless linked to approval/incident evidence                          |
| Expired invitations and unsuccessful verification | 30 days after expiry; retain minimal abuse evidence for 12 months                                                                          | Delete contact/token payload; retain non-content security fact where required                                                       |
| Identity/contact/account                          | While active; 90 days after verified closure request unless linked to a retained record, open case, hold or security obligation            | Delete/de-identify profile/contact; retain opaque subject link and minimum closure evidence only where required                     |
| Consent/privacy-rights evidence                   | Longer of six years after final processing/withdrawal or the associated clinical/transaction record period                                 | Preserve version, purpose, action and outcome; remove unnecessary contact copies                                                    |
| Intake/triage/clinical/prescription/follow-up     | At least six years after the health record becomes dormant/last treatment; apply longer HPCSA/statutory exceptions                         | Restrict/archive under clinical custody; approved destruction or irreversible de-identification only after review                   |
| Commerce/tax/payment/refund                       | At least five years from the applicable return submission/tax-period trigger; longer for open audit, dispute, chargeback or hold           | Preserve required ledger/source evidence; remove unnecessary provider/raw payloads                                                  |
| Order/fulfilment/custody/delivery                 | Five years after completion/cancellation; clinically material evidence follows the clinical period                                         | Delete/de-identify address and excess tracking detail; preserve minimum transaction/custody evidence                                |
| General support                                   | 24 months after case closure; a complaint, clinical escalation, transaction dispute or incident follows that linked record's longer period | Delete ordinary message content/attachments; preserve minimum linked outcome and audit evidence                                     |
| Integration raw inbox/provider payload            | 30 days after verified reconciliation, unless an open exception/incident requires restriction                                              | Delete raw payload; retain normalised authoritative fact, idempotency proof and provider reference under the owning record's period |
| Notification delivery content                     | 30 days after final delivery/terminal failure; suppression/security facts up to 12 months                                                  | Delete message body and transient provider payload; retain minimum outcome/reference                                                |
| Authentication/access/security logs               | 12 months after event; confirmed incidents and privileged/break-glass evidence six years after closure                                     | Delete routine raw telemetry; preserve safe incident/audit evidence without health payload                                          |
| Audit facts                                       | Same period as the longest authoritative record evidenced, with a six-year minimum for clinical, rights and privileged-access facts        | Append-only restriction/archive, then approved destruction/de-identification where permitted                                        |
| Generated exports/temp files                      | Expire after 24 hours and delete within seven days; evidence of request/delivery follows its rights record                                 | Secure deletion and access-token revocation; exports never become an unmanaged archive                                              |
| Recovery backups                                  | Rolling maximum 35 days unless a separately approved immutable incident snapshot is required                                               | Expire automatically; a restore reapplies current deletion/restriction/hold state before release                                    |

No transactional collection begins while a collected class lacks an approved purpose, accountable
owner, access scope, retention trigger/period, correction/export/deletion treatment, hold rule,
backup treatment, and destination after pilot exit.

## Data-Subject and Record Procedures

- **Access/export:** verify the requester, identify tenant/purpose scope, gather authoritative
  records and intelligible provenance, exclude other subjects and privileged material, record review
  and delivery, and use a secure expiring channel.
- **Correction:** preserve original professional/audit history, append an attributed correction or
  amendment, propagate the corrected projection, and reconcile downstream recipients.
- **Deletion/objection:** assess applicable purpose, obligation, hold, and third-party records;
  record the decision; delete or de-identify approved data and propagate requests; never claim
  erasure while retained copies remain unexplained.
- **Withdrawal:** stop future processing for the withdrawn purpose without rewriting prior evidence;
  evaluate downstream workflows and notify affected processors where required.
- **Legal/clinical hold:** restrict disposition only for the documented scope and authority; review
  expiry and release, then resume the lifecycle schedule.

### Rights and disposition service targets

- Acknowledge a verified rights request within two business days, complete identity/scope checks
  within five business days, and target a reviewed response within 20 business days while always
  meeting any shorter or mandatory legal period.
- Generated exports use a secure expiring channel; ordinary email carries notification only.
- Execute approved deletion/de-identification within 30 calendar days after review, then reconcile
  processors, indexes, caches, queues, analytics and backup propagation.
- Review every hold at least every 90 days and on matter closure; release restores the original
  disposition clock rather than creating a new indefinite period.
- At pilot exit, inventory and disposition approval begins within five business days and completes
  before pilot data is reused for public launch.

Sprint 05 must prove one complete synthetic request and its audit trail in staging before TD-016 can close.

## Schema Migration, Backup, and Restore

1. Version-controlled migrations are the only production schema-change path. Manual console changes
   are prohibited except an authorised, documented emergency followed by reconciliation.
2. Use expand–migrate–reconcile–contract. Breaking changes require DR-004 contract majors and
   consumer readiness; destructive contraction occurs only after the rollback window.
3. Every migration identifies owner, affected classes/tenants/contracts, locking and performance
   risk, backup/restore point, forward/rollback procedure, validation queries, and approval.
4. Data transformations are deterministic, restartable, checkpointed, idempotent, and preserve
   identifiers, timestamps, provenance, versions, attribution, and audit correlation.
5. Automated encrypted backups and point-in-time recovery or an approved equivalent are required.
   Backup access is separate, monitored, and tested; backup existence is not restore evidence.
6. Restore drills use isolated staging, synthetic or appropriately protected data, integrity checks,
   reconciliation, and recorded actual recovery point/time. Production recovery objectives remain
   gated by provider evaluation and Task 3.8.
7. Rollback never discards accepted facts. If a prior application cannot safely read new records,
   restore is not a valid code rollback and a forward repair or compatible adapter is required.

### Approved v1 recovery targets

- Critical identity, consent, intake/clinical, payment, order/fulfilment and audit records: recovery
  point objective of no more than one hour and recovery time objective of no more than four hours.
- Non-critical public/content and internal planning records: recovery point of 24 hours and recovery
  time of one business day.
- Record actual results in quarterly synthetic restore drills and before pilot activation. A provider
  incapable of the critical target fails DR-006 unless a separately approved compensating design
  provides equivalent recovery.

## Pilot Exit and Cross-Generation Migration

At pilot exit, the data owner inventories every store, provider, export, backup, log, queue, cache,
and device. Each record class is explicitly retained, migrated, restricted, de-identified, or
deleted according to the approved schedule; pilot closure alone does not imply deletion or consent
for public-launch reuse.

Next.js and conditional Laravel/React generations preserve canonical identifiers, contract/state
meaning, schema history, consent/professional attribution, audit correlation, and lifecycle status.
Cutover follows DR-004 and proves row/entity counts, relationship integrity, safe checksums or
equivalent evidence, exception resolution, access isolation, and restore/rollback readiness.

## Security and Privacy Controls

- Encrypt every connection and stored volume/object; approve key ownership, rotation, recovery, and
  personnel access before production provisioning.
- Use least-privilege application, migration, backup, analytics, support, and integration identities.
- Separate production from local/test/staging projects, credentials, storage, queues, and datasets.
  Non-production uses synthetic data by default.
- Prevent sensitive database responses from entering public caches, client logs, error trackers,
  analytics, build output, or source control.
- Record and review privileged reads, exports, migrations, restores, configuration changes, and
  lifecycle actions without copying raw health content into audit metadata.

## Consequences and Risks

- PostgreSQL is approved as the durable relational model; the managed provider and region remain open.
- Task 3.8 approves the v1 retention and recovery baseline. Named legal/privacy/clinical confirmation
  of final roles and any longer exception remains an activation gate.
- TD-016 remains open until Sprint 05 proves a staging restore and complete synthetic data-subject request.
- Sprint 05 must create actual schemas, migrations, database roles/policies, backups, restore proof,
  data-subject automation/evidence, and isolation tests.
- A nominal PostgreSQL provider can still create lock-in through identity, edge functions, RLS,
  extensions, storage, or proprietary branching; DR-006 evaluates the complete dependency.

## Implementation and Verification

- Implementation owner: Octothorp ZA technology owner under data/privacy/security approvals.
- Acceptance evidence: logical namespaces, entity/identifier rules, tenancy controls, classification,
  lifecycle model, data-subject procedures, migration/backup/restore rules, and Tasks 3.6/3.8 evidence.
- Rollback: supersede the decision and migrate through DR-004; never swap providers or schemas by
  deleting accepted records.

## Affected Documents

- `docs/00-blueprints/master-blueprint-v1.md`
- `docs/02-implementation-plans/phase-01/sprint-03-operating-model-architecture.md`
- `docs/02-implementation-plans/phase-01/annexures/sprint-03-8-architecture-validation-evidence.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/05-future-considerations/postgres-auth-email-vendor-strategy.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/03-platform-evolution.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`

## Approval

| Approver role                                       | Evidence/reference                                                                                                       | Decision                                       | Date       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------- |
| Data/architecture/repository owner                  | Owner-approved portable evolution and requested Task 3.6 implementation                                                  | Approved data and tenancy architecture         | 2026-08-08 |
| Privacy/security/clinical/operations/release owners | Task 3.8 validation and DR-008 review boundary; final role/provider application and implementation evidence remain gated | Baseline approved; activation evidence pending | 2026-08-08 |

## Source Basis

- [Protection of Personal Information Act 4 of 2013](https://www.justice.gov.za/legislation/acts/2013-004.pdf), especially section 14's purpose-limited retention, restriction and destruction/de-identification requirements.
- [Information Regulator retention/disposal procedure](https://inforegulator.org.za/wp-content/uploads/2020/07/Procedures-for-making-information-electronically-available.pdf), used as schedule-design guidance.
- [HPCSA Booklet 9: Guidelines on the Keeping of Patient Health Records](https://www.hpcsa-blogs.co.za/wp-content/uploads/2022/11/Booklet-9-Keeping-of-Patient-Records_Review-Draft_-FINAL_Sept-2022.pdf), including the general six-year dormant-record minimum and longer exceptions.
- [SARS record-keeping guidance](https://www.sars.gov.za/client-segments/record-keeping/), including the general five-year tax-record rules and longer audit/dispute cases.

## Review Trigger

Review before collecting transactional data, selecting/provisioning a provider, adding a tenant or
data class, changing purpose/retention/residency, after a security or restore failure, at pilot exit,
and before every datastore or framework migration.
