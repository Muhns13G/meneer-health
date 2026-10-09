---
runbook_id: meneer-mobile-invitations-release
title: Mobile Invitation Release, Recovery and Containment Runbook
status: active-engineering-channel-disabled
last_updated: 2026-10-09
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Mobile Invitation Operations

## Current Boundary

[Sprint 14](../03-completion-reports/phase-02/sprint-14-mobile-pilot-invitations.md) is completed
with activation gates. The real pilot is suspended. Current verified mobile-disabled version:
`559d739a-1e61-4277-9ad0-3cbb076ea5d8`; it retains the successful rehearsal code. No real roster
send, health collection, live payment, upload or generator operation is authorized by this runbook.

Only the repository owner may push, deploy, promote or roll back. Follow the
[Cloudflare release procedure](cloudflare-environments-release-runbook.md) and
[configuration lifecycle](environment-secrets-runbook.md). A later build must not silently restore
rehearsal gates from ignored local configuration. Inspect the actual active version after release.

## Required Real-Channel GO Packet

1. Resolve applicable retained debts in the [registry](../04-technical-debt/technical-debt-registry-v1.md),
   especially TD-065/066 before real identity/email use. Implement the required private uploads and
   scan/retention/recovery controls before the owner's selected launch, or obtain an explicit scope
   change; this document does not narrow the scope for them.
2. Complete truthful profile/privacy/intake/terms instruments, exact versions/hashes, contracting
   responsibilities and private approval references. Invitation-only access does not make data synthetic.
3. Record exact source SHA, passing exact-release CI, canonical Worker version/traffic, migration
   parity/private RLS/ACLs and the intentional preview media difference. Hosted trial proof is dated;
   refresh after source/provider/configuration drift rather than assume it persists indefinitely.
4. Confirm real operations assignments/purpose/AAL2, finite coverage and fallback. Mansoer is initial
   operational primary and Mikhail alternate; clinical concerns go to qualified appointed clinicians.
   Confirm 24-hour ordinary-query target where possible, emergency instructions and quota headroom.
5. Privately approve each expected participant's contact provenance. Confirm phone normalization,
   no active duplicate and authority to send the neutral invitation. Bearer plus verified email does
   not independently prove roster identity; mismatches/shared/recycled/forwarded links go to staff.
6. Verify Telnyx sender ownership, profile/ZA routing, exact optional alpha sender, signing key,
   credit and current all-in fees/segment count. Preserve shared profile webhooks; use exact per-message
   callback with profile-webhook inheritance off. No reply-STOP or two-way service is implemented.
7. Owner approves initial cohort size, recipient/attempt/segment and rolling monetary ceilings,
   primary/alternate, review date and stop criteria. US$0.196/two segments is observed test cost,
   not a future tariff or free-tier promise. First release is one approved participant, then review
   before expansion within the separately approved limits. No automatic retries or batch import.
8. Verify fresh recovery/monitoring and exact session/identity/contact-copy safeguards. An application
   logical backup is not Auth/MFA or private object-byte recovery. Record a separate scoped GO;
   do not infer it from a green CI run or this completion report.

## Controlled Send and Participant Journey

Staff use current assigned operations/AAL2 to create, review and reserve the exact invitation
version before dispatch. Preserve held spend on uncertainty; reconcile the exact provider message
before any reviewed resend. Never send a direct unrelated Telnyx message and call it app proof.

GET/scanner/prefetch does not consume the link. The participant deliberately claims it, supplies an
immutable email, receives a six-digit/900-second managed-provider OTP and accepts the exact approved
documents/profile. Invitation validity is 48 hours, not OTP validity. Do not copy link/code/contact
into issues, analytics or ordinary logs. Decline/support remain available; never promise an SMS reply.

The operator harness claims the bearer in its own session. Do not also ask the handset browser to
claim it: the second browser correctly sees unavailable/in-use. A full handset registration exercise
must be planned separately, without racing that harness or blindly sending another message.

## Exceptions, Retention and Recovery

Stop and use assigned staff review for wrong email/phone, duplicate/existing-account association,
unexpected sender, uncertain delivery, missing/conflicting signed receipts or wrong tenant/purpose.
No email change, automatic identity merge, phone-only authentication or silent deadline extension.

Register-only sweeps use the proposed approved 30-day unconverted-contact/90-day minimal-journal
defaults; final privacy/copy/backup acceptance remains required. They do not erase provider Auth or
stable account contacts. Follow the [TD-066 design](../02-implementation-plans/phase-02/annexures/sprint-14-unconverted-identity-recovery.md)
without treating it as implemented retirement. Operational deletion must not disable immutable
triggers; locked trigger bypass is solely the explicitly authorised manifested synthetic cleanup.

Reverify contact, re-enrol workforce MFA and separately reapprove authority after provider loss;
do not restore old sessions/factors/grants. Follow TD-065's domain-disposition/recovery requirements.

## Containment and Verified Restoration

Owner restores compatible code/configuration or deploys a reviewed configuration-only version with:

| Setting                              | Disabled value |
| ------------------------------------ | -------------- |
| `MOBILE_INVITATIONS_MODE`            | `disabled`     |
| `MOBILE_INVITATIONS_REDEMPTION_MODE` | `disabled`     |
| `MOBILE_INVITATIONS_EMAIL_MODE`      | `disabled`     |
| `MOBILE_INVITATIONS_WEBHOOK_MODE`    | `disabled`     |
| `MOBILE_INVITATIONS_DELIVERY_READY`  | `false`        |

Keep credentials/keys independently secured; do not rotate or delete them as an incidental rollback.
Tenant binding is not a substitute for disabled modes. A version label and an invalid bearer returning
200 unavailable are not proof of containment. In the 14.9 retest the nominal disabled baseline had
enabled mode secrets; same-code explicit disabling plus route verification resolved it.

Verify 100% intended version and compatible script/schema/key references. Make harmless first-party
POST probes: redemption with a random synthetic bearer/request key and email exchange without a
cookie return 503; empty JSON at the disabled callback returns 404. All must be no-store. Do not
send SMS/email or replay provider bodies to test containment. Check mode/readiness values through
the owner's configuration record; secret-list output only proves names, not values.

For an approved isolated rehearsal, verify disabled modes **before fixture creation and again before
cleanup**, regardless of the harness's version-ID check. Revoke exact disposable sessions, remove
only privately manifested fixtures under the separately approved cleanup transaction, then compare
full application/Auth fingerprints and named guards independently. Preserve unrelated/provider records.
Inspect response headers by meaning (`no-store`), not a presumed exact serialization string.

Worker rollback does not refund charges, reverse database migrations, erase contacts, revoke provider
sessions or undo provider delivery. Review current schema/security/dispositions before rollback;
retain minimal redacted evidence and require a separate owner resumption decision.
