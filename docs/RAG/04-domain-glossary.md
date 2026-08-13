---
rag_id: meneer-domain-glossary
title: Meneer Domain and Delivery Glossary
status: working
authority: derived
last_updated: 2026-08-13
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
- **Pilot provider stack:** DR-009's selected v1 combination of Supabase Free, Brevo Free,
  Cloudflare telemetry and EU R2 recovery exports, Better Stack uptime/heartbeats, and Stripe test
  mode; selection is not provisioning or activation.
- **Provider-disabled preview:** a Cloudflare branch build whose real pilot database, identity,
  email, storage, monitoring payloads, and payment integrations remain disabled or synthetic.
- **Free-tier stop trigger:** a usage, reliability, recovery, privacy, security, or operational
  threshold that requires intake to pause or a reviewed upgrade before it is exceeded; automatic
  spend is not permitted.

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
- **Payment evidence:** a verified provider event durably reconciled to an internal order; a browser
  redirect, client message, or Checkout page is not payment evidence.
- **Payment reconciliation exception:** a durable operations item created when a refund, dispute,
  provider reference, or state transition cannot be applied unambiguously; it blocks false success.
- **Server price snapshot:** immutable internal order lines selected from an approved
  environment-specific catalogue before provider contact; browser amounts are never authoritative.
- **Fulfilment partner event:** strict minimum-data integration evidence carrying an opaque workflow
  and event reference, event type, provider-reference digest, payload fingerprint, environment, and
  timestamp; it never carries questionnaire, clinical, address, tracking, or raw provider payloads.
- **Partner release gate:** provider/environment configuration that defaults to disabled. Task 5.15
  permits synthetic local evidence only; preview and production remain inactive until named
  authority, commercial, operational, data, security, monitoring, and release approvals pass.
- **Retained-capability catalogue:** machine-validated inventory recording each v1 behaviour's
  owner, authority, target disposition, contract references, fixtures, activation and rollback class.
- **Portable fixture:** language-neutral synthetic input plus an expected HTTP, contract, or
  behavioural observation that every retained target generation must reproduce or explicitly change.
- **Schema/version registry:** the unique mapping from contract name and major to its runtime schema,
  source, consumers, compatible generations, and originating database migration.
- **Migration rehearsal:** synthetic execution of inventory, migration, shadow comparison,
  reconciliation, cutover and rollback procedures before any production authority changes.
- **Opaque treatment intent:** an allowlisted non-semantic identifier submitted by same-origin POST
  and stored only as short-lived authenticated encryption. It is not a diagnosis, eligibility
  result, clinical record, URL parameter, analytics property, or workflow authority.
- **Public route policy:** the single repository contract classifying routes as indexable public,
  restricted, campaign-only, or internal and deriving canonical, robots, sitemap, metadata, and
  response-exclusion expectations.

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
- **Access assignment:** server-owned, tenant/resource/purpose-specific relationship evidence with
  activation, expiry and suspension state; it is not a broad role or client-supplied claim.
- **Authorisation projection:** the minimum approved view returned by an allowed policy decision,
  such as own, status-only, clinical, dispensing, evidence or configuration—not general table access.
- **Policy reason code:** a stable, payload-free allow/deny explanation suitable for later audit and
  monitoring without copying patient or clinical content.
- **Optimistic version:** the server-owned aggregate version a command must match before mutation;
  a stale version produces a conflict rather than overwriting a concurrent change.
- **Idempotency receipt:** the durable command-name/key/fingerprint record binding an exact request
  to its committed result; a changed payload cannot reuse the key.
- **False-success prevention:** the rule that success is returned only after every authoritative
  write required by that command commits; rollback leaves neither changed state nor a success receipt.
- **Audit fact:** an append-only minimum evidence record for an access, decision, committed command
  or privileged change; it contains opaque references, outcome, reason and correlation—not raw content.
- **Audit chain:** a tenant-serialized sequence in which each audit fact hashes its approved fields
  plus the previous hash; recomputation detects changes but is not external WORM storage.
- **Transactional outbox:** a minimum domain event committed in the same database transaction as
  authoritative state, then delivered and reconciled separately without dual-writing success.
- **Integration inbox:** a replay-safe receipt for verified external evidence. The current boundary
  stores provider/event identity and payload fingerprint, not the raw provider payload.
- **Step-up authentication:** fresh stronger authentication required before a high-risk action even
  when a session is already active.
- **Break glass:** exceptional, time-limited, notified and reviewed access for immediate patient
  safety or a declared incident; it is not ordinary support access.
- **Service identity:** a non-human, environment/purpose-scoped principal used by one integration or
  workload instead of a shared credential or human account.
- **Public build configuration:** a declared `VITE_*` value intentionally embedded in browser
  output; it can never contain a credential, patient information, or other secret.
- **Server-only configuration:** a named value consumed only behind the Worker/server boundary and
  prohibited from browser bundles, logs, RAG, screenshots, and CI artefacts.
- **Bundle canary:** a synthetic non-secret marker required in server output and forbidden from
  client output to prove the configured server/client separation remains enforced.
- **Response class:** the server-derived public, sensitive, redirect, error, fingerprinted-asset,
  or mutable-asset category that determines a response's security headers and cache policy.
- **Request-security decision:** a payload-free allow/deny fact carrying a safe correlation ID,
  route class and stable reason; it is not authorisation or proof that a business command committed.
- **Coarse edge rate limit:** a fast abuse-control allowance scoped by the selected edge provider;
  it is not durable accounting, idempotency, authorisation, or a substitute for route monitoring.
- **Telemetry event:** a strict payload-free operational fact containing only environment, event,
  outcome, severity, correlation and approved coarse classifications; it is not authoritative audit.
- **Service objective:** an internal measurable pilot target with a window, threshold, owner and
  response time; the 99.5% availability objective is not a public SLA.
- **Controlled incident exercise:** a synthetic detect/triage/contain/recover/review rehearsal that
  proves alerts and redaction without disrupting production or using patient data.
- **Anti-automation proof:** a short-lived server-verified challenge for an approved anonymous
  command. The raw proof is never trusted as identity, stored in evidence, or exposed to a client.
- **CSP nonce:** a fresh request-scoped value authorising only the matching rendered scripts; it
  avoids granting blanket inline-script execution and must be emitted with the same response policy.
- **Dormant clinical record:** a health record whose retention clock starts from the patient's last
  treatment/clinical activity, subject to longer applicable exceptions or holds.
- **Legal or clinical hold:** an authorised, scoped and reviewed pause on ordinary disposition; it
  does not permit unrelated access or create indefinite retention by default.
- **RPO:** recovery point objective—the maximum approved amount of recent data loss measured in time.
- **RTO:** recovery time objective—the maximum approved time to restore the required service/data.
- **Recovery archive:** an AES-256-GCM encrypted logical database/object-manifest package written to
  a private off-site destination and never read by ordinary application paths.
- **Erasure reconciliation:** per-destination proof that an approved deletion/de-identification was
  applied to authoritative data, identity, storage, and recoverable backups before completion.
- **Legal/clinical hold:** a scoped, authorised pause on disposition with a review due within 90
  days; release resumes the original lifecycle clock rather than creating a new retention period.
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

## Sprint Closure Terms

- **Implementation-complete owner checkpoint:** all repository work and local/current-hosted
  boundary checks are complete, but the owner must commit/push the exact change and obtain passing
  required hosted CI before verified closure.
- **Repository-Verified:** acceptance evidence proves an inactive or synthetic implementation in
  source and controlled tests; it does not imply provider activation or launch approval.
- **Activation evidence:** environment-specific proof required before a dormant route, identity,
  data, payment, monitoring or partner capability may process real use.
- **Activation gate:** a deliberately open debt condition that cannot be Verified until its dormant
  capability is approved, routed/configured in the target environment, and exercised safely. It
  does not mean the preceding repository task is incomplete.
- **Sprint-closed inactive boundary:** the planned implementation and verification are complete
  while customer/provider mutations remain disabled; enabling one later requires its own activation
  evidence and does not reopen the completed foundation unless that foundation regresses.
