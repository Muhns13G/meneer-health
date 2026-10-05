---
decision_id: DR-018
title: Meneer Hosted Medical Intake Amendment
status: approved-engineering-release-gated
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA technology owner
effective_date: 2026-10-04
last_updated: 2026-10-05
supersedes: DR-014 and DR-017 external-only intake scope; not their account or clinical-authority boundaries
related_debt: [TD-009, TD-037, TD-038, TD-043]
---

# DR-018 — Meneer Hosted Medical Intake Amendment

## Approval and Source

The owner supplied Mikhail's `Meneer_Medical_History_Questionnaire_Draft.docx`, confirmed that
Dr Zee approved its questions without amendments, and approved recording a first-party questionnaire
plan before continuing Sprint 10. This is **owner-attested clinician approval**, not an independently
obtained signed approval. The source still bears its original draft title; preserve that provenance.

Source SHA-256: `76d412344cd59d1ae66c7a0fb97a58e41f0802467f094a18ae8df8c1443d467a`.
Keep the original source privately; no completed patient response or credential belongs in Git.
No questionnaire text is rewritten by this amendment.

On 5 October 2026 the owner approved I1's remaining engineering recommendations and authorised
an additional Meneer-side sex input to supply the observed generator requirement. The original
24 questionnaire items remain exact at source version 1.0.0; collection version 1.1.0 adds the
separately attributed field without changing Precise Wellness's software. No automatic male answer
is inferred from men's-health positioning. Sex is not conflated with gender identity, and no gender
identity question is added. This owner approval does not assert that Dr Zee approved the extension.
Clinical review of the rendered addition and instruments remains a pre-launch publication gate.
The [I1 contract](../02-implementation-plans/phase-02/annexures/sprint-10-i1-medical-intake-contract.md)
freezes local implementation semantics; named clinical/safety appointments, response configuration,
provider agreements and final domain approvals remain release gates, not synthetic evidence of readiness.

The owner also confirms bloods are part of the wider process but are not required to complete
initial onboarding or submit this questionnaire, including the peptide pathway. A clinician may
request tests later. This is not a waiver of clinical testing or treatment approval.

## Revised Operating Direction

The intended pilot journey is Meneer identity/profile and required instruments → protected Meneer
medical questionnaire → authorised review/manual transfer into the separate protocol generator →
independent nonclinical reconciliation. The external patient-intake link is **not a prerequisite**
for this selected path. No provider API, webhook, automated prescribing or browser automation is
authorised or assumed.

Meneer becomes a custodian of questionnaire responses in a purpose-bound medical-intake module.
The minimal account profile remains unchanged; do not add clinical answers, identity-document
numbers, measurements or date of birth to it. The provider/practitioner remains responsible for
clinical review, protocol decisions and prescribing. OCTOTHORP ZA's technology/operations role
does not become clinical decision authority through storage of responses.

The general operations queue continues to carry only opaque references and administrative status.
An operations membership, administrator privilege or queue assignment alone must not confer access
to medical answers. A separately approved purpose/assignment grant is required for manual transfer;
define its permitted actors and scope before implementing answer access.

## Controls to Settle Before Collection Is Enabled

- Preserve the eight approved sections and five conditional categories. Record field identifiers,
  requiredness, units, length limits, explicit negative/unknown answers and branch behaviour without
  inventing clinical questions or silently deleting approved ones.
- Retain the drafted mental-health and STI questions. Their reviewer-facing notes leave screening
  alternatives and escalation handling to be clarified. Do not add PHQ-9 or infer an approved triage
  algorithm. Freeze the responsible recipient, immediate guidance, hold/routing behaviour,
  acknowledgement, failure and fallback before enabling these flows.
- Name the permitted medical reviewers/manual-transfer staff privately. Define session assurance,
  assignment, time-bound access, audit and revocation without exposing answers to routine support,
  finance, administrators or analytics.
- Map this questionnaire to the actual generator inputs. Resolve missing fields explicitly; do not
  assume compatibility, silently transform answers or infer measurements/results.
- Amend the processing/recipient schedules and rendered privacy, clinical-review declaration and
  hand-off authorisation before collection. Preserve the source declaration as proposed wording;
  identify the actual reviewing arrangement rather than asserting a verified affiliation.
- Define medical-record retention, draft expiry, correction/version history, access/export,
  restriction/deletion, holds and recovery separately from account-profile retention. No automatic
  reuse of the profile's 90-day closure rule or marketing consent.

These are implementation and operating decisions, not withdrawal of approval for the questions.
They can be settled in the task packet without stopping unrelated Sprint 10 work.

## Existing Work and Release Boundary

Task 2.10.6 at `b2a3a1e` remains completed at its original locally verified boundary. Keep its
attempts, independent evidence, replay and cancellation controls. Leave external-link issuance and
destination configuration inactive; do not configure a staff-login URL or dummy URL just to satisfy
its guards. Reconcile the new manual-transfer path explicitly; do not substitute a synthetic payment
adapter in production. Link-specific implementation is retained history, not the new intake module.

[Sprint 10's additional intake tasks](../02-implementation-plans/phase-02/annexures/sprint-10-medical-intake-amendment.md)
must be complete before the revised full-journey rehearsal and closure. Sprint 11 payment proof,
Sprint 12 support/accessibility and Sprint 13 release approval remain separate. This amendment
activates no tenant, form, staff account, payment or hosted migration and closes no debt item.
