---
plan_id: phase-02-sprint-14-9
title: Controlled Hosted Mobile Invitation Rehearsal
status: in-progress-sender-rewrite-fix-awaiting-deployment-and-retest
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
locked cleanup packet passed its rollback preflight. One uncertain SMS dispatch was attempted;
no handset delivery was confirmed and no email was sent. The owner restored the original Worker
version and the manifested fixtures have now been removed; real pilot activation remains disabled.
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
  The owner promoted it, then restored the original version before final fixture cleanup.
- Driver: `scripts/test-sprint14-hosted-mobile.ts`, explicit one-message/operator guards,
  private manifest, no blind resend, no automatic promotion/rollback. The interrupted operator
  session was recovered for cleanup only using the existing private manifest, not broad table
  deletion or seed replay.
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
- Source corrections are local only. The owner restored original disabled version
  `e41d7458-5428-4d1a-a55e-1cec5f2e08ac` at 100%; manifest-based cleanup verified the active version
  and matching source etag before revoking sessions and removing only the exact test fixtures.
  Do not reuse the uncertain attempt's consumed reservation.
- Updated regression packet passes **63 tests across three files**, strict TypeScript and targeted
  ESLint. Tests cover native-fetch receiver safety, manual no-follow redirects and one-shot behaviour.
  The driver supports manifest-based cleanup-only resumption after any dispatch; it cannot resend
  an interrupted attempt. Cleanup-only resumption exited successfully with `restored: true`.
- Final cleanup compared every saved application-table count/hash and named-guard fingerprint
  against the original baseline. A separate read-only Supabase check confirmed one suspended tenant,
  12 preserved provider-gate rows, zero Auth users/sessions/refresh tokens, zero mobile invitations
  and zero disabled guards. No additional SMS or email was sent during cleanup.
- Outstanding: owner source commit/CI/deployment, separate approval
  for one further bounded SMS attempt, handset receipt/link confirmation, genuine signed callback,
  actual email OTP/atomic conversion, hosted replay/consumption denials and final restoration.

## Execution Inputs and Separate Approvals

### Second Authorised Attempt — Fixed Runtime

The owner committed the runtime fixes at `5b55e58` and promoted fixed version
`5530f935-c084-4277-b169-e7b373011ff2`. A same-code disabled baseline was prepared and
owner-promoted as `6736af23-3749-4647-bb8d-2a449ac6d903`; script etags matched. After separately
authorising one additional SMS within US$1, the owner promoted isolated configuration version
`317c7635-4b26-4c2d-bc1e-ea521955d2c5` for fresh manifested fixtures.

Genuine workforce TOTP/AAL2 and email-only denial passed. Exactly one application dispatch returned
HTTP 200 with `uncertain`. Telnyx's exact-recipient record independently reports **delivered**,
two parts and **US$0.196**; the owner confirmed handset receipt and successful invitation-page load.
No resend or participant email/OTP/conversion occurred. No signed delivery receipt was retained.

Read-only comparison found the provider message's profile and recipient matched, but its sender
was rewritten to the existing shared profile's configured alphanumeric sender rather than the
configured US E.164 sender. The adapter's exact sender check therefore retains uncertainty; the
callback parser likewise currently requires the E.164 sender. The shared profile and webhooks
were not changed. Recognition of an explicitly configured provider sender rewrite needs a bounded
acceptance/callback fix; arbitrary mismatches must remain denied. Do not manually bind a provider
ID or fabricate a signed receipt to advance this attempt.

The initial `versions deploy` restoration was blocked by Cloudflare code 10220 because the six
mobile settings changed. The owner used `wrangler rollback`, explicitly confirmed exactly those
six settings, and restored `6736af23-3749-4647-bb8d-2a449ac6d903` at 100%. The driver verified the
active version and source etag, revoked disposable sessions, deleted only manifested fixtures,
and exited successfully with `restored: true`. All saved application count/hash and named-guard
fingerprints matched the original baseline. Independent read-only verification confirms one
suspended tenant, 12 preserved provider gates, zero Auth users/sessions/refresh tokens, zero mobile
invitations and zero disabled guards. Telnyx retains its delivered test-message record; it was not
deleted or resent. Task 14.9 remains incomplete despite successful SMS delivery: sender-rewrite
acceptance/callback handling and the remaining hosted onboarding proof are still outstanding.

### Sender-Rewrite Correction — Local Implementation

Optional server-only `TELNYX_ALPHA_SENDER` now allowlists the exact owner-verified profile sender
(1–11 ASCII letters/digits/spaces, containing a letter, no surrounding whitespace). With it absent,
the original E.164-only check remains. No arbitrary sender, case folding, provider-derived dynamic
trust or shared profile mutation is introduced. API acceptance still requires the exact profile,
recipient, message shape, parts and bounded cost, and never substitutes for signed delivery.

The signed receipt parser uses the same exact allowlist, then canonicalises the validated sender
to the configured dispatch E.164 identity for existing database correlation. Signature/freshness,
profile, recipient, token digest and outcome checks remain unchanged; no migration, manually bound
provider ID or fabricated receipt is needed. The staff readiness check requires the same sender
configuration for dispatch and callbacks. The rehearsal driver verifies the profile's current
`alpha_sender` against the explicit local setting before creating fixtures, and provisions that
setting only for an owner-promoted isolated version.

Sender/callback/staff tests pass **72 assertions across three files**, including exact alpha
acceptance, absent/wrong/case-changed sender denial, malformed settings and wrong-profile signed
callback denial. The actual local workerd no-send probe accepted the configured alpha rewrite with
exactly one intercepted synthetic call. The final complete Vitest run passes **1,133 tests across
151 files**; the catalogue expectation was updated for the added optional server value. Strict
TypeScript and focused ESLint pass. These results
are local implementation evidence only: owner commit/CI/deployment, a separately authorised fresh
hosted attempt, signed callback attribution, email OTP/atomic conversion and final restoration
remain required. Earlier test-message records are retained at Telnyx; no additional send occurred
while implementing this correction.

Provider basis: Telnyx documents the profile's alphanumeric sender for outbound international
messages in its [messaging profile guide](https://support.telnyx.com/en/articles/3562059-setting-up-a-messaging-profile).

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

The earlier runtime fix and operator driver are committed at `5b55e58`. The current sender-rewrite
correction touches only:

- `.env.example`: optional exact sender configuration guidance.
- `config/environment-catalogue.ts` and `src/config/environment.test.ts`: server-only catalogue and
  its exact expected list.
- `src/server/identity/mobile-provider-sender.ts`: new shared exact-match/validated-alpha helper.
- `src/server/identity/mobile-invitation-delivery-config.ts`: optional validated alpha setting.
- `src/adapters/identity/telnyx/telnyx-mobile-invitation-sender.ts` and its colocated test: exact
  rewrite acceptance and denial regressions; original outbound number remains unchanged.
- `src/server/identity/mobile-invitation-receipts.ts` and its colocated test: signed rewrite
  validation and canonical dispatch correlation, with untrusted sender/profile denial.
- `src/server/identity/mobile-invitation-http.ts`: matching sender readiness for dispatch/callback.
- `scripts/test-sprint14-hosted-mobile.ts`: independent profile preflight and optional configuration.
- This annexure and `docs/06-operations/environment-secrets-runbook.md`: evidence and release guidance.

No dependency, migration, generated output or shared provider configuration changed in this
correction. The production build, client-bundle scan, MCP-absence, generated-route, Worker type,
portability and discovery checks pass. Nothing staged, committed, pushed or promoted by the agent.
Two app dispatch attempts have occurred across separately approved rehearsals; the second delivered
for US$0.196 but was not attributed by the application. Both hosted fixture sets are cleaned and
disabled settings restored. No participant email/conversion or real-pilot activation occurred.
