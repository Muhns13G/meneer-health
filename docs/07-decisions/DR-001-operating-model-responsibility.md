---
decision_id: DR-001
title: Operating Model and Responsibility Matrix
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA operations owner
required_approvers: [business_owner, release_owner]
effective_date: 2026-08-08
supersedes: null
related_debt: [TD-009, TD-050]
last_updated: 2026-08-08
---

# DR-001 — Operating Model and Responsibility Matrix

## Context and Scope

Meneer needs a clear separation between its customer-facing brand, the company operating its
technology and marketing, and the authorised parties delivering clinical and pharmacy services.
This record governs the current informational website and the target controlled-pilot boundary. It
does not approve a medicine, clinical protocol, pharmacy licence, contract, or pilot activation.

### Confirmed Facts

- Meneer Health is the working customer-facing product and brand; it is not currently a registered
  juristic entity or independent clinical authority.
- OCTOTHORP ZA (`K2024185008`) operates the current website and is the intended technology,
  marketing, general-support, and operations-coordination layer.
- Precise Wellness is the owner-confirmed identity for the intended peptide clinical/pharmacy
  service pathway and operates the supplied provider portal. Its exact juristic and licensed-party
  particulars are not recorded in this repository.
- Authorised clinicians retain independent clinical authority. An operations or marketing actor
  cannot diagnose, prescribe, override a rejection, or direct dispensing.
- `support@meneerhealth.co.za` is the monitored general-support channel. It is not an urgent or
  clinical channel.
- The transactional journey remains gated and collects no health information.

### Explicit Unknowns and Activation Gates

- `[TBC — owner: BUSINESS OWNER — gate: transactional contracting model approval]`: the entity or
  entities contracting with and invoicing a patient for each service component.
- `[TBC — owner: LEGAL/PRIVACY OWNER — gate: transactional privacy approval]`: responsible-party,
  operator, joint-responsibility, records, and cross-party data-transfer allocations.
- `[TBC — owner: CLINICAL LEAD — gate: peptide pathway approval]`: verified practitioner identity,
  registration, questionnaire governance, clinical authority, records, and escalation.
- `[TBC — owner: PHARMACY LEAD — gate: dispensing activation]`: Precise Wellness's exact juristic
  entity, dispensing pharmacy, Y-number, responsible pharmacist, and product-level authority.
- `[TBC — owner: OPERATIONS OWNER — gate: fulfilment activation]`: hub operator, courier, custody,
  proof-of-delivery, return, failed-delivery, and reconciliation arrangements.
- `[TBC — owner: CLINICAL LEAD — gate: transactional activation]`: monitored urgent/adverse-event
  channel, hours, response target, and fallback.

## Options Considered

| Option                                                    | Benefits                                                           | Costs and risks                                                                   | Disposition |
| --------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----------- |
| Meneer acts as an integrated healthcare provider          | Simple public story                                                | Conflicts with the current brand status and unverified provider authority         | Rejected    |
| Octothorp ZA acts as the clinical and dispensing provider | Single legal operator                                              | Conflates technology/marketing with unverified clinical and pharmacy authority    | Rejected    |
| Layered brand, operations, clinical, and pharmacy model   | Preserves independent authority and supports portable integrations | Requires explicit contracts, hand-offs, data roles, and patient-facing disclosure | Approved    |

## Decision

Meneer uses a layered operating model:

1. **Meneer Health** is the customer-facing brand and product experience, not the clinical or
   pharmacy decision-maker.
2. **OCTOTHORP ZA** operates the website and coordinates technology, marketing, non-clinical
   support, releases, and operations. It must not represent itself as prescribing or dispensing.
3. **Precise Wellness and verified authorised professionals** provide the intended peptide
   questionnaire, clinical, and dispensing pathway within their evidenced authority.
4. **Other authorised clinicians** own condition-specific clinical decisions outside that pathway.
5. **The verified dispensing pharmacy** owns dispensing legality, pharmacist review, labelling,
   product release, and pharmacy records.
6. **The Meneer hub and courier** may perform traceable custody and delivery work only after an
   approved pharmacy release and documented hand-off.

The exact contracting, invoicing, information-responsibility, licence, and fulfilment particulars
remain activation gates assigned above. Approval of this layered boundary does not fill those gaps.

## Patient-Facing Representation Rules

- The current informational website identifies OCTOTHORP ZA as its operator and uses the monitored
  general-support address.
- No page may imply that Meneer or Octothorp diagnoses, prescribes, dispenses, or guarantees
  treatment.
- Transactional terms and privacy notices must name the actual contracting, clinical, pharmacy,
  payment, and information-responsibility parties before activation.
- Precise Wellness may be identified as the intended pathway partner, but its authority, products,
  registrations, and responsible professionals must not be presented as verified until evidence is
  approved.
- Commercial, delivery, and clinical claims still require their own approvals; this record does not
  authorise copy changes.

## Responsibility Matrix

`A` is accountable, `R` performs the work, `C` is consulted, and `I` is informed. Each activity has
one accountable role; a named role does not imply that its private role holder or evidence has been
supplied.

| Activity or decision                      | Octothorp ZA | Clinical lead | Precise pathway | Pharmacy lead | Hub/courier | Accountable boundary or gate                                    |
| ----------------------------------------- | ------------ | ------------- | --------------- | ------------- | ----------- | --------------------------------------------------------------- |
| Brand and product direction               | A/R          | C             | C               | I             | I           | Business owner approves scope                                   |
| Website technology and availability       | A/R          | I             | I               | I             | I           | Security/release gates apply                                    |
| Public content preparation                | R            | C             | C               | C             | I           | Content owner coordinates required domain approvals             |
| Clinical/safety claim approval            | C            | A/R           | C               | C             | I           | Evidence required before publication                            |
| Peptide questionnaire administration      | I            | C             | A/R             | C             | I           | Verified pathway and data hand-off required                     |
| Peptide clinical decision                 | I            | C             | A/R             | C             | I           | Exact authorised decision-maker remains an activation gate      |
| Other condition clinical decision         | I            | A/R           | I               | C             | I           | Condition-specific protocol required                            |
| Prescription decision and clinical record | I            | A/R           | C               | C             | I           | Authorised prescriber only                                      |
| Dispensing and pharmacy record            | I            | C             | C               | A/R           | I           | Verified pharmacy authority required                            |
| General, non-clinical support             | A/R          | C             | C               | C             | I           | No sensitive or urgent care by ordinary email                   |
| Clinical escalation/adverse event         | C            | A/R           | R               | C             | I           | Channel, hours, and fallback remain gated                       |
| Pharmacy supply release                   | I            | C             | C               | A/R           | I           | Approved order and release evidence required                    |
| Hub receipt and inventory custody         | A            | I             | I               | C             | R           | Traceable acceptance and reconciliation required                |
| Dispatch and delivery                     | A            | I             | I               | C             | R           | Courier/custody arrangement remains gated                       |
| Technical/privacy incident response       | R            | C             | C               | C             | I           | Security or privacy owner is accountable by incident class      |
| Clinical safety incident response         | I            | A             | R               | C             | I           | Stop criteria and escalation apply                              |
| Pilot release go/no-go                    | R            | C             | C               | C             | C           | Release owner is accountable; all applicable approvals required |

## Cross-Party Hand-off Rules

Every enabled hand-off must define the trigger, sender, recipient, minimum purpose-limited data,
authority, durable acknowledgement, time limit, idempotency/retry rule, exception owner, correlation
identifier, and retention treatment. No payment, operational, analytics, email, or URL field may
carry unnecessary health information.

Clinical approval, payment, pharmacy release, hub receipt, dispatch, delivery, cancellation, and
refund remain separate states. One state must never be inferred from another.

## Rationale

This model reflects the owner's stated company structure, preserves independent professional
authority, matches the current website operator disclosure, and avoids presenting an unregistered
brand or technology company as the healthcare provider. Explicit gates allow architecture work to
continue without publishing private or undecided particulars.

## Consequences and Risks

- Contracts, transactional policies, and interfaces must expose the responsible party at the point
  where its responsibility becomes relevant.
- Each integration requires an auditable hand-off rather than shared informal status.
- Missing partner, professional, privacy, contracting, and fulfilment evidence continues to block
  transactions and TD-009 verification.
- A change in entity, partner, or responsibility requires a superseding record and reconciliation
  of public content, contracts, permissions, data, and open transactions.

## Domain Implications

| Domain                             | Required treatment or approval                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| Clinical and safety                | Independent authorised decision-making; clinical lead approval before activation        |
| Legal and privacy                  | Contracting and information-responsibility allocation remains a gated DR-005 dependency |
| Security and access                | Each party receives only role-appropriate access under DR-007                           |
| Commercial and tax                 | Merchant, invoicing, tax, cancellation, and refund ownership belongs to DR-002          |
| Operations and support             | General support stays separate from clinical escalation; hand-offs must be traceable    |
| Data and migration                 | Cross-party identifiers, transfers, retention, and exports belong to DR-005             |
| Content and patient representation | Current operator disclosure remains; provider claims require evidence and approval      |

## Implementation and Verification

- Implementation owner: Octothorp ZA operations owner.
- Affected systems and contracts: public policies, future terms/consent, intake, clinical, payment,
  pharmacy, fulfilment, support, data, and audit boundaries.
- Acceptance evidence: Task 3.2 source reconciliation and responsibility walk-through.
- Migration/rollback effect: preserve role and hand-off semantics across TanStack, Next.js, and
  Laravel/React; gate affected capability if the model changes before migration.
- Dependencies and blockers: DR-002, DR-005, DR-007, product/pathway evidence under TD-006/TD-007,
  and all explicit activation gates in this record.

## Affected Documents

- `docs/00-blueprints/master-blueprint-v1.md`
- `docs/02-implementation-plans/phase-01/sprint-03-operating-model-architecture.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `src/lib/compliance/pilot-profile.ts`

## Approval

| Approver role  | Evidence/reference                                                                                                               | Decision                       | Date       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------- |
| Business owner | Owner confirmed Precise Wellness as the clinical/pharmacy identity and Octothorp ZA as the technology/marketing/operations layer | Approved within recorded scope | 2026-08-08 |
| Release owner  | Approved controlled-pilot charter and explicit pre-launch placeholder treatment                                                  | Approved with activation gates | 2026-08-08 |

Clinical, pharmacy, legal/privacy, security, and operational approvals remain required for their
activation evidence; they are not implied by this operating-boundary approval.

## Review Trigger

Review before transactional activation, when any entity or partner changes, when the contracting or
data-responsibility model is approved, after a material incident, and before each framework
migration or public launch.
