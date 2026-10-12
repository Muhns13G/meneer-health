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
