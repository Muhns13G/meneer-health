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
