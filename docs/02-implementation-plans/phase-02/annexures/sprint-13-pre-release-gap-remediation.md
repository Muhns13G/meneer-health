---
plan_id: phase-02-sprint-13-gap-remediation
title: Pre-13.10 Remediation and Private Upload Extension
status: in-progress
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Pre-13.10 Gap Remediation

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
