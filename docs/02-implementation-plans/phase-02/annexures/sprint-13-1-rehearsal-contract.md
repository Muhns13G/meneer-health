---
plan_id: phase-02-sprint-13-1
title: Sprint 13 Rehearsal Contract and Readiness Handoff
status: completed-contract-execution-gated
last_updated: 2026-10-07
source_commit: 08dc68c
owner: "@Muhns13G"
audience: internal
sensitivity: internal
depends_on: [phase-02-sprint-12]
---

# Task 2.13.1 — Rehearsal Contract

## Starting Boundary

Sprint 12 is [completed with activation gates](../../../03-completion-reports/phase-02/sprint-12-support-accessibility-readiness.md).
Its closure is committed at `08dc68c`; the working tree was clean on `itws-I` before this task.
All ten engineering tasks are closed at their recorded boundaries, not proof of live support,
exhaustive released accessibility or pilot approval. Registry: 59 items, 52 Verified and seven
non-Verified. Existing statuses and acceptance criteria are unchanged.

Read-only GitHub inspection on 7 October found preview run
[37586367138](https://github.com/Muhns13G/meneer-health/actions/runs/37586367138)
at `234ef828bc6dfda6617ff18b3f3a51b5195f712e` failing the development-tool `sharp <0.35.5`
advisory. Earlier validation steps passed; build/browser steps were skipped. This is the finding
already patched and locally Verified as TD-059 in `08dc68c`, not a second debt. No exact-commit
run was returned for `08dc68c`. Owner reconciliation/push and passing exact-code CI are execution
prerequisites. The agent neither stages, switches branches, pushes nor deploys.

This task freezes the rehearsal packet only. It sends no email, creates no identity/payment,
changes no hosted binding/schema/provider setting, and activates no tenant. Previous Sprint 10–12
fixture/configuration approvals do not become standing Sprint 13 permission.

## Reconciled Journey and Scope

Use DR-013/015/018 and the completed Sprint 9–12 implementation, not the older external-intake
assumption: invitation → confirmed identity/profile → exact document acknowledgements → protected
first-party questionnaire → authoritative R999 review-deposit settlement → authorised manual
transfer/professional review → independent nonclinical reconciliation → exact approved order with
capped deposit credit, separate delivery and eligible original-method refund.

Questionnaire draft/submission and urgent guidance remain free. Bloods are not required for initial
submission; later testing remains a clinician decision. No synthetic payment shortcut may stand
in for the implemented authoritative deposit adapter. Payment never clears medical/safety holds,
approves a protocol, dispenses or dispatches. External patient-intake-link activation is not required
for this first-party path; the provider generator remains a separate controlled dependency.

The [generator reactivation checklist](../../../05-future-considerations/protocol-generator-reactivation-and-compatibility.md)
records the last observed subscription/access exception. Its present state is not rechecked here.
Without current authorised access and mapping/output compatibility proof, 13.5 can test the Meneer
bridge and unavailable-provider behaviour, but cannot claim current generator success or approve
real manual transfer. Restoring a paid subscription requires the owner; no purchase is authorised.

## Owners and Identities

| Responsibility                       | Rehearsal owner / prerequisite                                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source, deployment, release decision | Repository/business owner `@Muhns13G`; exact commit, release scope and separate go decision.                                                          |
| Technical execution and evidence     | Technology operator under a bounded owner approval; record actor and exercise/version references.                                                     |
| Clinical/safety and generator review | Privately appointed qualified reviewer and alternate; no appointment inferred from test roles.                                                        |
| Privacy, complaints and support      | Privately approved purpose-specific primary/alternate coverage, deadlines, hours/absence and escalation evidence under TD-043.                        |
| Commercial/refund authority          | Independently authorised financial reviewer; general operations membership is insufficient.                                                           |
| Accessibility acceptance             | Named reviewer, exact released code and supported desktop/mobile/browser/AT scope; owner confirmations from Sprint 12 stay local historical evidence. |

Create one isolated disposable tenant, never enable `meneer-pilot`. Synthetic subjects comprise a
client, assigned operations actor, authorised medical-transfer/reviewer actor, independent financial
reviewer, and purpose-support primary/alternate. Use distinct identities where independence is
required; individual workforce actors use genuine TOTP/AAL2. Wrong-purpose/unassigned/revoked
identities are negative fixtures, not extra privileges for the real pilot.

Use synthetic `.invalid` names/addresses for non-delivery fixtures. A real controlled mailbox is
needed only for actual Auth/notification delivery; obtain approval for the exact address and
recipient identities before sending. Do not assume a new alias exists or reuse shared credentials.
No real patient, completed questionnaire, private appointment or credential belongs in Git.

## Ordered Script and Evidence Matrix

| Task  | Execution / required evidence                                                                                                                                                                                                         | Stop or honest gated outcome                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13.2  | Exact source/deployed Worker version/checksum and passing CI; branch-only media differences; secret presence without values; migration parity, RLS/ACL/advisors, restored baseline, monitoring/backup/restore and rollback readiness. | Unknown deployed version, unexpected real data, advisory, migration drift or missing recovery evidence prevents hosted mutation.                                          |
| 13.3  | Disposable invitee completes real invitation/OTP, recovery/session controls, profile and exact version/hash document receipts; medical notice, sections/branches, review/submission and own-client projection.                        | Synthetic publications prove mechanics only; real domain approval is required for release. No clinical answers in account profile or ordinary telemetry.                  |
| 13.4  | Assignment/claims, independently authorised test Checkout and signed provider settlement; paid-review eligibility and scoped status.                                                                                                  | Test account ID/mode and no-real-money approval mandatory; redirects/acceptance alone are not capture.                                                                    |
| 13.5  | Current exact submitted snapshot, purpose/assignment/time-bound medical grants, provider entitlement/mapping, transfer acknowledgement and independent reconciliation.                                                                | Missing generator access remains a named external gate; no mock substituted as current provider proof. No approve/send/dispense action without separate domain authority. |
| 13.6  | Cancellation/refund/duplicate/dispute and payment uncertainty; failed/suppressed notification, provider outage, revoked/expired session, wrong role/tenant/purpose and alternate support escalation.                                  | Uncertain delivery or payment remains held pending independent evidence; emergency path creates no ordinary case/email.                                                   |
| 13.7  | Reconcile immutable audit/receipts, authoritative money facts, transfer and human-response records, minimal telemetry, alert delivery, encrypted recovery and exact cleanup.                                                          | Missing chains or unexplained baseline delta fail acceptance; acceptance, delivery and human response are separate facts.                                                 |
| 13.8  | Complete local matrix with hosted configuration excluded; exact-code hosted-safe headers/denials; real desktop/mobile private-flow keyboard/zoom/AT walkthrough and retests.                                                          | No blanket screen-reader pass from axe or prior local confirmations. Preview media must exist if configured; keep the HTTP media check.                                   |
| 13.9  | Independently reconcile TD-006/007/009/010/037/038/043 and newly found debt against original criteria.                                                                                                                                | Open, in-progress or scope-removed outcomes remain explicit; no automatic Verified on sprint completion.                                                                  |
| 13.10 | Sprint/Phase reports, full file inventory, evidence/limits, explicit go/no-go and first-client/rollback checklist.                                                                                                                    | A technical rehearsal is not owner go approval; unresolved stop-ship capability remains unavailable.                                                                      |

For every scenario record: exact source/runtime/schema baseline; opaque exercise/scenario reference;
actor role/purpose/assurance; initial state and expected transition/denial; observed response and
independent durable result; provider evidence provenance; timestamp; pass/fail/gated outcome;
cleanup result and accountable reviewer. Never store cookies, OTPs, MFA seed, API/encryption keys,
full provider message IDs or medical responses in the committed evidence pack. Sanitise screenshots
and logs. Provider receipts/manual replay, fault injection and real provider delivery remain labelled.

## Authority and Stop Conditions

Before each hosted packet obtain explicit scope covering target/version, migrations if any,
disposable Auth/tenant/publication fixtures, approved recipient emails, test-account Stripe records,
provider generator test actions and temporary Worker/provider settings. Sender webhook installation
requires separate approval and actual unattended push proof; Sprint 12's replay does not satisfy it.
Verify provider quota and Auth headroom before claiming a shared sender allocation is sufficient.

Stop the affected scenario on real data/identity, live credentials or charge, wrong provider/account,
unexpected recipient, unexplained mutation, unsafe health disclosure, missing authority, uncertain
delivery without reconciliation, failed expiry/revocation, broken audit chain or failed restoration.
Preserve safe evidence, contain only authorised test resources, and ask the owner if new authority
is required. Unrelated read-only preparation can continue; never dilute a stop condition to finish.

## Cleanup and Restoration Plan

1. Before mutation capture aggregate-only table/Auth counts, tenant states, migration versions,
   security metadata and non-secret configuration fingerprint. Confirm isolated targets and no
   new real data; do not reset hosted Supabase or copy the local seed.
2. Maintain an exact test-resource manifest privately, outside Git. Scope every row, user, session,
   Checkout/refund, generator record, monitor/incident and temporary binding to the exercise.
3. Restore previous disabled modes/bindings and remove only newly introduced secrets; verify an
   omitted secret is actually deleted rather than retained by provider PATCH semantics. Never
   print secret values. Restore any approved webhook configuration precisely.
4. Revoke sessions and delete only manifested disposable identities/rows. Append-only evidence
   deletion requires separate approval for named triggers, locked transactional cleanup,
   re-enable-before-commit and verification. Never introduce a general cleanup bypass.
5. Expire exact unfinished sandbox Sessions. Captured/refunded/dispute test records may be retained
   by Stripe; record their test-only disposition rather than claim deletion. Generator records need
   provider-supported deletion or an explicit retained synthetic disposition.
6. Independently compare baseline counts, Auth, suspended pilot, gates, trigger/RLS/ACL metadata and
   restored Worker/provider settings. Outstanding artefacts or deltas prevent cleanup acceptance.
   If baseline includes new real data, stop rather than delete it to recreate an old empty baseline.

## Acceptance and Next Step

13.1 is complete at the contract boundary: script, identity/owner roles, evidence, stop conditions,
cleanup and dependency handoff are specified. Actual domain appointments, mailbox choice and
hosted mutation approvals remain execution inputs, not fabricated completion evidence.
Proceed to 13.2 read-only platform verification after the owner reconciles the latest source and
CI. Public claims/products, real authority, publications/commercial facts, released accessibility,
support activation and current generator proof remain the seven retained debt gates.

This task adds no runtime code, dependency, schema or new debt. Formatting/link/index validation
is recorded at handoff; no fresh application, hosted or spoken-output pass is inferred.

Validation: repository formatting and whitespace checks pass; all 176 relative links in the six
changed Markdown documents and all 192 indexed paths resolve; the JSON index parses. This is
documentation-only verification, not a fresh unit/browser/database run. All seven files are left
unstaged for owner review/commit; branch remains `itws-I`.
