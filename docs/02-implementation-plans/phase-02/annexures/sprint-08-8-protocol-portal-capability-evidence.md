---
evidence_id: phase-02-sprint-08-8-protocol-portal-capability-evidence
title: Protocol Portal Synthetic End-to-End Capability Evidence
status: completed
task: 8.8
source_commit: ac82466
observed: 2026-10-02
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-009, TD-043]
---

# Sprint 08.8 — Protocol Portal Synthetic End-to-End Capability Evidence

## Outcome

An authorised provider account completed a clearly labelled synthetic provider-managed intake and
generated a persistent pending protocol. The exercise mapped all three intake steps, inspected the
generated Summary, Dosing, Safety and Delivery views, and exercised both PDF-generation controls.
No protocol was approved, sent, printed, edited, ordered, dispensed or used for a real person. No
supported API or webhook was found. [DR-017](../../../07-decisions/DR-017-protocol-portal-manual-handoff-boundary.md)
therefore retains a manual, auditable, minimum-data hand-off for Sprint 10.

## Evidence Matrix

| Capability                  | Authenticated observation                                         | Task decision                           |
| --------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| Provider access             | Provider login and dashboard succeeded                            | Available; rotate disclosed password    |
| Patient intake link         | Reusable link works without provider authentication               | Private staff-mediated hand-off only    |
| Provider intake             | Synthetic three-step intake generated a pending protocol          | Keep health data in provider portal     |
| Notification routing        | Intake-submission notification email can be configured            | External operations detail              |
| Workflow status             | Pending, approved and sent protocol states are visible            | Manually map minimum non-clinical state |
| Professional review         | Explicit provider review and approval controls exist              | Provider remains decision authority     |
| Human-readable export       | Both PDF controls reported successful downloads                   | Binary contents still need review       |
| Machine export              | No supported machine/bulk export was visible                      | Not available for integration design    |
| API/webhook                 | No documented API, webhook or callback configuration was visible  | Manual bridge retained                  |
| Account/role administration | No role-management surface was verified                           | Separate provider evidence required     |
| Subscription                | Authenticated functions were accessible; billing state unverified | No purchase or billing claim            |

## Safety and Privacy Handling

- The reusable patient link was verified while signed out. Link expiry, revocation, per-client
  isolation and unauthorised enumeration resistance remain unverified.
- Existing record summaries were visible in the lists; record details were not opened, changed,
  approved, exported or deleted. Their content is excluded from committed evidence.
- One clearly labelled synthetic provider-managed intake was submitted. It used an `.invalid`
  address and explicit warnings that it was not a real patient and must not trigger contact or
  dispensing. The resulting protocol remains pending in the external portal.
- No password, provider-specific identifier, patient identity or clinical content was copied into
  the repository.
- The account was signed out after inspection.
- Browser diagnostics showed portal-owned Supabase REST traffic. Those private endpoints are not a
  supported partner interface and must not be reverse-engineered into an integration.

## Manual Bridge for Sprint 10

The verified low-risk path is staff-mediated redirection to the external provider intake after
Meneer's recipient-specific authorisation is durably recorded. Meneer then stores only opaque
handoff evidence and manually reconciled non-clinical status. Questionnaire answers, laboratory
results, protocol content, dosage, prescription and PDFs remain in the provider system.

Sprint 10 must fail closed when the link is unavailable, the destination or authorisation version
is stale, acknowledgement is missing, an update conflicts, or an operator lacks the required
tenant, role, assignment, purpose or assurance context.

## Retained Gates

- Verify the exact external juristic entity, contract and privacy allocation.
- Verify the reviewing professional's authority and the clinical escalation appointment.
- Verify pharmacy, dispensing, product, custody and fulfilment authority separately.
- Verify the provider-stated dependence on Precise Wellness pen concentrations with the clinician;
  the synthetic output expressed one dose with inconsistent rounded values across its dosing
  fields and explanatory text. Resolve this with the provider before any clinical use.
- Reconcile the dashboard aggregate, which showed no pending work while the protocol library
  displayed pending protocols. Sprint 10 must not rely on the dashboard count as authority.
- Obtain provider approval for the intended staff-mediated patient-link process.
- Rotate the disclosed shared password and replace shared access with individual, MFA-protected
  accounts before pilot use.
- Implement and exercise the Sprint 10 queue, acknowledgement, exception and audit boundary.

These gates keep TD-009 In progress and TD-043 Open. They do not prevent Task 8.8 from completing
its planned capability-investigation outcome.

## Validation

- Empty first-step continuation produced field-specific errors for first name, last name, patient
  email and consent. Phone is optional. The signed-out patient intake also rejected an empty first
  step. Browser inputs do not carry native `required` attributes; application checks enforce it.
- Provider-managed step two requires sex, age, height and weight. Supported sex values are Male,
  Female, Intersex and Prefer not to say. Goals are optional and multi-select: metabolic, weight,
  performance, recovery, pain, sleep, cognition, mood, skin/hair, gut and longevity.
- Step three supports condition flags, pregnancy/breastfeeding state, medications/supplements,
  allergies, optional report uploads, manually entered lab values, additional notes and a final
  review. Report guidance accepts PDF or image files up to 10 MB and claims automatic extraction;
  no file was uploaded, so extraction accuracy and malware/content handling remain unverified.
- The 16-step tutorial describes an autosaved intake, a review summary before submission,
  automatic reading of blood-test PDFs, protocol generation/versioning, professional review and
  approval, and patient-ready PDF sharing. These are provider UI assertions, not exercised proof.
  The tutorial describes Summary, Dosing, Safety and Delivery tabs; no existing protocol was opened.
- Synthetic protocol generation completed and produced recommendations, rationale, dosing,
  contraindication warnings, monitoring, combination notes and delivery controls. The record is
  pending professional review. Dosing cannot be directly edited in the visible editor; a reviewer
  can add/remove recommendations and edit rationale, monitoring and combination notes.
- Both short and full PDF controls returned download-success messages. The in-app browser did not
  expose the downloaded binary for independent content/layout inspection, so do not claim that the
  patient PDFs faithfully preserve the reviewed warnings or dosing until separately verified.
- Dashboard pending counts contradicted the protocol library, and one generated dose was rounded
  inconsistently within the same protocol. These defects require provider resolution and a manual
  cross-check before the pilot may rely on the portal.
- Authenticated login and logout: passed.
- Provider intake submission and protocol generation: passed with synthetic data.
- Summary, dosing, safety, editing and delivery-control inspection: passed without approval/send.
- Supported API/webhook or machine-export discovery: none visible.
- Browser warning/error log during the exercise: empty.
- Repository runtime and hosted configuration: unchanged.
