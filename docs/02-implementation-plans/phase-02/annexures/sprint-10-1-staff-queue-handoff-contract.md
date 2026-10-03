---
evidence_id: phase-02-sprint-10-1-staff-queue-handoff-contract
title: Staff Queue, Assignment and Manual Hand-off Contract
status: completed-at-contract-level
task: 2.10.1
source_commit: 1b41ed49d4a809baddd77be2cc598ee6668359bd
completed: 2026-10-03
owner: "@Muhns13G"
related_debt: [TD-009, TD-043]
---

# Sprint 10.1 — Staff Queue and Manual Hand-off Contract

## Outcome and Prerequisite Reconciliation

This contract freezes the permissions, assignment rules, operational states and negative-path
requirements for Tasks 10.2–10.9. It implements Task 10.1's design outcome, not a working staff
queue, staff login, provider integration or pilot activation.

Sprint 09 supplies invitation orchestration, client identity/profile/publication/receipt records
and own-account session boundaries. Its hosted synthetic proof restored the suspended empty
pilot baseline; it does not appoint staff or approve real transactional publications.
TD-057's remediation is committed at the source checkpoint above. Exact-commit
[GitHub CI 37138262125](https://github.com/Muhns13G/meneer-health/actions/runs/37138262125)
passed on `itws-I`, satisfying the feature-development prerequisite. Post-deploy smoke remains
separate release evidence; this task changes no hosted configuration or data.

Authority: DR-003, DR-007, DR-012 (as amended by DR-013), DR-014, DR-015 and
[DR-017](../../../07-decisions/DR-017-protocol-portal-manual-handoff-boundary.md).
DR-011's historic product exclusion must not override DR-013's approved commercial direction.
Product transactions, clinical authority and provider appointments remain separately gated.

## Roles, Purpose and Separation of Duties

Reuse the existing role vocabulary; no new superuser or implicit “Meneer admin” authority.

| Role                                | Sprint 10 boundary                                                                                                                             | Explicit denial                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `operations`                        | Assigned case coordination, governed client invitation, claim/release, hand-off attempts and non-clinical reconciliation; purpose `operations` | Clinical intake, diagnosis, prescribing, treatment approval, protocol/PDF access, role grants and direct payment overrides |
| `support`                           | Assigned support-case minimum projection and escalation; purpose `support`                                                                     | Operations queue transitions, hand-off delivery and provider outcomes                                                      |
| `auditor`                           | Assigned evidence review under existing audit/privacy-review purposes; separate reviewed export boundary                                       | Editing cases, delivering referrals or granting own access                                                                 |
| `admin`                             | Scoped security administration and staff membership/assignment governance with privileged assurance                                            | Routine client-profile reads, case handling, clinical decisions or bypassing release gates                                 |
| `release`                           | Recorded release configuration/approval only                                                                                                   | Routine case/profile access or operational transitions                                                                     |
| `patient`                           | Own approved non-clinical projection and explicit hand-off authorisation                                                                       | Staff queue, internal reasons, assignment or provider-state mutation                                                       |
| External clinical/pharmacy/provider | No direct Meneer queue/database access                                                                                                         | Shared workforce login, service credentials or implied tenant membership                                                   |

Clinical/pharmacy roles retain their existing separately governed scope; this queue grants them
no additional clinical or commercial access. Role grants, publication and release approvals
cannot be self-approved. An operations user may record an attributed administrative hand-off
fact, not declare a protocol clinically correct. Provider acknowledgement must have independent
recipient evidence, not merely the delivering operator's success checkbox.

## Workforce and Assignment Contract

- Individual invited accounts require active, reviewed role membership and provider-verified
  AAL2. Email OTP alone is insufficient. Staff MFA uses the approved TOTP fallback; shared
  credentials and automatic role promotion are forbidden.
- Recheck provider and application session validity, tenant, current role, purpose, case
  assignment and workflow version on every read/command. Never trust browser role/tenant values,
  editable `user_metadata`, a stale claim or UI hiding.
- Preserve DR-007 maxima: ordinary workforce 15-minute idle/8-hour absolute; privileged
  administration 10-minute idle/4-hour absolute with recent MFA. Revocation, suspension,
  separation or removed assignment denies subsequent access.
- Queue eligibility requires an explicit server-held case assignment. An unclaimed case is not
  a tenant-wide browse grant. Initial assignment must be provisioned through reviewed governance;
  absent assignment leaves the case inaccessible to ordinary staff.
- Claim is a concurrency-controlled processing reservation **within** existing assignment,
  not a permission grant. One active claimant per case; release pauses processing without erasing
  the assignment or history. Assignment changes invalidate the former owner's reservation/access.
- Reassignment requires an attributed, scoped governance command and an eligible active recipient;
  it does not give the administrator routine profile access. Self-grant and silent reassignment
  are denied. Abandoned work is escalated for governed reassignment, never automatically handed off.

## Records and Minimum Projections

Task 10.2 introduces a separate operations aggregate, not new clinical transitions in
`contracts/workflows.ts`. Queue, assignment, claim, hand-off authorisation, attempt,
acknowledgement and exception records have opaque IDs, tenant/subject scope, versions and
server timestamps. Assignment and transition history is append-only and purpose-bound.

Queue lists show opaque case reference, operational state, assigned owner, age/timestamps,
readiness flags and coded exception. Assigned detail adds only DR-014's name, masked contact,
contact preference and verification/account status. No free-text queue notes, product names,
conditions, questionnaire answers, laboratory values, diagnoses, doses, prescriptions or PDFs.
Contact delivery uses a purpose-bound server operation; masked display is not a raw-contact export.

Keep the private provider intake destination in a governed server-side configuration boundary,
not a case record, repository constant, public environment variable, analytics or payment metadata.
Persist only its approved destination identifier/digest and version. Provider references must be
opaque and validated, never a URL or arbitrary pasted text. Exceptions use bounded codes such as
`destination_unavailable`, `authorisation_stale`, `acknowledgement_missing`,
`delivery_uncertain`, `version_conflict` and `provider_unavailable`.

## Queue and Hand-off States

Readiness is computed from committed facts, never client/operations-supplied booleans. Profile
activation, exact instrument receipts, current recipient authorisation and applicable commercial
readiness remain separate checks. Sprint 11 owns the deposit ledger: a mock payment flag cannot
unlock a real hand-off. Queue visibility does not require or imply payment or clinical approval.

Preserve DR-017's operational vocabulary:

| From → to                                               | Required fact/command                                                                                                                      | Meaning and prohibited inference                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Onboarding pending → `ready_for_handoff`                | Active account/profile, required effective receipts, verified recipient/method, unexpired unused authorisation and applicable payment gate | Administrative readiness only; no eligibility or treatment approval                                                           |
| `ready_for_handoff` → `handed_off`                      | Assigned claimant initiates a uniquely identified attempt; confirmed permitted-channel delivery is recorded                                | Direction to external intake; not completed intake or provider acknowledgement                                                |
| `handed_off` → `provider_acknowledged`                  | Attributed, independently sourced recipient acknowledgement matched to the attempt/reference                                               | Receipt only; absence or ambiguous response remains unresolved                                                                |
| `provider_acknowledged` → `provider_review_pending`     | Assigned operator reconciles an explicit provider record/status, not a dashboard count                                                     | External processing reported; no protocol contents copied                                                                     |
| `provider_review_pending` → `provider_outcome_recorded` | Authorised operator records bounded non-clinical outcome and evidence reference                                                            | Administrative `completed`, `unable_to_complete` or `client_declined`; not `clinical.approve` or authority to charge/dispense |
| Any nonterminal stage → `handoff_exception`             | Failure, withdrawal, expired/changed authorisation, uncertain delivery or abandoned work                                                   | Pause with coded reason and retained prior stage; no false completion                                                         |
| `handoff_exception` → prior permitted stage             | Reconcile the identified exception, revalidate all guards, append resolution                                                               | Never erase an attempt or blindly resend an uncertain delivery                                                                |
| Any nonterminal stage → `cancelled`                     | Authorised cancellation/withdrawal; cancel pending work and record its delivery boundary                                                   | Cannot retract already received external data; follow governed provider reconciliation                                        |

Onboarding pending is an operations waiting state, not a hand-off attempt. Terminal outcomes and
cancelled cases are immutable; later work requires a new linked case/authorisation, not historical
overwrite. A provider outcome does not move payment, clinical, dispensing or fulfilment aggregates.
Product/clinical outcomes needed for Sprint 11 require their own approved authority and projection.

Attempts separately track `prepared`, `delivery_pending`, `delivered`, `failed`, `uncertain`
or `cancelled`. Persist intent before delivery. A timeout after external delivery becomes uncertain;
query/reconcile before any new attempt. A definite pre-delivery failure may be retried with a new
attempt linked to the original failure and revalidated authorisation. Same idempotency key returns
the committed result, never sends again; different payload with the same key is rejected.

Every mutation atomically checks expected version, assignment/claim, current authority and audit
availability. State and audit commit together; failed audit means failed transition. A stale
version or competing claim fails without partial ownership, duplicate delivery or false success.

## Authorisation, Delivery and Break Glass

DR-015 requires a distinct unchecked recipient-specific authorisation immediately before hand-off:
verified recipient/role/notice, exact minimum fields, purpose, method and refusal consequence.
It expires unused after 30 days and on recipient/version change or pre-delivery withdrawal.
Missing party/contract/schedule, unpublished terms, stale hash/version, restricted account or
unapproved channel denies delivery. Refusal does not masquerade as failed clinical eligibility.

The retained DR-017 method directs the client to the provider's own intake; staff do **not** copy
the external questionnaire or generate a protocol inside Meneer. A generic private notification
contains no health/product detail. The provider-specific link is disclosed only by the approved
private hand-off mechanism, excluded from third-party tracking and ordinary queue logs.
No link forwarding through general support email, public redirect or automated portal scraping.
Task 10.6 must verify the actual private delivery method before enabling it.

Break glass remains **unavailable in v1**, retaining Task 5.20's disabled-and-audited posture.
No override button, fallback service role or emergency case read is introduced. Attempted bypass
is denied, recorded and routed through existing payload-free security monitoring. Support/clinical
escalation coordinates accountable people; it never bypasses permissions. A future break-glass
capability requires separate approval, AAL2, independent authorisation, expiry, audit and rehearsal.

## Audit, Client Status and Failure Proof

Audit records actor, tenant/case, action, old/new operational state, version, assignment change,
attempt/reference, authorisation version, timestamp, idempotency/correlation and safe reason code.
Never log contacts, intake URLs, tokens, protocol text or clinical facts. Task 10.7 extends existing
append-only audit/alert patterns for denial, reassignment, uncertainty and overdue acknowledgement;
an alert is not proof that a human responded. Retention follows DR-005, not indefinite queue storage.

Task 10.8 projects only own-client non-clinical waiting, action-required, external hand-off pending,
handoff recorded, paused or completed status. Internal reasons, staff identities, provider outcomes
and clinical interpretation stay out of that projection. Messages must not imply consultation,
treatment, payment or delivery success from a hand-off state.

| Required scenario                                                               | Expected proof / task owner                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Wrong tenant/role/purpose/assignment, anonymous or AAL1 request                 | Direct endpoint and database denial; no case existence leakage (10.2–10.4, 10.9)                 |
| Suspended tenant, revoked session/role/assignment, expired privileged context   | Immediate denial despite a previously valid cookie/JWT (10.3, 10.9)                              |
| Two claimants, stale version, duplicate/replayed command                        | One reservation/result; no second mutation or send (10.5–10.6, 10.9)                             |
| Missing/stale/withdrawn authorisation, changed recipient, missing payment gate  | No hand-off; separate refusal/readiness evidence (10.5–10.6, 10.9)                               |
| Portal unavailable, timeout after send, missing acknowledgement, abandoned case | Coded exception, owned escalation and safe reconciliation/retry (10.6–10.7, 10.9)                |
| Forged acknowledgement, clinical/product text or URL pasted as reference        | Strict validation/authority denial; no sensitive persisted payload (10.2, 10.6, 10.9)            |
| Audit/storage/alert failure                                                     | No false committed-success display; durable reconciliation and observable failure (10.7, 10.9)   |
| Client projection, keyboard and mobile queue                                    | Own-scope minimum fields, no internal leakage, accessible state/error handling (10.4, 10.8–10.9) |

Local fixtures remain synthetic `.invalid`; hosted migrations, temporary identities/emails and
provider exercises need explicit scoped approval. Never copy the local seed to hosted Supabase.

## Task Acceptance and Next Boundary

Task 10.1 completes the contract without changing application code, schema, public wording,
dependencies, secrets, Git state or hosting. TD-009 remains In progress and TD-043 Open: private
party/authority/contract evidence and routed escalation are still activation gates, not invented
appointments. No new debt ID is introduced. Task 10.2 may now implement portable records/contracts
and local permission/state/concurrency tests; Task 10.3 owns workforce UI/AAL2 integration.

Source inspection covered current authorisation policy, invitation helper, workflow contract,
security evidence service, Sprint 09 closure and the Task 8.8 portal investigation. Current
[Supabase MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa) confirms that AAL2 must
be enforced beyond the UI. The [changelog](https://supabase.com/changelog) was reviewed; no SDK,
Auth setting, extension or database-engine change is part of this contract task.
