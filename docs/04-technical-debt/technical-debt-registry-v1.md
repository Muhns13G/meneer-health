# Meneer Technical Debt Registry v1

**Last amended:** 2026-10-09

## Registry Purpose

This registry converts the findings in the [project audit](../01-audits/project-codebase-audit-2026-08-05.md) into trackable remediation obligations. It is separate from the audit: the audit records current-state evidence; this document defines what must change and how completion will be proven.

The target state is defined in the [master blueprint](../00-blueprints/master-blueprint-v1.md). No entry should be closed solely because code was changed. Closure requires the stated acceptance evidence.

## Status and Priority Model

- **Open:** confirmed debt with no accepted resolution.
- **Decision required:** implementation depends on a business, clinical, legal, security, or architecture choice.
- **In progress:** an approved owner is actively resolving the item.
- **Blocked:** a named external dependency prevents progress.
- **Verified:** acceptance criteria have been independently checked.

Priorities:

- **P0 — Stop-ship:** unsafe, misleading, broken, or unsuitable for public use.
- **P1 — Foundation:** must be resolved or explicitly planned before normal feature development.
- **P2 — Pre-launch:** may follow foundation work but must close before public launch.
- **P3 — Improvement:** maintainability or optimisation work that can be scheduled later.

Sprint 07 closure reverified TD-040 and TD-045–TD-048 without creating new debt. TD-006 and TD-007
remain the existing fail-closed evidence and pathway-activation gates; they are not incomplete
Sprint 07 implementation.

## Phase 01 Closure Reconciliation

Phase 01 closed on 2 October 2026 at the secure inactive-foundation boundary under
[DR-010](../07-decisions/DR-010-phase-01-closure-minimum-pilot-boundary.md). Forty-nine items are
Verified. TD-006, TD-007, TD-009, TD-010, TD-037, TD-038 and TD-043 retain their recorded statuses,
required outcomes and evidence standards; closure does not relabel or waive them.

Those seven items are transferred as mandatory prerequisites for the corresponding pilot-
enablement capability. A later plan must name their tasks and owners before activating affected
claims, products, operating/commercial paths, forms, stepped flows or support channels. Phase 01
closure is not evidence of pilot readiness.

## Phase 02 Reconciliation

### 9 October — Retained Questionnaire Recovery Verified

TD-065 is now **Verified for the owner-amended identity/questionnaire-only scope**. Actual populated
encrypted local and hosted-source/offline-destination restores, newer deletion/holds, provider-loss
stable relink, fresh TOTP and independent medical-grant reapproval pass with exact baseline cleanup.
Key custody is owner-confirmed. Upload/object recovery remains deferred and unverified, gating future
upload activation. See the [recovery acceptance](../02-implementation-plans/phase-02/annexures/identity-questionnaire-recovery.md).
Current totals: **66 items — 57 Verified, nine non-Verified**. Earlier dated totals remain historical.
No pilot activation, live transaction or Worker release follows from this closure.

The [9 October final acceptance packet](../02-implementation-plans/phase-02/annexures/pilot-final-acceptance-2026-10-09.md)
records fresh redacted hosted baseline/readiness checks and owner-confirmed actual support/privacy
primary/alternate coverage and clinical escalation agreement. Hosted Auth still has zero users;
appointments alone do not prove real staff access or unattended callbacks. TD-064's intake/order
readiness remains disabled (412). TD-066's optional time-bounded control is proposed only, not
accepted or enforced. TD-037/038 retain flow-specific human review; none of these debt statuses
changes from this checkpoint.

The owner accepts shared functional inboxes and individual staff identities/TOTP with explicit
role switching. Per-person privacy-account aliases are superseded. Local implementation now adds
fresh-TOTP selection of one independently approved membership, immutable provider-session binding
and native validity/session checks. Changing roles requires sign-out and a new email/TOTP login;
this is not in-place context mutation. The owner-approved forward migration is now hosted with
exact history version `20261009101500`; application source is not yet owner-released. Local SQL
passes 2,116 assertions; genuine local Auth/TOTP and competing context selections pass with scoped
fixture cleanup; desktop/mobile workforce browser checks pass 4/4. Cross-tab/in-flight transition
acceptance, real named staff provisioning, hosted proof and delegated inbox access remain open.
TD-043 remains Open; no new debt or activation permission is introduced.

### 9 October — Live Payment Isolation Locally Implemented, TD-010 Retained

The [live activation packet](../02-implementation-plans/phase-02/annexures/live-payment-activation.md)
records explicit live Checkout/webhook/refund routing, permanent account/environment isolation,
rollback-only financial regressions and disabled-new-Checkout settlement/refund controls. The
forward migration is locally verified, not approved/applied to hosted Supabase. Separate live
webhook/secrets, approved instruments/provider acceptance and bounded real-money settlement/refund
acceptance remain required. TD-010 stays In progress; no debt item is closed or newly registered.
The owner-selected OCTOTHORP ZA seller / Octothorp LLC collector arrangement is owner-confirmed,
not independent inspection of an agreement. Upload deferral does not waive identity recovery.

### Task 14.10 — Sprint 14 Closed, Activation Gates Retained

The [Sprint 14 report](../03-completion-reports/phase-02/sprint-14-mobile-pilot-invitations.md)
closes the ten mobile engineering/rehearsal/reporting tasks. Controlled actual SMS/email conversion,
genuine signed delivery and independently verified cleanup/explicit disabled restoration pass.
The report and [runbook](../06-operations/mobile-invitations-release-runbook.md) do not activate the
cohort or waive retained debt. **66 items — 56 Verified, ten non-Verified**: TD-006/007/009/010/064/065
remain In progress; TD-037/038/043/066 remain Open. No status or original criterion changes here.
TD-066 was discovered in Sprint 14; this reporting task registers no additional debt. Required
private uploads and applicable identity/operating/legal/commercial acceptance keep Phase 02 open.

### Task 13.10 — Closed Reporting, No-Go for Real Activation

The [Sprint 13 report](../03-completion-reports/phase-02/sprint-13-pilot-rehearsal-release.md)
closes reporting with activation gates and first-client/rollback checklists. All nine non-Verified
statuses and original criteria are retained. The owner reports other reviewers approve the draft
direction; missing factual notice/contract details and exact issued instruments remain unresolved.
No approval is independently fabricated and no new debt/waiver is introduced. Phase 02 remains
open for adopted Sprint 14, required uploads and applicable release acceptance.

### Task 13.9 — Reconciled, Activation Gates Retained

The [13.9 debt packet](../02-implementation-plans/phase-02/annexures/sprint-13-9-debt-reconciliation.md)
reviews all 63 existing IDs against their recorded scopes. TD-006/007/009/010 remain In progress;
TD-037/038/043 remain Open. Fresh owner-confirmed local and released accessibility acceptance
completes Task 13.8 but does not supply individual exhaustive private-flow observations or exact
device/AT references. Two explicit remaining limitations are registered as TD-064/065 below.
Current totals: **65 items — 56 Verified, nine non-Verified**. Earlier totals are historical.
Task 13.9 is complete as reconciliation, not debt waiver, pilot activation or Phase 02 closure.

### Sprint 13.5 Workflow Finding — TD-063 Verified

The first-party medical transfer RPC requires a ready case, but the only current queue readiness
transition depends on a permanently false legacy readiness contract. Positive local transfer
fixtures manually set ready state; they are not end-to-end workflow proof. Read-only hosted
definitions confirm the gap. An explicit guarded first-party preparation command is recommended;
owner direction and the narrow migration were separately approved; guarded preparation is
implemented, owner-deployed and hosted. Fresh real intake-created case, signed sandbox funding,
protected preparation/record/replay/denial and independent reconciliation pass without seeded
ready state. Exact refund and independent baseline/trigger/Auth/settings restoration pass.
Current totals: **63 items — 56 Verified, seven non-Verified**. Provider acknowledgement remains
synthetic Meneer-only; the original external/domain/operating gates are not waived.

### Sprint 13.5 Preparation Finding — TD-062 Verified

Six intentional medical grant/transfer business conflicts still use serialization SQLSTATE in
four RPCs, confirmed statically and by read-only hosted definition counts. The narrow local
correction received separate hosted approval/application and owner deployment. Fresh protected
record/reconciliation stale/changed-replay 409s, exact replay, self-review denial and unchanged
state/cleanup checks pass; all six corrected raises/history/access metadata are verified.
TD-060/061 remain Verified in their own scopes. Earlier totals:
**62 items — 54 Verified, eight non-Verified** at that earlier preparation checkpoint.

### Sprint 13.4 Rehearsal Finding — TD-061 Verified

Four intentional queue conflicts used serialization SQLSTATE `40001`. The explicitly approved narrow
migration, owner-deployed adapter and fresh hosted stale/changed-request 409, replay, claim ownership
and independently verified scoped cleanup pass. TD-061 is Verified for this one RPC; TD-060 remains
Verified for intake only. Totals at that checkpoint: **61 items — 54 Verified, seven non-Verified**.

### Sprint 13.3 Rehearsal Finding — TD-060 Verified

The initial hosted stale-version exercise returned 503 rather than 409. The owner-approved narrow
migration and owner-deployed adapter now pass fresh hosted draft/replay, unchanged-version 409,
submission and foreign-intake denial; independent encrypted-state and exact cleanup proof pass.
TD-060 is Verified for this one RPC. Task 13.3 is completed at its synthetic boundary; the pilot
remains suspended and intake disabled. Totals at that checkpoint: **60 items — 53 Verified, seven non-Verified**.
Sprint 12 totals below are historical; other RPC conflict-code review remains Task 13.9.

### Sprint 12 Closure — Completed With Activation Gates

The [completion report](../03-completion-reports/phase-02/sprint-12-support-accessibility-readiness.md)
closes Tasks 12.1–12.10 at committed implementation/evidence `654f51f` plus the owner-pending
closure batch. Local regression and isolated hosted support evidence are accepted at their
recorded scope; TD-037/TD-038/TD-043 remain Open for released accessibility and real operational
activation. TD-059 was discovered and Verified through narrow remediation below. Current totals:
**59 items — 52 Verified, seven non-Verified**. Earlier totals/checkpoints below are historical.
No real pilot activation or exact-commit CI pass is claimed before owner commit/push.

### Task 12.9 — Acceptance Reconciled, Activation Debts Retained

The [acceptance matrix](../02-implementation-plans/phase-02/annexures/sprint-12-9-debt-reconciliation.md)
reconciles committed 12.5–12.8 implementation and evidence at baseline `c724e96`.
TD-037/TD-038 retain their released-form/transition assistive-technology review requirements;
representative owner-confirmed local acceptance is not silently expanded to every released flow.
TD-043 has accepted isolated hosted support/delivery/failure/response proof but retains actual
purpose/clinical appointments, approved coverage/escalation, unattended authenticated provider
push and quota/headroom before activation. All three remain Open. Task 12.9 is complete as
reconciliation, not waiver or blanket debt closure. Totals remain 58 items, 51 Verified and seven
non-Verified; Task 12.10 owns final sprint reporting/validation.

### Sprint 11 Closure — Completed With Activation Gates

The [completion report](../03-completion-reports/phase-02/sprint-11-stripe-commercial-operations.md)
closes Tasks 11.1–11.10 at committed implementation/evidence `7db0e0c`. TD-010's deposit/credit/
refund/reconciliation and complete sandbox/hosted exception obligations now have accepted proof.
It remains In progress for real private catalogue/rates, reviewed transactional publications,
supplier/tax/provider-business acceptance, case financial authority and owner release. Earlier
engineering-proof-pending notes below are historical, not current blockers. No new unresolved
debt ID accrued: 58 total, 51 Verified, seven non-Verified. TD-037/038/043 retain Sprint 12
operational/accessibility acceptance; TD-006/007/009 and remaining TD-010 release gates are not waived.
The real pilot remains suspended and live payments disabled; 11.10 changes only documentation.

### Sprint 11.9 — Synthetic Sandbox/Hosted Acceptance Completed

Current acceptance supersedes the historical checkpoints below. The final fixed hosted exception
packets and genuine asynchronous duplicate-refund run passed, including exact restoration of the
original fresh-run fingerprints and disabled unchanged-source configuration. TD-010's engineering
sandbox/hosted obligation is now evidenced; its actual publication/commercial/tax/operations and
live-release approvals remain In progress. Task 11.10 still owns the Sprint report. The transitive
source-map-js advisory found during closeout was patched to 1.2.2 in the lockfile; both audits pass.
No unresolved new debt ID accrued. Totals remain 58 items, 51 Verified and seven non-Verified.

The [11.9 packet](../02-implementation-plans/phase-02/annexures/sprint-11-9-sandbox-journey-evidence.md)
records actual deposit/credited-order/zero-balance test Sessions, exact provider lines/metadata,
stable retries and terminal unpaid expiration inspection. None completed a payment. All eight
owner-approved Sprint-11 migrations were applied hosted without seeds or role changes; independent
history and service-readable baseline checks passed. The real pilot stays suspended with zero Auth
users. Direct private SQL and genuine hosted signed-expiry transport proof passed, including
invalid-signature denial, unmatched/pending handling, no settlement and scoped restoration.
The owner deployed Sprint-11 code. Subsequent authenticated synthetic rehearsals proved sealed patient
sessions, staff AAL2 and scope denials, actual R999 signed funding and separately captured R100 delivery
after capped R800 product credit. Scoped cleanup refunded test captures and restored the empty baseline.
The owner-approved confirmed-remainder SQL fix is applied hosted. A Worker refund dispatch/body bug
was corrected and owner-deployed. Repeat hosted operational refund read/review/dispatch, independent
financial grant denial/success and genuine signed R199/R800/R100 original-method confirmations passed.
The approved retired-function ACL is independently verified. Forward disabled configuration-only
restoration preserved source checksum and the full private/public baseline. An earlier response 503
despite provider refund success is undiagnosed and must not trigger blind resubmission.
Duplicate/uncertain refund and remaining failure/dispute/owned-exception proof remain outstanding.
These findings are tracked under TD-010, not silently deferred or marked Verified.
Actual completed R0 Checkout returned paid/no PaymentIntent, revealing a zero-status assumption
in hosted reconciliation. The owner-approved narrow migration is now hosted with independently
verified history/ACL and successful genuine R0/credit-once acceptance. SDK-signed synthetic hosted
tamper/replay/conflict/out-of-order checks passed, with exact disabled/private/public restoration.
This remains within TD-010's existing settlement scope, not a new debt ID.
Genuine decline/expiry and bounded replacement with fresh acceptance/capture passed. Actual Stripe
`du_` Dispute IDs exposed a `dp_`-only validation defect at both webhook and provider inspection.
The owner deployed the narrow source fix. Genuine open and terminal won/lost delivery, attributed
independent provider reconciliation and synthetic conflicting-terminal holds now pass, without
supply advancement. Exact cleanup restored all baselines. Duplicate/uncertain refund, late-original
capture and operational-independence/owned-alert acceptance remain obligations within TD-010;
the interrupted duplicate rehearsal required exact disposable-session cleanup before restarting.
The approved aggregate-refund migration and hosted repeat now prove full duplicate refund once,
unchanged original deposit and restored readiness. Owned generic alert delivery is owner-confirmed
(three messages), with AAL2 response and wrong-role denial. Independent follow-up verifies disabled
source-preserving restoration and the empty protected baseline after the immediate assertion failed.
Refund uncertainty/retry, late-original capture and clinical/dependency independence remain open.
At that earlier checkpoint Task 11.9 and TD-010 remained In progress; the current acceptance above
closes Task 11.9's synthetic proof while retaining TD-010's actual release approvals.
No new debt ID; totals remain 58 items, 51 Verified and seven non-Verified.

### Sprint 11.8 Reconciliation — Completed Locally

The [local completion packet](../02-implementation-plans/phase-02/annexures/sprint-11-8-payment-reconciliation.md)
adds signed exact-refund settlement, verified-failure bounded retries, provider-checked unpaid credit
release, owned coded exceptions and a native R999 deposit-readiness bridge. None is hosted acceptance.
Task 11.8 is completed locally: separate duplicate captures have full original-method refunds;
final disputes have attributed, provider-checked outcomes; expired/failed deposits have immutable
replacement offers requiring fresh acceptance. TD-010 remains In progress pending Task 11.9
provider/hosted proof and Sprint closure. No new debt ID; 58 total, 51 Verified, seven non-Verified.

### Sprint 10 Closure — Current Authority

Sprint 10 is [completed with activation gates](../03-completion-reports/phase-02/sprint-10-staff-queue-protocol-handoff.md)
through implementation checkpoint `14a965a`. Tasks 10.1–10.10 and I1–I8 are accepted at their
recorded boundaries; the owner explicitly excepted the unavailable current-generator walkthrough.
TD-009/TD-043 engineering controls now include the queue, medical intake, independent grants,
manual-transfer reconciliation, hosted alerts/patient browser and local reliability packet.
Provider appointments/contracts, reviewed publications/recipient compatibility, operational rights,
primary/fallback safety ownership and released-flow accessibility remain acceptance requirements.
Do not interpret older task/migration-pending checkpoints below as the current implementation state.

TD-058 accrued during I8 and is Verified after the approved local/hosted correction. Current totals:
**58 items, 51 Verified, seven non-Verified**: TD-006, TD-007, TD-009, TD-010, TD-037, TD-038, TD-043.

Task [12.2](../02-implementation-plans/phase-02/annexures/sprint-12-2-durable-notifications.md)
adds locally verified atomic generic notifications, shared non-Auth quota, owned failure reasons
and private attributed delivery evidence. Task
[12.3](../02-implementation-plans/phase-02/annexures/sprint-12-3-purpose-support-routing.md) adds
locally verified private coverage gates, purpose-only secure requests and exact-owner AAL2 human
acknowledgement. No coverage policy is seeded or hosted service activated.
Task [12.4](../02-implementation-plans/phase-02/annexures/sprint-12-4-staff-support-followup.md)
now locally verifies purpose-scoped staff support, minimal delivery review, immutable responses
and guarded resend without sensitive email payloads or quota/suppression bypass.
Task [12.8](../02-implementation-plans/phase-02/annexures/sprint-12-8-hosted-support-rehearsal.md)
now verifies isolated hosted inbox delivery, exact attributed receipt/replay, failure/backoff,
uncertainty/suppression, real AAL2 acknowledgement and alternate-owner handling with scoped cleanup.
TD-043 remains Open: actual purpose-owner/alternate and clinical coverage, unattended authenticated
provider webhook configuration, quota/headroom and released-flow reconciliation remain activation
criteria. Synthetic coverage is not an actual appointment. No new debt ID, real pilot activation
or debt-status change is introduced; Task 12.9 owns reconciliation.
No additional confirmed defect ID accrued at 10.9/10.10. The unreproduced SQL interruption, implicit
SQL-initialisation warning and informational index candidates remain explicit review observations
in the completion report. Pilot/payment activation is not claimed by sprint closure.

### Historical Task Checkpoints

Task [12.7](../02-implementation-plans/phase-02/annexures/sprint-12-7-staff-accessibility.md)
implements local staff accessibility, masked recovery and expiry containment, including stalled
alert reads. Automated proof and owner-confirmed representative staff VoiceOver/browser zoom
close local Task 12.7 acceptance.
TD-037/TD-038 stay Open for broader released-flow reconciliation; no new debt ID or hosted
activation permission is introduced.

Task [12.6](../02-implementation-plans/phase-02/annexures/sprint-12-6-journey-announcements.md)
closes local client pending/result announcement and transition-focus verification. Automated
checks pass and the owner confirmed representative local VoiceOver pending/results are clear.
TD-038 remains Open until released-flow acceptance is reconciled in Tasks 12.8–12.9;
no new debt ID or activation permission.

Task [12.5](../02-implementation-plans/phase-02/annexures/sprint-12-5-client-form-accessibility.md)
adds controlled routed-client keyboard/reflow/display and expanded questionnaire checks. A local
synthetic VoiceOver review harness is supplied; the owner confirmed VoiceOver and browser zoom
checks pass, closing local Task 12.5 acceptance. Released-flow and wider accessibility acceptance
remain. TD-037 stays Open for that wider scope; no new debt ID.

Task I1's [medical-intake engineering contract](../02-implementation-plans/phase-02/annexures/sprint-10-i1-medical-intake-contract.md)
is frozen following owner approval on 5 October. It preserves 24 original source items and adds one
explicit unselected sex field with separate provenance, never an assumed male value. I2 may implement
synthetic local persistence/contracts. Clinical publication review of the extension, private medical
and safety appointments, response configuration and processing/retention confirmation remain release
gates. No new debt ID or TD-009/TD-043 closure; no live collection, grant or provider-code change.

Task 10.8's [own-client projection](../02-implementation-plans/phase-02/annexures/sprint-10-8-client-case-progress.md)
is completed locally: central read audit, coarse administrative labels and three-field private display
with own-scope/lifecycle/session/receipt authority. Full local SQL and application/browser checks pass.
Hosted migration approval and own-client release proof remain activation gates. No new debt ID;
TD-009/TD-043 wider intake/operational requirements and manual accessibility gates remain open.

Task 10.7's [audit/alert foundation](../02-implementation-plans/phase-02/annexures/sprint-10-7-operations-audit-alerts.md)
adds local central chained audit, access-before-disclosure evidence, identified denied overrides,
private owned alert intent, administrator AAL2 review and bounded overdue/uncertainty detection.
Generic Brevo dispatch, bounded durable retries/failure evidence, explicit AAL2 administrator
acknowledgement/resolution, five-minute invocation and 24-hour overdue review are implemented locally.
All seven migrations and the hosted database/provider rehearsal now pass: real TOTP/AAL2,
owner-confirmed generic mailbox receipt, synthetic response/replay/revocation and restored empty
baseline. A subsequent authorised Worker rehearsal passed Cron invocation and routed real-MFA
administrator response/revocation. A Workers redirect-mode defect retained the send as uncertain;
the local `manual` fix requires owner deployment and successful scheduled email/mailbox receipt retest.
Mode is restored to disabled and the synthetic baseline is clean. TD-009 and TD-043 retain
their status and hosted/operational acceptance requirements. No new debt ID is added.
The subsequent corrected Cron retest verified one accepted send and Brevo-reported delivery at
14:41 SAST on 4 October 2026, resolving the transport defect. Owner-confirmed mailbox receipt on
5 October formally closes Task 2.10.7; disabled mode and the suspended empty baseline were restored.
Wider TD-009/TD-043 debts stay open; earlier pending statements describe historical checkpoints.

Task 9.6 adds locally verified atomic profile/receipt activation and an accessible document-first
form, with separate actions, focused validation, pending-state controls and durable retry evidence.
See [the task annexure](../02-implementation-plans/phase-02/annexures/sprint-09-6-atomic-profile-acknowledgement.md).
TD-009 remains In progress for approved publication/party and hosted proof. TD-037/TD-038 remain
Open for live keyboard/assistive-technology review of the released flow; their earlier prototype
evidence is now supplemented by the new routed, synthetic local checks. No new debt ID is added.

Task 9.7 adds locally verified own-account portal projections, exact-document reproduction and
session-expiry/revalidation presentation, with database-enforced patient/tenant/session/receipt
denials. See [the portal evidence](../02-implementation-plans/phase-02/annexures/sprint-09-7-authenticated-client-portal.md).
No new debt ID accrued. TD-009 remains In progress for parties/publication, rights and hosted proof;
TD-037/TD-038 remain Open for live assistive-technology review. Local portal completion does not
activate a real account, intake, payment or clinical pathway.

Task 9.8 adds local versioned name/preference correction and private export/restriction/closure/
contact-change/support request receipt. See [the rights-entry evidence](../02-implementation-plans/phase-02/annexures/sprint-09-8-profile-correction-rights-entry.md).
No new debt ID is added: reviewed rights fulfilment, secure delivery, channel/step-up verification,
retention and downstream reconciliation remain existing DR-014/TD-009/TD-016 and operational release
obligations. Hosted proof stays Task 9.9; live assistive-technology gates remain TD-037/TD-038.
“Received” must never be reported as fulfilled.

Task 9.9 is completed at its synthetic-proof boundary: all five hosted Sprint-9 migrations and explicitly approved history
alignment are verified; 157 hosted rollback-only SQL assertions passed with a clean independent
post-test inventory. The initial deployed portal 404 was resolved; all seven anonymous HTTP denials
and actual code-only delivery/positive hosted Auth/session checks now pass. Separate provider and
application revocation were proved. Scoped cleanup restored zero identities/application evidence,
the suspended pilot tenant and all seven named audit/immutability triggers. No new debt ID is added:
the owner accepts retaining useful tracking unless it harms authentication or production reliability.
The invitation image alone is not evidence of harm; code-only credential protection and conditional
retesting remain recorded under FC-001. No tracking setting was changed.
TD-009's wider responsibility/partner obligations are not closed by this proof. See
[the security annexure](../02-implementation-plans/phase-02/annexures/sprint-09-9-security-hosted-proof.md).
Task 9.10 closes Sprint 09 with local/browser/provider evidence and the accepted tracking policy,
not database proof alone. See the [completion report](../03-completion-reports/phase-02/sprint-09-identity-profile-consent.md).
The original 56-item cohort remains 49 Verified and seven non-Verified. TD-009's profile/receipt/hosted identity
implementation is delivered; named-party/publication and manual-hand-off/privacy operations remain
mandatory. TD-037/TD-038 have routed synthetic browser evidence but retain live released-flow
review in Sprint 12. No new product debt ID is introduced. Rights processing/secure export/contact
step-up remain operational launch gates even though TD-016's earlier foundation is Verified.

Task 8.2 and [DR-011](../07-decisions/DR-011-minimum-pilot-product-pathway.md) originally selected
TD-007's scope-removal route. Task 8.4 and
[DR-013](../07-decisions/DR-013-pilot-product-commercial-fulfilment-amendment.md) supersede that
product exclusion by approving the Precise Wellness schedule as a gated candidate catalogue.
TD-007 therefore returns to In progress until product-specific authority and the complete clinical,
pharmacy, custody, courier and safety pathway are independently verified. Runtime product
transactions remain inaccessible.

The registry contains 49 Verified items. TD-006, TD-007, TD-009, TD-010, TD-037, TD-038 and TD-043
remain non-Verified Phase 02 activation gates.

Sprint 08 Task 8.10 reconciles all nine task annexures and DR-011–DR-017 against the committed
implementation checkpoint `3950b15`. The sprint is completed with activation gates; the seven
statuses and acceptance standards remain unchanged. Tasks 8.3/8.6/8.7 supplied approved contracts
and channel receipt evidence, while final external identities, appointments, rendered schedules,
approvals and routed exercises remain due in Sprints 09–13. Task 8.9 supplies a clean suspended
hosted tenant and exact 16-migration parity, not customer activation.

No new repository debt ID accrued. Portal dosing inconsistency extends TD-007; dashboard/library
status disagreement extends TD-009. Credential rotation and individual/permission-controlled
portal access remain DR-017/TD-009 requirements. Informational hosted index notices are scheduled
for query-based reassessment during Sprints 09–13. See the
[Sprint 08 completion report](../03-completion-reports/phase-02/sprint-08-pilot-activation-contract.md)
for ownership, deviations, evidence and the file inventory.

## Formal Development Entry Gate

Before new product features begin, the project should complete a stabilisation milestone that:

1. Prevents public use of false account, consent, clinical, and peptide completion paths.
2. Assigns product, clinical, legal/privacy, security, and operational decision owners.
3. Restores passing lint, type, and build gates and introduces CI.
4. Records approved architecture decisions for identity, data storage, consent, audit, and environments.
5. Produces a vulnerability remediation plan based on deployed reachability.
6. Replaces the broken brand asset and removes all accidental Lovable metadata.
7. Removes Lovable and obsolete platform coupling and verifies the TanStack Start application on the selected v1 host.
8. Defines the controlled v1 pilot boundary separately from the v2 public-launch boundary.

## A. Patient Safety, Truthfulness, and Compliance Debt

| ID     | Pri | Status      | Debt and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Required outcome / acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------ | --: | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-001 |  P0 | Verified    | The preserved prototype advances through local state and displays “You're in” without a request. At `3c1ff01`, the active `/start` route is a non-transactional gate with no form, action, or confirmation; browser and production-bundle evidence show the prototype is inaccessible.                                                                                                                                                                                             | Verified disabled outcome: no active action can produce confirmation. Before a replacement is enabled, implement a durable server transaction, explicit failure handling, and a traceable identifier; failed requests must never confirm success. Evidence: [`sprint-01-4-false-success-containment-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-4-false-success-containment-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| TD-002 |  P0 | Verified    | The original prototype accepted placeholder POPIA and telehealth wording. At `3c1ff01`, `/start` renders a non-transactional gate; browser and production-bundle evidence show no active consent control.                                                                                                                                                                                                                                                                          | Verified disabled outcome: consent collection is unavailable. Before any replacement is enabled, implement domain-approved versioned consent records, purposes, timestamps, policy references, withdrawal handling, and audit evidence. Evidence: [`sprint-01-3-account-consent-containment-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-3-account-consent-containment-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| TD-003 |  P0 | Verified    | The preserved prototype contains an empty “clinical questionnaire” with an enabled Submit control. At `3c1ff01`, the active `/start` route is a gate with no questionnaire or submit action; browser and production-bundle evidence show the prototype is inaccessible.                                                                                                                                                                                                            | Verified disabled outcome: empty or incomplete questionnaire completion is impossible. Before a replacement is enabled, define approved, versioned condition-specific questionnaires and server validation; required answers must be enforced and emergency or exclusion answers must route safely. Evidence: [`sprint-01-4-false-success-containment-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-4-false-success-containment-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| TD-004 |  P0 | Verified    | The preserved prototypes contain local password fields, but at `3c1ff01` the active `/start` and `/peptides` routes render gates. Browser and production-bundle evidence show no accessible account/profile/password controls.                                                                                                                                                                                                                                                     | Verified disabled outcome: simulated identity is inaccessible. Before any replacement is enabled, use an approved authentication flow with contact verification, secure recovery, session controls, rate limiting, and no application access to plaintext credentials. Evidence: [`sprint-01-3-account-consent-containment-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-3-account-consent-containment-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| TD-005 |  P0 | Verified    | Versioned website-only privacy and terms notices identify the provisional operator and actual non-transactional boundary. Contact and the internal procedure prohibit sensitive or urgent clinical use of general email. The owner proved external delivery to `support@meneerhealth.co.za`; after clearing Brevo's stale hard-bounce suppression, a final Supabase invitation reached Delivered and cleanup returned Auth users to zero.                                          | Preserve the approved website-only policy and monitored support boundary. Transactional privacy, terms, consent, roles, retention, vendors, secure support, and incident procedures remain mandatory before activation. Evidence: [`sprint-01-9-policy-support-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-9-policy-support-evidence.md) and [`sprint-05-20-hosted-identity-request-security-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-20-hosted-identity-request-security-evidence.md).                                                                                                                                                                                                                                                                                                                                                                       |
| TD-006 |  P0 | In progress | Tasks 7.4–7.6 convert the nine-family close-out pack into portable `public-claims.register@1`, bind the website source to it, and complete cross-channel reconciliation: 31 exact variants with source/channel/audience links, accountable roles, required evidence/approvers, lifecycle and fail-closed validation. Twenty-eight variants remain pending evidence; the three displaced timing variants remain rejected history, and no variant is falsely marked domain-approved. | Supply and verify every recorded requirement and obtain the named clinical, legal/privacy, commercial, security, operations, and release approvals. Product-owner wording approval and completed repository reconciliation are not regulated or operational proof. Evidence: [`sprint-01-10-claims-peptide-closeout-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-10-claims-peptide-closeout-evidence.md), [`sprint-07-4-claim-register-publication-validation.md`](../02-implementation-plans/phase-01/annexures/sprint-07-4-claim-register-publication-validation.md), [`sprint-07-5-canonical-public-content-migration.md`](../02-implementation-plans/phase-01/annexures/sprint-07-5-canonical-public-content-migration.md), and [`sprint-07-6-cross-channel-content-verification.md`](../02-implementation-plans/phase-01/annexures/sprint-07-6-cross-channel-content-verification.md). |
| TD-007 |  P0 | In progress | DR-013 supersedes DR-011's product exclusion and approves every item in the fingerprinted confidential Precise Wellness schedule as a gated candidate catalogue. This is commercial intent, not product authority, clinical approval, verified pharmacy appointment or release evidence. Active routes still expose no product selection, checkout, dispensing or fulfilment action.                                                                                               | Before any catalogue item can transact, verify authoritative product-specific registration or applicable Section 21 authority, manufacturer/source and formulation; professional and pharmacy identities/authority; the clinical, blood-result, consent, safety, data, prescribing, dispensing, custody, courier, adverse-event, recall and escalation pathway; and every domain/release approval. Evidence: [`DR-013`](../07-decisions/DR-013-pilot-product-commercial-fulfilment-amendment.md), [`sprint-08-4-commercial-pricing-benchmark.md`](../02-implementation-plans/phase-02/annexures/sprint-08-4-commercial-pricing-benchmark.md), and the retained [`sprint-01-10-claims-peptide-closeout-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-10-claims-peptide-closeout-evidence.md).                                                                                                 |
| TD-008 |  P0 | Verified    | Local runtime evidence confirms every active acquisition entry terminates at a non-transactional gate. `/start` renders 112/10177 emergency routing, separates general support from urgent care, exposes no form control or placeholder identity, and cannot enter consultation or fulfilment; `/peptides` is likewise gated.                                                                                                                                                      | Verified disabled outcome. Before any condition transaction is enabled, replace accountable-party fixtures, obtain clinical approval for its minimum-age, location, urgent-symptom, contraindication, exclusion, and escalation matrix, enforce the rules server-side, and repeat browser/server evidence. Evidence: [`sprint-01-8-safety-campaign-continuation-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-8-safety-campaign-continuation-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| TD-009 |  P1 | In progress | Sprint 10 delivers profile/receipts, staff queue, protected intake, independent grants and governed manual-transfer controls. Hosted synthetic Auth/browser/grant/expiry proof and cleanup are accepted with the explicit generator exception.                                                                                                                                                                                                                                     | Verify actual provider/professional authority, contracts/privacy allocation, reviewed publications/recipient mapping, current generator compatibility and operational rights handling; Sprint 11 supplies payment readiness. See the [Sprint 10 report](../03-completion-reports/phase-02/sprint-10-staff-queue-protocol-handoff.md) and DR-012–DR-018.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| TD-010 |  P1 | In progress | Sprint 11 implements server-owned private catalogue/quotes, immutable exact-order acceptance, guarded test Checkout, signed settlement, one-use credit, original-method refunds, disputes and replacement/duplicate reconciliation. Complete local and bounded hosted/sandbox exception proof is accepted at `7db0e0c`; modes restored disabled and real pilot suspended. Synthetic catalogue/publications are not real commercial approval.                                       | Before real transactions, verify/import the private RRP schedule and delivery rates with approved mappings, supplier/tax/invoice treatment and truthful provider business-model acceptance; publish reviewed immutable terms, financial authority/eligibility and operational release inputs, then obtain owner go/no-go. Do not relabel sandbox Prices or inline synthetic prices as approved live catalogue. Evidence: [Sprint 11 completion report](../03-completion-reports/phase-02/sprint-11-stripe-commercial-operations.md), [11.9 provider/hosted proof](../02-implementation-plans/phase-02/annexures/sprint-11-9-sandbox-journey-evidence.md), DR-013 and DR-015.                                                                                                                                                                                                                                         |

Task 11.7 implements [local cancellation/refund commands](../02-implementation-plans/phase-02/annexures/sprint-11-7-cancellation-refund-commands.md):
own-client requests, independent scoped financial authority and eligibility evidence, original-source
refund reservations, automatic unused-deposit jobs, staff-reviewed unresolved exceptions and
default-off sandbox dispatch. Submission is not confirmed refund settlement. Pending/failed/uncertain
reservations remain held for Task 11.8 reconciliation; no automatic retry under a fresh identity.
TD-010 remains In progress for 11.8–11.9, actual approvals/releases and hosted proof. No new debt ID;
totals remain 58 items, 51 Verified and seven non-Verified. Earlier checkpoints below are historical.

Task 11.6 implements [local private payment projections](../02-implementation-plans/phase-02/annexures/sprint-11-6-payment-status-projections.md):
own-client and assigned AAL2 operations reads, exact bounded output, expiry/revocation/tenant/purpose
guards, content-free audit, no clinical/delivery inference, and portal/queue clearing on invalidation.
No hosted deployment/provider call or money command is implied. TD-010 remains In progress for
11.7–11.9, actual releases/approvals and hosted proof; no new debt ID, totals remain 58/51/seven non-Verified.

Task 11.5 implements [local signed receipts and independent settlement facts](../02-implementation-plans/phase-02/annexures/sprint-11-5-signed-receipts-settlement.md):
raw HMAC/timestamp validation, scoped durable journal/audit, replay/conflict/correlation, monotonic
money evidence and owned exceptions, with SDK/HTTP/SQL/recovery proof. Checkout now depends on
current callback configuration/service authority. No hosted/provider activation or downstream
funding/refund/clinical release is asserted. TD-010 stays In progress for Tasks 11.6–11.9 and
real catalogue/terms/authority/release; no new debt ID, totals unchanged at 58/51/seven non-Verified.

Task 11.4 implements [guarded local sandbox Checkout creation](../02-implementation-plans/phase-02/annexures/sprint-11-4-guarded-sandbox-checkout.md):
explicit environment/database/account release, exact receipt/readiness checks, frozen server-only
ZAR parameters, stable provider retry identity and revalidated test-session attachment. Unit,
SQL, controlled browser and recovery evidence pass; no hosted or real provider activation occurred.
TD-010 stays In progress for signed new-ledger settlement, credit/refund/reconciliation, real
catalogue/rates, reviewed terms and release proof. No new debt ID; totals stay 58/51/seven non-Verified.

Task 11.3 implements [local own-order review and acceptance](../02-implementation-plans/phase-02/annexures/sprint-11-3-order-review-acceptance.md):
private page, sealed-session/current-tenant command, published instrument and exact price/hash
binding, immutable receipt plus atomic audit, expiry/denial clearing and SQL/HTTP/browser proof.
The boundary defaults disabled; Checkout and both payment readiness adapters remain closed.
No real transactional publication, hosted migration or provider payment proof is asserted.
TD-010 stays In progress and TD-037/038 remain Open for live review; no new debt ID was introduced.

Task 11.2 implements the [private local commerce preparation](../02-implementation-plans/phase-02/annexures/sprint-11-2-private-commerce-preparation.md):
synthetic prices, private readiness/quote/funding records, immutable offers, bounded totals and
locked one-use credit reservations. Full local SQL/unit/build/recovery proof passes. No service
entry, real RRP/rate import, provider mapping, order acceptance or hosted migration is activated.
TD-010 remains In progress for those particulars and Tasks 11.3–11.9 provider/runtime proof.
No new debt ID is added; totals remain 58 items/51 Verified/seven non-Verified.

Task 11.1 completes the [commercial payment contract](../02-implementation-plans/phase-02/annexures/sprint-11-1-commercial-payment-contract.md):
separate deposit/order timing, versioned price/instrument acceptance, atomic credit and provider
evidence/exception semantics. The owner approved capped below-R999 product credit with unused
deposit refund, separate delivery and staff-reviewed unresolved cancellation exceptions. TD-010
remains In progress: catalogue/rates, rendered domain approvals and payment implementation/proof
are not delivered by a contract. No new debt ID is added; totals remain 58/51/seven non-Verified.

Task 10.1 subsequently freezes the [staff queue and manual hand-off contract](../02-implementation-plans/phase-02/annexures/sprint-10-1-staff-queue-handoff-contract.md):
role/purpose boundaries, case-specific assignments and claims, AAL2, operational transitions,
minimum projections and disabled break glass. This is contract-level progress, not queue
implementation or closure: TD-009 stays In progress and TD-043 Open. No new debt ID is added.

## B. Platform, Data, and Security Debt

Task 10.2 adds the locally verified [staff persistence boundary](../02-implementation-plans/phase-02/annexures/sprint-10-2-staff-queue-persistence.md):
eight deny-default tables, scoped foreign keys, exclusive claims/attempts, bound receipts,
append-only evidence and portable records. No hosted migration or operational command is enabled.
TD-009 remains In progress and TD-043 Open; no new debt ID or activation permission is introduced.

Task 10.3 adds the locally verified [individual workforce boundary](../02-implementation-plans/phase-02/annexures/sprint-10-3-workforce-security.md):
staff email/invitation verification, TOTP/AAL2, server-derived context, bounded separate sessions,
live revocation checks and reviewed immutable invitation dispatch. Neither Sprint 10 migration
is applied hosted. Queue commands, hand-off, audit/alerts, external accountability and hosted
staff activation proof remain outstanding; TD-009 stays In progress and TD-043 Open. No new debt ID.

Task 10.4 adds the locally verified [assigned queue projection](../02-implementation-plans/phase-02/annexures/sprint-10-4-assigned-queue-projection.md):
bounded read-only operations list/detail, live AAL2 and assignment checks, state filters and
database-masked contacts. No routine admin/support browsing, raw contact export, claim or delivery
authority is introduced. All three Sprint 10 migrations remain unapplied hosted. Tasks 10.5–10.10,
external accountability and hosted staff activation remain; TD-009 stays In progress and TD-043 Open.
No new debt ID is accrued by this task.

Task 10.5 adds the local [claimed-command boundary](../02-implementation-plans/phase-02/annexures/sprint-10-5-claimed-queue-commands.md):
claim/release, expected versions, live assignment/AAL2, payload-bound replay, atomic event/journal,
coded pause and pre-delivery cancellation. Derived readiness still refuses missing recipient and
deposit integration. Task 10.6/Sprint 11 retain those explicit dependencies; all four migrations and
hosted command proof remain activation gates. TD-009 stays In progress and TD-043 Open; no new ID.

Task 10.6 adds the locally verified [manual hand-off command/reconciliation boundary](../02-implementation-plans/phase-02/annexures/sprint-10-6-manual-handoff-commands.md):
persisted attempts, independent opaque evidence, guarded acknowledgement/outcome, uncertainty,
linked retry, immutable exception resolution and cancellation preserving prior delivery.
Owner-approved authenticated portal issuance, tenant-bound destination approval and independent
assigned-reviewer evidence ingestion are implemented and verified locally. Task 10.6 local code is
complete; actual intake URL/configuration, recipient instruments/approval and hosted synthetic proof
remain activation gates. Issuance is not receipt; Sprint 11's deposit adapter defaults false.
All six Sprint 10 migrations require separate hosted approval/proof. TD-009 remains In progress,
TD-043 Open; no new debt ID. Earlier migration counts above are historical checkpoints.

**Subsequent scope amendment:** [DR-018](../07-decisions/DR-018-meneer-hosted-medical-intake.md)
selects a separately protected Meneer questionnaire and authorised manual transfer into the
generator. The owner confirms Dr Zee approved the questions unchanged; blood results are not an
initial submission prerequisite. Task 10.6 at `b2a3a1e` is retained local evidence, not medical-intake
implementation. Its external-link prerequisites are no longer required for the selected path.
The [eight intake tasks](../02-implementation-plans/phase-02/annexures/sprint-10-medical-intake-amendment.md)
remain planned before revised Sprint 10 rehearsal/closure. TD-009 stays In progress and
TD-037/TD-038/TD-043 remain Open; the field/access/escalation/processing contract is pending.
No new defect or debt ID is asserted from this scope change, and no debt is closed by planning.

Task 8.8/DR-017 subsequently verifies signed-out provider-linked intake and an authenticated
synthetic path through intake, protocol generation, review controls and PDF-download controls. No
supported API/webhook was found. TD-009 remains In progress for external identity, authority,
contracts, privacy allocation and Sprint 10's governed manual hand-off; its reconciliation must not
trust the portal dashboard count because it contradicted the protocol library. TD-007 additionally
requires provider correction and clinician verification of inconsistent rounding observed within
one generated dose. The provider-stated pen-concentration constraint is not proof of dosage
accuracy. Evidence: [`DR-017`](../07-decisions/DR-017-protocol-portal-manual-handoff-boundary.md) and
[`sprint-08-8-protocol-portal-capability-evidence.md`](../02-implementation-plans/phase-02/annexures/sprint-08-8-protocol-portal-capability-evidence.md).

| ID     | Pri | Status   | Debt and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Required outcome / acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | --: | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-011 |  P1 | Verified | DR-003 approves a framework-neutral modular core, channel/workspace and application/API boundaries, explicit module responsibilities, authoritative-state ownership, transition authority, integration reconciliation, and migration-safe deployment mapping. The current application remains non-transactional and has not implemented these boundaries.                                                                                                                                                                                                                   | Decision acceptance is verified by [`DR-003-platform-boundaries-authoritative-state.md`](../07-decisions/DR-003-platform-boundaries-authoritative-state.md) and [`sprint-03-4-platform-boundary-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-03-4-platform-boundary-evidence.md). Implementation remains governed by TD-012–TD-020, TD-054, and Sprint 05.                                                                                                                                                                                                                                                                                                        |
| TD-012 |  P1 | Verified | DR-005 approves managed PostgreSQL as the portable relational system of record, encrypted object storage for binaries, logical versioned namespaces, opaque identifiers, tenant scope, classification, lifecycle, data-subject procedures, migrations, backups, restores and exit. DR-006 governs selection; DR-009 selects Supabase Free plus EU R2 recovery exports for v1.                                                                                                                                                                                               | Decision acceptance is verified by DR-005, DR-006, DR-009, and their Sprint 03/05 evidence. Tasks 5.6 and 5.13 now supply the physical schema, migration, isolation, lifecycle, backup, and restore proof recorded under TD-016. Selection alone does not change TD-012's architecture-only closure.                                                                                                                                                                                                                                                                                                                                                                                    |
| TD-013 |  P1 | Verified | Tasks 5.7–5.12 implement stable managed identities, bounded sessions, TOTP/AAL2, deny-default contextual authorisation, exact service scopes, durable denial evidence, and a monitored disabled-break-glass disposition. Tasks 5.20–5.21 apply all twelve hosted migrations and pass synthetic Auth, horizontal/vertical, tenant, role, assignment, purpose, state, assurance, browser-denial, cleanup, and advisor checks.                                                                                                                                                 | Acceptance is verified by [`sprint-05-20-hosted-identity-request-security-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-20-hosted-identity-request-security-evidence.md) and [`sprint-05-21-final-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-21-final-closure-evidence.md). Break glass is deliberately unavailable in v1. Any enabled identity journey requires named role holders, first-party confirmation/OTP, route-level testing, monitoring, and release approval; those activation obligations do not negate the verified inactive foundation.                                                                       |
| TD-014 |  P1 | Verified | Tasks 5.2, 5.6, 5.9, 5.14 and 5.15 implement strict portable envelopes, server-only persistence, validated commands, inactive Stripe payment, and minimum-data partner/fulfilment reconciliation. Authorisation, optimistic state, payload-bound idempotency, replay conflicts, out-of-order evidence, cancellation/refund reconciliation, independent state and atomic false-success prevention pass locally. Browser roles and direct mutation remain denied.                                                                                                             | Repository implementation acceptance is verified by [`sprint-05-9-validated-workflow-commands-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-9-validated-workflow-commands-evidence.md), [`sprint-05-14-stripe-checkout-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-14-stripe-checkout-evidence.md), and [`sprint-05-15-fulfilment-partner-reconciliation-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-15-fulfilment-partner-reconciliation-evidence.md). TD-007, TD-009, and TD-010 still block real partner/payment activation.                                                                             |
| TD-015 |  P1 | Verified | Tasks 5.10–5.15 now cover successful commands, denials, rights/lifecycle, Stripe, and partner/fulfilment facts with append-only audit, safe inbox/outbox evidence, fingerprint-only replay, and durable reconciliation without raw provider bodies or health metadata. Browser roles remain denied.                                                                                                                                                                                                                                                                         | Repository implementation acceptance is verified by the Task 5.10, 5.13, 5.14, and [`Task 5.15`](../02-implementation-plans/phase-01/annexures/sprint-05-15-fulfilment-partner-reconciliation-evidence.md) evidence. No customer or real-provider route is enabled; named legal/privacy application and any external anchoring/WORM decision remain activation governance, not missing repository audit implementation.                                                                                                                                                                                                                                                                 |
| TD-016 |  P1 | Verified | Task 5.13 implements verified export/erasure requests, 24-hour export expiry, scoped 90-day-review holds, fail-closed processor/backup reconciliation, AES-256-GCM recovery archives, and deny-default browser access. Task 5.17 extends the governed dump through the Task 5.15 fulfilment schema and passes a real isolated logical restore with 125/125 records, matching checksums, and a nine-second RTO.                                                                                                                                                              | Repository implementation acceptance is verified by [`sprint-05-13-lifecycle-recovery-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-13-lifecycle-recovery-evidence.md), [`sprint-05-17-verification-and-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-17-verification-and-closure-evidence.md), and [`lifecycle-backup-recovery-runbook.md`](../06-operations/lifecycle-backup-recovery-runbook.md). Named legal/privacy/clinical application, hosted migration, R2/backup-heartbeat provisioning, final cross-border approval, and release go/no-go remain activation gates; they do not negate the completed synthetic proof. |
| TD-017 |  P1 | Verified | Tasks 5.11–5.14 implement bounded request parsing, same-origin/CORS rules, idempotency and replay controls, anti-automation interfaces, durable rate enforcement, payload-safe denial telemetry, and exact inactive payment policies. Local unit/integration/browser checks and hosted Task 5.20–5.21 requests prove malformed, cross-origin, direct, unregistered, and disabled mutations fail closed.                                                                                                                                                                     | Acceptance is verified for every currently exposed route by [`sprint-05-11-request-security-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-11-request-security-evidence.md), [`sprint-05-20-hosted-identity-request-security-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-20-hosted-identity-request-security-evidence.md), and [`sprint-05-21-final-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-21-final-closure-evidence.md). A future public form, identity action, webhook, or callback must add and prove its own named limits, WAF/rate policy, monitoring, and bypass cases before activation. |
| TD-018 |  P1 | Verified | Task 5.4 implements a nonce-based CSP and explicit framing, MIME-sniffing, referrer, permissions, HTTPS transport, and cache controls at both the Worker-response and Cloudflare static-asset layers. Local unit, production-preview, response-matrix, and desktop/mobile browser checks pass without changing route content.                                                                                                                                                                                                                                               | The recorded Cloudflare deployment passed every required response class with HSTS, matching nonce CSP, hydration, and clean browser-console evidence. Recheck after route, origin, or policy changes. Evidence: [`sprint-05-4-http-security-cache-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-4-http-security-cache-evidence.md) and [`http-security-cache-policy.md`](../06-operations/http-security-cache-policy.md).                                                                                                                                                                                                                                       |
| TD-019 |  P1 | Verified | Task 5.3 establishes the machine-checked environment boundary. Tasks 5.6 and 5.14 extend it with an optional all-or-none Supabase pair and Stripe restricted-key/signing-secret/service-identity set, preview exclusion, non-echoing failure tests, named ownership/rotation and client-bundle exclusion. Live or unrestricted Stripe keys fail validation; local values remain ignored and none is committed or deployed.                                                                                                                                                  | Every later selected consumer must add catalogue metadata, server schema, tests, environment-specific provisioning, rotation/revocation evidence, and the bundle check in its first implementation commit. Evidence: [`sprint-05-3-environment-security-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-3-environment-security-evidence.md), [`sprint-05-14-stripe-checkout-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-14-stripe-checkout-evidence.md), and [`environment-secrets-runbook.md`](../06-operations/environment-secrets-runbook.md).                                                                                       |
| TD-020 |  P1 | Verified | Tasks 5.12–5.15 implement privacy-safe telemetry, incident/recovery proof and durable Stripe/fulfilment reconciliation. Task 5.18 fail-tests public uptime and alert acknowledgement/recovery. Task 5.19 verifies private EU R2 encrypted upload, 35-day expiry, failed storage without false heartbeat, missed-heartbeat response, read-after-write, decryption, isolated restore/reconciliation, deletion, and success-heartbeat ordering. Tasks 5.20–5.21 verify hosted migrations, provider boundaries, final advisors, and the complete 125/125 local recovery matrix. | Monitoring, alert, correlation, redaction, incident, and recovery acceptance is Verified by the Task 5.12–5.21 evidence, culminating in [`sprint-05-21-final-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-21-final-closure-evidence.md). Automatic invocation logs stay disabled. Real Stripe/partner callbacks, scheduled production export, off-device key custody, and each later critical journey require capability-specific activation and recovery proof before enablement; no inactive capability is represented as operational.                                                                                                               |

## C. Dependency, Build, and Code-Quality Debt

| ID     | Pri | Status   | Debt and evidence                                                                                                                                                                                                                                                                                                           | Required outcome / acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------ | --: | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TD-021 |  P0 | Verified | Tasks 4.8–4.9 clear all full and production audit findings. Task 4.10 enforces both audit scripts after frozen installation; hosted passing run `31324807644` executes the complete job and controlled PR #10 proves the required job rejects an invalid change.                                                            | Verified dependency-policy and enforcement outcome. Future findings require advisory-path and reachability triage; do not use broad or forced upgrades. Evidence: [`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).                                                                                                                                                          |
| TD-022 |  P1 | Verified | Formatting, lint, typecheck, and build pass locally and in hosted `Repository validation`. Controlled PR #10 fails the non-writing format gate and is prevented from merging into protected `develop`.                                                                                                                      | Verified clean quality baseline and fail-closed enforcement without blanket suppression. Evidence: [`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).                                                                                                                                                                                                                         |
| TD-023 |  P1 | Verified | Eleven Vitest and 48 Playwright/axe checks pass locally and in hosted run `31324807644`; browser failures retain synthetic evidence for seven days.                                                                                                                                                                         | Verified automated test foundation and hosted execution. Manual keyboard/assistive-technology review remains complementary, and enabled server-submission success/failure belongs to Sprint 05. Evidence: [`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).                                                                                                                  |
| TD-024 |  P1 | Verified | The read-only GitHub Actions job covers frozen install, format, lint, typecheck, unit/integration/browser/accessibility tests, full/production audits, build, generated-route consistency, and Cloudflare dry-run. `main` and `develop` are protected; the job passes on the approved baseline and is required on PR #10.   | Verified CI and merge-control outcome: closed unmerged PR #10 and run `31336490260` prove an invalid change fails and cannot merge. The workflow performs no deployment and receives no production secret. Evidence: [`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).                                                                                                       |
| TD-025 |  P1 | Verified | Sprint 02 removed the unknown Rollup `platform`, ignored-directive, Wrangler-entry override, and obsolete adapter warnings. Current Cloudflare tooling emits one Node `punycode` deprecation during build/development commands.                                                                                             | The remaining warning is traced to current upstream Cloudflare tooling, is absent from application runtime behaviour, and remains bounded by passing build, preview, route, and dry-run evidence after Sprint 04. Reassess during routine compatible dependency maintenance. Evidence: [`sprint-02-5-telemetry-dependency-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-5-telemetry-dependency-evidence.md).             |
| TD-026 |  P1 | Verified | Task 4.3 repeats static, dynamic, glob, generated-route, and package reachability checks, then removes all 46 unused UI primitives, two support-only files, stale `components.json`, and 38 direct packages. Frozen install falls from 456/566 to 319/442 installs/packages; generated CSS falls from 85.95 kB to 35.04 kB. | Typecheck, build, Wrangler dry-run, route/redirect/404 checks, approved-message signatures, and rendered-browser checks pass with no broken images, horizontal overflow, or console findings. Future UI packages return only with first approved use under the reintroduction checklist. Evidence: [`sprint-04-3-ui-surface-reduction-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-3-ui-surface-reduction-evidence.md). |
| TD-027 |  P1 | Verified | Task 2.5 classified direct packages by deployed, source-only UI, build/development, and unused reachability. Five build-only packages moved to `devDependencies`; six unused direct declarations and stale query deduplication were removed.                                                                                | Frozen install, TypeScript, production build, Wrangler dry-run, full audit, and production-filtered audit were recorded after bounded lockfile regeneration. Evidence: [`sprint-02-5-telemetry-dependency-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-5-telemetry-dependency-evidence.md).                                                                                                                             |
| TD-028 |  P1 | Verified | The package identity, Bun 1.3.14/Node 22 contract, clean formatting baseline, and frozen install are established and enforced by the hosted workflow. PR #10 proves the format gate is required and fails closed.                                                                                                           | Verified deterministic package/tooling and formatting enforcement. Keep `bun.lock`, runtime pins, and non-writing checks synchronized. Evidence: [`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).                                                                                                                                                                           |
| TD-029 |  P2 | Verified | Scoped unused-code rules and two explained prototype exceptions remain active. Hosted passing CI runs identical lint/typecheck/generated-route checks; the local synthetic failure proves the unused-variable rule rejects violations.                                                                                      | Verified scoped unused-code enforcement. Future exceptions must remain rule-specific, explained, and limited to approved preserved/generated boundaries. Evidence: [`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).                                                                                                                                                         |
| TD-030 |  P1 | Verified | Root README, contribution guide, testing/CI operations guide, private security route, and absolute links from stripped production `main` to canonical `develop` make supported versions, validation, ownership, decisions, and the non-transactional boundary discoverable.                                                 | Verified clean-checkout contributor outcome without external chat context. Evidence: [`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).                                                                                                                                                                                                                                       |
| TD-031 |  P1 | Verified | Scoped contribution guidance, PR template, and no-PHI/no-secret bug form are published from default `main`. PR #10's body is template-prefilled, and the owner confirms the Bug report form renders after enabling Issues.                                                                                                  | Verified contribution-intake and traceability outcome. Preserve history and apply the contract prospectively; vulnerabilities remain private. Evidence: [`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).                                                                                                                                                                    |

### Sprint 04 Task 4.12 reconciliation

At committed HEAD `8b23428`, an isolated clone passes the full matrix and the configured lint gate
rejects a synthetic unused-variable failure. Hosted run `31324807644` proves the complete
`Repository validation` job passes at `b6331bd`. The owner protected `main` and `develop`, published
and rendered both contributor templates, and enabled Issues. Closed unmerged PR #10 and failed run
`31336490260` prove the required check rejects controlled commit `62a6a78` and disables ordinary
merge. The proof file never entered `develop`. TD-021–TD-024, TD-026, and TD-028–TD-031 are
Verified. Evidence is in
[`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).

## D. Broken Assets, UX, Accessibility, and Discovery Debt

| ID     | Pri | Status   | Debt and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Required outcome / acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | --: | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-032 |  P0 | Verified | Sprint 01.6 replaced the Lovable virtual logo metadata with the company-approved local placeholder at `src/assets/brand/meneer-mark.png`. Local desktop/mobile checks passed. On 7 August 2026, the same `itws-I-preview` deployment was published at `meneerhealth.co.za`; the canonical homepage and peptide route returned HTTP 200 and the hashed PNG returned HTTP 200 with the expected 107,450-byte length.                                                                  | Verified production-equivalent outcome: the owned placeholder asset loads from the canonical Cloudflare deployment as well as locally. Final identity quality remains separate under FC-002. Evidence: [`sprint-01-6-acquisition-assets-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-6-acquisition-assets-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| TD-033 |  P0 | Verified | The empty player is removed. Local browser evidence verifies the configured non-transactional review layout and video decode. Git inspection confirms the 6,703,712-byte draft binary and fallback exist only on `itws-I-preview`; permanent `itws-I` contains neither and remains gated by default. The owner approved this isolated-preview outcome on 7 August 2026.                                                                                                             | Verified containment outcome: no broken or unapproved video is part of the permanent default experience. Before final/public media use, provide approved optimised media, poster, captions, transcript, loading behaviour, manual playback and hosted browser tests. Evidence: [`sprint-01-6-acquisition-assets-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-6-acquisition-assets-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| TD-034 |  P0 | Verified | Both approved concepts have local SVG/1200 px PNG QR assets, human-readable fallbacks, and responsive print proofs. On 7 August 2026, `meneerhealth.co.za/go/dads` and `/go/thanks-dad` returned the approved attributed 307 redirects, both `/start` destinations returned HTTP 200, and the owner confirmed successful QR scans.                                                                                                                                                  | Verified current-campaign outcome: stable canonical QR routes resolve and preserve approved attribution to the intentionally gated `/start` page. Improving that journey belongs to later sprints. Final A1 production/material QA remains a mandatory pre-distribution release check, not unresolved implementation debt. Evidence: [`sprint-01-8-safety-campaign-continuation-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-8-safety-campaign-continuation-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| TD-035 |  P1 | Verified | Sprint 06.2 replaces page-local shared hashes with route-aware TanStack links. Component tests assert the exact destinations, and Playwright verifies the shared header/footer from `/`, `/contact`, `/privacy`, and `/terms` on desktop and mobile, including an actual cross-route transition to `/#how`.                                                                                                                                                                         | Verified navigation outcome: treatment and “How It Works” links resolve to homepage sections from every route using the shared chrome; Peptides, Start, home, legal, and contact destinations remain stable. Mobile disclosure behavior remains separately owned by TD-039. Evidence: [`sprint-06-2-route-aware-navigation.md`](../02-implementation-plans/phase-01/annexures/sprint-06-2-route-aware-navigation.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| TD-036 |  P1 | Verified | Sprint 06.3 replaces the four generic non-peptide card links with same-origin POST actions carrying opaque allowlisted IDs. The server validates and encrypts accepted intent into a 30-minute HttpOnly, Secure, SameSite=Strict cookie; missing configuration, invalid IDs, stale state, and tampering fail closed without URL state. No public wording or gated `/start` behavior changes.                                                                                        | On 13 August 2026 the owner approved the identifiers/expiry, reconciled the deployment branches, provisioned the server-only hosted key, and ran `test:intent:hosted` successfully against the canonical domain. The exercise proved valid encrypted persistence, security attributes, invalid-input fallback, expiry/tamper rejection, and zero URL/response payload fields. Strict telemetry, clean redirects, host-only cookie scope, and the absence of analytics prevent referrer, log, analytics, or third-party intent leakage. Evidence: [`sprint-06-3-private-treatment-intent.md`](../02-implementation-plans/phase-01/annexures/sprint-06-3-private-treatment-intent.md).                                                                                                                                                                                                                                                                                                                            |
| TD-037 |  P1 | Open     | Routed profile, staff and intake forms have synthetic keyboard/axe evidence; I8 adds actual hosted patient keyboard, validation and mobile proof.                                                                                                                                                                                                                                                                                                                                   | Complete released-flow assistive-technology review in Sprint 12. Controlled checks and keyboard proof do not establish screen-reader acceptance. See the [Sprint 10 report](../03-completion-reports/phase-02/sprint-10-staff-queue-protocol-handoff.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| TD-038 |  P2 | Open     | Routed multi-step intake, focus/error/pending/receipt and expiry clearing have local controlled evidence; I8 proves actual hosted sections/resume/submission/expiry.                                                                                                                                                                                                                                                                                                                | Complete released stepped-flow assistive-technology and asynchronous-announcement review in Sprint 12. See the [Sprint 10 report](../03-completion-reports/phase-02/sprint-10-staff-queue-protocol-handoff.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| TD-039 |  P2 | Verified | Sprint 06.6 implements the labelled mobile disclosure and all dismissal/focus contracts. Task 6.11 completes the visible 320/390-pixel, forced-colour, reduced-motion, keyboard, focus, Escape, reflow, and Chromium accessibility-tree review; the closed navigation is absent from the tree and focus returns to the trigger.                                                                                                                                                     | Maintain component/browser coverage for focus entry, Escape, outside interaction, desktop resize, route change, and narrow reflow. Evidence: [`sprint-06-6-mobile-navigation-disclosure.md`](../02-implementation-plans/phase-01/annexures/sprint-06-6-mobile-navigation-disclosure.md) and [`sprint-06-11-accessibility-verification.md`](../02-implementation-plans/phase-01/annexures/sprint-06-11-accessibility-verification.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| TD-040 |  P1 | Verified | Tasks 7.2–7.6 approve five canonical phases/projections, migrate runtime representations to one framework-neutral source and map 17 journey representations across marketing, timeline, intake, confirmation and metadata projections. Every projection uses known phases in canonical order; duplicate IDs, unknown/reordered phase mappings, drift, expiry, withdrawal and unsafe rollback fail automated checks.                                                                 | Repository content-model debt is Verified. The three replacement timing variants remain pending evidence and do not constitute clinical, legal, pharmacy or operational approval; TD-006/TD-007 still gate publication/activation. Evidence: [`sprint-07-2-canonical-journey-model.md`](../02-implementation-plans/phase-01/annexures/sprint-07-2-canonical-journey-model.md), [`sprint-07-5-canonical-public-content-migration.md`](../02-implementation-plans/phase-01/annexures/sprint-07-5-canonical-public-content-migration.md), and [`sprint-07-6-cross-channel-content-verification.md`](../02-implementation-plans/phase-01/annexures/sprint-07-6-cross-channel-content-verification.md).                                                                                                                                                                                                                                                                                                              |
| TD-041 |  P1 | Verified | Sprint 02 Task 2.6 replaces the Lovable root, author, and social fallbacks with approved Meneer values while preserving established route metadata and public copy. Local rendered-head checks cover root, route-specific, gated, policy, error-fallback, and not-found surfaces.                                                                                                                                                                                                   | Maintain the approved fallback identity. Comprehensive canonical, favicon, robots, sitemap, and social-image work remains TD-042. Evidence: [`sprint-02-6-meneer-metadata-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-6-meneer-metadata-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| TD-042 |  P2 | Verified | Tasks 6.8–6.9 implement absolute canonicals, generated robots/sitemap outputs, document and response-header exclusions, favicon metadata, and complete Open Graph/Twitter image metadata. The existing company-approved placeholder mark is reused unchanged; local production preview proves its hashed asset and absolute canonical image URL render correctly across public, restricted, campaign, error, and not-found surfaces.                                                | Maintain the route-policy drift check and metadata browser matrix. A purpose-designed final favicon/social-card suite remains post-pilot brand work under FC-002, not unresolved discovery functionality. Evidence: [`sprint-06-8-discovery-route-policy.md`](../02-implementation-plans/phase-01/annexures/sprint-06-8-discovery-route-policy.md) and [`sprint-06-9-favicon-social-metadata.md`](../02-implementation-plans/phase-01/annexures/sprint-06-9-favicon-social-metadata.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| TD-043 |  P1 | Open     | Active aliases and receipt proof are complemented by Sprint 10 generic operations/safety delivery, real AAL2 response/revocation and scoped cleanup. Initial internal operations responder is recorded; this is not a live clinical response service.                                                                                                                                                                                                                               | Privately appoint primary/alternate and clinical owners; approve safety deadlines/after-hours guidance and exercise failure/suppression/escalation/fallback and released accessibility before activation. Sprint 12/release own wider acceptance. See the [Sprint 10 report](../03-completion-reports/phase-02/sprint-10-staff-queue-protocol-handoff.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| TD-044 |  P2 | Verified | On 12 August 2026 the owner formally approved Google Fonts for the v1 pilot. Task 6.10 centralizes the exact DM Sans/Playfair Display request, weights, `display=swap`, provider origins, fallback stacks, and review trigger; aligns dynamic/static CSP; and adds a narrow provider disclosure to the privacy notice.                                                                                                                                                              | Unit tests pin the provider contract and static CSP. Desktop/Pixel 7 browser tests verify exact head/CSP metadata and block both Google origins while proving visible content, declared system fallbacks, and no horizontal overflow; the existing route-health matrix performs the same isolation across every active route. Reassess self-hosting before public launch or any approved successor migration under FC-004. Evidence: [`sprint-06-10-external-font-policy.md`](../02-implementation-plans/phase-01/annexures/sprint-06-10-external-font-policy.md).                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| TD-045 |  P2 | Verified | Tasks 7.7–7.9 approve, implement and prove the default-off first-party boundary: six pilot questions, nine strict events, two campaign IDs, separate opt-in/withdrawal, an unlinked 30-minute flow, private forced-RLS storage, purpose/AAL2-governed exports, daily deidentified aggregation, 30-day raw and 12-month evidence limits, withdrawal-linked deletion, prohibited-data canaries and hosted synthetic cleanup. Collection remains disabled and no public caller exists. | Repository and hosted measurement-governance debt is Verified. Hosted Supabase applies the measurement boundary, governance and role-purpose hardening migrations; synthetic proof confirms strict canary rejection, browser denial, governed inventory, opt-out and complete cleanup. The canonical site keeps both endpoints hidden with no cookie, CORS or echoed canary. An approved consent interface and explicit privacy/security release approval remain activation gates and do not reopen the implemented default-off boundary. Evidence: [`sprint-07-7-pilot-measurement-specification.md`](../02-implementation-plans/phase-01/annexures/sprint-07-7-pilot-measurement-specification.md), [`sprint-07-8-default-off-measurement-boundary.md`](../02-implementation-plans/phase-01/annexures/sprint-07-8-default-off-measurement-boundary.md), and [`sprint-07-9-measurement-governance-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-07-9-measurement-governance-evidence.md). |

## E. MCP and Content-Governance Debt

| ID     | Pri | Status   | Debt and evidence                                                                                                                                                                                                                                                                                                                                                                                                                | Required outcome / acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | --: | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-046 |  P1 | Verified | Tasks 7.3–7.6 register portable `public-content.catalogue@1` and `public-claims.register@1`, migrate 22 active website, metadata, campaign, support and preserved-prototype consumers, and map 34 uniquely identified journey/treatment/policy/support/trust representations to the versioned runtime source. All 28 retained non-rejected claim variants occur in that source; the three rejected variants remain history only. | Repository content-governance debt is Verified through attachment, drift, duplicate, expiry, withdrawal, version and rollback tests. CAP-001 plus PORT-021/PORT-022 preserve the contracts across v1/v2/v3. Pending evidence still fails claim publication closed and remains TD-006/TD-007 rather than reopening TD-046. Evidence: [`sprint-07-3-public-content-governance-contract.md`](../02-implementation-plans/phase-01/annexures/sprint-07-3-public-content-governance-contract.md), [`sprint-07-5-canonical-public-content-migration.md`](../02-implementation-plans/phase-01/annexures/sprint-07-5-canonical-public-content-migration.md), and [`sprint-07-6-cross-channel-content-verification.md`](../02-implementation-plans/phase-01/annexures/sprint-07-6-cross-channel-content-verification.md). |
| TD-047 |  P1 | Verified | Sprint 02 removed MCP and its duplicated claims. Tasks 7.4 and 7.10 register the provider-neutral fail-closed claim boundary and automate source, dependency, build, local-route and hosted-route regression evidence; no MCP code, route, dependency, content duplicate, or activation is reintroduced.                                                                                                                         | Keep MCP absent in v1. Any future public MCP requires a named use case, canonical content and claim IDs, exact approved variants, versioning, eligible channel/audience, evidence, approvals, review/expiry, withdrawal, threat model, monitoring and release decision before implementation. Evidence: [`sprint-07-4-claim-register-publication-validation.md`](../02-implementation-plans/phase-01/annexures/sprint-07-4-claim-register-publication-validation.md) and [`sprint-07-10-mcp-absence-boundary-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-07-10-mcp-absence-boundary-evidence.md).                                                                                                                                                                                        |
| TD-048 |  P2 | Verified | DIR-031 removes MCP from v1. Task 7.10 re-proves the retired files, dependencies, generated routes, build markers and local/hosted protocol paths are absent, then separates the maximum read-only public boundary from all private/account/clinical tool proposals.                                                                                                                                                             | No private MCP capability exists. Any future private tool requires a separate owner-approved use case and threat model covering authentication/OAuth, narrow scopes, tenant/role/assignment/purpose, consent, data minimisation, audit, replay/rate controls, monitoring, human oversight, privacy/security/domain review, hosted evidence and rollback before code or configuration is introduced. Evidence: [`sprint-07-10-mcp-absence-boundary-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-07-10-mcp-absence-boundary-evidence.md).                                                                                                                                                                                                                                                   |
| TD-049 |  P1 | Verified | Sprint 02 removed the Lovable SDK, telemetry implementation, environment handling, package-install exception, historical lockfile URLs, and application identity. Hosted browser-network and persisted-log inspection after Task 2.7 found no Lovable request or match. `LOVABLE_API_KEY` remains forbidden.                                                                                                                     | Source, built output, package, local route, canonical browser-network, and hosted log evidence all pass. Evidence: [`sprint-02-5-telemetry-dependency-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-5-telemetry-dependency-evidence.md) and [`sprint-02-8-verification-and-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-8-verification-and-closure-evidence.md).                                                                                                                                                                                                                                                                                                                                                                                       |
| TD-050 |  P1 | Verified | DR-008 names accountable business, clinical, pharmacy, legal/privacy, security, data, commercial, operations, content, technology, support, release, and repository roles; defines approval/stop paths; and separates domain approval from repository and release authority. `.github/CODEOWNERS` assigns current review responsibility to `@Muhns13G` across the repository and sensitive paths.                                | Verified role-governance outcome. Private role holders must still be appointed and evidenced before the capability they govern is activated; enable enforceable protected-branch review before additional collaborators receive write access. Evidence: [`DR-008-governance-ownership-approval.md`](../07-decisions/DR-008-governance-ownership-approval.md) and [`sprint-03-2-operating-model-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-03-2-operating-model-evidence.md).                                                                                                                                                                                                                                                                                                            |

## F. Platform Exit and Evolution Debt

| ID     | Pri | Status   | Debt and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                        | Required outcome / acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------ | --: | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-051 |  P0 | Verified | On 7 August 2026, the Lovable Vite wrapper, package, hidden defaults, sandbox behaviour, and virtual-asset proxy were replaced by explicit repository-owned Cloudflare, TanStack Start, React, Tailwind, TypeScript-path, alias, import-protection, deduplication, and development-server configuration.                                                                                                                                                 | Frozen install, TypeScript, build, development route parity, generic production preview, and Wrangler dry-run pass. The wrapper is absent from Vite runtime configuration, declared dependencies, and the lockfile. Its inert `bunfig.toml` package-age exception is assigned to Task 2.5. Evidence: [`sprint-02-3-cloudflare-runtime-ownership-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-3-cloudflare-runtime-ownership-evidence.md).                                                                                                                                                                                          |
| TD-052 |  P0 | Verified | The Cloudflare v1 boundary now has explicit runtime configuration, branch roles, secret rules, persisted logs, post-deploy verification, version history, and rollback availability. Cloudflare Fonts and automatic Web Analytics remain disabled after hosted verification. On 8 August 2026, both build triggers were aligned to Bun 1.3.14 and the documented `bunx wrangler` commands.                                                               | Production build `425bdc48-23f2-4c40-8f83-23c1a0f11f00` and non-production build `69d0d711-ccc7-4135-a310-71826242fd24` succeeded with Bun 1.3.14 and Node 22.23.2. Production version `ee3a151d-e25b-47b8-a036-c041a9225d13` serves 100%; aliased non-production version `641f728e-b460-4cd9-bbea-4448f98f7fba` remains available. Canonical smoke routes return HTTP 200. Evidence: [`cloudflare-environments-release-runbook.md`](../06-operations/cloudflare-environments-release-runbook.md) and [`sprint-02-8-verification-and-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-8-verification-and-closure-evidence.md). |
| TD-053 |  P1 | Verified | Task 2.4 removed MCP locally. After the owner deployed Sprint 2.6, both the canonical domain and workers.dev deployment returned ordinary HTML 404 responses for `/mcp`, `/.mcp/list-tools`, and the retired OAuth path.                                                                                                                                                                                                                                 | The unsupported v1 MCP/OAuth surface is absent locally and from the hosted application boundary. Any reintroduction remains governed by DIR-031 and TD-048. Evidence: [`sprint-02-4-mcp-removal-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-4-mcp-removal-evidence.md) and [`sprint-02-7-cloudflare-release-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-7-cloudflare-release-evidence.md).                                                                                                                                                                                                              |
| TD-054 |  P1 | Verified | DR-003 keeps authoritative state and clinical/domain rules outside framework UI. DR-004 approves a canonical framework-neutral catalogue for commands, queries, results, events, errors, audit facts, compatibility, idempotency, concurrency, reconciliation, migration, cutover, and rollback across TanStack, Next.js, and Laravel/React.                                                                                                             | Decision acceptance is verified by [`DR-004-framework-neutral-contracts-migration.md`](../07-decisions/DR-004-framework-neutral-contracts-migration.md) and [`sprint-03-5-contract-migration-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-03-5-contract-migration-evidence.md). Machine-readable schemas, validators, adapters, fixtures, contract tests, and behavioural-equivalence evidence remain implementation work under TD-014, TD-055, and Sprint 05.                                                                                                                                                                        |
| TD-055 |  P1 | Verified | Task 5.16 inventories retained and retired v1 capabilities, registers every supported contract major/runtime schema/migration link, supplies language-neutral HTTP/contract/behaviour fixtures, adds CI drift checks, and provides the mandatory v1-to-v2 rehearsal/cutover/rollback template. Evidence: [`sprint-05-16-platform-portability-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-05-16-platform-portability-evidence.md). | Repository migration preparation is Verified. A future migration still requires an approved trigger, named owners/window, a real v2 candidate, synthetic rehearsal, zero unexplained mismatches, security/privacy/clinical/recovery gates, and signed cutover/rollback evidence. Task 5.16 does not claim that Next.js exists or that cross-generation equivalence has already passed.                                                                                                                                                                                                                                                                      |
| TD-056 |  P0 | Verified | The repository owner approved the controlled-pilot charter on 7 August 2026. It defines a 30-day invite-only adult South African cohort, peptide-only transaction scope, route matrix, data boundary, operating roles, support/monitoring, success measures, stop criteria, activation gate, exit review, and separate public-launch gate.                                                                                                               | The missing pilot-scope decision is closed. This does not activate the pilot: named clinical, privacy, pharmacy, operations, support, security, and release evidence must still satisfy the charter's activation gate. Evidence: [`sprint-01-controlled-pilot-charter-v1.md`](../02-implementation-plans/phase-01/annexures/sprint-01-controlled-pilot-charter-v1.md).                                                                                                                                                                                                                                                                                      |

## Sprint 03 Closure Reconciliation

Sprint 03 is complete as decision and architecture work. Its four decision-complete items are
Verified: TD-011, TD-012, TD-050, and TD-054. TD-009 and TD-010 remain In progress for the gated
named-party, contracting, partner, price, merchant, terms, and operational evidence. TD-013
remained In progress at Sprint 03 closure pending server/hosted access evidence; Task 5.13 later
supplied the staging-restore and synthetic data-subject evidence required to Verify TD-016. No new
technical-debt ID arose from Sprint 03.

## Sprint 05 Closure Reconciliation

Sprint 05 is complete after Tasks 5.1–5.21. TD-013–TD-020 and TD-055 are Verified against the
implemented, deliberately inactive boundary. The final matrix passes local application, browser,
database, integration, incident and recovery checks plus current hosted migration, advisor,
request-denial and cleanup evidence. This does not activate a customer or provider capability:
at Sprint 05 closure, TD-006, TD-007, TD-009, TD-010, FC-001, and each route's release gate still
governed the evidence required before real use. Task 8.2 temporarily Verified TD-007 through scope
removal; Task 8.4 and DR-013 later reopened it by restoring a gated product catalogue.

## Suggested Resolution Order

1. **Contain public and pilot risk:** TD-001 through TD-008, TD-032 through TD-034, and TD-056.
2. **Exit obsolete platforms:** TD-051 and TD-052, followed by the TD-053 MCP decision and TD-049 telemetry removal.
3. **Make foundational decisions:** TD-009 through TD-013, TD-050, TD-054, and the peptide decision.
4. **Restore repository health:** TD-021 through TD-031.
5. **Design secure data operations:** TD-014 through TD-020 and establish TD-055 migration evidence.
6. **Correct journeys and public content:** TD-035 through TD-047.
7. **Complete public-launch quality:** TD-038, TD-039, TD-042, TD-044, TD-045, and TD-048.

## H. Phase 02 Newly Discovered Debt

| ID     | Pri | Status   | Debt and evidence                                                                                                                                                                                                                                                                                                                                               | Required outcome / acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------ | --: | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-057 |  P0 | Verified | Task 9.10 initially found 36 full/26 production-filtered findings on 2026-10-03. Dedicated remediation updates compatible parent packages, patches each transitive major, and removes the unpatched braces watcher path. Both audits now exit 0 with no vulnerabilities found; no deployed exploit or accepted security exception is claimed. Owner: @Muhns13G. | Locally Verified: frozen install, types/lint, 443 unit tests, 156 browser checks, database/security/recovery integrations, production build and upload dry-run pass. Streaming ownership and early CSP nonce compatibility are regression-tested; generated routes retain their baseline set. Owner commit/exact-commit CI and post-deploy smoke remain release steps. Evidence: [TD-057 remediation](../01-audits/td-057-dependency-remediation-2026-10-03.md). |

TD-057's owner remediation commit `1b41ed49` and exact-commit
[CI 37138262125](https://github.com/Muhns13G/meneer-health/actions/runs/37138262125) subsequently
passed, including the committed generated-output comparison. This supplements the row's original
local evidence; post-deploy smoke remains separate release evidence.

### TD-058 — Restricted Intake Safety Review Completion

Priority: **P1**. Status: **Verified**. Owner: **@Muhns13G**. Target: **2.10.I8**, before
clinical intake activation.

The isolated hosted rehearsal on 5 October found that `respond_medical_safety` cleared the hold
before its final grant check. For a restricted intake, safety access depends on the unresolved hold;
the final check therefore rejected the authorised transition and rolled back review completion.
No real patient was affected. Migration
`20261005134411_restricted_medical_safety_review_completion.sql` checks fresh authority before
clearing the hold without removing restriction or bypassing clinical grants, acknowledgement or audit.
Four added regressions pass; the full local database suite passes 1,007 assertions.

Acceptance: owner-approved hosted migration; actual AAL2 routed restricted-intake review succeeds;
restriction remains and subsequent ordinary/safety access is denied; exact audit evidence and scoped
cleanup pass. These criteria were subsequently satisfied on 5 October: owner-approved hosted
migration (36 matching versions), fresh routed TOTP/AAL2, independent grant activation, exact
one-field projection, review 200 and subsequent safety/ordinary read 403. The audit chain verified;
approved scoped cleanup restored the original baseline and all triggers. Repository commit/CI are
not claimed before the owner's actions. I8's other non-generator checks subsequently passed;
the owner explicitly excepted current generator entitlement/compatibility from its closeout. See the
[I8 progress record](../02-implementation-plans/phase-02/annexures/sprint-10-intake-implementation-progress.md).

Current total: **58 items — 51 Verified, seven non-Verified**. TD-021 retains its historical
dependency-policy/enforcement evidence; TD-057 remains an immutable newly discovered ID, now
locally Verified after bounded remediation. Both audits and local regression pass; owner
commit/exact-commit CI and post-deploy verification are not claimed in advance. TD-006, TD-007,
TD-009, TD-010, TD-037, TD-038 and TD-043 retain their original acceptance gates.

## TD-059 — Cloudflare Development Tooling sharp Advisory

Discovered 7 October 2026 during Task 12.10 final audit: Miniflare pins `sharp@0.35.4`
through the Cloudflare Vite plugin and Wrangler. Priority P1; status **Verified** after patched
installation, clean full/production audits, build/dry-run and browser regression. The two local
media-configuration failures and focused 2/2 retest are separately recorded, not hidden.
[GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) identifies `0.35.5`
as patched. A single `sharp: 0.35.5` override and synchronized `bun.lock` implement the narrow fix;
frozen installation and full/production audits pass. No application dependency or broad upgrade
is introduced. The [Sprint 12 report](../03-completion-reports/phase-02/sprint-12-support-accessibility-readiness.md)
records final evidence. Remove the override only when parent tooling naturally resolves a patched
compatible version, then repeat frozen installation, audits, build and browser regression.

Sprint 12 closure retains TD-006/007/009/010/037/038/043. Historical totals above predate TD-059;
Sprint 12 total after final validation is **59 items — 52 Verified, seven non-Verified**.
Engineering closure does not appoint real support owners, install unattended provider push or
complete released-flow assistive-technology acceptance.

## TD-060 — Medical Intake RPC Business Conflicts Use Serialization SQLSTATE

Priority **P1**; status **Verified**. Owner: `@Muhns13G` / System Architect. Target: Task 13.3
before questionnaire activation. Evidence: [onboarding rehearsal packet](../02-implementation-plans/phase-02/annexures/sprint-13-3-onboarding-rehearsal.md).

Hosted draft/replay succeeded, but a deliberately stale version returned **503**, not **409**.
`public.patient_intake_write(jsonb,jsonb)` has two intentional `INTAKE_CONFLICT` raises using
`40001`. Supabase documents automatic transaction retry behaviour for this SQLSTATE in PostgREST;
it is not the correct code for a permanent business conflict. This finding is consistent with the
observed response, not a claim that provider retry logs were independently inspected.

The approved/applied migration changes only those two intentional raises to `PT409`, asserting unchanged
owner, ACL, security-definer setting and function configuration. The adapter recognises `PT409`;
genuine serialization errors and other RPC functions are unchanged. Other intentional `40001`
uses outside this narrow function remain a Task 13.9 reconciliation consideration, not covered by
this patch's acceptance.

Acceptance passed on 7 October: 112 local SQL assertions and 20 adapter/service/HTTP tests;
explicitly approved hosted migration `20261007180000` and owner deployment; fresh hosted
draft/replay, immediate stale-version 409 with draft version still 1, submission/version 2,
own-client projection and foreign-intake denial. Review presentation passed in controlled local
desktop/mobile tests, not a new hosted browser/AT claim. Independent encrypted-record/receipt proof
passed; exact cleanup restored all 125 table fingerprints, original triggers and zero Auth users/
sessions. Final identical-code Worker `f8aed8c4-1e33-4e06-a93f-34130cfdc6d8` restores disabled intake.

## TD-061 — Queue RPC Business Conflicts Use Serialization SQLSTATE

Priority **P1**; status **Verified**. Owner: `@Muhns13G` / System Architect. Target: Task 13.4
before hosted claim-conflict rehearsal. Evidence: [assignment/payment packet](../02-implementation-plans/phase-02/annexures/sprint-13-4-assignment-payment-rehearsal.md).

`public.command_operations_queue(uuid,uuid,text,uuid,uuid,uuid,jsonb)` has four intentional
`QUEUE_CONFLICT` raises using `40001`. Static inspection and read-only hosted definition counting
confirm the reachable misuse; no fresh hosted retry/503 failure was induced or claimed.

Prepared migration `20261007220000` changes only these four raises to `PT409` and asserts unchanged
owner, ACL, security-definer and configuration. Only the command adapter recognises the new code;
genuine serialization errors and other RPCs remain unchanged. Acceptance requires local SQL and
adapter/HTTP regression, explicit hosted migration approval, owner-deployed adapter, fresh immediate
409 on stale/changed-payload commands with unchanged claim/version, exact replay success and
independent scoped cleanup proof. Do not mark Verified from static tests alone.

Local preparation passes 33 application tests, 103 rollback-only queue SQL assertions, strict
TypeScript, focused lint and migration security-metadata guards. The owner-approved migration is
now applied at matching hosted history version `20261007220000`; read-only verification confirms
four `PT409` raises and the retained wrapper/anonymous/browser/security-definer boundaries.
Fresh hosted acceptance passed on 7 October: immediate stale/changed-request 409s, exact replay
success, unchanged conflict version/sole ownership/one command receipt, explicit release/reclaim
and foreign-operator release denial. Independent final cleanup restored all 125 original table
fingerprints, 13 baseline rows, original triggers and zero Auth users/sessions. Final same-source
Worker `26678aba-8b3d-4e58-85a2-cc57016c31f8` restores disabled commerce and the suspended real
pilot. Earlier verifier/cleanup defects were corrected and independently reconciled; they do not
invalidate the fresh successful packet. Other RPC conflict-code review remains Task 13.9.

## TD-062 — Medical Grant/Transfer Business Conflicts Use Serialization SQLSTATE

Priority **P1**; status **Verified**. Owner: `@Muhns13G` / System Architect. Target: Task 13.5
before hosted conflict/replay rehearsal. Evidence: [protocol bridge packet](../02-implementation-plans/phase-02/annexures/sprint-13-5-protocol-bridge-rehearsal.md).

Six intentional `MEDICAL_CONFLICT` raises in four medical grant/transfer RPCs use `40001`.
Static inspection and read-only hosted counts confirm reachable misuse; no new hosted 503/retry
failure is claimed. CLI-created migration `20261007201957` changes only those six raises to
`PT409`, asserting unchanged owner/ACL/security-definer/configuration. The staff HTTP handler
maps `PT409` to private 409; clinical/payment/snapshot/recipient guards and other RPCs are unchanged.
Local migration guards and 87 SQL assertions plus five HTTP mapping tests pass. Acceptance needs
separate hosted migration approval, owner deployment, fresh routed stale/replay/independence proof
with unchanged durable state and exact cleanup. Fixture/payment approvals alone do not authorise
this schema change. Do not mark Verified from static/local tests alone.

The owner-approved migration is now applied with matching history and independently verified
six `PT409` raises and retained access boundaries. Fresh Task 13.5 passes actual grant approval/
activation/client authorisation, stale recording and changed transfer/reconciliation replay 409s,
exact idempotent references, independent actor acceptance/self-denial and unchanged-state fault
checks. Exact provider refund and independently verified fingerprint/trigger/Auth/settings cleanup
pass. Verified for the six named raises/four RPCs, not a blanket correction of other conflict RPCs
or real provider acknowledgement. TD-063's protected preparation is also verified below.

## TD-063 — Missing First-Party Medical Transfer Preparation Transition

Priority **P1**; status **Verified**. Owner: `@Muhns13G` / System Architect. Target:
Task 13.5 before real medical transfer or claims of end-to-end pilot readiness. Evidence:
[protocol bridge packet](../02-implementation-plans/phase-02/annexures/sprint-13-5-protocol-bridge-rehearsal.md).

`operations_readiness` always returns false; `mark_ready` requires true, while the selected
first-party `record_medical_transfer` requires a case already ready. No first-party preparation
command supplies that transition. Existing positive tests manually set ready state as a fixture.
Source trace and read-only hosted definition checks confirm the gap, not a newly induced hosted
incident. A seeded ready state cannot substitute for authenticated workflow proof.

Recommend an explicit, idempotent, audited first-party preparation command checking exact current
snapshot, recipient/notice/client authorisation, restriction/safety, authoritative deposit, bounded
medical grant, AAL2, assignment/claim and version before advancing ready. Recording must bind and
revalidate that preparation; independent reconciliation remains separate and nonclinical.
Acceptance requires owner workflow direction, local positive/denial/replay/expiry/audit checks,
separately approved hosted schema and owner deployment, a fresh genuinely paid protected journey
without manually seeded state, and independent exact cleanup. Alternatively explicitly retain
transfer as unavailable; that does not establish pilot readiness. No clinical/safety bypass.

The owner approved the first-party command. Local migration `20261007204237` adds immutable
bounded preparation/record binding; HTTP/UI only submit references and do not activate legacy
readiness. Clean replay, 116 focused SQL assertions, 546 full packet assertions, production build
and 4/4 controlled desktop/mobile browser checks pass. Preparation/replay deny changed authority,
restriction, safety hold, grant revocation, released claim, suspended account and wall-clock expiry;
failed audit rolls back intent/state. Separate hosted migration approval/application and owner
runtime deployment are complete. Fresh actual intake-created case, AAL2/exact grant/client consent,
genuine signed R999 sandbox funding, unpaid denial, protected preparation/record binding, exact
replay/stale/changed conflicts, four rollback authority/safety fault denials and independent
nonclinical reconciliation pass without seeding ready state. The exact capture is refunded;
independent 127-table/13-row fingerprints, original triggers, zero Auth/sessions and disabled
same-source runtime with temporary tenant binding removed pass. Verified at this protected
Meneer-only boundary; no generator access, external transfer, clinical approval or pilot activation.

## TD-064 — Remaining Permanent Business Conflicts Use Serialization SQLSTATE

Priority **P1**; status **In progress**. Owner: System Architect / `@Muhns13G`. Target: before enabling
affected commands; release disposition in Task 13.10. Evidence and acceptance:
[Task 13.9](../02-implementation-plans/phase-02/annexures/sprint-13-9-debt-reconciliation.md).
The initial reconciliation found two intentional `40001` raises in `patient_intake_restrict` and
four in `respond_medical_safety`; the earlier narrow patches did not correct these functions.
Inventory other latest reachable refund/commerce/alert/legacy definitions before a bounded fix.
The fully migrated local catalogue now inventories 21 remaining functions. Guarded migration
`20261008100000_remaining_business_conflict_status.sql` corrects their allowlisted permanent raises
while asserting unchanged owner/ACL/configuration/security/volatility; response mapping and SQL
regressions accompany it. The final 1,629 SQL assertions and 61 focused tests pass. The approved
migration is hosted with matching history `20261008100000`; exact-definition/security guards pass.
Routed acceptance is pending: intake/commerce readiness probes return disabled-configuration 412.
No hosted fixtures or settings are changed by the follow-up inspection. See the
[active remediation packet](../02-implementation-plans/phase-02/annexures/sprint-13-pre-release-gap-remediation.md).
Require security-preserving local stale/replay/atomicity tests, explicit hosted migration approval,
owner deployment and routed conflict/unchanged-state proof with exact cleanup. Static evidence is
not a fresh hosted failure, and genuine serialization errors must not be globally rewritten.

## TD-065 — Auth and Private Storage Recovery Coverage

9 October closure: the owner-approved restore-authority cutoff migration is hosted. Populated
encrypted restoration of two intakes/four snapshots, independently newer deletion/restriction/holds,
historic ciphertext erasure, provider-loss stable relink, fresh TOTP and independent medical-grant
approval/activation pass. Old tokens, revoked memberships and old approvals are denied. The hosted
source is synthetic; the restored destination is offline/local. Exact baseline and independent
zero-fixture/trigger readback pass. See [recovery acceptance](../02-implementation-plans/phase-02/annexures/identity-questionnaire-recovery.md).

**9 October scope amendment:** the owner now defers private uploads until required and selects
questionnaire-only initial intake. The [owner approval packet](../02-implementation-plans/phase-02/annexures/pilot-activation-owner-approval-packet.md)
supersedes the historical upload-before-launch requirement below. Upload implementation, scanning,
retention and metadata/object-byte recovery are deferred until that feature's activation, not
Verified. Identity/session/MFA and current domain-authority/disposition recovery still apply before
real account/intake use and are now verified within the bounded acceptance above.

Priority **P1**; status **Verified — retained identity/questionnaire scope; uploads excluded**.
Owner: System Architect, alternate Product Owner. Target:
before real intake; release disposition in Task 13.10. Evidence and acceptance:
[Task 13.9](../02-implementation-plans/phase-02/annexures/sprint-13-9-debt-reconciliation.md).
The nine-schema application export excludes Auth and Storage; no object-byte restore is proven.
The earlier optional blood-result upload-before-launch requirement (PDF/JPEG/PNG, 10 MB/file,
five/client) is superseded by the explicit 9 October no-upload amendment. Its implementation,
scan/retention and metadata/object-byte recovery remain required before future upload activation.
No object-byte restore is claimed. The local identity exercise
restores an encrypted application dump, revokes restored sessions/memberships/access assignments,
suspends restored tenants, preserves a newer restriction, and proves local re-verification/stable
relink/fresh TOTP after disposable provider-identity loss. The extended local test proves fresh
membership approval/revocation and applying a newer contact-only erasure without contact resurrection.
The subsequent populated/hosted acceptance adds current and historic medical erasure and genuine
fresh domain-grant authority after provider identity loss. It does not restore Auth secrets, old
MFA, Storage objects or a hosted application environment. Operational primary/alternate are Mansoer Gallie and
Mikhail Robertson; clinical lead/alternate are Tasneem and Dr Ziyaad Noor, with professional authority,
coverage and agreements still to be evidenced privately.
Approve and exercise secure identity recovery/relink, MFA/session revocation and private-object/
metadata recovery for enabled uploads, or explicitly exclude uploads from scope. Record custody,
isolation, dependencies, reconciliation and bounded recovery objectives. Do not broaden TD-020's
Verified application-recovery scope or add sensitive exports without approved design/authority.

## TD-066 — Unconverted Mobile Auth Identity Retention and Exception Recovery

Priority **P2**; status **Open**. Owner: System Architect; target: Sprint 14.8–14.10,
before enabling real mobile email delivery. Discovered in
[14.7](../02-implementation-plans/phase-02/annexures/sprint-14-7-email-conversion.md).
The private register sweeps names/phone/claimed email 30 days after terminal expiry/revocation
and minimal mobile journal after 90 days. Auth invitation creation also creates provider and
stable application identity/contact records. The register sweep deliberately cannot delete those
records or unrelated existing accounts. A provider-created but never converted identity can also
hold a subsequent send in the existing-account exception path; no blind retry is authorised.
Define and verify exact provenance-scoped orphan identity/contact retention, session revocation,
staff recovery/reissue and backup-erasure reconciliation. Preserve converted accounts and every
unrelated account, membership and domain record. Provider-accepted/uncertain outcomes need explicit
reconciliation, not automatic deletion or resend. Review the policy and exercise local denials/
cleanup before separately approved hosted proof. Keep the mobile email gate disabled until resolved
or a documented, time-bounded approved operating control exists. This does not weaken TD-065.
Task 14.8 prepares the [provenance-scoped retirement/reissue design](../02-implementation-plans/phase-02/annexures/sprint-14-unconverted-identity-recovery.md).
The owner approved the secondary-copy retention policy on 9 October, preserving unrelated and
converted accounts with Mansoer primary/Mikhail alternate. The new local creation-provenance
migration and candidate-policy tests are prerequisites only: they do not implement operational
retirement/reissue, provider uncertainty/session reconciliation or backup-erasure reconciliation.
The owner-approved provenance migration is now hosted, with separately approved history correction
to `20261009072105` and verified private-table/retired-function access controls. The original empty
Auth/provenance baseline and suspended tenant are unchanged. Hosted conversion/retirement acceptance
remains pending; status remains Open.
The private coordinator/provider checkpoint adds 79 passing focused candidate/coordinator/provider
tests for exact manifests, protected identities, uncertainty-before-delete and no blind repeat.
It is unwired and lacks the native locked repository, confirmation/session-race acceptance,
contact/backup-copy completion and staff reissue. No new hosted change or provider deletion was
performed. This is implementation progress, not closure or real-email activation; see the design.
Task 14.9's explicitly approved synthetic fixture deletion and session revocation are not an
operational orphan-retirement/reissue implementation. Task 14.10 retains this real-email gate in the
[mobile release runbook](../06-operations/mobile-invitations-release-runbook.md).

## Registry Maintenance Rules

- Each item receives an accountable owner, target milestone, and link to its implementation plan before work starts.
- A resolution may be “remove/defer the capability” when that is safer than implementing it prematurely.
- P0 items cannot be waived informally. Any accepted exception requires named clinical/business/security approval, scope, compensating control, and expiry.
- Dependency findings must be triaged by reachability and platform; do not apply breaking bulk upgrades without tests and rollback.
- Mark an item **Verified** only after its acceptance evidence is recorded in a completion report or linked change review.
- Add newly discovered debt as a new immutable ID; do not silently repurpose existing IDs.
- Framework migration does not close debt by itself. Closure requires preserved data, verified contracts, behavioural evidence, reconciliation, and a tested rollback path.
