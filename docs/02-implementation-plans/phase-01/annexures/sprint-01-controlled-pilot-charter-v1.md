---
decision_id: phase-01-controlled-pilot-charter-v1
title: Meneer v1 Controlled Pilot Charter
status: approved
decision_owner: "@Muhns13G"
prepared: 2026-08-07
related_debt: [TD-056]
audience: internal
sensitivity: internal
---

# Meneer v1 Controlled Pilot Charter

## Decision Summary

The v1 pilot is a controlled, invite-only, real-transaction evaluation lasting 30 calendar days
from its approved activation date. Public marketing may remain available, but transactional access
is limited to an enrolled roster of adults in South Africa. Peptides are the only intended
transactional condition during this pilot. Pilot approval never constitutes public-launch approval.

The owner later identified BPC-157 plus TB-500, commonly called the “Wolverine stack,” as the
initial candidate pairing. This refinement does not approve or activate either product. The pairing
may enter the pilot only if the product-specific SAHPRA and charter activation gates are satisfied;
otherwise it must be removed from transactional scope.

This charter defines the release boundary; it does not activate the pilot. Every capability remains
disabled until the gate below is evidenced and the release owner records a go decision.

## Release-Scope Matrix

| Surface or journey                        | Current state                   | Controlled-pilot disposition                                                       | Public-launch implication                                                          |
| ----------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Public homepage and treatment information | Available                       | Available with approved claims                                                     | Requires full content, claim, SEO, accessibility, and production evidence          |
| Hair, ED, weight, and TRT transactions    | Gated                           | Disabled; information only                                                         | Separate clinical and operational approval required                                |
| Peptide transaction                       | Gated                           | Invite-only after every gate passes                                                | Pilot evidence does not automatically approve public access                        |
| /start account, consent, and intake       | Gated                           | Replace with real identity, consent, validation, and durable submission            | Requires production security, recovery, accessibility, and scale evidence          |
| Precise Wellness questionnaire hand-off   | Placeholder preserved in source | Enable only after partner, data, decision, and escalation controls are approved    | Requires monitored integration and contractual evidence                            |
| Payment and order                         | Not implemented                 | Real Stripe test/live boundary only after approved pricing and durable order state | Requires reconciliation, refunds, disputes, tax, and operational evidence          |
| Supply, hub dispatch, and delivery        | Not implemented                 | Manual operations are permitted only when documented and traceable                 | Requires measured capacity, exception, custody, and support evidence               |
| Posters and campaign QR routes            | Internal proof / gated          | Distribute only after TD-034 acceptance                                            | Requires production-domain and campaign governance                                 |
| General support                           | Public email address            | General and non-urgent only; monitoring must be confirmed                          | Requires published ownership, hours, escalation, privacy, and service expectations |

## Participant Boundary

- Participants must be at least 18, resident in South Africa, and present on an owner-controlled
  invitation roster.
- Public self-enrolment is not permitted during v1.
- Eligibility for participation is not clinical eligibility for treatment.
- An approved clinician or questionnaire pathway must still apply condition-specific exclusions,
  red flags, contraindications, and escalation.
- The cohort roster must not be committed to Git, RAG documents, screenshots, logs, or test fixtures.
- Only synthetic identities may be used before the approved production data boundary exists.

## Accountable Operating Roles

| Role                            | Provisional responsibility                                                                              | Activation evidence required                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OCTOTHORP ZA                    | Product, public website, release decision, general support, commercial and operations coordination      | Final responsible-party/contracting role, Information Officer/privacy ownership, named support and release operators                              |
| Consulting clinician            | Independent clinical discovery, consultation, eligibility, decision, follow-up, and clinical escalation | Real identity, HPCSA registration, availability, protocol approval, records responsibility                                                        |
| Precise Wellness                | Intended peptide questionnaire and dispensing decision/pathway                                          | Exact legal identity, pharmacy authority/Y-number, responsible pharmacist, data hand-off, questionnaire governance, outcome and escalation record |
| Secondary pharmacy              | Contingency only                                                                                        | Exact identity, authority, activation conditions, hand-off and responsibility                                                                     |
| Meneer distribution hub/courier | Custody, dispatch, delivery events, exceptions, reconciliation                                          | Named operators, stock/custody controls, courier agreement, proof of delivery and exception process                                               |
| Technology vendors              | Identity, database, email, hosting, payments, monitoring or storage as approved                         | Architecture decision, contracts, data map, security/privacy review, environment and exit evidence                                                |

No placeholder identity or registration may satisfy this table.

## Data and Transaction Boundary

The pilot may collect real participant information only after identity, versioned consent, approved
questionnaires, server validation, authorisation, encryption, retention, audit, support, incident,
backup, deletion, and vendor controls are implemented and tested. Every enabled submission must:

1. reach a durable monitored destination;
2. return a traceable outcome without false success;
3. identify the accountable clinical/dispensing decision-maker;
4. keep health information out of email, payment metadata, analytics, URLs, and public logs; and
5. support correction, withdrawal, incident, reconciliation, and authorised export/deletion.

## Monitoring and Success Measures

| Measure                                                                         | Pilot threshold                                                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Serious safety, privacy, or unauthorised-access incidents                       | Zero tolerated; any occurrence triggers an immediate stop and review                                    |
| False-success or lost enabled submissions                                       | Zero                                                                                                    |
| Enabled submissions with durable identifiers and reconciled outcomes            | 100%                                                                                                    |
| Clinical/dispensing decisions attributable to an authorised professional        | 100%                                                                                                    |
| Paid orders reconciled across payment, decision, supply, dispatch, and delivery | 100%                                                                                                    |
| Urgent or excluded users entering routine fulfilment                            | Zero                                                                                                    |
| Support and operational exceptions                                              | Recorded, owned, and resolved or explicitly carried into the exit review                                |
| Delivery target                                                                 | Measure against the provisional 3–5-business-day target; do not publish a guarantee until substantiated |
| Participant feedback                                                            | Collect privacy-safe usability, trust, clarity, support, and outcome feedback from the enrolled cohort  |

## Stop and Narrowing Criteria

The release owner must stop the affected journey immediately when:

- an urgent or excluded user can proceed into routine fulfilment;
- a submission, clinical decision, payment, order, or custody event is lost or cannot be reconciled;
- consent, access control, audit, encryption, privacy, or vendor boundaries fail;
- the clinician, pharmacy, urgent channel, support operator, stock, courier, or critical vendor is
  unavailable without an approved fallback;
- a serious adverse, privacy, security, regulatory, or misleading-claims incident occurs;
- production monitoring or incident escalation is unavailable; or
- the enabled experience materially differs from the approved scope.

The owner may narrow the cohort or disable a capability as a compensating action. Silence,
workarounds, or manual success messages are not acceptable continuations.

## Activation Gate

Before the 30-day clock starts, the release record must show:

- selected host, canonical domain, preview/production verification, logs, rollback, and ownership;
- approved participant roster process and access control;
- verified operator, clinician, pharmacy, responsible pharmacist, urgent and support channels;
- approved website and transactional privacy/terms/consent content;
- approved peptide products, questionnaire, dispensing basis, exclusions, escalation, and claims;
- durable identity, data, consent, audit, payment, order, fulfilment, and support workflows;
- monitoring, incident, reconciliation, backup/recovery, and emergency-disable evidence;
- passing type, build, focused/full quality thresholds, security checks, and end-to-end browser tests;
  and
- a dated go decision by the release owner plus named clinical, privacy, pharmacy, operations, and
  security/technical approvers.

## Exit and Public-Launch Separation

The pilot ends after 30 calendar days, an earlier stop decision, or completion of the approved
roster—whichever occurs first. The exit review classifies evidence as retain, improve, remove, or
defer; reconciles incidents, payments, orders, support and data; and records secure retention or
disposal. Continuing the pilot, expanding the cohort, or launching publicly requires a new decision.

Public launch additionally requires complete multi-condition pathways, final legal and clinical
content, production-scale security and operations, accessibility, SEO, observability, recovery,
support capacity, and resolution or accepted exceptions for all public-launch P0 debt.

## Approval

The repository owner approved the participant boundary, 30-day duration, peptide-only transaction
scope, operating roles, measures, stop criteria, and exit rule on 7 August 2026. Clinical, privacy,
pharmacy, operations, and technical activation approvals remain separate.
