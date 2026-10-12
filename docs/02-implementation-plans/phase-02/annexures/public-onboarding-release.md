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

Code and tests are local. No hosted SQL, configuration, email send, clinical activation, payment,
staff grant or source deployment was performed for this change. The prior questionnaire reliability
fix remains in the owner's local commit and also requires deployment.

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

This feature does not renew the protocol-generator subscription, enable uploads, approve products,
assign clinical cases, bypass medical triage, or alter the R999 deposit/refund policy.
