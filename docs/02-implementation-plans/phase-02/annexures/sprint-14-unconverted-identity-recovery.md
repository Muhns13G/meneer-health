---
plan_id: phase-02-sprint-14-orphan-identity
title: Unconverted Mobile Identity Retention and Recovery Design
status: design-prepared-execution-disabled
last_updated: 2026-10-09
owner: "@Muhns13G"
---

# TD-066 — Bounded Retention and Staff Recovery Design

Prepared during Task 14.8. This is an engineering proposal and acceptance checklist, **not**
permission to erase hosted identities, resend messages, change retention or activate mobile email.
The owner-approved private-register defaults remain 30 days after terminal expiry/revocation
for unconverted contact data and 90 days for minimal mobile journal. Provider/application contacts
and backups are separate copies; a register deletion cannot be advertised as complete erasure.

## Provenance and Eligibility

### Owner Policy Approval — 9 October

The owner approves retiring only proven, never-converted invitation-created Auth/application
contact copies 30 days after terminal expiry/revocation, preserving holds, unrelated accounts and
converted accounts. Mansoer is accountable primary and Mikhail alternate. This settles the proposed
secondary-copy retention decision, not implementation or verification. Every provenance, session,
domain-record and uncertainty veto below remains mandatory. Actual retirement requires the
implemented guarded workflow; do not substitute ad hoc production deletion for that workflow.

The owner also approves isolated synthetic identities/questionnaire fixtures, genuine workforce
MFA, conflict/recovery testing and exact scoped cleanup. No real clients, charges, generator
activity or pilot activation are authorised. Source/configuration releases remain owner-controlled.
No fixture has been created under this new approval at this checkpoint.

Before any orphan action, build a private manifest containing the exact mobile version, claim,
email invitation, provider identity and stable application subject. Derive that manifest from
authoritative relationships, not an email search or a phone alone. Require every link to match
the same tenant and immutable contact digest. Unknown provider outcomes without a safely attributed
identity stay held for staff reconciliation; never infer that a failed HTTP response means no user.

Only the exact expired/revoked/declined, never-converted mobile-created identity is a candidate.
Recheck its current state under the shared mobile tenant lock. A converted invitation, accepted
email invitation, live claim or provider session, active membership, another invitation, cross-tenant
association, profile, health/commercial/domain record, valid hold or uncertain provenance vetoes
automatic cleanup. Do not erase unrelated or pre-existing accounts. The subject identifier itself
may need to remain for immutable audit; no broad cascading deletion is proposed.

## Proposed Orphan Retirement

### Local Creation-Provenance Prerequisite — 9 October

`20261009072105_mobile_identity_creation_provenance.sql` adds private, forced-RLS, immutable
creation leases and receipts. A server-generated 256-bit one-shot capability accompanies the
managed invitation; only its digest is stored in the lease. An Auth **INSERT** trigger records the
exact invitation/provider/stable-subject relationship after the existing identity-sync trigger.
It requires the current tenant/version/claim, bound email and unconfirmed newly created subject.
Metadata updates, a different email, an existing stable contact or a missing capability cannot
invent a receipt. This is creation evidence, not JWT authorisation. The retired inner reservation
and completion functions remain inaccessible to browser and service roles.

The email adapter now requires this capability and completion requires its exact creation receipt.
Missing/uncertain provenance fails closed; no existing account is automatically relinked or deleted.
The strict local retirement-candidate policy separately checks the 30-day boundary, all linked IDs,
current version and preservation vetoes. It is **not** a deletion API: reservation must recheck
authoritative records under the shared lock, and provider absence needs independent reconciliation.

Local evidence: 63 focused application tests; the complete database matrix passes 2,064 assertions
across 43 packets, including 81 assertions in the strengthened conversion/provenance packet.
Actual disposable local Auth conversion passes with eight competing requests, one provider
invitation, zero emails and exact baseline restoration. On 9 October the owner-approved migration
was applied to hosted Supabase. Its single history entry was separately approved and corrected to
`20261009072105`; readback confirms matching history, forced-RLS private provenance tables and
inaccessible retired inner functions. Auth users, creation leases and receipts remain zero, and the
sole pilot tenant remains suspended. This is schema verification, not hosted conversion acceptance.
Operational retirement/reissue, provider uncertainty/session
handling and backup-erasure reconciliation still remain; TD-066 stays Open.

### Private Coordinator Checkpoint — 9 October

The private `MobileOrphanRetirementService` and separate Supabase administrative provider adapter
now implement defensive command/manifest validation, current observation checks, preservation
vetoes, durable uncertainty before the external delete, exact-ID absence reconciliation and
no-blind-repeat handling. An acknowledged delete alone never completes retirement; application
copy/backup reconciliation remains pending. Confirmed, anonymous, changed-contact or wrong-ID
provider identities are protected. No email search or broad cascading application delete is used.

The focused candidate/coordinator/provider packet passes **79 tests**. These tests use mocked
ports: they are not database-lock, provider-confirmation/session-race or hosted acceptance evidence.
The coordinator and provider are deliberately **unwired**: no route, scheduled job or ordinary
retention sweep calls them. The native repository is a contract, not an implementation.

Remaining implementation must atomically reserve/freeze current native authority under shared
locks; prevent confirmation/conversion/session races during provider removal; persist exact
idempotent evidence; recheck before contact-only tombstoning; reconcile backup copies; and provide
reviewed staff recovery/reissue. Native local concurrency acceptance and separately approved hosted
proof follow that implementation. No new hosted migration, provider deletion, email or configuration
change was performed for this checkpoint. TD-066 remains Open; real email remains gated.

The complete Vitest run passes 1,191 tests across 156 files. TypeScript, ESLint, formatting,
production build/client-bundle checks, generated-route consistency and portability validation pass.
These are local checks, not hosted acceptance or a new accessibility review.

The schema prerequisite is now hosted; retain the real email gate disabled pending the remaining
acceptance and retirement/reissue work. The repository owner controls source
deployment. A successful local conversion does not authorise real participants or make retirement
complete.

1. Reserve an idempotent, private retirement operation with exact manifest/version, policy reference,
   due time and audit. The proposed due boundary is the existing 30-day terminal rule, subject to
   explicit privacy/owner review of its application to these secondary identity/contact copies.
2. Revoke the exact provider sessions and deny application authority before provider deletion.
   Do not restore sessions/MFA during recovery. Verify current session rows, not merely JWT expiry.
3. Remove only that attributed provider identity through the managed administrative API. Handle
   timeout/lost acknowledgement as uncertain; reconcile the exact ID before retry or contact deletion.
4. Apply approved contact-only application erasure/tombstoning while retaining required opaque
   referential/audit evidence. Never disable append-only guards in an operational retirement job.
   Preserve later restrictions, holds and erasure decisions in any application restore.
5. Reconcile every known copy and the encrypted backup/retention boundary. Record count-only result
   and minimal non-contact evidence; raw name, phone, email, token/code and provider credentials
   belong in neither ordinary audit metadata nor RAG documentation.

This design does not assume that deleting an Auth user revokes existing access JWTs. Sensitive
authority must reject a missing/revoked `session_id` independently. See
[Supabase sessions](https://supabase.com/docs/guides/auth/sessions).

## Staff Recovery / Reissue

Before expiry, the same current claim may resume the same immutable email; no lease or deadline is
extended. An accepted/uncertain email send cannot be blindly repeated. Wrong email/phone, existing
account or forwarded/shared/recycled-number reports require current operations assignment/purpose
and AAL2. Verify provenance and renewed contact authority privately, revoke all prior dependent
claim/token authority and prepare an explicit reviewed, budgeted new version.

If provider retirement is necessary before a legitimate reissue, use the same manifest and vetoes
above; no automatic relink, cross-tenant merge, phone-only login or bypass of email/document/profile
activation. Existing independent accounts use a separately approved recovery process, not this
orphan cleanup. Staff identity mismatch decisions must not be inferred from bearer possession.

## Acceptance Before Real Mobile Email

- Approve the secondary-contact retention policy, justified holds and accountable primary/alternate.
- Implement immutable, idempotent lifecycle evidence and fail-closed retirement/reissue APIs.
- Test converted and unrelated-account preservation, concurrent activation/revocation, changed
  version, cross-tenant association, live session, hold and domain-record vetoes.
- Test provider loss/timeout/retry, exact session revocation and uncertain acknowledgement without
  automatically deleting contact or sending again.
- Exercise contact-copy and backup-erasure reconciliation without resurrecting erased contacts.
- Complete local proof, then separately authorised isolated hosted proof and exact cleanup.
- Keep TD-066 **Open** and the real email gate disabled until evidence passes or a documented,
  time-bounded operating control is explicitly approved. TD-065 is separately Verified for retained
  identity/questionnaire recovery; future upload/object recovery remains excluded.
