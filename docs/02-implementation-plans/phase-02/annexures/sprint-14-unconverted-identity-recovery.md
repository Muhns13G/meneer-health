---
plan_id: phase-02-sprint-14-orphan-identity
title: Unconverted Mobile Identity Retention and Recovery Design
status: design-prepared-execution-disabled
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# TD-066 — Bounded Retention and Staff Recovery Design

Prepared during Task 14.8. This is an engineering proposal and acceptance checklist, **not**
permission to erase hosted identities, resend messages, change retention or activate mobile email.
The owner-approved private-register defaults remain 30 days after terminal expiry/revocation
for unconverted contact data and 90 days for minimal mobile journal. Provider/application contacts
and backups are separate copies; a register deletion cannot be advertised as complete erasure.

## Provenance and Eligibility

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
  time-bounded operating control is explicitly approved. TD-065 recovery remains independently open.
