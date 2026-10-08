---
plan_id: phase-02-sprint-14-1
title: Mobile Invitation Contract and Participant Verification Decision
status: completed-contract-execution-gated
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Task 2.14.1 — Mobile Invitation Contract

## Boundary

The owner requests Sprint 14 before resolving retained launch blockers. The
[Sprint 13 closure](../../../03-completion-reports/phase-02/sprint-13-pilot-rehearsal-release.md)
is completed with activation gates; real-client activation remains no-go. This task reconciles
the [Sprint 14 plan](../sprint-14-mobile-pilot-invitations.md) with actual invitation services,
records approved decisions and freezes the owner-selected participant-binding model. No schema,
runtime, hosted fixture, credential, message, spend or activation is changed. Git remains owner-controlled.

## Approved Decisions

- Staff supply minimal given/family names and a normalized E.164 phone, tenant, contact provenance,
  expected-invitation authority reference and responsible actor. No questionnaire/product data.
- Invitations last 48 hours from issuance; email sign-in/recovery OTP remains six digits/900 seconds.
  No phone-only login, public registration or clinical/commercial change.
- One-way SMS may use provider/local sender substitution. Identify Meneer in the text, not by
  assuming the displayed sender number identifies Meneer. Do not require replies to a US number.
- Owner-approved message direction on 8 October:

  > Meneer Health: Your pilot invitation: [link]. Valid 48 hours. Not for you? Do not share; use the link to decline. Help: support@meneerhealth.co.za.

  The placeholder is populated only with the exact first-party invitation URL. Rendering/encoding
  and segment limits are tested before any send. A working decline action must precede use of this
  wording; no reply-STOP mechanism is claimed. No marketing, health details or service guarantee.

- For unconverted invitations, proposed implementation defaults approved by the owner: remove
  names, phone and claimed email 30 days after expiry/revocation, retain minimal non-contact audit
  evidence for 90 days. These are not clinical/account-record retention rules. Final privacy review,
  backup reconciliation and any justified hold must be settled before real use. Converted contacts
  follow the existing separately approved account lifecycle; conversion must not reset expiry silently.
- Provider sending defaults off. Actual pricing, credit, controlled recipient and monetary/segment
  caps remain required before 14.9; approval of wording is not spending authority. Existing shared
  Telnyx profile/webhooks must not be changed without separate approval.

## Actual Existing Invitation Boundary

`StaffPatientInvitationService` verifies workforce AAL2, reserves an email-addressed invitation,
then invokes managed-provider delivery and binds the provider subject. A failed delivery closes the
reservation; replay must not send another provider invitation. This is not a pre-email mobile register.

`PatientInvitationVerificationService` verifies a delivered invitation, exact normalized email
digest, six-digit code, current tenant/provider subject and confirmed email. Provider code success
alone does not establish application authority; failed post-verification checks revoke the local
session. Sprint 14 must preserve these checks and existing profile/instrument activation.

Do not substitute a phone into the email service or mint an application session merely from a
mobile link. Convert only after the approved unique-link claim and verified email satisfy
the governed invitation boundary; no automatic merge with an existing account.

## Approved Binding — Unique Link Plus Verified Email

The owner approves the clarified flow on 8 October: staff save name, surname and phone; the
system sends that participant's unique SMS link; the participant supplies/verifies email and
completes existing registration/onboarding. No fresh SMS-code challenge or routine staff approval
is required between link redemption and email verification. Earlier alternatives are not selected.

The approved v1 assumption is one participant per normalized phone within the pilot tenant.
Enforce one active invitation per tenant/phone and prevent a converted phone being automatically
assigned to a second account. Duplicate phone, existing-account/email, recycled-number reports or
identity mismatch require staff exception review; no cross-tenant roster disclosure or automatic
merge. Correcting an unconverted contact requires AAL2 staff authority, a version check and
revocation of old token/exchange authority before reissuance.

The unique link is a bearer invitation, not independent civil-identity or fresh phone-ownership
verification. The owner accepts the simpler flow after discussion of forwarded-link risk. A person
given the link may control a different mailbox; single use prevents later duplicate conversion but
does not establish the first claimant is the intended person. Do not advertise stronger assurance.

### Frozen Claim, Conversion and Interruption Semantics

1. Staff create the private register entry. A bounded send reserves one versioned delivery intent;
   actual token issuance starts the 48-hour clock. Each current invitation has its own token.
2. GET/scanner visits do nothing. Deliberate protected POST exchanges the token for a short-lived
   server-sealed HttpOnly/Secure/SameSite claim cookie, bound to invitation/version. No account
   session, profile or staff-supplied name/phone is disclosed. One current claim is reserved atomically.
3. Normalize/bind the supplied email to that claim before invoking the existing email invitation
   boundary. Limit claim authority to 15 minutes or the remaining invitation lifetime, whichever
   is shorter. Email OTP validity remains 900 seconds; it never extends the invitation clock.
4. Existing governed provider/email verification and current invitation checks precede atomic
   conversion to one stable subject. Only successful verified conversion consumes the invitation
   permanently. Record lineage without raw token/code or SMS body in ordinary audit records.
5. The same current claim/request key may resume interrupted verification within its lifetime;
   another claimant cannot replace its email or create another provider invitation. Conflict or
   uncertain delivery is held for reconciliation, not reported as a successful account. Expired
   claims fail closed; a fresh explicit redemption may resume only the same bound email while
   the invitation remains current. An email correction needs staff revocation/reissue.
6. Resend/revoke invalidates the old token and all dependent claim authority atomically. Replayed
   converted/expired/revoked/superseded links cannot register another account. Decline revokes the
   current invitation and suppresses automatic resends; staff must obtain renewed contact authority.

## Required Security and State Contract for Subsequent Tasks

- Private tenant/purpose/AAL2 staff commands; current authority is checked on every mutation.
  Duplicate phones, email conflicts and concurrent claims fail closed without exposing roster data.
- High-entropy opaque invitation token; only digest in invitation storage, expiry and revocation
  checked server-side. A resend supersedes the old token atomically and remains budgeted/audited.
- Fragment transport avoids putting the token in HTTP path/query: strip it immediately
  from browser history, keep it transient and exchange only through deliberate protected POST.
  No GET/scanner consumption, third-party assets/tracking or persistent browser token storage.
  Verify token-bearing responses, referrers, request logs and provider metadata remain contained.
- Apply the frozen claim/consumption/interruption semantics. One live
  exchange per current invitation; verified conversion is atomic and replay-safe. Retrying an
  interrupted operation does not revive superseded authority or send repeated invitations.
- Durable delivery facts distinguish request/acceptance/delivery from participant acceptance.
  Persist only the digest, not plaintext link tokens, in register/outbox/provider journals. Generate
  the token during the authorised send invocation, commit its digest/version before dispatch and
  retain the raw token only transiently for that exact provider request. Crash/timeout after issue
  leaves an uncertain intent; reconcile attributed provider facts or use an explicit budgeted staff
  supersession, never reconstruct the token from its digest or blindly repeat the send. Detailed
  adapter transport tests belong to 14.4; no blanket provider idempotency guarantee is assumed.
- Signed, timestamp-bounded, attributed callbacks; duplicates/conflicts must not manufacture
  delivery or activation. No existing shared webhook/profile disruption or undocumented fallback.
- Local synthetic tests precede separately authorised hosted migrations, handset/email proof,
  actual spend, cleanup and disabled restoration. No real cohort is authorised by engineering.

## Acceptance and Handoff

14.1 is **completed at the contract boundary**: unique-link/email binding, exceptions, wording,
retention, token/claim/consumption semantics and threat controls are settled. Local/schema work may
proceed in 14.2. For local adapter design, enforce a maximum two SMS segments, three staff-issued
attempts per invitation in 24 hours and a configurable tenant/day reservation cap; no automatic
resend. The production spend ceiling remains zero while sending is disabled. Actual pricing,
nonzero per-message/daily limits, credit/headroom and rehearsal spend are execution inputs that
must be explicitly approved before 14.9. This contract does not invent a free SMS allowance.
The ten-task order remains unchanged; task completion never stages or commits files automatically.

Provider context checked against official documentation on 8 October: Telnyx states South Africa
alphanumeric sender IDs are overwritten with local long codes. This supports the approved display
expectation, not guaranteed handset delivery or current account readiness:
[South Africa SMS guidance](https://support.telnyx.com/en/articles/6545173-south-africa-sms-guidelines),
[Messaging API](https://developers.telnyx.com/docs/messaging/messages/send-message).
