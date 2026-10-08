---
plan_id: phase-02-sprint-14-9
title: Controlled Hosted Mobile Invitation Rehearsal
status: in-progress-runtime-fix-awaiting-restoration-and-deployment
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Task 2.14.9 — Hosted Mobile Rehearsal

## Current Checkpoint

Task 14.8 is committed at `48d624d625d888edef977ccafa186a5ca8546cfd`; the working tree
was clean before preparing this packet. Its local acceptance remains as recorded in the
[14.8 annexure](sprint-14-8-security-accessibility.md). The exact-commit origin CI run
[37808358975](https://github.com/Muhns13G/meneer-health/actions/runs/37808358975)
now passes. Preview-source CI [37807877946](https://github.com/Muhns13G/meneer-health/actions/runs/37807877946)
also passes at `679a4a99f6bd299d269a5092c89080c222d824f5`. Full source-tree comparison found
only the documented peptide preview route and draft-video differences.

The owner approved all bounded execution requirements. All six committed mobile migrations
below have been applied with their original filename versions; all 13 mobile tables have forced
RLS. The dedicated random 32-byte claim key and verified provider settings are saved in the
ignored operator file. No key, recipient, bearer, message body or OTP is recorded here.

The owner has authorised using one controlled handset for the SMS test. Its actual phone
number must remain outside Git and evidence documents. An isolated disposable workforce identity,
tenant, assignment, finite policy and synthetic-only instruments have been created after the
locked cleanup packet passed its rollback preflight. No SMS/email has been sent. A same-code
configuration version was promoted by the owner; real pilot activation remains disabled.
This is an interrupted-safe checkpoint, not completed provider acceptance.

## Execution Checkpoint — 8 October 2026

- Baseline: one suspended real tenant, 12 existing provider-gate configuration rows (eight disabled,
  four synthetic), zero Auth users and zero other application rows. Preserve exact count/hash and
  named-guard fingerprints privately; never delete the established provider-gate configuration.
- Verified provider: existing **MG iPhone SMS** profile, assigned active sender, ZA permitted,
  link shortening off, US$4.53 initial balance. Current published ZA international-alpha rate is
  US$0.098 per segment; two parts are expected to cost US$0.196. The approved one-message ceiling
  is US$1, conservatively reserved in the isolated policy; actual provider cost still needs proof.
- Shared profile webhooks and number assignment are unchanged. The adapter specifies its exact
  per-message callback and `use_profile_webhooks: false`; signed outbound delivery/failure receipts
  remain required even though the application does not accept SMS replies.
- Original Worker version: `e41d7458-5428-4d1a-a55e-1cec5f2e08ac`.
  Prepared rehearsal version: `db330d82-f25e-4a98-95b5-3d734983bbfd`; matching script etag was checked.
  The owner must promote it, then restore the original version before final fixture cleanup.
- Driver: `scripts/test-sprint14-hosted-mobile.ts`, explicit one-message/operator guards,
  private manifest, no blind resend, no automatic promotion/rollback. An active operator session
  awaits owner promotion; do not start a second fixture set. Recovery requires the existing private
  manifest, not broad table deletion or seed replay.
- Harness corrections: receipt mode is `telnyx`, not `enabled`; provider-gate baseline is preserved;
  terminal echo controls inherit the terminal descriptor. Typecheck and targeted ESLint pass;
  sender/callback/staff HTTP tests pass **61 assertions across three files**.
- Genuine workforce TOTP/AAL2 passed. Email-only staff access correctly returned **401** before an
  application session exists; the harness expectation was corrected from 403. An interrupted
  unverified factor was removed only from this manifested disposable identity before fresh TOTP.
  Resume uses the original private manifest and rollback cleanup preflight, not a new fixture set.
- Owner promoted the prepared version. One staff create/review/reserve/dispatch returned HTTP 200
  with **uncertain**, no provider message ID and no signed receipt. The held reservation remains
  intact; no blind resend occurred. Owner reported **no SMS received**. Telnyx's exact-recipient
  detail-record query returned zero records. No participant email/OTP or account conversion occurred.
- A no-send local **workerd** reproduction identified two native-runtime incompatibilities:
  `redirect: "error"` throws before transport, and invoking the native fetch as an adapter method
  gives it the wrong receiver. The narrow source fix uses `redirect: "manual"` and a global-fetch
  wrapper. Both fixes together return **accepted with exactly one intercepted synthetic call**;
  before the fixes the probe returned uncertain with zero calls. This supports the failure diagnosis
  but is not live Telnyx acceptance. Redirects still remain uncertain and are never followed/retried.
- Source corrections are local only. The owner must first restore original disabled version
  `e41d7458-5428-4d1a-a55e-1cec5f2e08ac`; then the active driver can revoke/remove its exact fixtures
  and independently verify the original count/hash/guard baseline. Do not deploy new source over
  this active rehearsal before cleanup, or reuse the uncertain attempt's consumed reservation.
- Updated regression packet passes **63 tests across three files**, strict TypeScript and targeted
  ESLint. Tests cover native-fetch receiver safety, manual no-follow redirects and one-shot behaviour.
  The driver supports manifest-based cleanup-only resumption after any dispatch; it cannot resend
  an interrupted attempt. The original active driver remains available for this attempt's cleanup.
- Outstanding: disabled restoration and cleanup, owner source commit/CI/deployment, separate approval
  for one further bounded SMS attempt, handset receipt/link confirmation, genuine signed callback,
  actual email OTP/atomic conversion, hosted replay/consumption denials and final restoration.

## Execution Inputs and Separate Approvals

Before execution:

1. Require successful exact-source CI and owner deployment evidence for the canonical Worker.
2. Approve applying only these six committed migrations, in order, without local seed data:
   - `20261008130000_mobile_invitation_foundation.sql`
   - `20261008143000_mobile_invitation_staff_commands.sql`
   - `20261008160000_mobile_invitation_delivery_intents.sql`
   - `20261008173000_mobile_invitation_delivery_receipts.sql`
   - `20261008200000_mobile_invitation_redemption.sql`
   - `20261008200100_mobile_invitation_email_conversion.sql`
3. Approve isolated disposable client/workforce identities, real workforce TOTP/AAL2,
   synthetic invitation/instrument/profile fixtures and email to an owner-controlled mailbox.
   Do not use real legal publication or real participant records as test fixtures.
4. Supply the server-only Telnyx API credential in the ignored operator environment. Verify
   owned profile, sender, signing public key, ZA route, balance, current all-in two-segment
   pricing and link-rewrite/tracking behaviour read-only before choosing positive budgets.
   Do not alter shared profile/webhooks. The adapter selects the exact per-message callback.
5. Approve a finite rehearsal spend cap and message count. Proposed scope is one invitation,
   at most two GSM-7 segments, with no automatic retry. A second send needs further approval.
   The approved monetary ceiling must cover verified fees; no free SMS allowance is assumed.
6. Approve generation of a separate random 32-byte mobile-claim key and saving it only in
   ignored/hosted secret stores. Never reuse existing recovery, journey or session keys.
7. Owner applies exact isolated-tenant runtime settings, records their prior state privately,
   and restores them afterward. No real pilot, payment, clinical or generator activation.
8. Approve scoped cleanup of manifested test rows and Auth sessions/users, including only
   necessary named immutable guards inside a locked transaction, restored before commit.
   Provider message/email records may remain under their separate provider retention.

Approval of a phone recipient alone is not permission for migrations, credential creation,
shared provider changes or unrestricted paid sends. Do not commit phone, mailbox, bearer,
OTP, SMS body, raw provider callback or credentials as rehearsal evidence.

## End-to-End Acceptance Sequence

- Establish independent hosted baseline counts, enabled guards and security metadata. Verify
  the real tenant is suspended and preserve unrelated data. Refuse ambiguous fixture provenance.
- Review/apply the approved migration packet and verify history, function ACLs and private RLS.
  A migration-history discrepancy needs separate narrowly scoped correction approval.
- Create one isolated rehearsal tenant, disposable current operations contact assignment,
  genuine workforce TOTP/AAL2 and exact synthetic document instruments.
- Configure finite attempt/segment/spend limits for only that tenant. Probe disabled/anonymous,
  wrong-origin and wrong-purpose paths before authorised dispatch.
- Use actual staff create/review/reserve/dispatch boundaries. Commit digest/version and held
  spend before the one Telnyx POST; record opaque lineage privately. Do not bypass the adapter
  with an unrelated direct provider message and call that application acceptance.
- Confirm actual handset receipt with the owner and independently reconcile genuine signed
  callbacks to the exact intent. API acceptance alone is insufficient. Missing/contradictory
  receipts remain uncertain; do not fabricate signatures or blindly resend.
- Open the real handset link: inert GET, fragment removal, first-party/no-tracking network,
  no-store/referrer/CSP, explicit claim, immutable email, actual email OTP/session verification
  and existing atomic profile/document activation. Confirm mailbox receipt separately.
- Verify unchanged 48-hour invitation and six-digit/900-second OTP boundaries, replay and
  consumed-link denial, plus bounded error/revocation checks without additional SMS spend.
  Record actual observations separately from local tests or simulated expiry evidence.
- Restore all temporary modes/settings, revoke exact disposable sessions, remove manifested
  fixtures and verify baseline/guards independently. Retain only redacted outcome evidence.
- Record deployed source/version, CI, migrated filenames, actual message count/spend, receipt,
  conversion, denials and cleanup results. Mark completed only after required evidence passes.

## Retained Release Gates

TD-066 remains open: isolated fixture cleanup is not an implemented operational orphan-retirement
job or approval of secondary-contact retention. TD-065 and applicable Sprint-13 legal, clinical,
commercial and release gates remain unchanged. This rehearsal cannot enable the real cohort or
establish stronger participant identity assurance than bearer-link plus verified mailbox ownership.

## File Accounting

This annexure and the operator driver are new; the Sprint-14 plan links the packet. The Telnyx
sender and its regression tests contain the narrow native-fetch fixes. No dependency or generated
output changed. Approved hosted migrations, isolated fixtures and ignored/prepared-version secrets
are recorded above. Nothing staged, committed, pushed or promoted by the agent. One app dispatch
attempt occurred, without confirmed provider acceptance/delivery; no email or real-pilot activation.
