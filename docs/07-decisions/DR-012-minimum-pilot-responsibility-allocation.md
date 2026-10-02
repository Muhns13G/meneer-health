---
decision_id: DR-012
title: Minimum Pilot Responsibility and Party Allocation
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA technology and operations owner
required_approvers: [business_owner, repository_owner]
effective_date: 2026-10-02
supersedes: DR-001-within-minimum-pilot-scope
superseded_by: DR-013-product-fulfilment-allocation-only
related_debt: [TD-009, TD-043]
---

# DR-012 — Minimum Pilot Responsibility and Party Allocation

> **Partial supersession:** DR-013 replaces this record's exclusion of pharmacy, custody, courier
> and product fulfilment. All other responsibility, data and support boundaries remain in force.

## Context

DR-001 approved a layered brand, technology/operations, clinical, pharmacy and fulfilment model but
left the transactional particulars open. DR-011 subsequently removed every product-specific
medicine, pharmacy, hub, courier and fulfilment transaction from the minimum pilot. The remaining
pilot needs a precise allocation for Meneer-owned onboarding, profile, acknowledgement, payment,
operations and manual protocol hand-off without representing OCTOTHORP ZA as a healthcare provider.

Private role-holder names and confidential agreements need not be stored in Git. An accountable
role or entity may be approved here only where its scope is explicit; an unverified party remains an
activation gate rather than a placeholder appointment.

## Decision

1. **Brand:** Meneer Health remains the customer-facing working brand. It is not a juristic entity,
   healthcare provider, pharmacy, prescriber or protocol authority.
2. **Meneer service counterparty and operator:** OCTOTHORP ZA (`K2024185008`) operates the website
   and will contract only for the approved Meneer-owned non-clinical pilot service. The exact paid
   line item, merchant/invoice/tax treatment and transactional terms remain Task 8.4 gates.
3. **Meneer information responsibility:** OCTOTHORP ZA is accountable for the identity, contact,
   profile, acknowledgement, payment-status, operational-status, support and audit information in
   the Meneer system. Its Information Officer/legal-privacy owner is maintained in the private
   authorised-role roster; no personal identity is inferred or published by this record.
4. **Technology operators:** Supabase, Cloudflare, Brevo, Better Stack, R2 and Stripe are limited to
   the purposes and data classes already approved in DR-009. Their service contracts, transfer
   basis and processor/subprocessor review remain privacy-release evidence, not new responsible
   parties for Meneer's business purposes.
5. **Clinical and protocol responsibility:** a separately contracting, independently authorised
   external protocol provider owns its intake, clinical/protocol decisions, records, professional
   support and safety escalation. `Precise Wellness` is retained only as the owner-confirmed portal
   identity until Task 8.8 verifies the exact juristic entity, professionals, contract, privacy
   role, intake-link behaviour and hand-off capability. No hand-off activates before that evidence.
6. **Pharmacy, hub, courier and product supply:** no party is appointed because those activities
   are outside the minimum pilot under DR-011. No pharmacy, dispensing, custody, dispatch, delivery,
   return or adverse-product responsibility may be implied by the pilot workflow.
7. **General support:** OCTOTHORP ZA owns the monitored `support@meneerhealth.co.za` channel for
   non-sensitive, non-urgent account and operations support. It is not a privacy-case submission,
   complaint, clinical advice, emergency or adverse-event channel.
8. **Dedicated escalation:** Task 8.7 must approve and verify the privacy, complaint and external
   clinical/protocol escalation channels, owners, hours and fallbacks. Until then, the affected
   processing and hand-off remain disabled. Public emergency routing to 112/10177 is safety
   guidance, not a Meneer support service.
9. **Release:** the Meneer business owner makes the pilot-scope decision; applicable private domain
   approvers must approve their evidence; the release owner records the final go/no-go. Repository
   approval and deployment never substitute for domain or release approval.

## Minimum-Pilot Responsibility Matrix

| Activity or record                                      | Accountable entity/role                     | Operational boundary                                                         |
| ------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| Brand, pilot scope and product direction                | Meneer business owner                       | May stop or narrow the pilot                                                 |
| Website, application and release implementation         | OCTOTHORP ZA technology owner               | No clinical or pharmacy authority                                            |
| Non-clinical pilot contract                             | OCTOTHORP ZA                                | Only after Tasks 8.4 and 8.6 approve the line item and terms                 |
| Meneer identity/profile/consent/operations data purpose | OCTOTHORP ZA legal/privacy owner            | DR-014 fixes the field catalogue; instruments remain Task 8.6                |
| Information Officer governance                          | OCTOTHORP ZA private authorised-role roster | Role appointment/evidence retained privately                                 |
| General account/operations support                      | OCTOTHORP ZA support owner                  | Monitored email; no sensitive or urgent payload                              |
| Protocol intake, decision and record                    | Verified external protocol provider         | Disabled until Task 8.8 verifies the party and contract                      |
| Clinical/protocol safety escalation                     | External protocol clinical owner            | Disabled until Task 8.7 verifies channel, hours and fallback                 |
| Privacy request and complaint handling                  | OCTOTHORP ZA legal/privacy owner            | Dedicated routes/channels remain Task 8.7 gates                              |
| Payment processing                                      | OCTOTHORP ZA commercial owner and Stripe    | Task 8.4 decides merchant/tax treatment; Task 11 implements sandbox evidence |
| Pharmacy, hub, courier and product fulfilment           | Not applicable to minimum pilot             | Prohibited by DR-011; a new decision is required                             |
| Final pilot release                                     | Release owner                               | Requires every applicable domain approval and Sprint 13 go/no-go             |

## Cross-Party Boundary

The protocol provider must receive only the minimum approved hand-off data through the Task 10
boundary. Meneer stores an opaque external reference, ownership/timestamps, acknowledgement,
status and exception evidence—not questionnaire answers, diagnosis, protocol content,
prescriptions or product selections. Each party supplies its own notice and exercises independent
authority over its own records unless a later approved agreement establishes another lawful model.

The participant must be told when they leave the Meneer-controlled service and which verified party
will receive their data before a hand-off occurs. Payment cannot be evidence of clinical acceptance,
and protocol completion cannot be inferred from a hand-off attempt.

## Explicit Retained Gates

- The external protocol provider's exact juristic entity, authorised professionals, contractual
  role, privacy allocation and authenticated portal capability remain unverified until Task 8.8.
- DR-014 approves the minimum profile field catalogue, purposes, classifications, lifecycle and
  staff projections. The transactional privacy notice, operator disclosures, data-transfer terms
  and acknowledgement/consent versions remain Task 8.6 inputs.
- The dedicated privacy, complaint and clinical/protocol channels remain Task 8.7 inputs.
- DR-013 completes the merchant, VAT-planning, invoice and payment policy; implementation and domain
  approval remain TD-010 gates.

These retained inputs keep TD-009 In progress. DR-013 supersedes the earlier product-role exclusion
with an intended pharmacy/custody/courier direction that remains unverified and fail-closed.

## Privacy, Security and Clinical Implications

- OCTOTHORP ZA may not use a provider's professional authority to broaden Meneer's purposes or
  access clinical content.
- The external provider receives no access to the Meneer tenant, database or staff portal merely
  because a manual hand-off exists.
- Technology providers process only the minimum classes already mapped in DR-009; secrets,
  credentials and unrestricted service access remain prohibited.
- A missing private role appointment, contract or dedicated channel fails closed.

## Review Triggers

Review before approving the Task 8.8 protocol party, enabling any hand-off or payment, adding health
or product information to Meneer, appointing a pharmacy/hub/courier, changing the contracting or
information-responsibility model, or selecting a successor framework.

## Affected Documents

- `docs/07-decisions/DR-001-operating-model-responsibility.md`
- `docs/02-implementation-plans/phase-02/sprint-08-pilot-activation-contract.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`
