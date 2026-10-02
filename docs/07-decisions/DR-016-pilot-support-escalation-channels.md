---
decision_id: DR-016
title: Pilot Support and Escalation Channel Activation Contract
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA operations, privacy and technology owners
required_approvers: [business_owner, repository_owner]
effective_date: 2026-10-02
supersedes: null
related_debt: [TD-009, TD-043]
last_updated: 2026-10-02
---

# DR-016 — Pilot Support and Escalation Channel Activation Contract

## Context and Scope

The current site correctly publishes only daily-monitored general support and South African
emergency numbers. The business owner confirms that three purpose-specific Meneer aliases are now
created and active. On 2 October 2026, Brevo SMTP accepted a payload-free synthetic message for
each destination and the business owner confirmed receipt of all three. This decision approves
their names, purpose and fail-closed activation contract. It does not publish them, appoint a named
clinician, prove operational fallback, or close TD-043.

## Approved Channel Register

| Purpose                          | Alias                           | Accountable role                         | Current state                         |
| -------------------------------- | ------------------------------- | ---------------------------------------- | ------------------------------------- |
| Privacy and data-subject rights  | `privacy@meneerhealth.co.za`    | OCTOTHORP ZA legal/privacy owner         | Active; synthetic receipt confirmed   |
| Service and commercial complaint | `complaints@meneerhealth.co.za` | OCTOTHORP ZA operations/complaints owner | Active; synthetic receipt confirmed   |
| Clinical/adverse-event routing   | `clinical@meneerhealth.co.za`   | Verified external clinical owner         | Active/received; provider-owner gated |

Named role holders remain in the private authorised-role roster. The external clinical owner,
professional authority and provider fallback remain
`[TBC — owner: external clinical owner — gate: Tasks 8.8 and 12.3]` and cannot be inferred from the
Precise Wellness software-support addresses.

## Channel Boundaries

### Privacy

The privacy alias is the initial contact point for access, correction, objection, restriction,
export, deletion/closure and privacy complaints concerning Meneer-controlled information. Ordinary
email must contain only enough information to request secure follow-up. Identity proof, health
information and request evidence move through the authenticated case route implemented later.

The Information Regulator complaint route remains an independent external escalation option. It
does not replace Meneer's internal privacy contact or accountable Information Officer governance.

### Complaints

The complaints alias receives service, accessibility, support, payment, refund and commercial
complaint notices. An email is not itself a completed cancellation, refund, chargeback or clinical
case. The owner must open the appropriate authenticated case, preserve acknowledgement/delivery
evidence and route payment or privacy matters to the responsible queue.

### Clinical and adverse events

The clinical alias may activate only after the external provider and professional owner are
independently verified and Sprint 12 verifies monitoring, acknowledgement, escalation and fallback.
Task 8.8 verified portal workflow but did not establish that authority. The alias must not be owned
solely by OCTOTHORP ZA non-clinical staff or routed to Precise Wellness's practitioner-software
support address as though that were patient care.

The alias is not an emergency service. Urgent or severe symptoms must continue to route to `112`
from a mobile, `10177` for an ambulance, or the nearest emergency facility. General support must
never promise to relay an urgent clinical message.

## Availability and Response Boundary

The pilot has no fixed or published business/operating hours for these asynchronous mailboxes. The
approved service target is to answer mail and queries within 24 hours where operationally possible.
This is a target, not a guaranteed service level or an emergency-response promise. Automated or
public wording must preserve the qualifier and must not imply continuous staffing.

The applicable channel owner and private alternate remain responsible for coverage. The external
clinical owner must approve clinical/adverse-event escalation and after-hours handling before the
clinical route is published. Urgent symptoms always use the emergency routes rather than waiting
for the 24-hour target.

## Delivery, Failure and Fallback Contract

Each channel must pass all of the following before activation:

1. The alias resolves to a company-controlled mailbox with MFA and least-privilege delegates.
2. An external synthetic message is delivered, acknowledged by the primary owner and recorded
   without sensitive content.
3. An approved alternate proves absence coverage without shared credentials.
4. A controlled routing failure or suppression is detected and produces an owned alert or queue
   item; the interface must not claim receipt from a client-side send action alone.
5. The fallback path is exercised: non-sensitive privacy/complaint routing may use the verified
   general-support mailbox, while clinical urgency uses emergency services and the provider's
   verified fallback—not general support.
6. Public wording states the purpose, monitored hours, acknowledgement expectation, sensitive-data
   restriction, emergency limitation and external escalation where applicable.

## Implementation Boundary

- Task 8.7 records the approved destinations, successful synthetic receipt, role ownership, no-
  fixed-hours policy, qualified 24-hour target and exact remaining activation proof.
- DR-017 verifies portal capability, but the protocol/clinical party and professional authority must
  still be verified before the clinical alias can activate.
- Sprint 12.3 implements the routed channels and acknowledgement behaviour.
- Sprint 12.8 exercises success, failure, acknowledgement, escalation and fallback with synthetic
  content. Only that evidence can close TD-043.
- Current `/contact`, `/privacy`, `/terms` and route-gate wording remains unchanged until activation
  proof exists.

## Consequences and Residual Gates

Task 8.7 is complete at the Sprint 08 channel-contract and delivery-evidence boundary. TD-043
remains Open because named private alternates, the external clinical owner, routed case handling,
controlled failure, after-hours escalation and fallback operation still require Sprint 12 proof.
The affected privacy-case, complaint and clinical/adverse-event journeys remain disabled.

## Source Basis

- [Information Regulator contact and POPIA complaint routes](https://inforegulator.org.za/contact-us/)
- [Precise Wellness public service boundary](https://precise-wellness.com/), which describes
  practitioner reference software and assigns final clinical decisions to the treating practitioner

These public sources establish only external escalation and software-support boundaries. Alias
creation, synthetic receipt and the qualified response target are supported by the owner and test
evidence recorded above.

## Review Triggers

Review before changing an alias, owner, purpose, hours, response target, fallback, provider,
emergency wording, secure case route or notification provider; and after any missed, misrouted or
false-success support event.

## Affected Documents

- `docs/00-blueprints/master-blueprint-v1.md`
- `docs/02-implementation-plans/phase-02/README.md`
- `docs/02-implementation-plans/phase-02/sprint-08-pilot-activation-contract.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/07-decisions/DR-012-minimum-pilot-responsibility-allocation.md`
- `docs/07-decisions/DR-015-pilot-transactional-instruments.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`

## Approval

| Approver role    | Evidence/reference                                                   | Decision                       | Date       |
| ---------------- | -------------------------------------------------------------------- | ------------------------------ | ---------- |
| Business owner   | Confirms aliases active, three receipts and qualified 24-hour target | Approved channel contract      | 2026-10-02 |
| Repository owner | Instruction to implement Task 2.8.7                                  | Approved within recorded scope | 2026-10-02 |

Applicable privacy, operations, clinical, security, accessibility and release approval remains
mandatory before publication.
