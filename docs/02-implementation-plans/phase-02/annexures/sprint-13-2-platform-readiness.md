---
plan_id: phase-02-sprint-13-2
title: Platform Readiness Verification
status: in-progress
last_updated: 2026-10-07
owner: "@Muhns13G"
---

# Task 13.2 — Platform Readiness

Task 13.1 is committed at `95e73b7`. This packet records read-only observations, not pilot
activation, secret-value verification or an end-to-end rehearsal. No Git mutation, hosted settings
change, migration, fixture, email, charge or deployment was performed.

## Follow-up Findings

The read-only review established exact source provenance through Cloudflare build
`259783c5-33f5-495f-8809-59219f395bdc`: preview commit
`ad13febdcb693b6216bb173835a27d6c8cb33729` produced active version
`81e52dc2-73cd-4acc-ba69-f0ccc03eb480`. Build logs identify Bun 1.3.14 and Node 22.23.2.
Git blob comparison against committed `95e73b7` found only the seven Sprint-13.1 documentation
differences, the intentional peptide route difference and preview-only media binary. No other
committed source/configuration/migration differences were found. The local fixes below are not deployed.

GitHub run `37602735614` completed **failed**: 232 browser tests passed and 40 failed. The
failures report macOS-only `/private/tmp` screenshot paths on the Linux runner. The two screenshot
helpers now use Playwright's per-test `outputPath`, preserving all accessibility assertions and
isolating parallel/project artifacts under ignored `test-results`. The affected local three-file
matrix initially passed 46/48; two staff sign-in checks sampled the pre-hydration dimmed button.
The staff test now explicitly waits for enabled submission before its presentation measurement;
the two desktop/mobile retests passed (33.1 seconds). This is a 46/48 run plus a successful 2/2
retest, not a single new full 272-test passing run. Formatting checks on the three test files pass.
Exact-commit remote CI must pass after the owner commits/pushes these fixes.

Expanded database coverage corrects the earlier six-schema sample: **125 governed tables**, all
with RLS enabled, zero anonymous or authenticated SELECT grants. All tables have forced RLS except
the two existing identity account-command/rights-request tables, which retain RLS and deny both
client roles SELECT. Supabase Security Advisor reports **0 errors, 0 warnings, 125 informational
RLS-enabled/no-policy suggestions**. These correspond to the deliberate deny-default architecture,
not permission to add public policies.

Hosted `db lint --linked --level warning` is a different check and is **not clean**. It reports
volatility warnings in `audit_private.safe_metadata`, `audit_private.notification_resend_allowed`,
`commerce_private.calculate` and `identity_private.read_operations_queue_before_audit`; cast
warnings in `commerce_private.prepare_offer` and `public.execute_patient_account_command`; and
unused-variable warnings in reconciliation/support/payment functions. Investigate the actual
declarations/call chains locally before deciding which require a forward migration; lint warnings
alone do not prove broken transactions. No hosted function alteration was made.

Authenticated Better Stack browser review confirms monitor `4799009` is **Up**, with 3-minute
frequency, confirmation and recovery windows, expected statuses 200–208, TLS verification, all
four regions, email notification and escalation to the whole team after 3 minutes. Its primary
on-call page says no schedule is configured and the entire team receives notifications; this is
not evidence of separately appointed primary/alternate coverage. Recovery heartbeat `481481` is
**Down**, expected hourly with 15-minute grace; missed-heartbeat incident `1000464658` remains
ongoing since August. No false success heartbeat, acknowledgement or resolution was sent.

The scheduled recovery job is intentionally disabled and no GitHub repository database-connection
secret exists. Readiness therefore remains gated even though EU private storage and expiry pass.
Before real intake, obtain explicit authority for connection provisioning, a production-format
export/isolated restore, independent key-custody confirmation and hourly scheduling. Auth/private
Storage coverage remains part of that recovery decision, not something a source deployment solves.

Immutable deployment history and the rollback procedure are available, but no fully verified
exact-source rollback target has been accepted for this packet. Do not use an arbitrary older
version with current state/configuration. Record compatible target and forward-only migration
recovery before promotion; no canonical rollback test was performed.

## Initial Observations (Superseded Where the Follow-up Gives New Evidence)

| Boundary                 | Observation on 7 October 2026                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source                   | Clean `itws-I` tree at `95e73b7` before this documentation update.                                                                                                                                                                                                       |
| CI                       | Preview run `37602735614`, SHA `ad13febdcb693b6216bb173835a27d6c8cb33729`, still in progress at inspection. No passing result claimed.                                                                                                                                   |
| Runtime                  | Active 100% Worker version `81e52dc2-73cd-4acc-ba69-f0ccc03eb480`, created 09:45:38 UTC. Metadata contains no Git SHA; exact source correspondence remains unproved.                                                                                                     |
| Bindings                 | Supabase, Stripe, Brevo, identity/session, journey-intent and intake secret names present; rate limiter present. Secret names alone do not prove values or modes. Operations alerts and transactional notifications explicitly disabled.                                 |
| Logging                  | Persisted logs enabled, invocation logs disabled, traces disabled. Query-string redaction is false; confirm application logging remains payload-free during the later rehearsal.                                                                                         |
| HTTP                     | Homepage 200 with CSP/HSTS and revalidation cache policy. Order portal 200 with private/no-store policy. Disabled notification callback GET returns 404 with private/no-store policy. No authenticated journey was exercised.                                            |
| Migrations               | All 53 local migration versions have corresponding hosted versions. History parity is not a function-body checksum audit.                                                                                                                                                |
| Database                 | All 73 tables in the six governed schemas have RLS enabled. Baseline inventory: 48 public resources, 18 service-unreadable, Auth users zero, one suspended pilot tenant and 12 provider gates; no other service-readable application data. Anonymous tenant read denied. |
| Independent restrictions | Read-only Sprint-12 baseline SQL: 22 tables, zero fixture rows, Auth empty, pilot suspended, append-only triggers enabled, private-table forced RLS and five command ACL restrictions pass.                                                                              |
| R2                       | `meneer-health-recovery-production` found through EU-jurisdiction API; managed public domain disabled, no custom domains, enabled expiry rule 3,024,000 seconds (35 days). No object contents read.                                                                      |
| Recovery runner          | Hourly workflow exists but `RECOVERY_EXPORT_ENABLED=false`. Recent scheduled runs skipped. Four recovery secrets exist by name; `SUPABASE_DB_URL` absent from repository Actions secret inventory. Production exports are not operational.                               |
| Rollback                 | Immutable deployment history available; owner-controlled rollback procedure documented. No rollback performed and no exact-source last-verified rollback target selected yet.                                                                                            |

## Remaining Acceptance Work

### Additional readiness corrections — 7 October 2026

Local migration `20261007102500_time_sensitive_authority_volatility.sql` corrects two
time-sensitive authority predicates to `VOLATILE`, without changing their bodies or access controls.
The new volatility/ACL regression and the staff queue, support follow-up and commerce catalogue
packets passed together: **181 assertions across four SQL suites**. Hosted application still requires
explicit approval. Remaining lint notices about valid literal conversions and unused locals must not
be represented as runtime failures or as a clean lint result.

The recovery export schema allowlist now includes `measurement_private`; its exact nine-schema
inventory is covered by the recovery adapter regression (**8 tests passed**). This source correction
still needs the owner's normal commit/release process.

The owner authorised connection-secret provisioning, encrypted production-format export/isolated
restore proof and hourly activation **only after reconciliation passes**. Execution remains blocked
because neither `SUPABASE_DB_URL` nor `SUPABASE_DB_PASSWORD` is present in the ignored local
environment. Independent off-device key custody and named primary/alternate responders also remain
unconfirmed. The connection-provisioning observations above are superseded by the follow-up below.

### Connection provisioning and CI follow-up

Both exact-commit CI runs completed successfully: `37606869524` (`itws-I`,
`7f12b0d3d191c9275e258eb148e29bf19c3709cf`) and `37606984109` (`itws-I-preview`,
`8c44f6dd73418ec3eddca7f947cd8387ab9aa3af`). These results precede the additional local
recovery corrections; they do not verify those uncommitted changes.

The owner supplied the database connection and authorised provisioning. `SUPABASE_DB_URL` was
saved only in the ignored local environment and the repository Actions secret. The session-pooler
connection on port 5432 passed an actual read-only PostgreSQL connection check. No password reset
was performed. Credentials disclosed in chat should be rotated through a separately authorised
credential-change process, not copied into evidence documents.

The connection check exposed a tooling issue: placing a complete URI in `PGDATABASE` did not select
the remote connection. The production dump adapter now splits the validated TLS-required URL into
standard `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` and `PGSSLMODE` environment
variables, with a connection timeout. Credential values remain absent from command arguments.
The eight adapter tests pass; type checking passed before this additional connection correction.

`main` still lacks the measurement-schema correction. Its production recovery path does not yet
perform the required isolated restore/reconciliation. No export was dispatched and
`RECOVERY_EXPORT_ENABLED` remains `false`. Complete the restore implementation and owner release,
then prove the off-site round trip before enabling the authorised schedule. Independent key custody,
Auth/private-Storage coverage and named recovery responders remain acceptance gates.

1. Record passing exact-commit CI after the owner pushes the portable screenshot/readiness fixes.
   Active deployed source provenance is now verified above.
2. Complete hosted security/advisor and required binding/configuration compatibility review without
   exposing secret values; verify hidden-schema restrictions beyond the sampled command packet.
3. Resolve recovery readiness and actual responder/alternate appointments. Live Better Stack state
   has now been refreshed through the authenticated browser; uptime is healthy, recovery is Down.
4. Select the exact last-verified rollback version and reconcile its schema/configuration compatibility.
5. Before real intake, separately authorise production-format recovery proof, database connection
   provisioning and hourly activation. Confirm independent key custody and Auth/private-Storage
   recovery coverage. Do not enable exports merely to complete a checklist.

Task 13.2 remains **in progress**. The suspended-pilot baseline is intact; this evidence does not
authorise Tasks 13.3 onward to create hosted fixtures or activate the real pilot.

## Owner-confirmed release and recovery boundary

The owner confirms an offline copy of `RECOVERY_ENCRYPTION_KEY_BASE64` exists. Cloudflare will
continue serving **`itws-I-preview`**, deliberately retaining its draft peptide video. Do not switch
its production branch to `main`. The scheduled GitHub recovery workflow is a separate release path
on the default branch; the owner reports `main` is updated, but new local readiness corrections
still need the owner's commit/push before an exact-source hosted workflow dispatch can verify them.

The production runner now verifies the downloaded encrypted archive, decrypts it, restores the
logical dump into a disposable PostgreSQL instance and reconciles per-table counts and row digests
across all nine governed application schemas before success heartbeat delivery. It retains the
production recovery object, while synthetic objects remain scoped cleanup targets. Source fingerprints
are compared before/after export and with the restore; a changed source fails closed. This does not
constitute an Auth/Storage export or permission to restore into hosted Supabase.

Local adapter/proof/job regressions pass: **15 assertions across three test files**, including
credential-free command arguments, malformed fingerprint rejection and reconciliation mismatch.
Hosted R2 round-trip acceptance and hourly activation remain pending the owner's release of these
corrections; no false success heartbeat was emitted.

The authorised hosted export/disposable local restore **passed for all 125 application tables and
13 baseline records**. Per-table counts and row digests reconciled. An initial attempt exposed the
fresh database's default `public` schema collision; the disposable bootstrap now drops only that
empty local schema before restoration. The retest passed. Plaintext dump/fingerprint working files
and the disposable database container were removed after each attempt. This direct restore proof
does not yet establish download/decryption from R2; that exact-source workflow step remains pending
the owner commit/push. Lint, type checking, formatting and all 15 recovery assertions pass.
