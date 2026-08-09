---
decision_id: DR-004
title: Framework-Neutral Contracts and Migration Boundaries
status: approved
accountable_owner: Octothorp ZA architecture owner
implementation_owner: Octothorp ZA technology owner
required_approvers:
  [architecture_owner, data_owner, security_owner, operations_owner, release_owner]
effective_date: 2026-08-08
supersedes: null
related_debt: [TD-014, TD-054, TD-055]
last_updated: 2026-08-10
---

# DR-004 — Framework-Neutral Contracts and Migration Boundaries

## Context and Scope

DR-003 defines logical boundaries and authoritative-state ownership. This record defines how those
boundaries communicate without making React components, TanStack/Next.js routes, Laravel
controllers, database tables, hosting functions, or provider SDK objects the product contract.

The current v1 repository has no transactional API, events, persistence, or contract-test suite.
This is therefore an approved implementation contract for later engineering, not evidence that the
capabilities exist. DR-005 owns physical schemas, tenancy, lifecycle, and data migration. DR-007
owns identity and permission design.

### Confirmed Constraints

- One logical module owns each command, invariant, state transition, and emitted domain event.
- Contracts must remain serialisable and implementable across TypeScript/TanStack, Next.js, and
  Laravel/PHP without importing framework or vendor types.
- Every enabled state change requires server validation, authorisation, idempotency, concurrency
  control, traceability, and an honest failure response.
- Provider callbacks and browser redirects are evidence inputs, not authoritative domain events.
- Special personal information is excluded from contracts unless the receiving boundary requires
  it for an approved purpose.

### Explicit Unknowns

- `[TBC — owner: DATA OWNER — gate: DR-005 approval]`: canonical identifiers, field-level data
  classification, tenant scope, physical schemas, retention, and migration tooling.
- `[TBC — owner: SECURITY OWNER — gate: DR-007 approval]`: actor/subject claim structure,
  authentication context, permission vocabulary, service identities, and signature mechanisms.
- `[PARTIALLY RESOLVED — owner: ARCHITECTURE OWNER — Task 5.2]`: top-level `contracts/`, Zod 4.4.3,
  and Vitest now own the first runtime schemas and portable contract tests. Concrete endpoint paths,
  generated types, business payload files, event transport, and outbox/inbox technology remain TBC.
- `[TBC — owner: RELEASE OWNER — gate: migration approval]`: cutover window, rollback window,
  consumer inventory, operational thresholds, and sign-off evidence for each migration.

## Options Considered

| Option                                                            | Benefits                                                                  | Costs and risks                                                                  | Disposition |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------- |
| Treat framework routes and TypeScript types as contracts          | Minimal initial work                                                      | Runtime validation absent; PHP/provider portability poor; behaviour hidden in UI | Rejected    |
| Share database tables between all channels/modules                | Fast direct access                                                        | Ownership bypass, unsafe coupling, difficult migrations, broad data exposure     | Rejected    |
| Define portable command, query, event, error, and audit contracts | Explicit runtime boundaries, compatibility, testing, and migration safety | Requires registry discipline and contract tests                                  | Approved    |

## Decision

Meneer will maintain one version-controlled **contract catalogue** independent of application
frameworks. The catalogue is the normative definition of boundary names, schemas, semantics,
ownership, privacy classification, examples, compatibility, and tests. Generated language types
are conveniences and never replace the canonical runtime-validatable definition.

Sprint 05 must create a top-level `contracts/` boundary or an equivalently explicit location with:

- domain-neutral schemas for commands, queries, results, events, errors, and audit facts;
- a registry naming owner, consumers, version, sensitivity, idempotency, and lifecycle;
- valid and invalid fixtures with framework-independent contract tests; and
- adapters mapping HTTP, framework actions, provider webhooks, persistence, and transports to the
  canonical contracts.

No route handler, component prop, ORM model, payment-provider object, or webhook payload may be
published directly as a cross-boundary contract.

## Contract Kinds

| Kind                | Purpose                                                                         | Required behaviour                                                                                   |
| ------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Command             | Requests one state-changing action from the owning module                       | Authorised, runtime validated, idempotent where retryable, concurrency checked, one explicit outcome |
| Query               | Requests a purpose-limited projection without changing domain state             | Authorised, field scoped, cache classified, pagination and not-found semantics explicit              |
| Result              | Returns an accepted command/query projection                                    | Stable status and identifiers; no implication of a later workflow stage                              |
| Domain event        | Immutable fact emitted after the owning state transition commits                | Past tense, globally unique, ordered per aggregate, replay safe, minimum payload                     |
| Integration message | Provider-facing request or verified source evidence                             | Provider mapping isolated; signature/origin/environment and replay checks explicit                   |
| Error               | Machine-readable rejection/failure contract                                     | Stable code, safe message, retry classification, correlation identifier, no sensitive leakage        |
| Audit fact          | Append-only evidence of access, decision, command outcome, or privileged change | Actor/service, action, subject reference, time, outcome, correlation, safe metadata                  |

## Common Envelopes

Field names below are semantic requirements. DR-005 and DR-007 may refine their concrete shapes
without weakening them.

### Command envelope

```json
{
  "contract": "consent.record",
  "version": 1,
  "requestId": "opaque-unique-id",
  "idempotencyKey": "opaque-retry-key",
  "correlationId": "opaque-trace-id",
  "actor": { "type": "patient", "id": "opaque-subject-id" },
  "subjectId": "opaque-subject-id",
  "expectedVersion": 3,
  "requestedAt": "RFC-3339 timestamp",
  "payload": {}
}
```

The authenticated server creates or verifies actor context; clients cannot award themselves roles
or tenant scope. `expectedVersion` protects mutable aggregates from stale writes. Reusing an
idempotency key with a different canonical payload is a conflict, not a new command.

### Event envelope

```json
{
  "eventId": "globally-unique-id",
  "event": "consent.recorded",
  "version": 1,
  "aggregate": { "type": "consent", "id": "opaque-record-id", "version": 4 },
  "occurredAt": "RFC-3339 timestamp",
  "recordedAt": "RFC-3339 timestamp",
  "actor": { "type": "patient", "id": "opaque-subject-id" },
  "correlationId": "opaque-trace-id",
  "causationId": "opaque-command-or-event-id",
  "payload": {}
}
```

Events record committed facts only. Consumers deduplicate by `eventId`, checkpoint safely, and
must tolerate replay. Event payloads contain the minimum fact needed; consumers query an authorised
projection when additional data is required.

## Required Contract Families

| Family            | Owning module     | Minimum commands/queries                                                            | Minimum emitted facts                                                             |
| ----------------- | ----------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Identity          | Identity/access   | request verification, verify contact, update permitted profile, query safe identity | contact verified, profile updated, access suspended                               |
| Consent           | Consent           | record, withdraw, query current/version history                                     | consent recorded, consent withdrawn                                               |
| Intake            | Intake            | save permitted draft, submit, authorised correction, query permitted intake         | intake submitted, intake corrected, intake locked                                 |
| Triage            | Intake/triage     | record outcome, request missing information, query queue/outcome                    | triage completed, urgent route raised, exclusion recorded                         |
| Clinical decision | Clinical          | record/amend decision, query permitted decision projection                          | decision recorded, amended, approved, rejected                                    |
| Prescription      | Clinical          | issue, amend, revoke, query validity                                                | prescription issued, amended, revoked, expired                                    |
| Payment/refund    | Commerce          | create attempt, reconcile evidence, request refund, query ledger projection         | payment pending, confirmed, failed, refunded, disputed                            |
| Order             | Orders            | create, accept prerequisites, cancel, query status                                  | order accepted, held, cancelled, fulfilment eligible                              |
| Fulfilment        | Orders/fulfilment | record verified hand-off/exception, reconcile custody, query tracking projection    | pharmacy released/rejected, hub accepted, dispatched, delivered, exception raised |
| Support           | Support           | open, message, assign, escalate, resolve, query permitted case                      | case opened, assigned, escalated, resolved                                        |
| Audit             | Audit/governance  | append through trusted interface, query authorised evidence                         | no recursive public audit event; append result is recorded internally             |

Exact payload fields, enumerations, and permission claims remain gated by DR-005 and DR-007. The
catalogue must still represent rejection, cancellation, expiry, reversal, correction, and manual
recovery paths rather than only happy-path facts.

## Validation, Errors, and State Safety

1. Validate envelope and payload at every external and module boundary before business logic.
2. Reject unknown contract majors, malformed identifiers/timestamps, unauthorised fields, invalid
   state transitions, stale versions, duplicates with conflicting payloads, and impossible values.
3. Stable error codes distinguish at least validation, unauthenticated, forbidden, not found,
   conflict, duplicate, rate limited, dependency unavailable, pending reconciliation, and internal
   failure. Public messages remain safe and do not reveal record existence improperly.
4. A command acknowledgement means only that named command's committed outcome. It cannot imply
   clinical approval, payment, dispensing, delivery, or another module's success.
5. Multi-module progress uses committed facts and explicit pending/exception states. When atomicity
   is unavailable, use an outbox/inbox pattern or equivalent durable delivery and reconciliation.
6. Logs and analytics carry correlation identifiers and safe classifications, not raw clinical,
   credential, payment, or provider payloads.

## Versioning and Compatibility

Contracts use a named contract plus positive integer major version. The catalogue records its own
revision history, but a contract major changes only for a breaking semantic or structural change.

### Compatible within a major

- Add an optional field with a defined default/absence meaning.
- Relax a validation constraint only when safety, security, and consumer behaviour remain valid.
- Add documentation, examples, or a new error detail that consumers are explicitly allowed to ignore.
- Publish a new independent event or query without changing existing contracts.

### Breaking and requiring a new major

- Remove, rename, or change the meaning/type of a field.
- Add a required field or strengthen validation for previously valid messages.
- Change ownership, authorisation, idempotency, ordering, error, or state-transition semantics.
- Add an enumeration value unless the contract explicitly defines unknown-value handling.
- Change identifier meaning, money units, timestamps, clinical meaning, privacy classification, or
  whether an outcome represents committed success.

Producers never emit a new major until every registered consumer declares support. Consumers reject
unsupported majors safely. Deprecation remains active until all consumers migrate, reconciliation
passes, and at least one approved rollback window has elapsed; time alone does not remove support.

## Migration and Release Contract

Every v1-to-v2, v2-to-v3, datastore, transport, or module-extraction migration follows:

1. **Inventory:** freeze a capability/consumer catalogue and baseline accepted fixtures, states,
   counts, invariants, and known exceptions.
2. **Expand:** add backward-compatible schemas, adapters, readers, and observability before changing
   producers; never require a flag-day shared-table rewrite.
3. **Migrate:** transform or backfill with deterministic, restartable, checkpointed jobs. Preserve
   source identifiers, versions, timestamps, provenance, and audit correlation.
4. **Shadow and reconcile:** compare authorised outputs and safe aggregate evidence while the old
   authority remains active. Resolve every unexplained mismatch.
5. **Cut over:** move one named authority at a time after contract, security, performance, recovery,
   and operational gates pass.
6. **Observe:** retain the prior compatible reader/adapter during the approved rollback window and
   monitor error, lag, reconciliation, and business invariants.
7. **Contract:** remove old paths only after consumers, data, credentials, routes, jobs, and recovery
   evidence are reconciled and approved.

Dual writing is not the default because partial failure can create two authorities. If unavoidable,
one side remains explicitly authoritative and durable reconciliation is mandatory.

Rollback reverts code, routing, or adapters; it never deletes or rewrites accepted patient,
clinical, payment, fulfilment, consent, or audit facts. If the old version cannot understand newly
accepted records, rollback is unsafe and a forward-compatible repair is required.

## Cross-Generation Guarantees

| Generation                   | Contract obligation                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1 TanStack/Cloudflare       | Implement canonical contracts behind route/server adapters; do not expose framework or Worker types as domain contracts                            |
| v2 Next.js                   | Reuse the catalogue, fixtures, identifiers, state meaning, errors, and contract tests; Server Actions/Route Handlers remain adapters               |
| Conditional v3 Laravel/React | Generate or implement PHP/TypeScript adapters from the same canonical definitions; Laravel models/controllers and React state remain non-normative |

A generation is not behaviourally equivalent merely because pages render. It must pass retained
contract fixtures, state-transition scenarios, reconciliation checks, and approved journey-level
acceptance tests. Intentional changes require a new contract version, migration impact assessment,
and explicit approval.

## Security, Privacy, and Clinical Boundaries

- Contract fixtures use synthetic data; no patient or private partner particulars enter the repository.
- Permission and purpose checks occur before queries reveal whether a sensitive record exists.
- Clinical facts are authored only by the authorised clinical boundary; integrations and other
  modules consume minimum permitted projections.
- Secrets, tokens, full payment details, raw provider callbacks, and unnecessary health payloads
  are never domain-event fields.
- Data exports and support/operations projections use separately authorised contracts rather than
  direct datastore access.
- Schema compatibility cannot weaken safety exclusions, consent purpose, professional attribution,
  audit evidence, or server-side authorisation.

## Rationale

An explicit portable catalogue makes behaviour reviewable before implementation and testable across
framework generations. It prevents UI and vendor coupling, gives migrations measurable invariants,
and allows v1 to remain operationally small without sacrificing later portability.

## Consequences and Risks

- Sprint 05 must implement schemas, validators, adapters, registries, fixtures, and contract tests;
  this decision alone does not close TD-014 or TD-055.
- Catalogue drift is possible unless CI verifies generated artifacts and examples against canonical schemas.
- Excessive event payloads increase privacy and compatibility risk; reference identifiers plus
  authorised queries are preferred.
- A contract may be technically compatible but clinically or operationally unsafe; applicable
  domain approval remains mandatory.

## Implementation and Verification

- Implementation owner: Octothorp ZA technology owner.
- Acceptance evidence: this decision's contract-kind model, required-family catalogue, envelope,
  validation/error, compatibility, migration, rollback, and cross-generation rules plus Task 3.5 evidence.
- Dependencies: DR-003 ownership, DR-005 data/tenancy/lifecycle, DR-007 identity/authorisation,
  Sprint 04 delivery controls, and Sprint 05 implementation.
- Rollback: supersede this record; do not silently rewrite an approved contract or remove support
  before registered consumers and accepted records are reconciled.

## Affected Documents

- `docs/00-blueprints/master-blueprint-v1.md`
- `docs/02-implementation-plans/phase-01/sprint-03-operating-model-architecture.md`
- `docs/02-implementation-plans/phase-01/annexures/sprint-05-2-contract-foundation-evidence.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/03-platform-evolution.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`

## Approval

| Approver role                           | Evidence/reference                                                                            | Decision                                             | Date       |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------- |
| Architecture/repository owner           | Owner-approved Sprint 03 architecture direction and requested Task 3.5 implementation         | Approved contract and migration boundary             | 2026-08-08 |
| Data/security/operations/release owners | DR-008 review boundary; concrete implementations remain gated by DR-005, DR-007 and Sprint 05 | Principles approved; implementation evidence pending | 2026-08-08 |

## Review Trigger

Review before the first transactional endpoint, when a contract owner or semantic changes, before
adding a consumer/provider, before every framework/datastore migration, after an unreconciled
message or data incident, and before removing any contract version.
