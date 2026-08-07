---
rag_id: meneer-domain-glossary
title: Meneer Domain and Delivery Glossary
status: working
authority: derived
last_updated: 2026-08-08
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

## Technical Terms

- **Authoritative state:** the durable server-side record that determines workflow truth; browser component state is not authoritative.
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
