# Public registration — narrow notice update for approval

Prepared 12 October 2026. Proposed account/privacy version: `1.1`, locale `en-ZA`.
Status: owner-approved wording published as `1.1` with exact legacy-receipt protection;
not a legal-compliance certification. Approval/release was given in this task on 12 October 2026.

The currently published `1.0` documents describe organiser-supplied invitations. Public registration
must describe information supplied directly by the participant. Retain all other operator,
clinical, consent, payment, complaint and security wording from the approved original documents.

## Account terms: replace the opening of “What the pilot provides”

The pilot allows participants who register directly on our website or receive an invitation to
verify an account, provide profile information, complete a medical-history questionnaire and see
the services and products made available to them. Account creation and questionnaire submission
are free. This is not a paid membership or club subscription. Access does not guarantee a
consultation, prescription, product, treatment outcome or uninterrupted availability.

## Account terms: replace the opening of “Using your account”

Use your own verified email and provide accurate information. You may begin registration through
Start privately without an invitation. If you receive an SMS or email invitation, it is personal:
do not forward it or register on another person's behalf. Invitations are valid for 48 hours unless
withdrawn or replaced; email verification codes expire after 15 minutes. An invitation link alone
is not independent proof of identity. Keep verification codes private and contact support if access
may have been misused. Staff may suspend access to investigate misuse, security risks or safety
concerns; suspension does not automatically forfeit money or waive your rights to information,
complaints or an eligible refund.

## Privacy notice: replace the participant-information source paragraph

When you register directly, you supply your email and profile details, including your name and
phone number. If you receive a pilot invitation, the organiser may first supply your name and
phone number or email address. In either route, you verify your email and confirm your profile.
If you choose the medical pathway, you provide questionnaire responses. We also record document
acknowledgements, access/security events, support requests and, when enabled, order/payment/refund
references and statuses. Private file uploads are not part of this initial release. Full
payment-card details are entered into Stripe's hosted payment interface, not the questionnaire
or support messages.

## Abandoned registrations: proposed operational handling

Keep the provider email-send/OTP/verification limits at their current 30-per-hour values and the
per-contact resend interval at 60 seconds; do not relax them to open signup. Application reservations
remain three/contact/hour and 100/tenant/hour. These are distinct from direct-provider controls.
CAPTCHA is currently off; enabling it requires a supported challenge/token flow, not a blind switch
that breaks existing sign-in/invitations. Monitor provider limits/complaints during the small pilot
and disable new registration if abuse cannot be contained.

Mansoer should review incomplete registrations at least monthly. An age of 30 days is an inventory
candidate, not permission to delete: independently check current Auth/application identities,
memberships, invitations, sessions, profile, clinical/financial/audit references and lawful holds.
Preserve existing staff and clients. Direct-provider registrations have no trustworthy application
admission provenance until verified; metadata alone must not authorise deletion. Use an exact
approved manifest and the established provider/application/recovery disposition controls. No
automatic public orphan-deletion job is claimed by this change.

## Existing clients must not be locked out by publication

The current session verifier requires receipts for the currently published documents. Immediately
superseding `1.0` would therefore reject existing clients whose valid receipts refer to `1.0`.
Do not publish these replacements until a bounded compatibility or explicit re-acknowledgement
path is implemented and tested. Retain historical receipt bodies/hashes; never manufacture `1.1`
acceptances or silently rewrite a client's consent. Any compatibility must be limited to this
scope-neutral transition for existing invitation-based accounts; new public accounts must accept
the current documents. Clinical consent and transfer authorisation remain separate.

The owner approved these three wording changes, the supervised review defaults and implementing
the bounded transition. Hosted publication and deployment are still separate release actions.

## Implemented transition: individual receipt approvals

`20261012210000_account_notice_receipt_transition.sql` creates an empty private registry. Only
the custodian can populate it; browser and service credentials cannot read or write its rows.
Each approval names an exact receipt, subject, tenant and successor publication, approver/reference
and explicit expiry. It is immutable except for one-way revocation. Publication must select a
reviewed expiry and track it operationally; expired approvals do not silently renew. Any later
re-acknowledgement or replacement approval needs an explicit supported process before that deadline.

The insert guard permits only genuine native activation receipts for an already activated,
invitation-based client predating the exact `1.0` → `1.1` source-only transition. Public admissions,
other instruments/locales/versions, withheld or expired documents and invalidated receipts cannot
qualify. An approval for `1.1` cannot extend into a later document version. Existing subject
quarantine guards also cover both the client and approver references.

Session evidence, client portal and staff readiness share one native instrument-evidence function.
It returns the original accepted publication ID, version, hash, body and action. No new receipt is
created for an existing client. Native new-account activation remains unchanged and still requires
actual actions on the current publications. All session, membership, role, assignment, purpose,
medical, payment and generator guards remain separate.

Release ordering is database first, then matching owner-deployed application, then the separately
approved exact publication/receipt manifest. Do not supersede documents while old source is serving:
the old adapter would still reject old receipt holders. Preserve a pre-publication inventory and
verify every affected existing client has complete, genuine evidence before publication commits.
The owner subsequently approved the hosted migration, which is now applied/history-source aligned
and independently verified. All four existing profiles retain valid evidence through the real
updated adapter/RPC. Registry and public policy remain empty, and Auth signup remains disabled.
The owner deployed the matching adapter, authorised publication and approved 90-day compatibility.
After rollback rehearsal, the two `1.1` publications and eight exact existing-receipt approvals
committed, preserving all four existing profiles and their actual `1.0` receipts. See the release
packet for exact IDs/hashes. Approvals expire 10 January 2027 at 22:28 SAST; review before
3 January at 22:28 and complete a supported genuine re-acknowledgement/replacement before expiry.
No automatic renewal or reminder is claimed. Public runtime/provider policy is not yet enabled;
the same-source candidate requires owner promotion and a controlled owned-mailbox journey.
