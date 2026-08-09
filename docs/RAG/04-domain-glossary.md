---
rag_id: meneer-domain-glossary
title: Meneer Domain and Delivery Glossary
status: working
authority: derived
last_updated: 2026-08-10
audience: internal
sensitivity: internal
---

# Meneer Domain and Delivery Glossary

## Status Terms

- **Observed:** verified directly in repository or runtime evidence.
- **Owner confirmed:** stated product direction that may not yet exist in code.
- **Approved:** formally accepted by the accountable owner.
- **Verified:** completed and independently checked against recorded acceptance evidence.
- **Proposed:** recommended but not approved.
- **Placeholder:** visible or coded material that is incomplete and must not be treated as operational.

## Release Terms

- **v1:** current TanStack Start generation using Cloudflare as its approved pilot host.
- **Controlled pilot:** restricted, monitored use by an approved test group under a defined scope and support model. It is not public-launch approval.
- **Pilot charter:** the proposed or approved participant, journey, operating, measurement, stop,
  activation, and exit boundary; a charter does not itself activate a release.
- **v2:** planned Next.js generation intended to absorb v1 learning and support public launch.
- **Public launch:** unrestricted intended-market availability after the complete public release gate passes.
- **v3:** conditional Laravel API and React evolution triggered by demonstrated scale or operational complexity.
- **Migration by absorption:** preserving validated behaviour, contracts, data, and tests while deliberately improving or removing weaknesses.

## Product Terms

- **Patient journey:** the intended sequence from discovery and education through eligibility, consent, identity, intake, consultation, clinical decision, fulfilment, and follow-up.
- **Pre-screen:** an early safety and suitability screen; it is not a diagnosis or prescribing decision.
- **Clinical intake:** versioned collection of condition-relevant medical information for clinician review.
- **Triage:** rules and professional review that identify urgency, exclusion, missing data, investigations, and the appropriate consultation route.
- **Clinical decision:** an authorised clinician's recorded assessment and plan, including a decision not to treat where appropriate.
- **Fulfilment:** approved prescription/order hand-off, pharmacy processing, packaging, delivery, exceptions, and reconciliation.
- **Follow-up:** monitoring, support, repeat consultation, adverse-event handling, and continuity activity after a decision or treatment.
- **Clinical rejection:** an authorised decision that treatment is not appropriate; it is distinct
  from payment failure, patient cancellation, pharmacy rejection, or stock failure.
- **Eligible for fulfilment:** proposed DR-002 state reached only after all required clinical,
  payment, stock, pharmacy, address, consent, and operational conditions independently pass.
- **Bundle:** a presentation of separately governed consultation, medication, delivery, discount,
  refund, and adjustment line items; it is never one opaque clinical/commercial state.

## Governance Terms

- **Claim register:** controlled record of each public assertion, its evidence, accountable approver, permitted channels, effective date, and review/expiry date.
- **Canonical content:** the approved source from which website, messages, metadata, support, and MCP outputs derive.
- **Consent record:** durable evidence of the exact notice/purpose/version accepted, subject, timestamp, capture channel, and withdrawal route.
- **Audit event:** append-only evidence of an actor, action, subject, time, outcome, correlation identifier, and safe metadata.
- **Special personal information:** health and related information requiring heightened protection. This glossary is descriptive and not legal advice.
- **Release gate:** evidence that must exist before a defined pilot or public release may proceed.
- **Website-only policy:** a notice or term governing the current informational website; it is not
  transactional terms, clinical consent, or authority to collect health information.
- **Sprint completion report:** the verified closure record for delivered work, decisions,
  deviations, lessons, debt, file changes, validation, and residual risk.
- **Closed engineering boundary:** planned work has been implemented or honestly dispositioned and
  recorded; it does not by itself authorise pilot activation or public release.
- **Decision-complete:** the required choice, rationale, ownership, consequences, and gates are
  approved and recorded; it does not mean the resulting system capability is implemented.
- **Implementation-evidence boundary:** the explicit point at which an approved design must be
  proven through running code, tests, operations, or release evidence before related debt closes.

## Technical Terms

- **Authoritative state:** the durable server-side record that determines workflow truth; browser component state is not authoritative.
- **Channel/workspace boundary:** a purpose-specific public, patient, clinical, or operations
  interface that renders authorised projections and submits intent without owning workflow truth.
- **Application/API boundary:** the server-side entry that authenticates, authorises, validates,
  and routes commands and queries to the module that owns the state.
- **Modular core:** framework-neutral domain modules with explicit ownership and dependency rules;
  modules may share one deployment without sharing private state or bypassing contracts.
- **Integration port/adapter:** a controlled contract and implementation for an external service;
  provider objects and callbacks do not become domain authority.
- **Source evidence:** an externally or professionally authored fact that must be verified and
  normalised before it affects Meneer's workflow state.
- **System of record:** the module responsible for preserving the authoritative internal record,
  history, and permitted transitions for a state domain.
- **Pending reconciliation:** an explicit non-success state used when external and internal
  evidence is missing, delayed, or conflicting.
- **Contract catalogue:** the canonical version-controlled definitions, ownership, schemas,
  semantics, privacy classification, fixtures, and tests for cross-boundary communication.
- **Canonical contract boundary:** the top-level, runtime-validatable `contracts/` implementation
  that remains independent of routes, UI frameworks, hosting runtimes, ORMs, and providers.
- **Contract definition:** registry metadata naming a contract's kind, owner, consumers, major,
  sensitivity, idempotency expectation, and lifecycle.
- **Command:** an authorised request for one owning module to perform a state-changing action.
- **Query:** an authorised request for a purpose-limited projection that does not change domain state.
- **Domain event:** an immutable, past-tense fact emitted only after the owning transition commits.
- **Contract major:** the positive integer version changed when structure or behaviour becomes
  incompatible; consumers must safely reject unsupported majors.
- **Retry classification:** a stable error property indicating whether retry is never appropriate,
  immediately safe, delayed, or requires reconciliation; it does not itself perform a retry.
- **Behavioural equivalence:** evidence that a replacement retains approved contract and journey
  behaviour, not merely similar pages or responses.
- **Expand–migrate–contract:** add compatible capability first, migrate and reconcile under
  observation, then retire the old path after rollback and consumer gates pass.
- **Logical namespace:** a data-ownership boundary for one domain; physical schema names may vary,
  but another module may not bypass its commands/queries to mutate private records.
- **Tenant scope:** the server-derived business/client boundary applied to records, commands,
  queries, jobs, exports, storage, caches, logs, and audit evidence.
- **Data lifecycle state:** the approved progression through active, restricted/archive,
  disposition, deletion/de-identification, with a scoped hold able to pause disposition.
- **Vendor hard gate:** a non-negotiable legal/privacy, security, isolation, portability/recovery,
  authority, or commercial requirement that scoring cannot override.
- **Lock-in budget:** the limited provider-specific implementation permitted behind portable
  contracts, migrations, exports, tests, and an evidenced exit path.
- **Internal subject:** Meneer's stable opaque identity for a person, distinct from mutable contact
  details, provider account identifiers, professional roles, and tenant memberships.
- **RBAC plus context:** role-based permission combined with tenant, resource relationship,
  assignment, purpose, workflow state, and authentication-assurance checks.
- **Step-up authentication:** fresh stronger authentication required before a high-risk action even
  when a session is already active.
- **Break glass:** exceptional, time-limited, notified and reviewed access for immediate patient
  safety or a declared incident; it is not ordinary support access.
- **Service identity:** a non-human, environment/purpose-scoped principal used by one integration or
  workload instead of a shared credential or human account.
- **Dormant clinical record:** a health record whose retention clock starts from the patient's last
  treatment/clinical activity, subject to longer applicable exceptions or holds.
- **Legal or clinical hold:** an authorised, scoped and reviewed pause on ordinary disposition; it
  does not permit unrelated access or create indefinite retention by default.
- **RPO:** recovery point objective—the maximum approved amount of recent data loss measured in time.
- **RTO:** recovery time objective—the maximum approved time to restore the required service/data.
- **Deletion propagation:** reconciling an approved deletion/restriction across authoritative data,
  providers, projections, caches, queues, exports, analytics and restored backups.
- **Portable core:** domain rules, records, contracts, and tests that can move between TanStack, Next.js, Laravel, or hosting providers.
- **Contract test:** a test proving that an API, event, or behaviour remains compatible across implementations.
- **Reconciliation:** proving that source and destination records or external transactions agree after processing or migration.
- **MCP:** Model Context Protocol. Meneer v1 does not expose MCP; its former unauthenticated Lovable
  public-information surface was removed in Sprint 02 Task 2.4. Any reintroduction requires a named
  use case and separately approved boundary and must never be assumed to be a patient-data interface.
- **RAG:** retrieval-augmented generation. Here it refers to curated internal documents used to ground agents in current evidence and approved direction.

## Operating Roles

- **Meneer Health:** working customer-facing brand and product experience; not itself the clinical
  or pharmacy decision-maker.
- **OCTOTHORP ZA:** current website operator and intended technology, marketing, general-support,
  release, and operations-coordination layer.
- **Clinical lead/authorised clinician:** independent authority for the applicable clinical
  protocol, decision, record, and escalation.
- **Precise Wellness pathway:** owner-confirmed intended peptide clinical/pharmacy service identity;
  exact juristic, professional, pharmacy, product, data, and escalation evidence remains gated.
- **Pharmacy lead/responsible pharmacist:** authority for dispensing, product release, pharmacy
  records, and applicable supply or recall decisions.
- **Hub/courier:** traceable custody and delivery actors after an authorised pharmacy release; exact
  arrangements remain gated.

These allocations come from DR-001. Contracting and information-responsibility roles remain open;
the terms provider, responsible party, operator, processor, clinician, pharmacy, courier, and
support owner are not interchangeable.
