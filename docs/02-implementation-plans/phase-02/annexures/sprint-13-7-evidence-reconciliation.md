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

## Authorised Hosted Audit and Incident Response — 8 October

After explicit owner approval, `scripts/sql/sprint-13-evidence-audit.sql` passed locally and on
hosted Supabase in a single rollback-only transaction. An isolated suspended tenant, synthetic
subject/workflow and service identity produced **three non-empty hash-chain facts**. The committed
command receipt, version-one outbox, verified inbox and reconciliation response share their exact
correlation/causation lineage. Command and inbox replay create no duplicate evidence. Ordinary
audit updates are blocked by the unchanged immutable trigger; changing only the isolated chain
head detects corruption, and restoring it verifies the chain again before rollback.

The declared patient/AAL1 context is a SQL fixture, **not** a new authenticated-session proof.
No payment, email, provider transfer, clinical approval, Auth identity or pilot activation occurred.
Independent before/after aggregate evidence matches exact rows, security settings, governed
functions and triggers. Subsequent reads confirm zero Auth users/sessions, Storage objects,
audit events and fixture tenants; the original pilot remains suspended. No immutable trigger was
disabled. PostgreSQL audit sequence values advance despite rollback; harmless monotonic gaps are
expected and the shared sequence was not reset.

The owner separately authorised one controlled production recovery export and acknowledgement
of incident `1028695803`. Run
[37701825733](https://github.com/Muhns13G/meneer-health/actions/runs/37701825733), source SHA
`c1fd50ebd3110f5b5ea9517dd64fa859882149f9`, completed successfully at **01:22 SAST on 8 October**:
encrypted durable write, downloaded/decrypted isolated restore, **13 records** reconciled and
zero heartbeat payload fields. This creates another retained baseline archive, not a synthetic
object to delete. The workflow verified the new object's round trip; older objects were not
downloaded or removed.

Better Stack records detection/email dispatch at **23:52 SAST on 7 October**, acknowledgement
under Mansoer Gallie's account at **01:22 SAST on 8 October**, and automatic recovery at **01:22**.
The incident lasted approximately **89 minutes**. On 8 October the owner confirmed actual receipt
of the incident alert email, closing the delivery-evidence gap; no exact inbox-arrival timestamp
was supplied. No manual success ping, forced resolve,
heartbeat-policy relaxation or source deployment occurred. The workflow is active on default
branch `main`, with the intended hourly cron and enabled job variable, but current run history
still does not establish sustained hourly execution. Manual recovery does not fix that gap.

A bounded, own-IP-only Wrangler observation emitted no raw request data, but did **not** capture
a schema-valid hosted telemetry event. It is an inconclusive observation, not passing telemetry
proof. Local strict-schema tests remain valid.

The subsequent bounded observation on 8 October captured a production `request.completed` event
from an anonymous synthetic 404 request and validated it against the strict telemetry contract.
Only event/environment/validation booleans were emitted; no raw request, URL, header, cookie,
correlation identifier or private payload was printed. Removing the own-IP filter corrected the
inconclusive observation; this does not certify all historical/provider logs. The hosted minimal
application-telemetry observation gap is closed.

The owner approved preparation of a separate hourly dispatcher. Its
[activation runbook](../../../../operations/recovery-dispatcher/README.md) explicitly separates
dispatch acceptance from verified backup completion, pins the workflow/ref and retains the
existing alert threshold. It has no database/R2/encryption/heartbeat credentials. GitHub's
repository-level Actions credential is broader than one workflow and needs owner provisioning;
no credential was created and no Worker was deployed. Sustained hourly evidence remains pending
activation and observed runs, not closed by preparing code.

## Remaining Acceptance Work

### Historical archive disposition verified

On 8 October the owner authorised private download/decryption of the exact two older R2 objects.
AES-GCM decryption and manifest SHA-256 checks pass. Their manifest creation timestamps are
`2026-10-07T16:02:37.439Z` and `2026-10-07T20:37:04.400Z`, matching the manual and scheduled
production runs. Parsing `pg_restore --data-only` COPY output without executing archived SQL
finds exactly **13 records each**: one `public.tenants` row and 12
`public.fulfilment_provider_gates` rows; every other archived table is empty. No rehearsal-table
records or row contents were emitted. This proves record-count/provenance disposition, not a new
full isolated restore or byte-for-byte match to today's database. The runners already supplied
their original isolated restore proofs. An initial inspection used an incorrect expected gate
table name and failed closed; the name was checked against the committed migration and the
same bounded inspection then passed for both archives.

Exact downloaded encrypted files and decrypted dumps were removed in `finally`; the R2 originals
remain private and retained under the approved 35-day lifecycle. No remote deletion occurred.
Archive disposition and hosted minimal telemetry are now closed. Only dispatcher credential
provisioning, owner deployment and consecutive verified hourly runs remain for this packet.

The owner's first dispatcher deployment was rejected because compatibility date `2026-10-08`
was still in the future for Cloudflare's UTC validation during early-morning SAST. Configuration
now pins `2026-10-07`. The subsequent secret command created the Worker and installed the token,
but that is not proof that the dispatcher source or cron was deployed. The owner must rerun the
deploy command; the existing secret need not be entered again.

Owner deployment is now verified: version `84d314d2-9c0e-48f4-be88-7c0fe96add36` is at
100%, deployed **01:51:58 SAST on 8 October**, with the named secret present. Owner output confirms
the `17 * * * *` trigger. At the immediate post-deployment check no new recovery run had appeared.
The next three nominal trigger times are **02:17, 03:17 and 04:17 SAST on 8 October**; actual
accepted dispatch, successful runner completion and verified restore/heartbeat evidence must be
recorded, not assumed from deployment. Credential scope/expiry is owner-managed and its value
was neither retrieved nor printed. Task 13.7 remains in progress solely for observed cadence.

1. Finish archive provenance against the exact fixture windows/private manifests; current inventory
   and run summaries are consistent with two baseline archives. Database deletion is not backup
   deletion. Preserve these recovery objects; any content inspection or deletion requires specific
   authority. No download, decryption or deletion has occurred at this checkpoint.
2. Resolve the actual missed recovery cadence and record alert delivery/acknowledgement/response.
   The incident above recovered automatically and actual email receipt is confirmed. Sustained
   hourly cadence still requires evidence; do not widen grace or manually send success.
3. Hosted audit-only chain and exact rollback cleanup are now verified above. They supplement,
   rather than replace, the earlier genuine payment and authenticated provider-boundary proofs.
4. Hosted minimal-telemetry observation is now verified. Auth/Storage recovery remains an explicit
   pre-intake release gate; do not treat application-schema recovery as coverage of those systems.

### Latest Checkpoint — 8 October, After 03:17 SAST

The owner reduced initial acceptance to one scheduled recovery success; sustained cadence remains
follow-up evidence. Credential provisioning and deployment are verified, superseding the pending
claims above. The 02:17 execution failed; diagnostic version
`284d9819-6aef-48c3-aa29-d9c6149124c9` also failed at 03:17:37 SAST, reporting `network` with no
HTTP status. Local workerd reproduction proves `redirect: "error"` is rejected before outbound
networking. The local fix uses `manual`, rejects every non-204 response and never follows redirects.
Mocked exact-source runtime checks exercise 204 acceptance and 302/403 rejection; no real
credentials, provider dispatch or backup is used in those checks.

Separately, GitHub's native scheduled run
[37710532445](https://github.com/Muhns13G/meneer-health/actions/runs/37710532445) started at
02:58:30 SAST and verified production encrypted storage, round-trip restoration of 13 records and
payload-free heartbeat success at 02:59:33. This is genuine scheduled recovery evidence, but not
proof of the failed Cloudflare dispatcher. The native schedule has not been removed.

**13.7 remains in progress.** All earlier audit/cleanup, minimal telemetry, archive disposition and
incident-response evidence is retained. The remaining boundary is owner deployment of the runtime
fix followed by a successful scheduled dispatcher-to-export/restore chain and monitoring check.
No new manually triggered export or heartbeat substitutes for that proof.
The full quality/AT matrix, debt review and release decision remain 13.8–13.10.
