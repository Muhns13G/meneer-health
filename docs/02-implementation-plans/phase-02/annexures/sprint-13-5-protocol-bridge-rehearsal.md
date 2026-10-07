---
plan_id: phase-02-sprint-13-5
title: First-Party Medical Transfer and Protocol Bridge Rehearsal
status: completed
last_updated: 2026-10-08
owner: "@Muhns13G"
source_commit: 3d68aed
depends_on: [phase-02-sprint-13-4]
primary_debt: [TD-009, TD-007, TD-043]
---

# Task 2.13.5 — Protocol Bridge Rehearsal

## Starting Boundary

Task 13.4 is committed at `bfc2138`; the working tree was clean on `itws-I`. It proved actual
R999 sandbox settlement and payment projections, then refunded its exact capture and removed all
fixtures. Its paid records cannot be reused as current funding for a new case. The real pilot
remains suspended. Historical hosted permissions do not authorise this task's new resources.

Follow the [13.1 contract](sprint-13-1-rehearsal-contract.md), DR-018 and the first-party intake
implementation. The retained patient external-link channel is a separately tested legacy path,
not the selected pilot questionnaire. No patient-intake URL is required to test first-party
questionnaire → exact submitted snapshot → authorised manual transfer → independent nonclinical
reconciliation. No provider API or webhook is invented.

## Evidence Classes and Scope

| Boundary                    | Required proof                                                                                                                                                                                                  | What it does not prove                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Medical authority           | Current exact snapshot, separate clinician approval/admin activation, assigned role/purpose/fields, genuine AAL2 and bounded expiry; ordinary operations cannot read answers.                                   | A synthetic roster is not a real clinical appointment.                                         |
| Consent and readiness       | Current recipient/notice/version, explicit client transfer authorisation, no restriction/unresolved safety hold, authoritative paid-review gate.                                                                | Questionnaire submission, profile creation or a paid flag is not medical consent or clearance. |
| Manual transfer             | Correct transcriber records an exact snapshot/case-version/opaque external reference, with durable receipt and replay checks.                                                                                   | A fixture reference is not actual external delivery or a generated protocol.                   |
| Independent acknowledgement | A different assigned actor reconciles only the opaque transfer/evidence reference without seeing medical answers; self-verification denied.                                                                     | Reconciliation is not clinical approval, treatment, dispensing or shipping.                    |
| Exceptions/status           | Missing provider/readiness, stale snapshot, withdrawn/restricted intake, wrong purpose/role/assignment, self-review and expired/revoked authority fail closed; client status is coarse and contains no answers. | Mocked outage success is not current generator compatibility.                                  |
| Cleanup                     | Exact manifested fixtures/sessions only, original fingerprints/security metadata and disabled settings restored.                                                                                                | Passing `finally` or matching table counts alone does not establish cleanup.                   |

No real health information is transferred; no dose, protocol approval/send, product order,
dispensing, real client, provider purchase or real charge is authorised by implementation work.
Keep collection/transfer, notifications and commerce disabled outside a separately approved
isolated exercise. The positive medical transfer receipt is explicitly synthetic unless it is
supported by a separately approved current external-provider observation.

## Repeatable Local Packet

`bun --no-env-file run scripts/test-sprint13-handoff-rehearsal.ts` targets only
`supabase_db_meneer-health-local` and rejects hosted/Supabase/Stripe/Brevo/medical-key environment
configuration. It reuses the nine fixed Sprint-10 suites for workforce authority, queue projection/
commands, retained handoff state machine/channel, own-client projection, medical foundation,
medical field/purpose grants and first-party transfer/rights.

Each suite is rollback-only, has a 45-second statement timeout and five-second lock timeout, and
must return complete passing TAP. Before/after every suite the runner compares exact table row
fingerprints across application/Auth schemas plus table RLS/ACL metadata, original trigger
definitions/states, and application/payment/transfer function definitions/owners/ACL/configuration.
No row values, tokens, MFA seeds, clinical answers or raw SQL errors are printed. The helper's
hashes are consistency evidence, not a cryptographic clinical record seal.

Existing positive local fixtures replace only the case-specific payment function inside the
rollback transaction. That visible substitution is not hosted funding, Stripe settlement or
generator evidence. This packet must never be adapted to hosted by replacing its container target,
nor copied with the local seed. The packet itself changes no schema or production guard;
the separately reviewed narrow TD-062 correction is recorded below.

## Hosted Packet — Approved and Verified at the Synthetic Boundary

The owner explicitly approved an isolated tenant and disposable client, transcriber/clinician,
independent clinical approver, security administrator and independent assigned reconciler, all
with synthetic publications/snapshots/roster references and actual provider sessions/TOTP.
Generated OTPs are session prerequisites, not fresh email delivery evidence. No emails are planned.
Temporary same-source configuration must be manifested and restored to the approved disabled
baseline. Scoped append-only cleanup uses necessary named triggers in a locked transaction,
re-enabled before commit; no general cleanup bypass or hosted seed.

Because 13.4's fixtures were removed/refunded, fresh hosted positive paid-transfer proof requires
separate approval for one additional standalone-account `acct_1U32UbFfj16Nnr1i` R999 sandbox
Checkout/capture, genuine signed ingestion and exact original-method refund. Without approval,
the hosted positive paid path stays gated; local substitution must not be deployed as a shortcut.
The prior deposit driver must not be blindly reused: it cleans up/refunds before medical transfer
and has no 13.5 resource authority. Build a bounded task-specific packet after scope approval.

The owner also approved that additional exact sandbox capture/refund. Both approvals exclude
emails, generator access, actual health transfer, clinical approval/send, real-pilot activation
and dispensing. Each new migration received separate explicit approval; source deployment
remained owner-controlled.

## TD-062 — Medical Grant/Transfer Conflict Correction

Static inspection and a read-only hosted definition count confirm six intentional `MEDICAL_CONFLICT`
raises still use serialization SQLSTATE `40001` in four RPCs: `approve_medical_grant` (one),
`authorise_medical_transfer` (one), `record_medical_transfer` (two), and
`reconcile_medical_transfer` (two). This is the same retry-sensitive business-conflict misuse as
TD-060/061, but outside their verified scopes. No hosted retry failure was deliberately induced.

CLI-created migration `20261007201957_medical_transfer_business_conflict_status.sql` changes only
those six raises to `PT409`, asserts exact expected definition counts and unchanged owner, ACL,
security-definer and configuration, and leaves all clinical/payment/recipient/safety guards,
audit and other RPCs unchanged. The staff intake HTTP handler recognises `PT409` as private 409;
real serialization errors retain existing handling. Safety-response conflicts are not broadened
into this patch; other RPC review remains Task 13.9.

Local migration/security guards and 87 SQL assertions across three suites pass, including stale
case version, changed transfer replay and changed independent reconciliation. Five HTTP error-
mapping tests pass alongside local packet guard tests. The correction required separate explicit
hosted migration approval and owner-deployed handler before the hosted conflict packet ran.
The owner committed preparation at `ef7d3a3` and explicitly approved hosted application. The
linked dry-run contained only `20261007201957`, with no seeds/roles; application succeeded.
Independent read-only verification confirms the six `PT409` raises (1/1/2/2), retained security-
definer and anonymous/browser denial/service-wrapper boundaries, and matching migration history.
The migration's unchanged owner/ACL/configuration guards passed atomically. Fresh active Cloudflare
version `6ae5b581-0219-4a2d-a646-73a4829e48fd` serves 100%, script ETag
`da37d24c1ce2fa01145b0dfb5f2a5847448d2dde40e477ff569c6e7ef5bd3fbc`, after the owner-reported
latest branch deployment. This is a runtime metadata checkpoint, not independently mapped Git SHA
or authenticated medical command proof. Auth users/sessions remain zero and the real pilot suspended.
Canonical order/intake commands remain disabled (412); Stripe webhook remains disabled (404).
At that earlier checkpoint TD-062 remained
in progress pending fresh routed conflict/replay/cleanup proof; configuration presence or
owner deployment alone is not that proof. This was the earlier pre-rehearsal checkpoint;
the fresh routed acceptance and cleanup below now close this correction.

The CLI-generated timestamp precedes previously applied `20261007220000`; local validation used
`migration up --local --include-all`. Hosted dry-run must be reviewed for exactly this pending
migration before any approved application; no seed or unrelated migration is authorised.
The linked dry-run with `--include-all` confirms exactly this one migration and no seeds/roles.

## TD-063 — First-Party Preparation Implemented and Verified

The whole-journey trace found a real capability gap hidden by positive fixture setup. The retained
`identity_private.operations_readiness(uuid)` still returns `paymentReadiness=integration_pending`
and `ready=false`. `command_operations_queue` requires this readiness before `mark_ready` can
advance `onboarding_pending` to `ready_for_handoff`. Meanwhile `record_medical_transfer` requires
the case already be `ready_for_handoff`. At discovery no first-party preparation action bridged
these states; client transfer authorisation recorded consent without moving the case.

Read-only hosted function-definition flags independently confirm all three conditions. The
positive medical-transfer SQL tests previously set the case state as a fixture, then used their
rollback-only synthetic payment function. Those tests prove the isolated transfer machinery;
they do not prove a live case can reach it through the first-party workflow. Do not set a hosted
case to ready through fixture SQL and call that end-to-end proof, or unlock the legacy external-
link readiness as a shortcut. At that discovery checkpoint the additional sandbox capture had
not been created.

The owner approved implementation. New first-party `prepare_transfer` rechecks the exact submitted snapshot,
client recipient/notice authorisation, no restriction/unresolved safety hold, authoritative deposit,
live bounded medical-transfer grant, AAL2, active assignment/current claim and expected case version.
It persists a payload-free preparation intent and idempotent audit before external work; only then
advances to `ready_for_handoff`. `record_transfer` binds that preparation and rechecks the same
live guards, including exact replay, while acknowledgement remains separate independent nonclinical
evidence. Staff controls and stale/replay/restriction/expiry/audit-failure tests are implemented.
It does not auto-clear safety holds,
approve protocols, invoke the generator or make a paid flag medical authority.

Migration `20261007204237_first_party_medical_transfer_preparation.sql` is applied locally and,
after separate explicit owner approval, to hosted Supabase with matching migration history.
Two forced-RLS, service-hidden immutable journals bind grant/claim/client-authorisation/snapshot/
case versions and the recorded transfer. The intent expires within 15 minutes and no later than
grant, assignment, client authorisation or publication validity. Expiry, release or replaced
authority does not create a resend permission. Preparation requires the assigned current claimant
to hold an independently approved medical-transfer grant; ordinary staff membership is insufficient.
Existing recording-function owner, ACL, security-definer and configuration are asserted unchanged;
the legacy external-link readiness remains closed and unchanged. No clinical protocol approval.

The staff HTTP handler accepts only intake/snapshot/version/request references, and the UI defaults
to preparation, states that nothing was sent, and requires reloading the current case version
before recording. Browser testing found editable pre-hydration fields could lose early input;
all affected controls now remain disabled until hydration, preserving native required validation.
No private values enter URL/storage, and existing state-clearing/status focus behaviour is retained.

Clean local schema replay passes. Final local evidence: **116 focused SQL assertions** across three
suites, **546 assertions** in the nine-suite fingerprint packet, **94 application tests across ten suites**,
production build/client canary/MCP absence, TypeScript/ESLint/portability/discovery/generated checks,
SQL lint with no errors and **4/4 desktop/mobile controlled browser checks** including axe/reflow, exact reference payload,
no claimed external delivery and stale-conflict/no-auto-retry. Browser responses are controlled;
they do not replace hosted Auth/database/provider proof. An initial legacy packet interruption
was followed by isolated and complete passing reruns; no guard/assertion was relaxed.

The owner committed/deployed the handler/control at reported source `3d68aed`. Runtime metadata
verified the same script ETag throughout the configuration-only rehearsal; it is not an independent
Git-SHA-to-provider-build attestation. The new baseline contains 127 application tables, including
both preparation journals. The fresh paid packet below passes without seeding a ready case,
intake snapshot, grant, preparation, transfer or settlement. Current generator compatibility
stays separately gated.

Before any mutation, verify exact source/runtime/schema, suspended pilot, empty application/Auth
baseline, existing secret metadata, provider quota and unchanged configuration. Persist a private
0600 resource manifest; require rollback-proven setup/cleanup. Stop affected paths on unexpected
data, concurrent deployment, missing authority, unconfirmed payment or unsafe disclosure.

## Generator Dependency — Explicitly Gated

The last recorded authenticated generator visit reached `/subscribe` on 5 October; it is not
rechecked or assumed active here. Follow the [reactivation checklist](../../../05-future-considerations/protocol-generator-reactivation-and-compatibility.md)
before asserting current access, input mapping or output/PDF compatibility. The owner must restore
subscription entitlement and separately approve any provider login/test-record action. Do not
purchase, approve/send a protocol or infer male sex/clinical answers from the business focus.

The Meneer-only bridge and unavailable-provider state may be tested without buying access. Any
synthetic transfer/acknowledgement recorded solely in Meneer must be labelled accordingly, not
misrepresented as provider acknowledgement. Current generator success remains a named external
gate. TD-009/007/043 retain their real-provider/domain/operating criteria regardless of this task.

## Status

Task 13.5 is **completed at its authorised Meneer-only synthetic boundary**. Earlier local packet passed 514 assertions; after the narrow correction,
the instrumented full rerun passes **517 assertions across nine suites**, with exact row/security/
function restoration. One initial corrected-packet run stopped with a generic failure; adding
safe suite/reason diagnostics and repeating the packet passed. The interruption was not reproduced
or conclusively diagnosed; no assertion or production guard was weakened. Final local regression
passes **90 tests across nine suites**, strict TypeScript, focused ESLint and formatting/whitespace
checks. The subsequent preparation implementation and stronger validation are recorded above.
Both separately approved migrations are hosted with matching history. Fresh bounded acceptance
and independent restoration pass, closing TD-062/TD-063 in their stated scopes. Current external
generator compatibility remains gated. No source deployment, branch switch, staging, commit or
push was performed by this task; configuration-only changes and disposable hosted fixtures were
expressly authorised and restored/removed.

## Fresh Hosted Acceptance — 7/8 October 2026

The guarded interactive `medical-bridge` scenario in `scripts/test-sprint13-hosted-payment.ts`
uses `scripts/lib/sprint13-hosted-bridge.ts`; ordinary CI must never run it. It requires fresh
explicit resource/capture/cleanup approval, exact current Worker version, restricted sandbox key,
approved account and saved-Stripe disabled-restoration guards. It preserves a private 0600
manifest, validates setup/cleanup in rollback first, and stops affected paths on uncertainty.

Two earlier attempts were **not passes** and created no Checkout/capture. The first tried to submit
without first saving a draft and was rejected. The second successfully submitted and approved/
activated the grant but failed its read assertion: the harness assigned staff to a separately
seeded payment case, while real intake creates its own case. The response status was not logged
by that earlier assertion. Both attempts fully restored settings, fingerprints, triggers and zero
Auth/session baseline. The correction removes the unrelated seeded case, follows the real
endpoint's case ID, independently verifies tenant/client linkage, then assigns and claims that
case. No production access check was weakened. A regression proves this linkage and rejects
mismatch. The final harness/regression packet passes 12 tests.

Fresh successful acceptance proves:

- Real disposable provider sessions and workforce TOTP/AAL2; email-only, unassigned, wrong-role
  and foreign-case denials, actual queue claims/releases, exact replay and unchanged-state 409s.
- Actual client draft/save/submission creates the case and encrypted current snapshot; independent
  clinician grant approval and administrator activation permit only `full_name`/`sex` for the
  assigned transcriber. Ordinary operations and the nonclinical reconciler cannot read answers.
- Actual client transfer authorisation; unpaid preparation remains 412. Authenticated R999 terms
  acceptance and Checkout produce one actual test capture on the approved standalone account.
  Genuine signed `checkout.session.completed`, exact settlement lineage and deposit funding are
  independently checked; payment alone does not advance the case or supply state.
- Routed preparation advances the case from version 6 to 7; recording binds its immutable intent
  and advances to 8. Exact replays return the same references; stale/changed requests return 409.
  Rollback-only restricted-intake, unresolved-safety, revoked-grant and released-claim faults deny
  recording and leave one preparation/no transfer/the unchanged ready case.
- A different assigned operator reconciles opaque synthetic evidence, advancing to version 9;
  self-reconciliation and medical answer access are denied. Exact replay is stable and changed
  evidence conflicts. Own-client statuses are `handoff_pending` then `handoff_recorded`; one bound
  transfer/reconciliation and AES-256-GCM intake are checked, with no fulfilment.

This is **synthetic Meneer-only acknowledgement**, not delivery to Precise Wellness or a generated
protocol. No generator access, email, real health transfer, clinical approval/send or dispensing
occurred. The separate released browser/assistive-technology walkthrough remains Task 13.8.
Checkout was completed with the official test card in the browser; its return browser had no
application session. Authenticated confirmed payment/status proof came from the manifested
sessions, not that unauthenticated return page.

The exact R999 test capture was fully refunded to its original method. Independent provider
verification finds exactly one refund for 99900 ZAR minor units, status `succeeded`, matching the
payment, with the charge fully refunded and undisputed; refund reference
`re_3UO2rdFfj16Nnr1i172h65Ze`. Stripe retains these test records. The temporary webhook is removed.
All five disposable Auth identities/sessions and manifested fixtures were removed by scoped locked
cleanup. Independent post-packet verification matches **all 127 table fingerprints/13 baseline
rows and original trigger states**, Auth users/sessions zero, one suspended real pilot, matching
migration history, forced preparation RLS and anonymous/browser execute denial.

Final active 100% same-source Worker: `a6f15689-a354-4d27-a70e-fa5faa8498e5`; ETag
`1417a0bc963867d14a9a1cdcc88615d822f920a5a25bb756264856c87bd4d535`.
The temporary medical tenant binding is actually absent, existing keyring retained, intake and
all four commerce modes disabled. Canonical order/intake commands return 412; Stripe callback
returns 404. Restoration uses the explicitly approved saved Stripe/suspended-pilot baseline,
not unknown original secret values. Task 13.6 is next; no pilot activation or Sprint 13 closure.

Final local regression after the harness corrections: **882 tests across 135 suites pass**;
strict TypeScript, focused ESLint and formatting/whitespace validation are recorded with this
closure. No new runtime source change or migration was needed for the fixture-linkage correction.
