---
plan_id: phase-02-sprint-13-7
title: Cross-Record Evidence and Recovery Reconciliation
status: in-progress
last_updated: 2026-10-08
source_commit: d12e088
owner: "@Muhns13G"
depends_on: [phase-02-sprint-13-6]
---

# Task 2.13.7 — Evidence Reconciliation

## Starting Boundary

Task 13.6 is committed at `d12e088` on `itws-I`; the starting tree was clean. The
[13.1 contract](sprint-13-1-rehearsal-contract.md) governs this packet. The real pilot remains
suspended and the generator remains inactive until manual generation is needed. Previous fixture,
payment and cleanup approvals are not standing permission for a new exercise. No staging, commit,
branch change, source deployment, charge, email or hosted mutation belongs to this checkpoint.

## Repeatable Local Evidence

`bun --no-env-file run test:evidence:rehearsal` runs seven fixed reviewed SQL suites against only
`supabase_db_meneer-health-local`: audit/inbox/outbox integrity, security observability, payment
reconciliation, queue/handoff records, private handoff delivery, transactional notifications and
lifecycle/recovery governance. All **418 SQL assertions pass**. Each suite is rollback-only,
bounded to 45-second statements/five-second locks, and must return complete passing TAP.
Exact application/Auth row fingerprints, table RLS/ACLs, trigger definitions/states and governed
function definitions/owners/ACL/configuration match before/after every suite. No raw SQL errors,
row contents or credentials are emitted. These are independent local scenarios, not a single
hosted whole-journey audit chain or new provider-delivery proof.

The packet's **16 guard tests** and combined **30 tests across four suites** (telemetry, recovery
job, archive and packet guards), strict TypeScript and targeted ESLint pass. Provider/hosted
environment variables are rejected and dotenv autoload is disabled. No schema or runtime guard
was changed; these reviewed fixtures must not be copied into hosted Supabase.

## Reconciled Evidence and Provenance

| Boundary           | Observed evidence                                                                                                                                                                                                                      | Limit                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Onboarding         | [13.3](sprint-13-3-onboarding-rehearsal.md): actual invitation/sign-in/recovery, profile/exact receipts, encrypted intake and own-client projection; independent scoped cleanup.                                                       | Generated session prerequisites are not additional email-delivery evidence.                                            |
| Money              | [13.4](sprint-13-4-assignment-payment-rehearsal.md), [13.5](sprint-13-5-protocol-bridge-rehearsal.md), [13.6](sprint-13-6-recovery-rehearsal.md): exact test captures, genuine signed settlement, independent original-method refunds. | Stripe retains sandbox records; deleted application fixtures cannot be inspected as current settlement rows.           |
| Transfer           | 13.5: current intake-created case, preparation/record/reconciliation lineage, independent actor and durable version transitions.                                                                                                       | Acknowledgement is explicitly synthetic Meneer-only; no current generator proof.                                       |
| Failure/response   | 13.6: declined-then-paid hold, routed cancellation/refund, injected notification faults and alternate response/revocation.                                                                                                             | Fault injection is not real Brevo outage/delivery; earlier stopped attempts remain incomplete.                         |
| Telemetry          | Strict server telemetry schema and payload-free recovery summary; local security evidence suite.                                                                                                                                       | A schema test alone does not certify every persisted Cloudflare log; fresh bounded hosted observation remains pending. |
| Hosted cleanup     | Fresh read-only transaction: Auth users 0, sessions 0, Storage objects 0, audit events 0; existing tenant chains valid and pilot suspended.                                                                                            | The empty chain is baseline evidence, not verification of the now-deleted rehearsal chains.                            |
| Scheduled recovery | Origin run [37683201774](https://github.com/Muhns13G/meneer-health/actions/runs/37683201774), event `schedule`, SHA `7108ed7d1a7c983a7430d87ac8f077b8b0d6b2f7`, succeeded at 20:37 UTC on 7 October.                                   | One unattended success is not sustained hourly RPO evidence or a current alert-response drill.                         |

The scheduled runner reports production source, encryption, durable storage, download/decrypt/
restore reconciliation of **13 records**, no synthetic-object deletion and zero heartbeat payload
fields. Repository `RECOVERY_EXPORT_ENABLED` is `true`. This closes 13.2's first-unattended-run
observation gap, without relabelling its earlier manual dispatches as scheduled successes.
GitHub CLI initially selected the upstream fork; its skipped jobs were excluded after checking
repository identity. All accepted run evidence above explicitly targets `Muhns13G/meneer-health`.

Current source exports all nine governed application schemas, including commerce, intake and
measurement. Auth and private Storage are excluded and remain explicit pre-intake recovery gates.
The current zero-user/zero-object baseline does not waive their coverage for future clients.

## Approved Read-Only Provider Inspection

The owner approved R2 inventory and monitoring inspection only: no downloads, deletion, test
alerts or settings changes. Cloudflare's authenticated EU bucket view lists exactly two encrypted
objects, each approximately 1.89 MB, public access disabled. Their modification times are
7 October **18:02:39 SAST** and **22:37:06 SAST**, corresponding to the manual production run and
scheduled run above. Both runner summaries reconcile 13 baseline records; this is consistent with
baseline archives, not evidence that rehearsal fixtures were captured. Object contents were not
downloaded or independently matched to those runs. Preserve both archives under the existing
35-day policy; no unknown object was deleted and no fixture-containing archive is asserted.

Better Stack monitor `4799009` is **Up**, checked every three minutes. Recovery heartbeat `481481`
is **Down**; missed-heartbeat incident `1028695803` is ongoing and unacknowledged in the list.
An earlier missed-heartbeat incident `1028574381` lasted three hours and 18 minutes. The successful
scheduled run recovered the old August missed-heartbeat incident, but does not prevent subsequent
misses. GitHub's current origin run inventory contains only one successful scheduled export after
enablement; do not infer an hourly success stream from the cron expression. The cause of missing
invocations is not conclusively diagnosed here. No false heartbeat, incident acknowledgement,
resolution or monitor-policy relaxation was performed.

## Remaining Acceptance Work

1. Finish archive provenance against the exact fixture windows/private manifests; current inventory
   and run summaries are consistent with two baseline archives. Database deletion is not backup
   deletion. Preserve these recovery objects; any content inspection or deletion requires specific
   authority. No download, decryption or deletion has occurred at this checkpoint.
2. Resolve the actual missed recovery cadence and record alert delivery/acknowledgement/response.
   The current Down heartbeat is a genuine acceptance gap, not a reason to widen its grace period
   or manually send success. Historical delivery drills remain historical, not a new drill.
3. Verify a fresh bounded hosted cross-record audit chain **before** scoped fixture removal and
   reconcile its workflow/receipt/response links. Prior drivers independently proved specific
   records but did not retain a complete cross-domain chain attestation. Obtain fresh isolated
   fixture/cleanup authority; no new payment is required merely to test chain mechanics, and
   synthetic money references must never be represented as new capture proof.
4. Record actual hosted minimal-telemetry observation without collecting private payloads or
   treating query-string logging configuration as proven redaction. Define Auth/Storage recovery
   disposition and retain remaining release gates explicitly.

**13.7 is in progress, not completed.** Local reconciliation and first unattended recovery proof
are verified; wider hosted audit, monitoring and historical archive disposition remain open.
The full quality/AT matrix, debt review and release decision remain 13.8–13.10.
