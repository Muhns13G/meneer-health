---
plan_id: phase-02-sprint-13-gap-remediation
title: Pre-13.10 Remediation and Private Upload Extension
status: in-progress
last_updated: 2026-10-09
owner: "@Muhns13G"
---

# Pre-13.10 Gap Remediation

## Current Upload Scope — 9 October Amendment

The owner now defers uploads until needed and uses the questionnaire without required blood-result
files for initial peptide intake. The [scope/approval packet](pilot-activation-owner-approval-packet.md)
supersedes this document's earlier upload-before-launch requirement. Retain the bounded upload
design for future implementation; no file collection is enabled. TD-065's upload/object component
is deferred, while identity/current-authority recovery remains applicable to real accounts/intake.
Earlier requirements below are retained as historical decisions, not the current launch scope.

The owner requests resolution before 13.10, not deferral to Sprint 14. Previous 13.9 review and
uncommitted closure documents are preserved. Git staging, commit, deployment and branch control
remain with the owner. Hosted migrations/rehearsals require a fresh bounded approval.

## Owner Decisions — 8 October

- General support and privacy administration: Mansoer Gallie primary, Mikhail Robertson alternate.
  These are operational appointments, not proof of registered Information Officer status.
- Clinical/safety lead: Tasneem; qualified alternate nominated by the owner: Dr Ziyaad Noor.
  Full professional identity/registration, agreement and actual coverage remain to be evidenced
  privately. Administrators route clinical concerns; they do not substitute for clinician decisions.
- Ordinary enquiries: target response within 24 hours where possible, not guaranteed emergency
  availability. Urgent concerns must not wait for an asynchronous support response.
- Do not narrow launch to onboarding-only. Live payment/product requirements remain in scope,
  while generator renewal waits until manual generation is needed. No capability is activated here.
- Add optional private blood-result uploads: PDF/JPEG/PNG, maximum 10 MB each and five per client;
  own-client upload, purpose/assignment/AAL2-restricted clinician access. No public links, email
  attachments, executable/archive formats or automatic AI interpretation.
- Existing approved legal/medical notices are absent. Draft them for review, not publication.

### Follow-up Scope Decision

The owner approves completing existing conflict, identity-recovery, accessibility and notice-review
work first. Upload implementation is deferred to a separate bounded task, **not removed from launch
scope**. Malware handling, retention and object-byte recovery remain required before enabling it.
The owner authorises a no-email/no-payment isolated hosted conflict rehearsal with workforce AAL2
and scoped cleanup, and approves local fail-closed identity re-verification recovery.

## Ordered Work Packets

1. **TD-064:** inventory actual migrated function definitions; patch only allowlisted permanent
   conflicts with exact expected counts and unchanged owner/ACL/security/configuration/volatility.
   Preserve genuine serialization exceptions. Update response mappings and regression assertions.
   Then obtain specific hosted migration approval, owner deployment, routed positive/stale/replay/
   unchanged-state proof and scoped cleanup. Local success alone does not Verify hosted acceptance.
2. **TD-065 identity:** choose and approve provider-identity recovery, not blindly restore valid
   old sessions/MFA secrets. Rehearse an isolated application restore, authoritative identity
   contact re-verification/relink, revoked old sessions, independently re-enrolled workforce MFA,
   current restrictions/erasure and grant reapproval. Existing returning-identity SQL and local Auth
   lifecycle tests are prerequisites, not a full disaster-recovery exercise.
3. **Private uploads:** implement the bounded contract below; include object bytes and metadata
   in encrypted recovery/reconciliation and rights/deletion evidence. Verify local and separately
   authorised hosted synthetic uploads before enabling. This is new work, not completed Sprint-13
   functionality merely because Storage objects are currently zero.
4. **TD-037/038:** complete the individual released client/staff inventory and transition evidence
   without discounting the owner's accepted representative VoiceOver/zoom/phone checks. Record
   exact reviewed runtime and device/AT metadata; use only newly approved disposable private fixtures.
5. **TD-006/009/043:** domain review of drafts, actual agreements/authority, approved safety/coverage
   publication, unattended callback/headroom and real roster proof. The names above alone do not
   satisfy professional authority, contracts or clinical approval of the notices.
6. **TD-007/010:** product-specific authority and private real catalogue/delivery/terms/provider
   acceptance; no live charge to prove this. Synthetic quotes remain synthetic. Owner/domain
   approval and operational readiness precede live commerce.
7. **13.10:** explicit go/no-go, dependency/recovery/rollback and first-client checklist only after
   the applicable packets pass. Sprint 14 SMS invitations do not waive these launch requirements.

## Private Upload Contract — Approved Scope, Implementation Pending

Upload is optional; absent bloods do not block initial questionnaire submission. Files supplement
the exact patient case and are not automatic prescriptions or proof of fitness for treatment.
Enforce limits server-side, verify actual file signatures and MIME, reject archives/executables,
and use opaque object keys with no names/medical details. Authentication, tenant, subject,
assignment, purpose, assurance and expiry/revocation checks apply to every operation. Never grant
browser roles direct bucket listing or object reads. Server-only credentials and keys are separate
from recovery/session/medical-intake keys. Never cache file responses publicly or log their bytes.

Quarantine files until an approved malware-validation process passes. Extension/MIME validation
is not antivirus. No third-party scanner receives medical documents without privacy/processor
approval. Unscanned/failed files must not become clinician-downloadable; do not falsely label them
safe. Decide storage jurisdiction, free-tier quota/headroom, scan runner, retention and custody
before hosting activation. No paid service or new broad credential is authorised by this scope.

Maintain immutable upload receipts and deletion/disposition evidence; cap concurrent uploads
transactionally, account for incomplete reservations and reject overwrite/replay substitution.
Fresh short-lived download access must be revocable, with no bearer URL in email/telemetry.
Restore into isolation, reconcile ciphertext/object checksums, reapply the independently current
deletion/restriction ledger, invalidate old links and prove missing-object failure. A metadata-only
backup does not close TD-065. Draft retention must be explicitly approved by clinical/privacy
owners and applied consistently to object bytes, metadata, backups and provider copies.

## Current Technical Evidence

Local migration `20261008100000_remaining_business_conflict_status.sql` changes only reviewed
permanent raises in 21 named functions, including internally called restricted refund helpers.
Its guards assert exact source counts, approved conflict messages and unchanged security metadata;
no function body/business rule is otherwise rewritten. Fresh local reset succeeds. The existing
35-file/1,599-assertion suite passes after expected permanent-conflict codes change to `PT409`.
New structural ACL/serialization regression and affected TypeScript tests are recorded separately
after execution. No hosted schema/runtime success or full gap closure is claimed here.

### First Remediation Batch — Local Validation and Hosted Migration

The complete clean serial rerun passes **36 SQL files / 1,629 assertions**, including 30 new
definition/ACL/serialization checks. The initial expanded run overlapped with the local Auth
integration, producing a fourth synthetic subject where the seed test expected three; it failed
and is not counted as passing. The task-owned local database was reset, and the serial rerun
passes. The existing Auth integration separately passes lifecycle/TOTP/revocation, not a complete
identity disaster restore. Local services were stopped with their recoverable development backup.

All **61 focused tests across nine files**, strict TypeScript, ESLint, repository formatting,
Node 22 production build, client-bundle canaries, retired-MCP absence and whitespace checks pass.
No full 954-test/280-browser rerun is claimed for this batch. Sixty-four allowlisted permanent
raises in 21 functions are corrected; genuine transaction serialization remains unchanged.
Refund HTTP maps permanent conflicts to a redacted 409 without dispatching a provider operation.

The owner explicitly approves the guarded hosted migration. Initial credential-redacted prechecks
fail before application: passing the connection URL through `PGDATABASE` does not configure the
intended hosted connection. Passing its components through protected PostgreSQL environment
variables resolves the local-socket failure without exposing credentials. Hosted migration history
then exactly matches all preceding local migrations. On 8 October 2026, only the approved migration
is applied atomically with history version `20261008100000`. Its exact-definition/count and
unchanged-security-metadata guards pass for all 21 functions; the matching history entry is read
back afterward. No application data is changed. Routed acceptance still requires owner source
deployment and separate bounded fixture/rehearsal/cleanup authority. All original domain/recovery
gates stay open.
The new upload contract is approved but implementation remains pending, including quarantine,
approved malware handling, retention, rights and object-byte recovery. Notice drafts are prepared
for review, not published. This batch is not complete pre-13.10 gap resolution.

## Follow-up Evidence — 8 October 2026

Current source is committed on `itws-I` at `fd54835c9f268c07c75cbb84333ade18d16ad28b`.
Read-only Cloudflare inspection identifies active Worker `80ba440b-cf54-41c4-97af-cb13f23cb4e7`
(version 302, 100% traffic). Its metadata does not provide a source Git SHA; chronology alone does
not establish exact source equivalence. Canonical-origin anonymous POST readiness probes return:

| Command                                           | Status | Interpretation                                       |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| `/portal/intake/command`, `/staff/intake/command` | 412    | Intake configuration not enabled for rehearsal       |
| `/portal/order/command`                           | 412    | Commerce configuration not enabled for rehearsal     |
| `/portal/rights/command`                          | 401    | Anonymous identity rejected                          |
| `/staff/alerts/respond`                           | 400    | Invalid form probe rejected, not AAL2/conflict proof |

All responses are private no-store without CORS permission. No hosted fixture, session, settings,
email, charge or generator record is created. Authenticated positive/stale/replay/unchanged-state
acceptance remains pending at the first configuration boundary. AGENTS reserves releases to the
owner, including configuration changes producing a Worker version. Do not fabricate a 409 from
an anonymous 412 or enable the real pilot to make the test pass.

### Local Identity Disaster Recovery

`bun --no-env-file run test:identity:recovery` rejects inherited hosted/provider configuration,
requires the fixed local API/container, empty local Auth and synthetic-only stored email contacts.
It restores an actual nine-schema custom-format dump into a unique temporary database after an
AES-GCM archive round trip and SHA-256 payload comparison. Auth credentials/sessions/factors are
excluded. The restore is held closed: tenants suspended, application sessions revoked, tenant
memberships/access assignments revoked. A current subject suspension newer than the snapshot wins.

Against local GoTrue, it deletes its disposable old identity, rejects the old token, recreates an
unconfirmed identity and preserves the stable internal subject. Fresh local code verification sends
no email. Initial AAL1 and absence of the old factor are verified before new TOTP enrolment produces
AAL2. Relinking preserves the current restriction. Generated application/Auth fixtures and the
restore database are removed before success is reported. Local provider audit history is not
described as an exact full-stack rollback. No persisted archive is uploaded or hosted key changed.

This proves local components, **not production recovery automation**. Keep a real restore isolated
until the independently current restriction/erasure ledger is reconciled, domain-specific grants/
approvals are separately revalidated, fresh identity is linked in the actual restored environment,
and hosted delivery/authority denials pass. The local code is not mailbox-delivery evidence. Full
erasure reconciliation, domain-grant reapproval and hosted recovery remain unverified; TD-065 stays
In progress. Object-byte proof is deferred with upload implementation.

The final registered local command passes after the empty-Auth/synthetic-contact guards are added.
Three injected inherited-variable probes (`SUPABASE_URL`, `HOSTED_SYNTHETIC_TARGET`,
`STRIPE_RESTRICTED_KEY`) fail at the environment guard before database access. The archive manifest
counts identify this exercise's subject/session probes, not an exhaustive all-row reconciliation;
do not present this focused exercise as a replacement for the existing complete application backup
packet.

The extended local exercise also passes: fresh AAL2 cannot resolve workforce context while the
subject is suspended or membership absent. A newly approved synthetic operations membership grants
context; revoking it denies context again. A newer contact-only erasure is applied to the restored
snapshot without resurrecting the contact or active session. This is not complete medical/financial
erasure reconciliation or domain-specific clinical/commercial grant reapproval. Those outcomes and
hosted recovery remain unverified. Disposable membership/identity fixtures and the isolated restore
database are removed before success; no emails are sent.

### Owner-Controlled Hosted Conflict Settings

The owner approves preparing the following settings, **not agent deployment**. The dedicated
synthetic tenant identifier is `6d951368-281e-4519-8361-7b5f63efe245`. It is newly generated, not yet a
hosted fixture; verify its absence and the suspended real-pilot baseline before creating authorised
test records. Do not substitute the real pilot tenant identifier.

In Cloudflare, select Workers & Pages → `meneer-health` → Settings → Variables and Secrets. Privately
record the previous value or absence of each changed binding for exact restoration. Prepare these
server-runtime bindings together and release them in one owner-controlled configuration version:

```dotenv
MEDICAL_INTAKE_MODE=enabled
MEDICAL_INTAKE_TENANT_ID=6d951368-281e-4519-8361-7b5f63efe245
COMMERCE_REVIEW_MODE=enabled
COMMERCE_REVIEW_TENANT_ID=6d951368-281e-4519-8361-7b5f63efe245
COMMERCE_CHECKOUT_MODE=disabled
COMMERCE_WEBHOOK_MODE=disabled
COMMERCE_REFUND_MODE=disabled
OPERATIONS_ALERTS_MODE=disabled
TRANSACTIONAL_NOTIFICATIONS_MODE=disabled
```

These are runtime settings, not public `VITE_*` values or a local `.env` change. Preserve the existing
dedicated intake keyring, identity/session keys, provider credentials, recovery configuration and
source branch. Do not paste secrets into this packet. Do not add a duplicate plaintext binding
where a secret of the same name already exists; edit its existing binding through the owner's
release workflow. Confirm the pending version contains both isolated tenant bindings before
enabling either route. No real tenant is activated by this packet.

Alert read/response routes use authenticated workforce authority and do not require outbound
`OPERATIONS_ALERTS_MODE=enabled`. Checkout, webhook, refund dispatch and outbound email stay disabled;
no new Stripe webhook, payment, generator access or upload is authorised. The isolated fixtures must
not introduce destinations or dispatch authority for the real tenant.

After the owner confirms the released version, run the separately authorised genuine AAL2,
positive/stale/replay/unchanged-state conflict checks, then exact manifested cleanup. The owner must
restore both enabled modes to `disabled` and restore/remove the tenant bindings to their recorded
pre-rehearsal values/absence. Verify payment/email modes stayed disabled, no fixtures remain and
the real pilot is suspended. Retain temporary and restored Worker version IDs and redacted results.
This is an execution handoff, **not evidence that these steps have occurred**.

### Accessibility Evidence and Remaining Human Review

Node 22.23.2 desktop Chromium/Pixel 7: **88/88 tests pass in 7.1 minutes** across client/staff
accessibility, journey announcements, questionnaire, activation, rights, order, transfer preparation
and recovery. The supplemental queue, financial read, staff support and alert packet passes
**26/26 in 1.4 minutes**. These are 114 distinct local controlled tests, not a full-suite rerun or
hosted persistence/spoken-output proof. No UI component changes are made by this follow-up.

Earlier owner-confirmed VoiceOver/zoom/phone acceptance is retained. Exact released-flow closure
needs reviewer, OS/browser/AT version, source/Worker version and reviewed states, without patient
data. Do not invent observations to fill the following finite inventory:

| Surface                                 | Remaining exact review states                                                                                  | Automated packet                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Account verify/sign-in/recover/sign-out | Email/code labels, pending, invalid/expired code, retry/result focus                                           | Client forms and journey announcements        |
| Account activation                      | Separate receipts, profile/contact preference, failure/retry and durable completion                            | Activation and client forms                   |
| Portal profile/dashboard                | Read/refresh, failure, expiry/revocation clears details, literal payment/refund states                         | Recovery, client forms and payment status     |
| Portal rights/support                   | Correction, uncertain same-key retry, receipt not human action, urgent denial                                  | Rights, journey and recovery                  |
| Portal intake                           | Notice, all eight sections, conditional fields, validation, save failure/retry, review/submission, expiry      | Medical intake                                |
| Portal order                            | Exact disclosure, unchecked acceptance, expiry/conflict clearing, Checkout not settlement                      | Order review and journey                      |
| Staff sign-in                           | Email versus MFA, resume/expiry and denial                                                                     | Staff accessibility                           |
| Staff queue                             | Filter/pagination/claim conflict, masked detail, handoff/evidence/destination controls, financial read, expiry | Queue, payment status and staff accessibility |
| Staff intake                            | Granted work/detail, protected fields, transfer preparation, stale/expired work                                | Staff accessibility and transfer preparation  |
| Staff alerts/support                    | Load/pending, human response controls, uncertain delivery/follow-up, expiry/result focus                       | Staff accessibility, alerts and support       |

Provider-owned Stripe Checkout is a separate review; this no-payment packet does not prove its
spoken output or authorise a charge. Upload controls are not implemented and need their own review.
TD-037/038 retain their remaining released-flow human-evidence requirements.

### Notice and Launch Approval Packet

The [notice drafts](../../../05-future-considerations/pilot-notices-review-drafts.md) remain unpublished.
Private evidence references are sufficient for internal recording; confidential documents need not
be pasted into chat. Remaining approval inputs are:

| Packet            | Unresolved facts/evidence                                                                                                                                 | Reviewer                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Account/privacy   | Contracting entity, responsible party/operator allocation, privacy accountability, retention/transfer/operator terms, complaints contacts, final versions | Legal/privacy reviewer; Mansoer coordinates, Mikhail alternate |
| Clinical/safety   | Full identity/registration, accepted scope/agreement, Tasneem/Dr Ziyaad Noor coverage, approved urgent/after-hours wording and claims                     | Qualified clinical lead/alternate                              |
| Provider/products | Exact partner agreement, permitted pathways, sourcing/dispensing/courier roles, concentration compatibility and transfer approval                         | Clinical/provider and business owners                          |
| Commercial        | Real catalogue/delivery rates, VAT/invoice/merchant basis, cancellation/refund terms, provider acceptance                                                 | Commercial owner with appropriate advice                       |
| Operations        | Actual finite roster/mailbox controls, callback authentication, unattended dispatch, quota/Auth headroom and escalation acceptance                        | Mansoer/Mikhail with clinical escalation owners                |

Operational appointments and the 24-hour ordinary-response target do not establish professional
authority, contracts or a statutory office. Engineering approval does not publish incomplete notices.
TD-006/007/009/010/043 retain their statuses until applicable evidence and approval are recorded.

The owner explicitly confirms reviewer-approved notices and private agreement/commercial references
are **not yet available** and requests recording them as launch blockers. No assumed approval,
publication or debt waiver is recorded. Uploads remain a separately deferred task required before
launch. Task 13.9 is complete as reconciliation; this remediation packet and applicable release
gates remain open until their own acceptance is evidenced.

### Subsequent Owner-Reported Approval and 13.10 Handoff

The owner subsequently states that the other reviewers also approve the proposed approach and
drafts. Record this as owner-reported approval, not independently obtained signatures. The earlier
absence statement is its historical checkpoint. Actual unresolved identities, responsibilities,
retention and sale terms remain factual inputs; no exact completed instruments are published.
Task 13.10 closes reporting with these gates retained, not this remediation packet. Its report
records NO-GO for real activation while required hosted conflict/recovery/accessibility/operational
evidence, private uploads and adopted Sprint 14 remain unfinished.
