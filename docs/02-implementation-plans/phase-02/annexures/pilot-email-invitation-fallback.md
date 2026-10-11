---
plan_id: phase-02-pilot-email-invitation-fallback
status: completed-local-hosted-release-gated
last_updated: 2026-10-11
---

# Pilot email invitation fallback

The owner requested an email fallback before providing the affected participant's email.
Audit found the standalone staff invitation service had no routed caller; existing email
conversion required a mobile claim first. This change emails a capability for the **existing
reviewed cohort participant**, not a second account or general public registration service.
A phone/participant roster record is still required.

## Implemented path

Assigned operations staff with current workforce MFA/context use **Send one email invitation**
in `/staff/mobile-invitations`, confirm contact authority and enter the intended participant's
address. A service-only native reservation rechecks tenant, role, session, assignment, roster
version and review. It rejects claimed/converted/terminal records, prior claims/managed email
exchanges, existing Auth/application email contacts and competing active email invitations.
No returning-account merge or unconfirmed-identity deletion is performed.

The reservation supersedes the unused SMS token and issues one new 48-hour capability on the
same participant. Only the digest is stored; the plaintext token exists in the current request
and intended email. One Brevo POST follows the committed lease. Exact replay, changed recipient
or key, uncertain delivery and process loss cannot acquire another send. The native channel
also caps reservations at ten per tenant per 24 hours. It neither consumes nor fabricates SMS
spend/delivery evidence. Other cohort participants remain unchanged.

The link opens existing `/mobile-invitation`: GET/scanners do not consume it; the fragment is
stripped before requests. Continue establishes the normal 15-minute claim. Email binding is
restricted to the addressed mailbox. A forwarded link cannot select another email. Separate
managed code verification retains creation provenance, OTP/session expiry and revocation,
immutable binding and atomic profile/document activation. The 48-hour invitation window does
not extend claim/code expiry. Questionnaire/payment next actions remain the existing portal.

Staff see only email `prepared`, `accepted`, `failed` or `uncertain` state in refreshed private
projections. `accepted` means provider acceptance, **not receipt, reading or onboarding**.
Definitive 4xx failure revokes the new token. Timeout/5xx/missing finish stays held, not retried.
Investigate and explicitly revoke/reprepare through the existing governed process if needed;
automatic resend and returning-account handling are outside this correction.

The journal has forced RLS, service-only RPCs, immutable state/recipient guards and the existing
orphan-reference quarantine trigger. It stores no plaintext email. Unconverted digests purge
30 days after terminal expiry/revocation/decline; digest-free attempts purge after 90 days via
the existing retention RPC. Converted evidence retains existing account-retention governance.

## Release sequence — not performed by local implementation

1. Owner commits/deploys code with fallback disabled. After explicit hosted approval apply only
   `20261011133000_pilot_email_invitation_fallback.sql`; verify history parity, ACLs and quarantine
   coverage. No production seed or duplicate cohort record is required.
2. Separately approve a controlled mailbox acceptance test and exact fixture cleanup.
3. Set `PILOT_EMAIL_INVITATIONS_MODE=brevo` in the Worker and explicitly approve the exact tenant's
   native `mobile_invitation_policies.email_delivery_enabled=true`. Both default disabled.
   Preserve existing tenant, redemption/email conversion gates, claim/preactivation keys,
   Supabase configuration and `BREVO_API_KEY`. No new secret/dependency is required.
4. Verify actual received sender/address/link, preserved fragment, scanner safety, code delivery,
   verification, profile/document activation and existing portal next actions. Check harmful
   link rewriting/tracking before cohort use. Plain-text composition does not prove provider
   tracking is disabled; no global marketing setting is changed by this code.
5. Obtain the affected participant's confirmed email and explicit authority for **one** send.
   No address is assumed for Zubin. The old SMS link is intentionally replaced.

No hosted migration, policy change, send, account or Worker deployment occurs in local tests.
Owner staging/commit/promotion control remains. This uses Brevo's documented
[transactional send API](https://developers.brevo.com/reference/send-transac-email), the existing
support sender and neutral plain text. Native one-shot reservation, not provider deduplication,
is authoritative. Actual mailbox acceptance remains a release gate.

## Verification

### Hosted release preparation — 11 October 2026

The owner confirmed commit `baec148` was deployed, then expressly approved this migration,
the pilot-specific channel and a controlled support-mailbox test with disposable fixtures and
scoped cleanup. Only `20261011133000_pilot_email_invitation_fallback.sql` was applied, with its
matching migration-history entry in the same transaction. The unrelated pending manual-product
fulfilment migration was not applied. Hosted readback confirms forced RLS and service-only
prepare/finish access; anonymous and authenticated roles cannot execute either function.

Only `meneer-pilot` (`80000000-0000-4000-8000-000000000001`) has its native
`email_delivery_enabled` policy approved/enabled. Worker version
`27e6dcb5-957f-4e52-a6e8-db1785e680bd` was prepared with
`PILOT_EMAIL_INVITATIONS_MODE=brevo`; owner promotion remains required. No invitation,
disposable account or provider send has occurred. The controlled received-email/OTP/conversion
acceptance and cleanup remain outstanding; this is not verified hosted completion.

Owner promotion of that version was independently confirmed at 100%. The first no-send
operator setup encountered the legitimate single-context MFA HTTP 204 response rather than
the harness's expected multi-context response. No participant/send lease/email was created;
its exact temporary operator and authority were removed, with original accounts preserved.
The harness now accepts either legitimate response and never treats a lost send response as
authority to retry.

For a removable acceptance packet, use a separate synthetic tenant rather than append test
facts to the real pilot's shared audit chain. The guarded
`scripts/rehearse-pilot-email-invitation.ts` prepares only that tenant and uses an ignored
UUID-only private manifest; it sends only to `support@meneerhealth.co.za`. Temporary version
`ee876b16-cedc-4fd8-b964-cb816c0087a2` points mobile invitations at the isolated tenant with
SMS dispatch/webhooks disabled. It remains unpromoted. During the short rehearsal real cohort
mobile links must not be exercised; their records and expiry are unchanged. Restore the pilot
configuration after the acceptance check using an owner-controlled forward restoration or
confirmed rollback to `27e6dcb5-957f-4e52-a6e8-db1785e680bd` as appropriate to Cloudflare's
changed-secret guard. No current identity/medical/payment keys are changed.

The cleanup packet rejects the real tenant as a root and real-tenant audit deletion. Only exact
manifested UUIDs, captured managed-creation identity lineage and their FK descendants may be
removed. Necessary named guards are restored before commit; unrelated affected-table rows are
fingerprinted inside the locked transaction, and original Auth identities are independently
checked afterward. Do not run this packet for a participant who supplied real medical data,
made a payment or exercised unrelated workflows.

The owner subsequently promoted isolated version `ee876b16-cedc-4fd8-b964-cb816c0087a2`.
One invitation to `support@meneerhealth.co.za` was accepted through the deployed HTTP boundary
using a disposable operator with genuine TOTP/AAL2. Exact request replay returned
`already_attempted`, not a second send. The temporary operator's grants and sessions were
revoked immediately afterward. Native readback reports one issued/accepted invitation and
zero claims, profiles or document receipts at the initial observation. No real-cohort invitation
was sent. The isolated tenant cleanup SQL passed an earlier rollback-only preparation check;
the populated packet must be checked again before committed cleanup.

The owner confirmed actual mailbox receipt, link activation, code verification and arrival at
the account-setup page. Profile activation failed: the disposable roster phone was not supplied
up front, and the original conversion also incorrectly capped its internal invitation at the
15-minute claim deadline. Profile acceptance, final scoped cleanup and owner restoration of
the pilot configuration remain outstanding. The last owner-promoted version is the isolated
test configuration; the new expiry correction below is not deployed by this local work.

Fresh local reset and full rollback-only regression pass **54 suites / 2,740 assertions**.
The new packet proves default-off policy, tenant/version/assignment/AAL2 denials, exact replay,
old SMS invalidation, addressed-mailbox binding, managed creation/session proof, document-gated
activation, one profile/two receipts and consumed-token denial. The first regression caught
missing orphan-reference coverage on the new journal; this was corrected before acceptance.

Focused application regression passes **seven files / 109 tests** across adapter errors, HTTP
auth/origin/schema/configuration gates, staff confirmation/clearing, provider uncertainty and
existing recipient code/conversion. TypeScript passes. Controlled local browser/axe checks
pass **26 desktop/Pixel-7 checks**, covering staff email action, real anonymous denial and the
existing fragment/claim/code/activation handoff, expiry, keyboard and storage boundaries.
The production client/Worker build, client-bundle canary, retired-MCP checks, lint, TypeScript,
discovery and portability checks pass. Local Supabase is stopped with its backup retained.
None of these counts claims hosted/provider acceptance or a complete full-unit-suite run.

## Resumable signup correction — 11 October

Owner requested preserving the 48-hour signup window while leaving OTPs at 15 minutes.
`20261011150000_resumable_invitation_onboarding.sql` separates the original invitation deadline
from claim and verification lifetimes. It preserves function owners, ACLs, security-definer,
search-path and volatility metadata with exact-shape assertions. It corrects only pending,
delivered, provenance-backed mobile account invitations whose deadline equals their original
claim deadline, within the still-live original invitation/version/token window. It does not
revive revoked, converted, replaced or retired invitations, extend their original 48 hours,
change hosted Auth code expiry, or alter existing staff accounts.

Apply the migration before deploying the new Worker caller. The existing strict read RPC
keeps its response unchanged; a separate service-only resume RPC supplies the server-selected
OTP type. This preserves compatibility with the old Worker during the database-first cutover.

After verification the atomic activation guards retain the exact provider/session, bound
email, current invitation/version/token, tenant and document checks. An elapsed claim alone
no longer invalidates a still-valid short preactivation proof. The preactivation cookie stays
at **at most ten minutes**; the mobile claim stays at **at most fifteen minutes**.

If verification expires, reopen the original SMS/email link. The same browser reuses its
still-live matching sealed claim; otherwise it starts a fresh fifteen-minute claim and binds
the same email. A private immutable one-shot resume lease permits an existing-account email
OTP (`shouldCreateUser:false`), never a second identity invitation. The server selects the OTP
type; a fresh provider session must postdate its lease. It replaces the pending verification
proof and rejects the superseded proof. Reservations cap at three per account/hour, eight per
invitation and ten per tenant/hour, in addition to HTTP/provider rate limits. A lost send
response does not permit repeating that lease.

Account setup distinguishes expired-cookie feedback from uncertain writes. It directs the
participant to reverify in another tab, then return and retry, preserving the current form
and idempotency key in memory. Nothing is saved to local/session storage; closing or reloading
the page loses unsaved form inputs. The phone must still match the invitation roster, and the
screen now explains that requirement. Native activation, not an email/link/phone alone,
remains authoritative.

Local acceptance: clean migration rebuild, **54 SQL suites / 2,767 assertions**, a no-send
real local Auth exercise that resumes after claim expiry and rejects superseded proof before
one atomic profile/two receipts, and **32 desktop/Pixel-7 browser/axe checks**. Exact local
fixture baseline/guards were restored. Production build, lint, TypeScript, portability,
discovery and unchanged generated routes passed. No hosted migration, additional email,
cohort change, staging, commit or deployment occurred in this correction.

The final Node-22 full unit run passed 187 files / 1,535 tests but hit the existing five-second
timeout in two stepped-flow accessibility tests while the local database rebuild was running.
Both passed unchanged on a focused rerun alongside the final invitation/configuration tests
(four files / 74 tests). This is not recorded as a clean full-suite pass. Changed-file formatting
passes; the repository-wide formatting command flags only the unrelated ignored
`.projects/cache/catalog.json`, which was left untouched.

Release requires owner source deployment, separately approved fresh OTP/profile
acceptance against the isolated fixture, scoped cleanup and owner configuration restoration.
Do not send Zubin's invitation or claim hosted signup completion before those steps pass.

### Approved hosted migration checkpoint — 11 October

The owner approved `20261011150000_resumable_invitation_onboarding.sql`, including its bounded
pending-deadline repair. It is now applied atomically to the canonical hosted Supabase project.
One eligible pending invitation was repaired inside its original live window. Auth-user and
client-profile row fingerprints are unchanged, as is the old strict read-function definition.
The migration's internal checks preserved the four edited functions' security metadata.

Independent readback verifies forced RLS, denied service-role direct table reads, the enabled
immutable lease guard, service-only resume functions with blank search paths, and the retired
inner primitive's restricted ACL. No resume lease was dispatched. History is recorded directly
as `20261011150000`, with the exact local SQL content; no history repair is required. Hosted Auth
still uses six-digit codes valid for 900 seconds. No email, SMS, provider account/session,
Worker configuration change, source deployment, Git staging or commit occurred in this step.

Deploy the matching application code next. Database migration success is not completed hosted
signup acceptance; retain the isolated rehearsal and real-cohort send gates above.

### Real-pilot interruption and restoration candidate — 11 October

The owner reported an SMS invitee could not proceed. Read-only native evidence showed that
participant's original invitation and token remained live/current, with no claim, email
exchange or converted account. The canonical Worker was still the isolated-mailbox version
`ee876b16-cedc-4fd8-b964-cb816c0087a2`; its tenant override excluded real-pilot invitations.
This was a rehearsal configuration interruption, not expiry or a reason to resend the SMS.

The owner authorised restoration. Same-code forward candidate
`ec12c0b0-7c78-4590-98d8-5cbb42ca8a1e` restores only `MOBILE_INVITATIONS_TENANT_ID` to the
real-pilot tenant, `MOBILE_INVITATIONS_MODE=telnyx`, `MOBILE_INVITATIONS_DELIVERY_READY=true`
and `MOBILE_INVITATIONS_WEBHOOK_MODE=telnyx`. Candidate readback confirms unchanged code
fingerprint, complete binding names/types and unchanged non-target binding metadata. No key,
payment/intake/product setting, message or account was changed. Production is still on the
rehearsal until the owner promotes this candidate; do not claim access is restored yet.

This immediate configuration restoration does not require a source commit. The separate
resumable-signup application changes still need the owner's commit/deployment after the
approved hosted migration. Existing valid SMS links should not be resent merely for this
configuration interruption. Do not repeat a tenant-switched rehearsal on the canonical site
while invited participants are active; prepare a separate staging Worker for further isolated
acceptance, with its own explicitly approved configuration.
