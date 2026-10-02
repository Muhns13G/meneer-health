---
decision_id: DR-017
title: Protocol Portal Capability and Manual Hand-off Boundary
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA operations and technology owners
required_approvers: [business_owner, repository_owner]
effective_date: 2026-10-02
supersedes: null
related_debt: [TD-009, TD-043]
last_updated: 2026-10-02
---

# DR-017 — Protocol Portal Capability and Manual Hand-off Boundary

## Context

Task 8.8 performed an authorised inspection of the separate protocol portal using an owner-supplied
provider account, followed by an owner-authorised synthetic end-to-end generation exercise. One
clearly labelled non-patient intake created a pending protocol; its summary, dosing, safety, editor
and delivery controls were inspected, and both PDF controls reported successful downloads. The
protocol was not approved, sent, printed, changed, ordered or dispensed. No notification address,
subscription or payment state was changed. The account was signed out after inspection. No
credential, provider-link identifier, synthetic health values or protocol content is stored here.

## Verified Capabilities

The authenticated provider surface visibly supports:

- a reusable provider-specific remote patient-intake link;
- provider-managed intake capture through a three-step workflow;
- a configurable notification email when a remote intake is submitted;
- intake and protocol lists with pending, approved and sent states;
- explicit practitioner review and approval;
- printable or downloadable short dosing and full rationale PDFs; and
- separate portal privacy and terms documents that place the final clinical decision on the
  treating practitioner.

The reusable patient link was also verified while signed out, and its empty first step failed
closed until identity fields and consent were supplied. A synthetic provider-managed intake
successfully generated a persistent pending protocol.

The browser contacts the portal's own Supabase-backed data service for account, role, intake,
profile and protocol records. That is an internal browser implementation detail, not a supported
Meneer integration contract.

## Capabilities Not Verified

The owner-supplied provider message states that dosage calculations use Precise Wellness pen
concentrations exclusively. Record this as a provider-stated constraint; concentration tables and
calculation correctness were not tested. Clinical approval must cover the actual formulation and
concentration before use; no calculation or dosage content belongs in Meneer's manual bridge.

No supported or documented API, webhook, callback registration, service account, machine export,
bulk export, partner event feed or Meneer-controlled integration was visible. No per-client intake
link, expiry/revocation control, delivery acknowledgement, role-administration surface or provider
audit export was verified. The owner-supplied onboarding message refers to subscription billing,
but current subscription, invoice and cancellation state were not independently inspected.

The synthetic exercise exposed two defects that prevent unqualified operational reliance: the
dashboard reported no pending work while the protocol library displayed pending protocols, and a
generated dose used inconsistent rounded values between its structured dosing fields and narrative
instruction. Download controls reported success, but the in-app browser did not expose the PDF
binaries for independent warning, dosing or layout verification.

The portal names Precise Wellness and identifies a reviewing-clinician boundary, but it does not
establish in repository evidence the exact juristic entity, registration, professional licence,
contract, processing allocation, pharmacy authority or escalation appointment required to activate
the pilot.

## Decision

1. The Phase 02 pilot retains a manual, auditable bridge. No API or webhook integration may be
   represented or built from the portal's private browser calls.
2. After the client completes Meneer's approved identity, acknowledgement and hand-off
   authorisation steps, an authorised staff member may direct the client to the externally hosted
   provider intake link through an approved private channel.
3. Meneer may store only its opaque case reference, hand-off owner, destination identifier digest,
   authorisation version, timestamps, acknowledgement state, operational status and exception
   evidence. It must not store the external URL, questionnaire answers, laboratory results,
   diagnosis, protocol rationale, dosage, prescription or PDF.
4. The provider portal remains authoritative for its intake, clinical review, protocol content and
   practitioner decision. Meneer staff manually reconcile only approved non-clinical states.
   They must use the protocol record itself rather than dashboard aggregate counts.
5. The reusable provider intake link is not a public marketing URL. It must remain outside search,
   analytics, logs, payment metadata and repository configuration until Sprint 10 implements a
   governed server-side hand-off boundary.
6. A future integration requires separately documented provider support, authentication,
   versioned contracts, minimum-data mapping, replay/idempotency behaviour, monitoring, incident
   handling, privacy/security review and rollback. Observing private Supabase requests is not
   permission or a stable contract.

## Sprint 10 Handoff Contract

The staff queue must support these non-clinical states without copying clinical content:

`ready_for_handoff` → `handed_off` → `provider_acknowledged` → `provider_review_pending` →
`provider_outcome_recorded` or `handoff_exception`.

Every transition requires an authorised actor, tenant/case scope, timestamp, idempotency key and
audit evidence. “Protocol approved”, product selection and dosage remain external clinical facts;
Meneer records only the minimum owner-approved operational outcome required to continue or stop its
own workflow.

## Consequences and Retained Gates

Task 8.8 is complete as a synthetic capability investigation. The verified patient-link,
generation, review-status and PDF-control capabilities are sufficient to design Sprint 10 without
duplicating clinical intake. They are not evidence that generated clinical content is correct.
TD-009 remains In progress because the exact external entities, contracts, privacy
allocation, professional/pharmacy authority and governed hand-off implementation are still
unverified. TD-007 additionally retains provider correction and clinician verification of the
observed dosing inconsistency. TD-043 remains Open because the clinical escalation owner and routed
fallback exercise remain outstanding.

The password disclosed for this investigation must be rotated before pilot use and must never be
placed in Git, shared credentials, ordinary email templates or Meneer runtime configuration.

## Review Triggers

Review before enabling a hand-off, changing the portal/provider, exposing an intake link, copying
portal content into Meneer, automating a status, using a portal export, adding a new account or role,
or implementing any API/webhook integration.

## Approval

| Approver role    | Evidence/reference                            | Decision                       | Date       |
| ---------------- | --------------------------------------------- | ------------------------------ | ---------- |
| Business owner   | Owner-supplied portal URL and provider access | Authorised capability review   | 2026-10-02 |
| Repository owner | Instruction to implement Task 2.8.8           | Approved within recorded scope | 2026-10-02 |
