---
evidence_id: sprint-03-8-architecture-validation
sprint: 03
task: 3.8
status: validated-with-gates
date: 2026-08-08
primary_debt: [TD-016]
validated_debt: [TD-009, TD-010, TD-011, TD-012, TD-013, TD-016, TD-050, TD-054]
---

# Sprint 03 Task 3.8 — Architecture Validation Evidence

## Mission

Validate the approved operating, commercial, platform, contract, data, vendor, identity and
governance decisions as one coherent model. Walk required success/failure journeys, challenge
responsibility and permission boundaries, approve the v1 lifecycle baseline, and identify every
remaining activation or implementation gate before Sprint 03 closure.

## Inputs and Boundary

Validation covers DR-001 through DR-008, the controlled-pilot charter, master blueprint, technical
debt registry, current RAG corpus, and the non-transactional source/runtime boundary. It is a design
and consistency validation: no backend, database, identity, integration, or transactional journey
exists to exercise yet.

## Validation Method

1. Map each workflow state to exactly one authoritative module and accountable operating role.
2. Map each role/action to DR-007 permission, tenant, assignment, purpose and assurance checks.
3. Map each data class to purpose, owner, storage class, access, retention, disposition and recovery.
4. Check each cross-boundary contract for owner, runtime validation, error, idempotency,
   concurrency, compatibility, privacy classification and reconciliation.
5. Walk happy, rejection, urgent, failed-payment, fulfilment-exception, support-escalation,
   data-subject, incident and framework-migration scenarios.
6. Threat-model identity, tenant isolation, privileged access, integration credentials, exports and migration.

## Cross-Record Consistency

| Concern                                     | Authoritative decision | Validation result                                                                                        | Residual gate                                                                   |
| ------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Brand, operator and professional separation | DR-001                 | Consistent: Meneer/Octothorp cannot diagnose, prescribe or dispense                                      | Contracting/data roles, verified parties and urgent channel remain TD-009 gates |
| Pricing, payment, refund and fulfilment     | DR-002                 | Consistent: explicit line items and independent states prevent payment-driven clinical authority         | Prices, tax/merchant, terms, Stripe and operating evidence remain TD-010 gates  |
| Channels, modules and state ownership       | DR-003                 | Complete and non-overlapping at logical level                                                            | Sprint 05 implementation and dependency tests                                   |
| Commands, queries, events and migration     | DR-004                 | All required families have owner/version/safety/compatibility rules                                      | Schemas, adapters, fixtures and tests remain TD-014/TD-055                      |
| Data, tenancy and lifecycle                 | DR-005                 | Every module maps to a namespace; Task 3.8 adds baseline periods, rights targets and recovery objectives | Final domain application plus Sprint 05 restore/rights evidence remain TD-016   |
| Vendor evaluation and exit                  | DR-006                 | Hard gates prevent hosting/bundle/score from bypassing privacy, security or portability                  | Exact providers/plans/regions remain unselected                                 |
| Identity and authorisation                  | DR-007                 | Every human/service role maps to explicit actions, scopes, MFA/session/recovery and audit rules          | Named role holders/provider and Sprint 05 access tests remain TD-013            |
| Governance and approvals                    | DR-008                 | Domain, repository and release approvals remain separate with stop authority                             | Private role-holder appointments and release evidence remain capability gates   |

## Responsibility, Permission, and State Validation

| State/action                   | State owner                                                       | Accountable operating authority                                   | Permitted actor/service                                                 | Explicitly denied                                                     |
| ------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Cohort/access decision         | Identity/access                                                   | Business/access owner                                             | Access service or authorised access administrator                       | Marketing page, browser flag, patient self-award                      |
| Contact/account verification   | Identity/access                                                   | Security/identity owner                                           | Patient through verified identity flow; governed recovery administrator | Support agent editing verification status directly                    |
| Consent record/withdrawal      | Consent                                                           | Privacy owner; patient supplies action                            | Patient through versioned command; privacy process for correction       | Clinician/operations inferring consent from attendance                |
| Intake submission              | Intake                                                            | Clinical/data owners for approved form; patient authors responses | Patient; attributed correction workflow after lock                      | Marketing, support, provider callback changing answers                |
| Triage/urgent/exclusion        | Intake/triage                                                     | Clinical owner                                                    | Approved rules/service or authorised clinical role                      | Commercial/operations override                                        |
| Clinical decision/prescription | Clinical                                                          | Authorised clinician/approved pathway authority                   | Assigned authorised professional only                                   | Meneer/Octothorp admin, support, payment or pharmacy self-approval    |
| Price/payment/refund           | Commerce                                                          | Commercial owner                                                  | Commerce service; authorised exception/refund role                      | Clinician changing payment; browser redirect confirming payment       |
| Order/fulfilment eligibility   | Orders                                                            | Operations owner within approved prerequisites                    | Order service after independent facts                                   | Payment alone, UI button, courier or support inference                |
| Pharmacy release               | Fulfilment normalised record; pharmacy owns professional evidence | Verified pharmacy authority                                       | Verified scoped pharmacy identity/adapter                               | Operations or hub manufacturing release status                        |
| Custody/dispatch/delivery      | Fulfilment                                                        | Operations owner and verified custody actor                       | Assigned hub/courier adapter or governed correction                     | Patient browser or email delivery inference                           |
| Support escalation             | Support                                                           | Support/operations; clinical owner for clinical escalation        | Assigned support/clinical role                                          | General mailbox providing urgent care or unrestricted clinical access |
| Audit/rights/hold              | Audit/governance and owning module                                | Privacy/security/clinical owner by purpose                        | Append-only service; authorised reviewer/action owner                   | Record owner deleting history or administrator silently editing audit |

Result: no role gains authority merely from authentication, employment, payment, provider status,
or shared deployment. DR-007 contextual checks and DR-003 state ownership align with DR-001 duties.

## Lifecycle Completeness

Task 3.8 approves DR-005's v1 baseline. Final legal/privacy/clinical confirmation remains an
activation gate because the contracting/data roles and exact provider region are unresolved.

| Data class                    | Purpose/owner                 | Storage/access                                      | Approved baseline                                                                             | Deletion/recovery validation                                                             |
| ----------------------------- | ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Public/governance             | Content/legal evidence        | Versioned governance; public published projection   | Current plus six years after supersession                                                     | Obsolete drafts removed; approval evidence recoverable                                   |
| Identity/contact              | Identity/security/privacy     | PostgreSQL; own/minimum privileged projection       | Active plus 90-day closure window; linked minimal evidence follows longer record              | Profile/contact deleted/de-identified; opaque linkage retained only where justified      |
| Consent/rights                | Privacy/patient action        | Consent namespace; own/privacy/audit projection     | Six-year minimum or associated record period, whichever longer                                | Version/action/outcome preserved; processors/restrictions reconciled                     |
| Health/clinical               | Clinical/professional         | Clinical namespaces; assigned clinical scope        | At least six years after dormant/last treatment, subject to longer exceptions                 | Restricted archive; attributable correction; approved destruction/de-identification only |
| Commerce/order                | Commercial/operations         | Commerce/fulfilment; minimum role projection        | Five-year tax/transaction baseline; longer open dispute/audit                                 | Raw payment/provider/address excess removed; ledger and custody integrity retained       |
| Support/integration           | Support/data/security         | Scoped cases and inbox/outbox                       | Support 24 months; reconciled raw integration evidence 30 days                                | Linked complaint/clinical/incident follows longer schedule; normalised fact remains      |
| Authentication/security/audit | Security/privacy/domain owner | Restricted audit/security storage                   | Routine logs 12 months; incident/privileged and linked audit facts six years or owning period | Safe evidence only; raw telemetry expires; immutable history until approved disposition  |
| Exports/backups               | Privacy/data/security         | Expiring object storage/encrypted recovery boundary | Export 24-hour expiry/delete within seven days; rolling backup maximum 35 days                | Restore reapplies current deletion/restriction/hold state before release                 |

Approved service targets: rights acknowledgement within two business days, verification/scope within
five, response target within 20, approved disposition within 30 calendar days, hold review at least
every 90 days, critical RPO no more than one hour and RTO no more than four hours. These internal
targets never extend a shorter mandatory requirement.

## Contract Assurance Review

| Contract family       | Owner             | Validation/error                                                | Retry/concurrency                                          | Compatibility/privacy result                                  |
| --------------------- | ----------------- | --------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Identity              | Identity/access   | Runtime validation; generic enumeration-safe errors             | Idempotent verification/recovery; revoke stale sessions    | Internal subject portable; provider claims are inputs         |
| Consent               | Consent           | Approved version/purpose required; withdrawal distinct          | Idempotent action plus expected version                    | Append history; minimum permitted fact to consumers           |
| Intake/triage         | Intake/triage     | Versioned questionnaire and server exclusion rules              | Lock/version prevents stale correction; safe resubmission  | Health payload excluded from logs/events                      |
| Clinical/prescription | Clinical          | Professional identity/scope and valid transition required       | Attributed append/amend/revoke; no destructive overwrite   | Framework/provider cannot author clinical fact                |
| Payment/refund        | Commerce          | Verified signature, amount, currency, environment and reference | Inbox/idempotency plus ledger concurrency/reconciliation   | Browser return non-authoritative; no raw card data            |
| Order/fulfilment      | Orders/fulfilment | Independent prerequisite and custody-state validation           | Expected version; duplicate/out-of-order evidence rejected | Minimum pharmacy/courier projections and portable events      |
| Support               | Support           | Tenant/assignment/purpose/field validation                      | Case/message idempotency and state version                 | Clinical escalation separated; generic notification           |
| Audit                 | Audit/governance  | Trusted append interface and safe metadata                      | Unique event/correlation; immutable append                 | Retained with evidenced record; no recursive/raw health event |

Result: DR-004 supplies the required semantics, but TD-014 remains open until schemas, validators,
state machines and retry/concurrency tests exist.

## Required Scenario Walkthroughs

### 1. Happy path

Invite/cohort approval → verified patient → current consent → submitted intake → safe triage →
assigned authorised clinical review → approved decision/prescription → versioned price acceptance →
verified payment → fulfilment eligibility → pharmacy release → hub custody → courier dispatch →
delivery → follow-up. Each arrow is a separate server command/committed fact. No later state is
inferred; notification is a side effect. **Design passes; implementation/party/product gates remain.**

### 2. Clinical rejection

The clinician records an attributed rejection independent of commerce. No medication/delivery
charge is created. Under an approved bundle, all medication/delivery and retained no-charge-on-
rejection lines reverse automatically; consultation-only handling follows DR-002. Operations sees
minimum reason/status, not clinical detail. **Design passes; exact terms/prices/refund automation remain gated.**

### 3. Urgent or excluded intake

Server triage records the urgent/exclusion fact, prevents payment/order progression, displays the
approved emergency route, and creates only the approved clinical escalation. General support email
is not emergency care. **Design passes fail-closed; final condition rules and monitored clinical
channel remain gated under TD-008/TD-009.**

### 4. Failed, duplicate, or unverifiable payment

A browser redirect cannot mark payment successful. Verified provider evidence enters the inbox;
failure/expiry leaves no paid order, a duplicate is reconciled/refunded to the original method, and
unknown state becomes `pending_reconciliation`. Clinical state is unchanged. **Design passes;
Stripe activation, ledger/adapter and tests remain gated.**

### 5. Fulfilment exception

Stock, pharmacy rejection, failed hand-off, damage, address failure or courier exception records a
specific fulfilment state, holds downstream transitions, notifies through an approved generic
channel, and routes to assigned operations/pharmacy responsibility. Refund/cancellation follows the
actual stage. **Design passes; exact partner, custody, terms and SLA evidence remain gated.**

### 6. Support and clinical escalation

The patient opens a scoped case. Support receives minimum identity/status fields and cannot browse
clinical content. A clinical issue transfers through an attributed escalation to the assigned
clinical role; break glass is reserved for immediate safety. **Design passes; named owners, channel,
hours and operational test remain gated.**

### 7. Data-subject request

The privacy role verifies the requester/scope, gathers tenant-scoped authoritative records, reviews
third-party/privileged material, creates a secure expiring export, records delivery, and propagates
approved correction/deletion/restriction to providers, caches, queues and restored backups.
**Decision passes; TD-016 remains open until Sprint 05 completes this with synthetic data.**

### 8. Security/privacy incident

Detection correlates safe audit facts, revokes affected sessions/service identities, stops the
affected capability, preserves scoped evidence/hold, invokes security/privacy/clinical owners,
reconciles records and providers, and communicates through the approved incident process. Recovery
uses a tested restore and reapplies lifecycle state before release. **Design passes; monitoring,
incident runbook, alert and restore exercise remain TD-020/TD-016 work.**

### 9. Framework/datastore migration

Inventory/freeze → compatible expansion → deterministic checkpointed migration → shadow comparison
and reconciliation → one-authority cutover → observation/rollback window → contraction. Internal
subjects, identifiers, state meaning, consent/professional attribution, audit and lifecycle remain.
**Design passes; retained fixtures, migration rehearsal and equivalence suite remain TD-055.**

## Cross-Boundary Threat Review

| Threat                                 | Prevent/detect/respond design                                                                         | Residual implementation evidence                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Identity takeover/recovery abuse       | Verified contact, short one-time material, MFA, step-up, generic responses, revocation, alerts        | Provider configuration, rate limits and end-to-end tests   |
| Cross-patient/tenant IDOR              | Server-derived subject/tenant, resource relationship, opaque IDs, deny default                        | Horizontal/tenant negative tests on every query/command    |
| Vertical/insider privilege             | Action matrix, assignment/purpose, separation, minimum projections, audit/access review               | Vertical tests, named roles, alert/review evidence         |
| Break-glass misuse                     | Recent MFA, reason/resource/time limit, notification, auto-expiry, next-day review                    | Workflow and incident tests                                |
| Service credential/webhook compromise  | Per-service/environment identity, secret isolation, signature/time/replay checks, rotation/revocation | Synthetic replay/rotation/cross-environment tests          |
| Export or support leakage              | Step-up, scoped review, secure expiring file, no ordinary-email payload, audit                        | DSR/support negative tests and deletion proof              |
| Migration corruption or dual authority | One authority, outbox/inbox, checkpoints, version/count/invariant reconciliation, safe rollback       | Staging rehearsal and exception closure                    |
| Backup/restore resurrects deleted data | 35-day expiry, deletion ledger, restore quarantine and lifecycle replay                               | Quarterly restore plus deletion/restriction reconciliation |
| Provider outage/suspension/exit        | Internal authority, DR-006 exit pack, portable contracts/data, degraded fail-closed state             | Provider-specific export/import/recovery exercise          |

## Findings and Deviations

- No material contradiction was found across DR-001–DR-008.
- DR-005 previously left exact lifecycle periods and recovery objectives to Task 3.8. This task adds
  the conservative v1 baseline and source basis; it does not waive final domain application review.
- DR-007 already contains the required permission and identity threat model; this task validates it
  against every operating role and workflow state instead of duplicating another permission record.
- The architecture can support the intended pilot, but current source remains intentionally
  non-transactional. Validation is not activation or implementation evidence.

## Debt Disposition

| Debt   | Task 3.8 result                                                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-009 | Remains In progress: architecture is consistent; named contracting/data roles, verified professional/pharmacy/courier and urgent-channel evidence remain |
| TD-010 | Remains In progress: state/exception model passes; prices, tax/merchant, terms, Stripe and operating evidence remain                                     |
| TD-011 | Remains Verified: all scenarios preserve DR-003 authority and boundary rules                                                                             |
| TD-012 | Remains Verified: all data classes map to DR-005 namespaces, tenant and migration/recovery ownership                                                     |
| TD-013 | Remains In progress: permission design passes; Sprint 05 enforcement and horizontal/vertical tests remain                                                |
| TD-016 | Moves to In progress: schedule/procedure decision is complete; staging restore and synthetic rights workflow remain                                      |
| TD-050 | Remains Verified: every scenario has accountable role and stop path; private appointments remain release gates                                           |
| TD-054 | Remains Verified: required contracts remain portable across every scenario/migration                                                                     |

## Source Basis for Lifecycle Validation

- [Protection of Personal Information Act 4 of 2013](https://www.justice.gov.za/legislation/acts/2013-004.pdf)
- [Information Regulator retention/disposal procedure](https://inforegulator.org.za/wp-content/uploads/2020/07/Procedures-for-making-information-electronically-available.pdf)
- [HPCSA Booklet 9: Guidelines on the Keeping of Patient Health Records](https://www.hpcsa-blogs.co.za/wp-content/uploads/2022/11/Booklet-9-Keeping-of-Patient-Records_Review-Draft_-FINAL_Sept-2022.pdf)
- [SARS record-keeping guidance](https://www.sars.gov.za/client-segments/record-keeping/)

## Validation Result

Task 3.8 is **Completed with explicit gates**. The Sprint 03 design is internally coherent and
defines the decisions Sprint 05 must implement. It does not authorise transactional activation.
Task 3.9 must perform final approval/debt/RAG reconciliation and produce the completion report.

No application source, public wording, dependency, provider account, secret, environment, or runtime
behaviour was changed.
