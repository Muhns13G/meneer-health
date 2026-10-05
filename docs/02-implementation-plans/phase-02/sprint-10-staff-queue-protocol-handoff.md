---
plan_id: phase-02-sprint-10
title: Staff Operations Queue and Manual Protocol Hand-Off
status: in-progress
primary_debt: [TD-009, TD-043]
depends_on:
  [phase-02-sprint-09, DR-003, DR-007, DR-011, DR-012, DR-013, DR-014, DR-015, DR-017, DR-018]
last_updated: 2026-10-05
owner: "@Muhns13G"
---

# Sprint 10 — Staff Operations Queue and Manual Protocol Hand-Off

## Mission

Give authorised Meneer operations staff a least-privilege queue for progressing pilot clients and
recording a manual, auditable minimum-data bridge to the separate protocol portal. The queue must
coordinate work without granting clinical authority or copying protocol data into Meneer.

## Commit-Sized Task Plan

### First Party Intake Amendment — 4 October 2026

[DR-018](../../07-decisions/DR-018-meneer-hosted-medical-intake.md) supersedes external-only
questionnaire collection for the selected pilot path. The owner confirms Dr Zee approved Mikhail's
questions unchanged and that blood results are not an initial submission prerequisite. A separate
protected medical-intake module is now planned, with authorised manual transfer into the generator;
the minimum account profile and nonclinical queue remain unchanged. No medical answers or provider
integration are currently implemented by this amendment.

The [intake task packet](annexures/sprint-10-medical-intake-amendment.md) adds eight commit-sized
tasks, `2.10.I1`–`2.10.I8`, without renumbering completed work. Continue 10.7 and 10.8 as planned,
then complete the intake stream before the expanded 10.9 rehearsal and 10.10 closure. Its field,
access, escalation and processing contract is frozen in I1 before schema/application changes.
I1's [contract packet](annexures/sprint-10-i1-medical-intake-contract.md) is now frozen for local I2
implementation following owner approval on 5 October. The original 24 items are unchanged; collection
version 1.1.0 adds an explicit unselected sex field for generator mapping with separately attributed
owner approval and clinical publication review. Technical controls and medical-grant semantics are
fixed; private appointments, safety configuration and domain publication remain pre-launch gates.
This is not implemented intake or a live permission expansion.
Task 10.7 remains audit/alerts, not questionnaire implementation. The external-link delivery path
stays inactive and is no longer a mandatory activation dependency for the first-party path.

### Reconciled Sprint 09 prerequisite

Sprint 09 is [completed with activation gates](../../03-completion-reports/phase-02/sprint-09-identity-profile-consent.md):
the profile, invitation, first-party OTP, session, portal and rights-request boundaries exist, and
all 21 migrations were verified hosted. Disposable hosted proof restored the empty, suspended
pilot baseline. The staff invitation service is a governed helper, not an operational staff UI.
Task 10.1 must settle roles, assignments and transitions before queue implementation; Task 10.3
still owns staff invitation integration and AAL2 enforcement. Do not infer real-client activation,
approved legal publication, operational rights fulfilment or clinical authority from Sprint 09.

Task 9.10 discovered TD-057 dependency advisories. The dedicated
[remediation](../../01-audits/td-057-dependency-remediation-2026-10-03.md) now passes both audits
and local regression. The owner committed remediation at `1b41ed49d4a809baddd77be2cc598ee6668359bd`;
[exact-commit CI 37138262125](https://github.com/Muhns13G/meneer-health/actions/runs/37138262125)
passed on `itws-I`. This prerequisite is satisfied; post-deploy verification remains separate.
The approved queue mission and activation gates remain unchanged.

Task 10.1 is completed at the contract level in the
[staff queue and hand-off annexure](annexures/sprint-10-1-staff-queue-handoff-contract.md):
existing scoped roles, individual AAL2 workforce accounts, case-specific assignment/claim rules,
DR-017 states, guarded attempts/acknowledgements, separate clinical/payment authority and disabled
break glass. No staff queue/UI, migration or hosted activation is delivered by this task.

| Task     | Commit-sized outcome                                                                                                                            | Gate               | Status                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| 10.1     | Freeze staff roles, queue states, assignments, allowed transitions, separation of duties and break-glass posture.                               | TD-009             | Completed (contract)                                                           |
| 10.2     | Add migrations/contracts for queue items, assignments, hand-off attempts, acknowledgements, opaque external references and exceptions.          | Data model         | Completed (local)                                                              |
| 10.3     | Implement staff invitation, AAL2 enforcement and server-derived tenant/role/purpose context.                                                    | Workforce security | Completed (local)                                                              |
| 10.4     | Implement the accessible staff queue with minimum necessary fields, filters and masked contact data.                                            | Operations         | Completed (local)                                                              |
| 10.5     | Implement claimed assignment and optimistic-concurrency-safe transitions through onboarding, payment readiness and hand-off states.             | Workflow           | Completed (local gated)                                                        |
| 10.6     | Implement manual protocol hand-off initiation, acknowledgement, retry, cancellation and reconciliation without transporting health information. | TD-009, DR-013     | Completed locally; activation gated                                            |
| 10.7     | Implement append-only audit facts and alerts for access, assignment, override, hand-off and exception events.                                   | Audit              | Completed and closed; hosted verified with owner-confirmed receipt             |
| 10.8     | Add client-visible non-clinical status projection without revealing internal notes or clinical state.                                           | Client portal      | Completed locally; hosted migration/release proof gated                        |
| 10.I1–I8 | Deliver the separately protected first-party questionnaire, authorised manual transfer and medical lifecycle under the intake amendment.        | DR-018, TD-009     | Completed; current external-generator walkthrough explicitly excepted by owner |
| 10.9     | Rehearse success, duplicate, wrong-assignment, stale-state, unavailable-portal and abandoned-case scenarios.                                    | Reliability        | Completed; bounded local rehearsal, activation gates unchanged                 |
| 10.10    | Reconcile evidence and issue the Sprint 10 completion report.                                                                                   | All                | Planned                                                                        |

Task 10.2 adds eight deny-default tables and `operations.record@1`; see the
[persistence evidence](annexures/sprint-10-2-staff-queue-persistence.md). Local migration replay
and database checks pass. Hosted application is recorded at the Task 10.7 checkpoint below;
no operational staff workflow is activated;
Task 10.3's [workforce security evidence](annexures/sprint-10-3-workforce-security.md)
records individual staff entry, TOTP/AAL2, server-derived context, bounded separate sessions and
reviewed invitation dispatch. Task 10.4's [queue projection evidence](annexures/sprint-10-4-assigned-queue-projection.md)
records the read-only assigned queue, bounded state filtering/keyset pages and database-masked detail.
Task 10.5's [claimed-command evidence](annexures/sprint-10-5-claimed-queue-commands.md) adds
reservation/release, coded pause and pre-delivery cancellation with expected versions, atomic audit
and payload-bound replay. Detail derives account/receipt/authorisation facts; recipient/payment
integration remains explicitly pending, not an operator override. Task 10.6 owns delivered/provider
transitions and reconciliation; Sprint 11 supplies the authoritative deposit gate.
Task 10.6's [manual command/reconciliation evidence](annexures/sprint-10-6-manual-handoff-commands.md)
adds reference-only commands, private recipient/evidence facts, atomic attempt/state/audit/replay,
safe uncertainty/retry and cancellation boundaries. The owner-approved portal channel and separate
assigned reviewer now have guarded issuance, administrator destination approval and private evidence
ingestion. Link issuance is not receipt or acknowledgement. Actual patient-intake URL/configuration,
recipient approval/instruments and a hosted synthetic exercise remain operational activation gates
for that retained external-link path. DR-018 replaces it as the selected pilot intake direction;
the new medical module/manual-transfer proof replaces link-specific prerequisites, not recipient
authorisation or payment evidence.
Task 10.7's [audit/alert packet](annexures/sprint-10-7-operations-audit-alerts.md) now implements
central chained facts, audit-before-read, identified denial/override evidence, private alert intent,
live AAL2 administrator review and a bounded deduplicated uncertainty/overdue sweep. The approved
Brevo dispatcher, durable retry/failure evidence and explicit administrator acknowledgement/resolution
are implemented locally. Five-minute invocation and 24-hour overdue review are operational targets,
not clinical SLAs. Hosted RPC/provider rehearsal now verifies real MFA, owner-confirmed mailbox
receipt and scripted synthetic administrator response/revocation, followed by scoped fixture removal.
An authorised configuration-only Worker rehearsal verified Cron invocation and routed administrator
MFA/response/revocation, but the email attempt was uncertain: Workers rejected `redirect: "error"`.
The local `manual` redirect fix needs owner deployment and successful Cron email/receipt retesting.
Temporary configuration was restored to disabled mode and synthetic fixtures were removed.
The corrected deployed Cron retest then passed one accepted attempt and provider-reported delivery
at 14:41 SAST on 4 October 2026; owner-confirmed receipt on 5 October closes Task 10.7. Disabled mode
and the empty suspended baseline were restored without changing the corrected deployed code.
Task 10.8's [own-client progress packet](annexures/sprint-10-8-client-case-progress.md) adds an audited
server-only case projection and private portal section: opaque reference, coarse administrative status
and update time only. Own-scope/lifecycle/receipt/session checks, audit failure and wall-clock expiry
deny disclosure; no internal outcomes, reasons or clinical authority are exposed. Local migration
replay, 908 SQL assertions, 610 Vitest tests and 18 desktop/mobile portal checks pass. The new migration
needs separate hosted approval before deploying its RPC consumer. No hosted application or pilot
activation was claimed at that checkpoint. I1–I8 engineering acceptance is now complete: the approved
hosted migrations, real Auth/AAL2 and medical-command proofs, hosted patient browser/expiry checks,
mailbox visibility and scoped cleanup are in the
[intake progress packet](annexures/sprint-10-intake-implementation-progress.md). On 5 October the
owner explicitly excepted the unavailable current-generator walkthrough from I8 closeout; provider
entitlement/compatibility remains a pre-launch dependency. Final intake mode is disabled and the
real tenant remains suspended. Task 10.9 may now proceed after the owner's commit.
The payment adapter remains false until Sprint 11. Task 10.9's
[cross-boundary rehearsal](annexures/sprint-10-9-cross-boundary-rehearsal.md) adds a repeatable
rollback-only local packet, generator-outage/abandonment assertions and controlled browser failure
checks. The packet passes 411 assertions, full SQL 1,017, Vitest 673, real local MFA/concurrency,
34 targeted desktop/mobile browser checks and production build. Task 10.9 is complete at this
bounded engineering boundary; Task 10.10 remains planned. All seven Sprint
10 migrations were applied hosted with explicit owner approval on 4 October 2026. No seed/role
import or pilot activation occurred; independent checks retain one suspended tenant and zero
subjects/Auth users, cases, attempts and alerts. No real-client or scheduled Worker activation is claimed.

## Acceptance Gate

- Operations users cannot diagnose, prescribe, approve treatment or view protocol content.
- Every hand-off has an owner, time, opaque reference, acknowledgement and exception path.
- No health information is placed in URLs, logs, payment metadata, ordinary email or free-text
  queue fields.
- Wrong tenant, role, assignment, purpose, assurance or state fails closed and is auditable.

## Validation

Extend authorisation, workflow-command, audit and browser tests; run AAL2, concurrency,
idempotency, replay and failure exercises locally and against synthetic hosted identities. Obtain
an owner-assisted protocol-portal walkthrough without entering real patient data.
