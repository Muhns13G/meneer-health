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
