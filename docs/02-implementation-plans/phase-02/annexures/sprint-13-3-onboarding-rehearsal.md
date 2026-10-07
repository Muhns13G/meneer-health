---
plan_id: phase-02-sprint-13-3
title: Synthetic Onboarding and First-Party Intake Rehearsal
status: completed
last_updated: 2026-10-07
owner: "@Muhns13G"
depends_on: [phase-02-sprint-13-2]
---

# Task 2.13.3 — Onboarding Rehearsal

## Starting Boundary

Task 13.2 closure is committed at `e0ab390`; the working tree was clean before this task.
Cloudflare serves `itws-I-preview`; hourly recovery runs separately from `main`. The 13.1
[rehearsal contract](sprint-13-1-rehearsal-contract.md) governs new hosted authority and cleanup.
Earlier Sprint 9–12 approvals are not reused. No payment, professional approval, generator action,
real legal publication or real-pilot activation belongs to this task.

Fresh read-only hosted baseline passes: one suspended `meneer-pilot` tenant, zero Auth users,
48 public resources, 18 service-unreadable resources, only the tenant and 12 provider gates nonempty
among service-readable tables, anonymous tenant access denied. This is a sampled service/API
baseline, not proof of emptiness in deliberately hidden private tables. An independent read-only
SQL check now covers all **125 application tables**: **13 rows total**, only the tenant and provider
gates nonempty, **zero Auth users and sessions**. No row content was logged. Capture the exact
count/hash and trigger-state cleanup manifest before fixture creation.

## Required End-to-End Evidence

| Scenario           | Acceptance                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invitation         | Actual approved-mailbox invitation, confirmed six-digit OTP; replay and wrong-contact denial.                                                        |
| Identity/session   | Secure cookies, routed sign-in/recovery, renewal, expiry/tamper rejection and revocation.                                                            |
| Profile/documents  | Synthetic profile and exact publication/version/hash acknowledgements; independent durable verification and mismatch/stale rejection.                |
| First-party intake | Synthetic medical notice and instrument, section/branch behaviour, encrypted draft, review and submission; no bloods prerequisite or payment bypass. |
| Portal             | Own-client status matches durable state; private/no-store responses; unauthenticated and wrong-subject denial.                                       |
| Cleanup            | Exact fixtures/sessions removed, append-only triggers re-enabled and original suspended baseline restored; previous Worker settings restored.        |

Use only the isolated synthetic tenant and approved controlled mailbox. Ordinary profile and logs
must contain no medical answers. OTPs, cookies, keys and questionnaire payloads remain outside Git
and evidence output. Capture actual delivery separately from provider acceptance. Generated admin
OTP links do not substitute for real email-delivery proof.

## Execution Prerequisites

Fresh owner approval has been received for disposable hosted onboarding fixtures, emails to
`support@meneerhealth.co.za`, isolated temporary configuration and guarded exact-resource cleanup.
Both the bounded rehearsal and scoped cleanup were explicitly authorised on 7 October 2026.
The approved disposable prerequisites have now been created. The existing interactive Sprint 9 Auth and Sprint 10 intake
helpers are historical scenario-specific tools; do not reuse their fixed tenant IDs or old restoration
versions as Sprint 13 authority. Review/adapt the harness before executing it.

Task status is **completed** at the isolated synthetic boundary recorded below. This is not pilot
activation or proof of real legal/clinical approval.

Local preparation passed **42 tests across five service suites**: invitation verification, account
activation, patient sessions, own-client portal and medical intake. These deterministic checks use
synthetic fixtures and are not fresh hosted email/browser/durable-state evidence. Documentation
formatting and whitespace checks pass. Files remain unstaged for owner control.

## Current Hosted Checkpoint

The Auth driver now accepts a distinct `SPRINT13_HOSTED_ONBOARDING_CONFIRM` guard and labels its
evidence as Sprint 13. It reuses no historical SQL fixture IDs or Worker restoration versions.
Strict TypeScript and driver formatting checks pass.

Before mutation, the complete 125-table count/hash inventory and trigger state were captured in a
private temporary manifest. Fresh setup and exact-root cleanup transactions both passed in
**rollback-only** mode. Only afterward were the disposable tenant, one non-login synthetic
authority subject, two explicitly synthetic account instruments and reserved invitation persisted.
The single disposable Auth identity is `ef4c865a-7f83-4a52-8cfc-8a6feab7644a`; the isolated tenant is
`e1330000-0000-4000-8000-000000000001`. They are cleanup identifiers, not real client records.

The owner supplied the fresh invitation code, confirming mailbox receipt. Only that reserved
invitation was marked delivered. Hosted verification returned **204** with a Secure/HttpOnly/
SameSite=Strict preactivation cookie; replay returned **422** without a new cookie. Account
instrument preparation returned **200**, and routed synthetic activation returned **204**.
Independent SQL verifies **one profile**, **two exact publication/version/hash receipts** and the
accepted invitation, with the real pilot still suspended. No record contents were logged.

Hosted anonymous portal access returns
**401**, and a wrong-contact verification returns **422**, with private/no-store responses.
The owner supplied the fresh sign-in code. Hosted sign-in returned **204** with a secure session
cookie and own-client portal returned **200** with the expected contact. Sign-in replay returned
**422**; renewal returned **204**; cookie tampering and expiry each returned **401**. Real provider
session revocation was followed by a **401** portal denial. All driver response privacy checks pass.

The owner supplied the fresh recovery code; routed recovery returned **204** without issuing a
new authorising session. Real email invitation/sign-in/recovery and the session packet are proven.

The private manifest directory is
`/var/folders/vb/y3j62bbj68vg8t8f08g4zqww0000gn/T/meneer-sprint13-onboarding-D8USvi`;
it contains only aggregate baseline/trigger inventory and exact cleanup roots, not OTPs or cookies.
The interactive Auth driver has finished, and its exact disposable provider identity was deleted.

## Questionnaire Finding and Containment

Only the isolated tenant was temporarily enabled in Worker version
`9ea4dffc-62da-450b-9da7-b0273c9e88a1`; its script ETag exactly matched the original version.
One synthetic intake publication and a second non-login test authority subject were added under
the approved fixture scope. A separately labelled generated-code session prerequisite sent no
new email and is not counted as email-delivery proof.

Hosted notice read, draft save and exact replay returned **200**. The stale-version request returned
**503 instead of 409**; a single diagnostic probe confirmed that status. The packet stopped before
submission, transfer or payment. This is **TD-060 In progress**, not a successful hosted intake
rehearsal. The deployed function contains two intentional `40001` business-conflict raises.
Supabase [documents serialization retry behaviour](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b)
consistent with this failure; provider retry logs were not independently inspected.

The narrow local migration `20261007180000_medical_intake_business_conflict_status.sql` changes
only those two `INTAKE_CONFLICT` raises to `PT409` and asserts unchanged ACL/owner/security/config.
The adapter recognises `PT409`. Local SQL reset/migration validation and **112 pgTAP assertions**
pass; **20 targeted adapter/service/HTTP tests**, including the explicit private HTTP 409 regression,
and strict TypeScript pass. At that checkpoint the migration and adapter were not hosted.
The approved hosted correction and subsequent retest are recorded below. Other RPC conflicts
remain outside this narrow patch.

ESLint, focused Prettier checks, production build/client-bundle/MCP-absence checks and generated
route-tree checks pass. The local synthetic Supabase stack was stopped after validation. Files
remain unstaged; no source commit, push or source deployment was performed by the agent.

The verification skill kept browser presentation separate from persistence proof: after an initial
sandbox listener-permission failure, the authorised local rerun passed **2/2 desktop/mobile
questionnaire browser tests**, including sections, branching, review and hidden-state behaviour.
Those tests use controlled API responses; they do not replace hosted submission proof.

Actual locked scoped cleanup restored all **125 table count/fingerprints** and the exact original
trigger state. Independent proof confirms **zero Auth users/sessions**, 13 original application
rows and suspended real pilot. Cloudflare refused the old secret-bearing version restoration
(`10220`), so fresh configuration-only versions restored disabled mode and removed the temporary
tenant binding. Final active version is **`9a050fe7-bc6f-44fd-8de8-10a732669b8b`**, on identical code;
the hosted intake route again returns **412**. Historical immutable Worker versions remain provider
deployment evidence, not active settings. No payment/generator action or real clinical approval
occurred. Hourly encrypted backup artefact disposition remains part of Task 13.7 cleanup review.

## Approved Correction, Fresh Retest and Closure

On 7 October the owner approved the narrow migration and confirmed all branches were updated and
Cloudflare deployed. Local source was clean at `975839d`. Linked CLI dry-run identified only
`20261007180000_medical_intake_business_conflict_status.sql`; the approved push applied it without
seeds. A second dry-run reported no pending migrations; independent SQL confirms its exact history
version. The migration's guards require two exact intentional conflicts and unchanged security
metadata before committing.

The freshly deployed baseline was Worker **`48891bd0-54b5-4f4d-a134-8602045d1050`**, script ETag
`e73ba4a40aa4c39fd457c1fc0a0665f7b0a9067bc75d4e441bcbc07850f14e8b`. Owner deployment is confirmed
by the owner; a separate provider build-to-Git-SHA mapping was not collected in this retest.
Configuration-only rehearsal version **`36e5aa56-669f-4d6e-ac5d-f4949c88c332`** preserved that ETag
and scoped intake to the disposable tenant only. No agent source deployment occurred.

The first fresh invitation was sent before its application fixture was prepared: verification
returned **422**, not a pass. Its Auth identity and exact application identity roots were removed
with the approved rollback-tested cleanup, restoring the original baseline before restarting.
The replacement invitation was correctly prepared as reserved; the owner's fresh code confirmed
receipt before it was marked delivered. Verification returned **204**, synthetic instruments
**200**, and routed activation **204**. No OTP was retained in the evidence pack.

The full hosted questionnaire packet then passed: notice read, encrypted draft save and exact replay
**200**; stale-version write **409**; subsequent read still **draft/version 1**; submission **200**;
final own-client read **submitted/version 2**; foreign intake **401**; routed sign-out **204**.
Private/no-store and no-CORS checks passed throughout. The separate generated-code session
prerequisite is not counted as new email-delivery proof. No bloods were supplied, no deposit bypass
was used, and no transfer/payment/generator action occurred.

Independent SQL confirms one profile, two account receipts, the exact medical notice receipt,
one submitted version-2 intake and one version-2 snapshot with **AES-256-GCM ciphertext**, no
transfer, and the suspended real pilot. Only booleans/counts were printed, never answers/envelopes.
Section/branch/review presentation and publication mismatch/stale-document regression remain
local controlled evidence; they are not represented as additional hosted browser/AT acceptance.
The real released-flow walkthrough remains Task 13.8.

Rollback-only cleanup was re-proven before committing exact-root deletion. Independent reconciliation
restored **all 125 table count/fingerprints**, **13 original application rows**, and exact original
trigger state. The disposable provider identity was deleted; Auth users and sessions are **zero**.
Fresh configuration-only restoration preserved the deployed ETag, restored disabled mode and
removed the temporary tenant binding. Final Worker is **`f8aed8c4-1e33-4e06-a93f-34130cfdc6d8`**;
canonical intake again returns **412**. No old source version was rolled back.

Private aggregate cleanup manifests are under
`/var/folders/vb/y3j62bbj68vg8t8f08g4zqww0000gn/T/meneer-sprint13-retest-468umI`.
Both interactive helpers are closed. Immutable provider versions and any scheduled encrypted backup
artefacts are historical evidence; their disposition remains Task 13.7, not a claim of removal here.

**Task 13.3 completed; TD-060 Verified** for this one corrected RPC. Other intentional serialization
codes remain a Task 13.9 audit consideration. Sprint 13, release approval, provider review and pilot
activation are not closed by this task. Closure documentation remains unstaged for owner commit.
