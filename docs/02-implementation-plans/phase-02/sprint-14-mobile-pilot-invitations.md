---
plan_id: phase-02-sprint-14
title: Mobile Pilot Invitations and Email-Based Account Activation
status: in-progress
authority: owner-approved-direction
last_updated: 2026-10-08
owner: "@Muhns13G"
depends_on: [phase-02-sprint-09, phase-02-sprint-12, phase-02-sprint-13]
---

# Sprint 14 — Mobile Pilot Invitations

## Mission and Approved Scope

Extend Phase 02 with a bounded mobile invitation channel. Mikhail has participants' names and
phone numbers but cannot reliably supply their email addresses. Staff prepare invitations;
participants supply and verify their own email, then use the existing email-based account,
session and recovery journey. No phone-only authentication, public registration, marketing
campaign, clinical change, payment change or framework rebuild is included.

The owner approved **48-hour invitation-link validity**. This is separate from Supabase's existing
six-digit **900-second email OTP**; do not extend sign-in/recovery code validity. Opening an SMS
link does not issue an account session, reveal staff-supplied details or activate a patient.
Planning may proceed while Task 13.7 observes its first approved scheduled recovery success;
neither this plan nor Sprint 13 completion silently activates the pilot.

## Reconciliation with Existing Implementation

Sprint 9 already supplies staff-governed email invitations, code-only email verification,
atomic profile/document activation and private email-session/recovery boundaries. Its current
staff invitation service reserves email-addressed invitations before managed-provider delivery.
Sprint 14 must add a pre-email mobile invitation register and controlled conversion, not merely
replace the email string with a phone number or bypass activation evidence. Sprint 12 notification
delivery/retry/budget patterns are reusable boundaries, not proof of a Telnyx adapter.

On 8 October, read-only portal inspection confirmed the owner's US number is active, assigned to
the API-v2 "MG iPhone SMS" profile, with South Africa enabled. The current alpha sender is
"Octothorp"; both webhook endpoints target the existing `webhook.oitw.site` service. Worldwide
destinations are enabled and the profile daily spend limit is disabled. Do not disrupt that shared
integration without explicit approval. Available credit, exact pricing and actual handset delivery
remain unverified; no messages were sent and no provider configuration was changed.

The owner approved **one-way SMS invitations**: participants need not see the US number, and
local sender substitution is acceptable. Two-way messaging, a new number purchase and inbound
reply handling are outside this scope. Identify Meneer in the message and provide a working
support/decline/opt-out alternative; do not instruct recipients to reply STOP unless that reply
route is separately implemented and verified. Delivery-status callbacks remain required even
though conversational replies are not. Provider trials and real SMS sends require separately
approved recipients and spend bounds.

## Contract Decisions to Freeze in 14.1

The [14.1 contract](annexures/sprint-14-1-mobile-invitation-contract.md) records approved 48-hour
links, message direction and proposed 30-day unconverted-contact/90-day minimal-audit defaults.
The owner subsequently approves unique participant links plus email verification, with one active
invitation per tenant/phone, no extra SMS code or routine staff approval, and staff review only for
duplicate/mismatched contacts or existing-account conflicts. The contract is complete; the
[14.2 foundation](annexures/sprint-14-2-private-mobile-invitation-foundation.md) records local private
schema implementation and validation. No hosted SMS send is authorised. Sprint 13 blockers remain tracked separately.

- Private tenant-scoped register: given/family names, normalized E.164 phone number, provenance,
  contact-authority evidence, responsible staff member, state and expiry. No medical answers,
  product interest or clinical status in SMS or this register. Treat imports as personal data;
  keep participant lists out of Git, RAG, ordinary logs and test fixtures.
- Staff must confirm recipients expect a pilot invitation; a phone list is not blanket marketing
  consent. Approve the neutral SMS wording, communication purpose, decline/stop path, register
  retention and correction procedure before sending.
- Cryptographically random opaque link token, server-stored digest only, 48-hour expiry from
  issuance, revocable and single-use. Resend invalidates the prior token atomically; bounded
  staff authority, rate limits, idempotency and delivery budget prevent duplicate/cost races.
- GET, preview, security scanner or link prefetch must not consume an invitation. A deliberate
  first-party POST starts a bounded exchange; strip the URL token, prohibit third-party assets
  and tracking on redemption, use no-store/noindex and no-referrer. Keep bearer tokens out of
  provider callback fields, access logs, analytics and persisted browser storage. Final token
  transport/redaction design is an implementation gate, not presumed safe because opaque.
- Require verified email ownership before conversion into the existing invitation/activation
  path. Verification alone does not prove the person is the intended phone recipient: explicitly
  record the approved bearer-link/verified-email assurance limit. A forwarded link can be claimed
  by another mailbox owner; do not claim independent identity proof. Shared/recycled-number reports
  and participant mismatch go to staff exception review. No extra SMS challenge or SMS login.
- Define when single-use consumption occurs, how interrupted email verification resumes, OTP
  retries, conflicting email claims, existing accounts, duplicate phones and concurrent claims.
  No partial account activation or automatic merge; uncertain cases go to staff review.
- Delivery acknowledgement is not invitation acceptance or authentication. Durable provider facts
  retain only necessary opaque IDs/status/timestamps; signed callback verification, exact attribution,
  replay/conflict checks and uncertainty-preserving retry are mandatory.
- Use server-only Telnyx credentials with environment gates and spend/segment limits. Staff
  send/resend/revoke requires current tenant/purpose authority and AAL2. Public redemption learns
  nothing about roster membership through distinguishable responses.

## Commit-Sized Tasks

| Task  | Outcome                                                                                             | Acceptance boundary                                                                                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 14.1  | Completed: mobile invitation, binding, wording, retention and threat contract.                      | Unique link plus verified email; exceptions to staff; production sending/spend off pending provider proof.                                                                     |
| 14.2  | Completed locally: private register, token/claim digests, versions, expiry/revocation and journal.  | RLS/ACL/tenant isolation, no raw token columns, collision/expiry/replay and retention tests; no hosted migration or sending.                                                   |
| 14.3  | Completed locally: AAL2 staff commands and private register UI; sends reserve only.                 | Exact-purpose authority, duplicate handling, atomic supersession, budgets and audit; no provider sends.                                                                        |
| 14.4  | Completed locally: add server-only Telnyx sender port/adapter and bounded durable delivery intents. | Disabled defaults, provider failure/timeout/unknown outcomes, segment/cost controls and credential-safe tests.                                                                 |
| 14.5  | Completed locally: add attributed delivery webhook and reconciliation/support views.                | Signature/time/replay/conflict handling, no false delivery/acceptance, privacy-safe status and recovery.                                                                       |
| 14.6  | Completed locally: accessible 48-hour mobile redemption and email capture/exchange.                 | No GET consumption, URL/log/referrer safety, expiry/revoke/resend, concurrent claims and interruption recovery.                                                                |
| 14.7  | Completed locally: managed email verification and existing atomic profile/document activation.      | Current bearer/immutable email/actual provider session binding; OTP remains 900 seconds; conflicts fail closed, no session shortcuts.                                          |
| 14.8  | Completed locally: security/race packet, manual mobile acceptance and targeted regression fixes.    | Broad scan plus focused-fix evidence; exact-commit full CI required before hosted proof; no release/retention approval.                                                        |
| 14.9  | Conduct explicitly approved hosted Telnyx/phone/email synthetic rehearsal and cleanup.              | Owner deployment/migrations, approved controlled phone/mailbox and spend cap; actual handset receipt, link/OTP/activation and delivery reconciliation; restore gates/baseline. |
| 14.10 | Reconcile debt, release checklist, runbooks and Sprint/Phase reports.                               | Exact-commit CI, channel/privacy/recovery readiness, approved first-cohort limits and explicit owner go/no-go.                                                                 |

Commit after each completed task; the owner alone stages, commits, pushes and deploys. Task 14.9
is not permission to send to the real participant list. No hosted mutation, purchase, new credential,
message, migration or activation is authorised by this planning document.

The [14.9 hosted rehearsal packet](annexures/sprint-14-9-hosted-mobile-rehearsal.md) is prepared.
The owner has supplied a controlled handset; exact-commit CI, six hosted migrations, provider
configuration/pricing, a finite spend cap and bounded fixture/key/cleanup approvals remain
execution prerequisites. Preparation does not assert hosted acceptance.

## Readiness and Release Gates

14.1 is completed at its contract boundary; 14.2 is completed at its local schema boundary. The
[14.3 staff commands/UI](annexures/sprint-14-3-governed-mobile-invitation-staff.md) are implemented
locally; send/resend reserve requests without issuing tokens or contacting Telnyx. The
[14.4 delivery boundary](annexures/sprint-14-4-mobile-delivery-intents.md) is completed and verified
locally: it adds a server-only
one-shot sender/service and private, digest-only delivery intents with held spend and uncertain
outcomes. [14.5](annexures/sprint-14-5-attributed-mobile-delivery.md) adds signed, attributed callback
facts, immutable conflict reconciliation, private recovery status and guarded dispatch wiring.
The [14.6 redemption boundary](annexures/sprint-14-6-mobile-redemption.md) is completed locally:
inert first-party GET, protected digest exchange, bounded sealed claim cookie, immutable email
capture and terminal decline. Sending and redemption remain disabled pending authorised
hosted/provider proof and applicable release gates. [14.7](annexures/sprint-14-7-email-conversion.md)
now completes the local email-conversion boundary: one-shot provider reservation, real local Auth
OTP/session proof, bounded preactivation, guarded atomic terms/profile conversion and register
retention sweeping. This does not prove handset/mail delivery or hosted readiness. Neither saving an email nor receiving an SMS
creates an account or a session.
The [14.8 acceptance packet](annexures/sprint-14-8-security-accessibility.md) adds fixed local
rollback/fingerprint and actual concurrent no-send delivery checks. The owner confirms fresh mobile
VoiceOver/keyboard/400% zoom acceptance. Broad-scan and focused-fix regression evidence is recorded;
exact-commit full CI is required before the hosted rehearsal. No single all-green final local full run is claimed;
the [TD-066 design](annexures/sprint-14-unconverted-identity-recovery.md) is prepared, not implemented
retirement or policy approval. These checks do not activate the channel or close retained launch debt.
Parallel work does not
waive unfinished Sprint 13 quality/debt/release checks. Telnyx capability/cost inspection can be
read-only; operational sends need explicit authority and a controlled recipient.

Before real invitations: verify roster authority, approved wording/support path, exact deployed
source and migrations, minimum-data delivery processing, credential ownership/expiry, rate/spend
limits, staff AAL2, actual mobile acceptance and baseline cleanup. Before real profiles/intake:
close applicable privacy/operating gates and **Auth/private Storage recovery coverage** in addition
to reliable application backups. Protocol-generator reactivation remains deferred until needed;
do not promise a review/service timetable that the operating team cannot fulfil. Live payments
and clinical/product release remain separately authorised.

Sprint 13.10 should produce a conditional release/handoff to this extension, not falsely close
Phase 02 or activate this new channel. Phase 02 final closure is reconciled in 14.10 if this
extension remains the selected onboarding path. Existing debts retain their original criteria;
new gaps discovered during implementation must be recorded, not silently waived.

## Required Evidence and Handoff

Retain synthetic-only command/receipt lineage, delivery/expiry/revocation and conversion proof,
token/URL/log privacy checks, controlled actual receipt and accessible mobile journey, failures,
bounded cleanup, exact deployed version and CI. Produce a completion report under
`docs/03-completion-reports/phase-02/`, update this plan, relevant annexures, debt and RAG routing,
and document separate existing-file changes versus files created. Planned work is not implemented
state and this document does not assert a legal or clinical approval.

Provider references: [South Africa SMS guidance](https://support.telnyx.com/en/articles/6545173-south-africa-sms-guidelines),
[Telnyx two-way number availability](https://telnyx.com/release-notes/2-way-sms-numbers-added-in-mexico-and-south-africa),
[messaging documentation](https://developers.telnyx.com/docs/messaging/messages).
