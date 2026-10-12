# Public referral onboarding and compact account documents

Owner-approved change, 12 October 2026. Canonical origin remains `https://meneerhealth.co.za`.
This is an entry/registration change, not approval to widen clinical, dispensing or payment scope.

## Contract

`Start privately` opens `/start`: email → one email OTP → minimum profile and account actions →
questionnaire → the existing governed deposit/order journey. Returning active accounts reuse the
verified provider session and enter their portal. New accounts receive only a sealed, short-lived
activation continuation; a verified email alone creates no application membership or profile.

Terms and privacy documents open in native, keyboard-accessible modals instead of occupying the
whole signup page. Their bodies, exact version/hash, download and separate unchecked actions remain.
No separate document-review screen is required. Closing a modal does not accept anything, and
account acceptance does not replace medical consent or disclosure authorisation.

Existing completed clients can sign in normally. Existing pending staff/mobile invitations are
not replaced, revoked or converted by this public path: those clients finish through their original
invitation. Expired admissions remain history; a fresh verified public registration can create a
new admission without reviving an old one. No source can be changed after insertion.

## Engineering and release state

The local migration `20261012130000_public_patient_registration.sql` adds a separate private,
default-off tenant policy and a service-only verified admission command. Patient activation still
uses the existing atomic profile/terms/privacy receipt transaction. A late public-policy disable
rolls activation back. No staff role, assignment, medical grant or payment approval is inferred.

The signup endpoint admits only its configured tenant, canonical host, strict form fields, origin
and rate checks. Email-send reservations are serialized: three per normalized contact/hour and
100 per tenant/hour; exhausted/uncertain requests are not blindly resent. The budget stores only
restricted contact digests, not raw email, and purges its hot entries older than 24 hours when used.
Digests are not anonymous data. Archive retention and restore controls still apply.

Provider readiness requires email signup enabled, mandatory email confirmation, email provider
enabled and anonymous users disabled. Unknown/unavailable settings fail closed. Supabase's email
OTP workflow is documented in its [passwordless guide](https://supabase.com/docs/guides/auth/auth-email-passwordless);
the [Auth settings response](https://github.com/supabase/auth/blob/master/internal/api/settings.go)
defines the checked provider flags. Existing sign-in continues using `shouldCreateUser: false`;
only the distinct public operation uses `true`.

Local engineering acceptance is complete. The owner reports committing and deploying the source;
read-only canonical-origin checks on 12 October confirm the new `/start` wording is serving and
signup availability returns HTTP 412 with private/no-store headers. The local tree was clean at
commit `274b954`. This is not proof of public-signup activation or an authenticated user journey.

After explicit owner approval, migration `20261012130000_public_patient_registration.sql` was
applied to hosted project `gibfpolrdjotwvewgfsz` in one guarded transaction, with its matching
version/name/source stored in migration history. Independent readback verifies exact local source,
forced RLS, no direct anon/authenticated/service access to the private tables, and service-only
public RPC execution. Existing invitation rows and existing function definitions/security metadata
were asserted unchanged inside the transaction. Independent counts remained 11 Auth users,
four profiles, six invitations, 11 memberships and two tenants. No fixture cleanup or reset was run.
Registration policy and budget tables remain empty; no public admissions were created.

Read-only Auth configuration inspection confirms `disable_signup=true`, email confirmation required,
email provider enabled, anonymous signup disabled, six-digit/900-second OTPs and configured SMTP.
No Auth configuration, Worker setting, email, clinical/payment workflow or grant was changed.
Public registration remains disabled. Migration acceptance is complete; the remaining release
checklist is not.

The subsequent readiness review found the confirmation email still used a link-only template.
Its content now reuses the existing OTP-only magic-link template, its subject is
`Meneer Health — verify your email`, and the exact `/start` redirect was added without removing
the existing canonical redirect. Signup remains disabled; no email was sent. The provider also
updates its derived custom-template metadata when a template changes. Selected security/rate
settings require independent readback, not equality of that derived metadata.
Independent readback confirms the repaired template and exact redirect, required confirmation,
disabled anonymous signup, six-digit/900-second codes, configured SMTP, unchanged 30/hour
email/OTP/verify limits and 60-second resend interval. Public signup remains disabled.

Current published notices describe invited participants/organiser-supplied contact information.
The [narrow notice draft](public-onboarding-notice-update-draft.md) corrects the public-registration
source and proposes supervised abandoned-registration review. Immediate document supersession
would reject existing clients with valid `1.0` receipts under the current session verifier;
publication must wait for a tested, bounded existing-client transition. No publication, native
policy enablement or Worker promotion follows from the template repair. The owner approved
`mansoergallie@gmail.com` for a disposable synthetic public-signup acceptance test; that address
has no existing hosted Auth user. No test identity or fixture has yet been created.

The owner subsequently approved the narrow notice wording and bounded existing-client transition.
The new local migration `20261012210000_account_notice_receipt_transition.sql` adds an empty,
custodian-only individual receipt approval registry and shares native evidence across session,
portal and staff readiness. It retains actual original document versions/bodies instead of
fabricating new acceptances, denies public-admission/future-version compatibility, and preserves
the independent new-account activation command. No approval records or publication are seeded.
The matching adapter now requires the new service-only `has_pilot_account_evidence` RPC. Apply
and verify this migration before deploying that adapter; publish only after matching source is
active and the exact existing-receipt manifest has been separately approved. Expiry/revocation,
withdrawal, identity quarantine and other authority checks remain applicable.

### Hosted receipt-transition migration — 12 October

The owner explicitly approved applying `20261012210000`. It committed on hosted project
`gibfpolrdjotwvewgfsz` with the matching migration version/name/source. Transactional fingerprints
of existing profiles, invitations, memberships, receipts, publications and Auth authority fields
were unchanged. Existing function security metadata and unrelated function bodies were unchanged;
only the two intended instrument-evidence blocks were replaced. Independent readback verifies
the exact local SQL, forced RLS, no anon/authenticated/service table access, service-only public
evidence RPC, private inner functions and both enabled immutable/quarantine guards.

Hosted counts remain 11 Auth users, four profiles, six invitations, 11 memberships, eight receipts
and two publications. The real updated adapter successfully checked all four existing profiles:
all four retain valid account evidence; an unknown subject is denied. This is evidence/RPC proof,
not an authenticated browser/session or new-user onboarding acceptance claim. Registry and public
policy remain empty, and Auth still disables signup. No existing receipt was rewritten, no fixture
was created/deleted and no notice, email, payment, grant or Worker configuration was released.

The database-first dependency is now satisfied. The owner should commit/deploy the matching source
before any notice supersession or public enablement. The publication/legacy-receipt manifest,
explicit approval expiry, owned-mailbox journey and matching public-policy/Worker settings remain
separate pending release steps.

### Authorised notice release and runtime candidate — 12 October

The owner authorised publication, existing-receipt preservation, controlled no-payment/no-SMS
mailbox acceptance and eventual public signup, and separately approved 90-day legacy approvals.
The active Worker was verified as `e9bd9a8a-adac-4791-b010-833caf935c73`; its version ETag and
downloaded content ETag both match
`0caa5c781c97efac0cf947bd637e71bc1212324023855fa2cbed41e00ddb8e12`, and its source contains
the new native receipt RPC and signup route. No downloaded code or credential was printed/saved.

The guarded runner `operations/pilot-launch/release-public-registration.mjs` has a no-network
default. Its expressly approved rehearsal ran the actual publication/transition transaction and
rolled back. The subsequent committed transaction superseded the two `1.0` publications,
published only the approved three source-wording changes as `1.1`, and recorded eight exact
legacy approvals. It asserted unchanged profiles/receipts and valid evidence for all four existing
clients before commit. Independent real-adapter readback confirms the four accounts remain valid
and their eight original receipts still say `1.0`; no new-version acceptance was fabricated.

- Terms publication: `c05b1d60-e5cc-4aab-ac03-e3ff66afcb14`, SHA-256
  `7b9a7a9d062759e3d7bb166861f8439cacad022539ad3506d225ff4d36cd3e01`.
- Privacy publication: `a64a3e96-9d8e-4948-a857-712c79354065`, SHA-256
  `144f0a1fbb42ad036522d18e11cc1f9d022df625be91a32772cc391b2627b6c0`.
- Approval: `owner-public-source-2026-10-12:4f440075-8b65-429d-94d6-8ae8c7fa551a`.
- Legacy approvals expire **10 January 2027, 22:28 SAST** (exact UTC
  `2027-01-10T20:28:43.930Z`). Review before **3 January 2027, 22:28 SAST**. A supported genuine
  re-acknowledgement/replacement process is required before expiry; no automatic renewal or
  reminder is claimed.

Candidate `8e21a1e3-7a5b-4e2d-95d6-6a23eae12e1c` clones that exact deployed source and changes
only `PUBLIC_REGISTRATION_MODE=enabled` and the real-pilot tenant binding. Those two bindings
are now `secret_text`; unrelated binding names/types and every readable non-secret binding value
were independently compared unchanged. Existing identity/medical secrets were not supplied,
reused, rotated or replaced. No application build/upload or Worker promotion was performed.
At candidate preparation the active Worker remained the baseline, Auth disabled signup and the
native public policy was empty. Payment/product/clinical/generator/mobile modes were not changed.

### Owner promotion verified; acceptance blocked and signup closed

The owner promoted `8e21a1e3-7a5b-4e2d-95d6-6a23eae12e1c` to 100%; independent deployment
readback confirms it active. The guarded runner opened the approved real-tenant policy and changed
only Auth `disable_signup` to false, preserving every other Auth configuration field. Production
still returned HTTP 412 and showed signup unavailable, so the window was closed before sending mail.

A separate no-send diagnostic window established direct provider readiness (`/auth/v1/settings`)
and native `public_registration_available` RPC readiness as true, while the canonical Worker
availability GET still returned 412. A closed-policy HEAD probe returned 405, demonstrating the
Worker passed its mode/tenant and handler-initialisation checks; the exact downstream cause is
not established. This is **not** evidence of OTP failure or a completed public journey. No gate,
receipt, session or identity verification requirement was bypassed.

Auth signup is disabled again and the real-tenant public policy is explicitly false (no longer
an empty table). The candidate remains active; no source/tenant rollback or unrelated mode change
was performed. No test identity, email, SMS, Checkout or charge was created. Original identities
are checked against the ignored pre-window manifest. Next: resolve the Worker readiness mismatch,
then repeat controlled owned-mailbox acceptance on this same tenant before leaving signup enabled.
Preserve concurrent genuine registrations and clean up only the manifested disposable test account.
Do not claim the one-OTP/profile/questionnaire journey until it actually passes.

### Readiness failure classification — local correction, deployment pending

Inspection of the actual deployed source confirmed that `publicRegistrationAvailable` catches
every settings transport/HTTP/JSON error and returns false. Consequently HTTP 412 alone cannot
distinguish a closed provider policy from an unavailable dependency. This is a confirmed diagnostic
defect, **not a confirmed explanation of the original production mismatch**.

The local correction retains every admission predicate but separates valid closed Auth settings
from malformed/unavailable settings. Closed native/Auth policies retain 412; HTTP rejection,
transport failure and malformed settings produce 503. The availability handler emits only fixed
`PUBLIC_SIGNUP_*` reason codes through the strict existing telemetry schema. It logs no API key,
provider body, email, medical answer, cookie or session token. The source/headers and policy are
not bypassed or replaced. Read-only User-Agent probes showed browser-agent rejection (401) and
absent/explicit-server-agent success (200) from the local origin; this does not establish the
Worker's outbound agent, so no speculative header/key change was made.

Next owner action is to commit/deploy this source correction, not re-promote the older candidate
that lacks it. Verify the new active source and current bindings, then collect the fixed readiness
reason during the bounded no-send diagnostic window. Correct only the evidenced cause and repeat
owned-mailbox acceptance. Keep signup closed until then. No new schema migration is needed for
this correction; the old runner's exact-version/ETag guards must be reconciled to the newly verified
release before another enablement. Do not remove those guards just to rerun it.

Local validation: seven focused identity/activation/session/telemetry suites pass **108 tests**;
strict TypeScript, scoped ESLint, portability, Node **22.23.2** production build, client-bundle
and retired-MCP checks pass. Generated route/Worker types are unchanged and `git diff --check`
passes. These are local diagnostic-correction results, not hosted journey acceptance. Changes
remain unstaged for the owner's commit; no deployment, message or production switch was made
while preparing this correction.

### Diagnostic source deployed; exact runtime candidate awaiting owner promotion

The owner committed `522614f` and deployed the diagnostic source. Independent Cloudflare readback
confirms active version `94f01955-e131-4b2f-9c98-fc749c7168e8`, ETag
`baf8b0a623d9febf1447ece482d06dcdf622109c175339ff1b42a92049323846`, with the diagnostic method
and fixed reason codes present in actual deployed content. This code deployment restored the
template's `PUBLIC_REGISTRATION_MODE=disabled` and empty tenant as plain-text bindings; therefore
it cannot yet reach the downstream diagnostic gate. This explains the current runtime closure,
not the previous provider/native mismatch.

The approved guarded `--prepare-diagnostic-runtime` operation cloned this exact new active source
as candidate `12574bb6-415c-43c6-9caa-45b783201ec0`, changing only the two approved public signup
bindings. Source ETag and unrelated binding names/types and readable values are unchanged. Existing
keys were not supplied or replaced; Auth/native policy remained disabled, and no email, SMS, user
or payment was created. The helper retains the previous release checkpoint and updates exact
source guards rather than bypassing them. The candidate has not been promoted.

Owner promotion is required before the fixed-code no-send probe. Promote this candidate directly,
not the older `8e21...` source; do not insert another source deployment between preparation and
promotion. Readiness diagnosis and actual OTP/profile/questionnaire acceptance remain outstanding.

### Promoted diagnostics identify the transport cause; fix awaiting source deployment

Owner promotion of `12574bb6-415c-43c6-9caa-45b783201ec0` is independently verified. The
filtered no-send probe first produced `PUBLIC_SIGNUP_NATIVE_POLICY_CLOSED`/412 with both gates
closed. The expressly approved temporary window then produced
`PUBLIC_SIGNUP_AUTH_TRANSPORT_UNAVAILABLE`/503 after native readiness passed. The runner restored
Auth `disable_signup=true` and native policy `enabled=false` in its finalisation path. No email,
SMS, account, questionnaire, Checkout or payment was created.

The production settings fetch specifies `redirect: "error"`. A synthetic local workerd probe
using the deployed `2026-08-07` compatibility date and `nodejs_compat` reproduces its request
construction failure: `Invalid redirect value, must be one of "follow" or "manual"`. The same
construction accepts `manual`. This behaviour also matches
[workerd's redirect parser](https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c%2B%2B).
Unlike Bun/Node, this Worker runtime rejects the option before contacting Supabase. The old silent
catch had therefore disguised a runtime exception as closed Auth policy.

The local fix uses `publicAuthSettingsRequestOptions` with **manual** redirects, retains no-store
and the five-second timeout, and continues rejecting every non-2xx response before reading JSON.
Redirects cannot forward the server key to a new destination. Browser-only `redirect: "error"`
calls and Node-only operational scripts are not rewritten. No admission, session, receipt or OTP
predicate is weakened.

The new `bun --no-env-file run test:identity:worker-runtime` command uses Wrangler's locked
workerd/Miniflare runtime and the application's actual options function. It reproduces the legacy
failure and accepts the corrected options, with **zero provider requests**, messages or accounts;
the disposable loopback runtime is disposed afterward. CI now runs it alongside unit tests.
All seven focused identity/activation/session/telemetry suites pass **113 tests**, including
301/302/303/307/308 redirect rejection. Strict TypeScript and portability checks pass.
The final Node 22.23.2 production build, client-bundle/MCP-absence checks, scoped ESLint,
formatting and diff checks also pass. Route/Worker generated outputs and `bun.lock` are unchanged.
Independent post-window readback confirms closed signup, zero test users and preservation of all
11 original Auth identities and four original profiles. No files were staged or committed.

**Next owner action:** commit/deploy the source fix. Verify that new source, then prepare/release
its approved public bindings without re-promoting either older version. Keep Auth/native signup
closed until that coordinated release and the controlled one-OTP/profile/questionnaire test.
No migration, new key, recipient message or OTP-expiry change is needed for this transport fix.

## Hosted release checklist — not completed by a code push alone

1. Review and approve the migration, apply it to the correct hosted project, and verify migration
   history/ACLs. Do not seed demo identities or copy the local seed.
2. Review current published account/privacy wording for the newly approved public referral scope.
   If a change is needed, publish an approved new version; never rewrite historical receipts.
3. Review/enable Supabase email signup while retaining email confirmation, anonymous-user denial,
   six-digit codes, 900-second OTP expiry and working Brevo SMTP. Confirm the applicable signup/email
   template displays the code and the canonical redirect includes `/start`. This does not enable
   social, phone or anonymous signup. Review provider rate limits and public endpoint WAF/abuse
   controls: the app send budget is not a substitute for controls on direct Supabase Auth requests.
4. Review retention/cleanup of abandoned Auth-only registrations. The mobile orphan retirement
   mechanism must not be assumed to cover public Auth signup. Never delete staff or existing clients
   merely because a registration/profile was not completed.
5. Deploy the exact reviewed source with public mode still disabled. Obtain a separately approved
   isolated owned-mailbox rehearsal for actual new-user OTP delivery, profile/document commit,
   session handoff, questionnaire recovery and returning-client sign-in; manifest cleanup precisely.
   Obtain a real keyboard/VoiceOver review of the new modal, including scroll, Close/Escape and
   return focus. Automated axe checks are not that human acceptance.
6. After acceptance, enable the private policy only for the approved live tenant, and release
   `PUBLIC_REGISTRATION_MODE=enabled` plus `PUBLIC_REGISTRATION_TENANT_ID=<approved tenant UUID>`
   in the matching Worker version. Preserve current identity/medical keys and all other gates.
   The policy table is unavailable to application credentials and is enabled only by the custodian.
7. Check `/account/sign-up/availability`, the homepage CTA and one bounded production journey.
   Keep existing invitations and individual staff access working. Turning public registration off
   means disabling the Worker gate and private policy, not rolling back old rehearsal versions.

No new encryption key is required. Before any offline restore, disable this private registration
policy and Worker mode as well as the existing intake/payment/notification modes. Do not restore
old public-admission settings into an active system or treat them as current release approval.

## Local acceptance checkpoint

The local matrix passes 492 identity/adapter/configuration assertions, 2,801 rollback-only
database assertions across 55 packets, and 46 desktop/mobile browser checks. The browser packet
includes signup availability, new/returning continuation, exact-version dialog download,
Close/Escape return focus, profile acceptance and existing private-form keyboard/reflow/axe checks.
An intermediate disabled-signup browser assertion found duplicate status regions; the corrected
single-region final run passes. Final gateway review additionally registered signup in the shared
protected-POST boundary and rate-limited availability reads before provider calls. All 34 focused
HTTP/request-security assertions and a 14-check desktop/mobile signup/modal rerun pass. A direct
request to the actual local Worker returned the expected disabled-signup HTTP 412 without sending
mail. The broad fork-based unit rerun stalled before reporting tests and was stopped; the final
focused packet passed using one thread. TypeScript, focused ESLint, formatting, production build,
client-bundle/MCP absence, generated Worker types, discovery and portability checks pass.
The local baseline had zero Auth users/non-synthetic email contacts; all SQL fixtures rolled back.
The test stack was started locally for validation and stopped afterward. No hosted acceptance is
claimed by these local results.

### Receipt-transition local acceptance — 12 October

The final migration chain rebuilt successfully from the fixed synthetic-only local seed.
All 57 SQL packets / 2,841 assertions and all 189 Vitest files / 1,573 tests pass. TypeScript,
focused ESLint/formatting, production build and client-bundle/MCP checks, error-level database lint,
discovery, portability and diff checks pass. The real local access adapter successfully calls the
new service-only RPC: an unactivated seeded subject is denied and anonymous RPC execution is denied,
with no fixtures or messages created by that REST check.

The new packets prove genuine legacy evidence, actual original version/body projection, shared
staff readiness, no fabricated `1.1` receipts, new public current-version activation, wrong-tenant
and public-source compatibility denials, immutable approvals, one-way revocation, future-version
and document withdrawal rejection, receipt withdrawal, profile/membership restriction and timed
approval expiry. An initial fixture parameter/timestamp mismatch was corrected without weakening
native activation; current-version acceptance uses a separate rollback packet so transaction-fixed
`now()` does not falsely treat a newly effective publication as already active. The broader matrix
also caught a missing quarantine trigger on the new table; the final clean rebuild includes it and
all retirement coverage tests pass. No hosted migration or approval row is implied by these tests.
The full unit matrix took approximately seven minutes; its final result, not intermediate silence,
is the recorded pass.

This feature does not renew the protocol-generator subscription, enable uploads, approve products,
assign clinical cases, bypass medical triage, or alter the R999 deposit/refund policy.
