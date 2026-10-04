---
plan_id: phase-02-sprint-10-task-07
status: completed-hosted-rehearsal-live-activation-pending
last_updated: 2026-10-04
primary_debt: [TD-009, TD-043]
source_commit: 3deab6f
---

# Task 2.10.7 — Operations Audit and Alerts

## Mission and Scope

Extend the minimum-data queue journals into central append-only audit evidence and owned alerts
for access, assignment, denied overrides, hand-off uncertainty and missing acknowledgement.
This does not implement DR-018 intake, activate workflows or approve clinical decisions.
The foundation started on clean `itws-I`; Task 10.6 was committed at `b2a3a1e`.

## Implemented Work and Decisions

- Database triggers append reference-only facts to the tenant hash chain for queue mutations,
  assignment grants/revocations, destination approval, evidence verification and private portal
  issuance. Failed central audit/alert insertion rolls back the source write. Exact command replay
  does not duplicate central evidence. Assignment attribution is explicitly `system`, not invented
  proof of the grantor's live AAL2 session.
- Queue list/detail reads commit audit before disclosure and recheck wall-clock authority after
  audit-lock waiting. Identified wrong-role/assignment, conflict and readiness denials record coded
  actor-scoped facts separately; attempted client identifiers and free text are excluded. Recognised
  override/break-glass commands are denied and audited, never executed. Evidence failure returns 503
  with payload-free critical telemetry. Unidentified requests fabricate no tenant facts.
- Private append-only alerts use bounded codes, severity and security/technology-operations owners.
  Assignment, denial and exception alerts are atomic. A tenant-serialized, deduplicated service sweep
  processes at most 100 uncertain or overdue attempts without changing clinical/case state. The
  approved dispatcher selects a **24-hour overdue review target and five-minute Cron**, not a clinical SLA.
- The owner approved generic Brevo mail to `support@meneerhealth.co.za`; **Mansoer Gallie** is the
  initial responder. The server-only HTTPS adapter uses `BREVO_API_KEY`, distinct from the SMTP key.
  Fixed plaintext excludes patient, case, tenant and clinical details. A stable alert UUID is the
  provider idempotency key. Auth SMTP and public-facing messaging remain unchanged.
- Durable leased dispatch reserves at most **50 attempts per UTC day globally**, three per invocation.
  Known 429 rejection retries at most three times with 60/300-second backoff. Permanent rejection is
  failed; timeouts, 5xx, redirects and abandoned leases become uncertain, not blindly resent. Attempts
  and outcome facts are append-only. Failed receipt persistence leaves an expiring lease rather than
  claiming success. Provider 201 means accepted, **not delivered or acknowledged**. The internal cap
  does not guarantee remaining shared Brevo quota.
- `/staff/alerts` requires freshly verified administrator AAL2/security-administration authority.
  Its eight-field projection adds transport/response state but excludes client references and content.
  POST endpoints reject browser authority, foreign origins and unexpected fields. Responses are private,
  no-store and noindex. Human acknowledgement/resolution is immutable, idempotent and centrally audited;
  resolution requires prior acknowledgement. Review alone does not respond for a human.
- The screen clears prior data before refresh and at session expiry, stores nothing in browser
  storage, aborts obsolete requests and disables the SSR load button until hydration. All security
  functions revoke browser execution, use fully qualified objects and an empty search path. New
  private tables force RLS and deny direct service access.

## Completion and Activation Boundaries

Task 10.7 implementation and hosted database/provider synthetic acceptance are complete; live
scheduled Worker activation is not verified. The dispatcher defaults to disabled.
Separate authorisation is still required for hosted API-key/tenant configuration,
deployment, synthetic mailbox receipt and explicit responder acknowledgement/resolution rehearsal.
On 4 October 2026, the owner explicitly approved all seven pending Sprint 10 migrations. Linked
CLI dry-run identified exactly those files; `db push --linked --yes` applied them without seed or
role changes. Hosted history now matches all 28 local filename versions, with no history repair.
Independent checks confirmed one suspended tenant, zero subjects/Auth users, cases, attempts and
alerts; all 19 operations/hand-off tables force RLS and deny browser reads. Eight inspected public
workforce/queue/alert RPCs deny browser execution and grant service execution. Security advisors
reported only informational no-policy notices, consistent with the deny-default design.
The Brevo API credential was separately validated and saved only in the ignored local environment
at the owner's request. The subsequently approved rehearsal below verifies actual email acceptance,
owner-confirmed receipt and synthetic administrator response RPCs. No hosted Worker alert configuration
or deployment change ran. Historical Better Stack evidence is not queue-alert proof; neither schema
application nor this disposable rehearsal activates the suspended pilot.

### Hosted Synthetic Rehearsal — 4 October 2026

- Explicit owner approval covered an isolated synthetic tenant, disposable `.invalid` Auth identity,
  actual TOTP/AAL2, one generic email to the support mailbox and scoped transactional cleanup.
  The runner used the current identity service/repositories and Brevo transport adapter, calling
  hosted RPCs directly. It did **not** exercise a deployed Worker Cron or browser HTTP session.
- Actual MFA established a privileged session and server-derived administrator context. A denied
  override generated one reference-only alert through the normal denial RPC/trigger; the 24-hour
  sweep and lease/finish RPCs ran. Brevo accepted the notification at **12:17:54 SAST**. The owner
  confirmed mailbox arrival separately in this chat; no precise delivery timestamp is claimed.
- Scripted synthetic administrator acknowledgement and resolution passed at **12:18:15 SAST**,
  including exact acknowledgement replay, rejection of resolution before acknowledgement,
  wrong-tenant denial, no repeat notification and denial after real session sign-out/revocation.
  These are technical response proofs, not an assertion that the owner operated `/staff/alerts`.
- Independent SQL found one attempt, one accepted receipt, two immutable responses and a valid
  central audit chain. Rollback-only failed/uncertain outcome checks proved state retention and
  no automatic resend; no deliberately failing real provider send was made.
- Approved cleanup locked affected tables, disabled only five named append-only triggers, removed
  only the identified synthetic fixtures, and restored triggers before commit. Independent inventory
  verified one suspended tenant and zero Auth/application sessions, identities, audit facts/heads,
  alerts, dispatch cursors, attempts, delivery facts and responses. All six inspected original
  audit/alert triggers remain enabled. Temporary runner/token state was removed after revocation.
- **Remaining release gate:** the owner must deploy this task, provision the Worker-only Brevo key
  and approved tenant binding, deliberately enable the mode, and verify Cron plus the routed
  administrator flow. Until that owner-controlled release proof, live dispatch remains disabled;
  do not describe the scheduled channel as operational. No new debt or real-client activation.

Review the console at least daily: a broken email channel cannot notify itself. Security alerts
escalate to the security owner and operational alerts to technology/operations, initially the repository
owner until separately designated. Resending/reopening failed or uncertain delivery is deliberately
not exposed; it needs a reviewed reconciliation design. Apply DR-005 retention, not indefinite
retention; no automatic purge is claimed. See the audit integration runbook for activation steps.

## Validation

- Local reset applied all 28 migrations. **897 pgTAP checks across 22 files** passed, including audit
  integrity, denial/privacy, live AAL2, replay, retry backoff/ceiling, abandoned leases, global budget,
  immutable receipts and explicit human response. Fixtures roll back. SQL lint reports no errors.
- Full Vitest passed **599 checks across 98 files**. The final focused component/HTTP packet passed
  **49 checks across five files** after the hydration correction. Earlier foundation evidence was
  581 checks across 95 files.
- Desktop/mobile Playwright passed four new alert checks after the hydration correction, including
  explicit acknowledgement/resolution, keyboard, axe and anonymous endpoint denial. The existing
  queue packet's eight desktop/mobile checks also passed. Fixtures are controlled/mocked, not hosted
  staff/provider acceptance. No unapproved email was sent.
- Typecheck, ESLint, Prettier, SQL lint, production build, client-bundle/MCP-absence, Cloudflare
  generated type check, discovery policy and portability checks passed. Cloudflare upload dry-run
  succeeded without deployment. The new route tree was tool-generated, not manually edited.
- Hosted database/provider synthetic evidence is recorded above. Deployed Worker Cron/browser
  acceptance and GitHub CI evidence are not claimed.

## Deviations, Lessons and Debt

Triggers wrap immutable journals instead of rewriting every command RPC, preserving authority/replay
contracts while making central audit mandatory. The channel/cadence decision was completed after the
initial foundation. Provider acceptance, mailbox receipt and human response need separate evidence.
Browser tests caught a genuine pre-hydration click race; the component was corrected without loosening
assertions. Ambiguous delivery deliberately requires review, and shared quota requires daily oversight.
No new debt ID is introduced; TD-009 and TD-043 retain their wider hosted/operational acceptance gates.

## File Inventory

| Kind     | Files                                                                                                                                                                      | Purpose                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| New      | `supabase/migrations/20261004083827_operations_audit_alerts.sql`                                                                                                           | Central audit, private alerts, transport cursor/immutable receipts and response RPCs       |
| Modified | `src/adapters/persistence/supabase/supabase-queue-repository.ts` and test; `src/server/operations/queue-http.ts` and test                                                  | Identified denial receipt and fail-closed HTTP evidence                                    |
| New      | `src/server/operations/alert-dispatch.ts` and test; `alert-http.ts` and test                                                                                               | Generic Brevo delivery, bounded scheduled dispatch and protected review/response endpoints |
| New      | `src/application/operations/alert-projection.ts`; `src/components/StaffAlertsPage.tsx` and test; `src/routes/staff.alerts.tsx`; `e2e/staff-alerts.spec.ts`                 | Strict projection and accessible administrator response screen/proofs                      |
| Modified | `src/server.ts`; `src/server/security/request-security.ts`; `src/lib/public-route-policy.ts`; `src/components/WorkforceSignInPage.tsx`                                     | Scheduled entry, protected endpoints, restricted discovery and administrator navigation    |
| Modified | `wrangler.jsonc`; `worker-configuration.d.ts`; `src/routeTree.gen.ts`; `.env.example`; `config/environment-catalogue.ts`; `src/config/environment.test.ts`                 | Disabled-default Cron, regenerated bindings/routes and server-only configuration catalogue |
| Modified | `supabase/tests/database/staff_queue_commands.test.sql`; `staff_queue_projection.test.sql`; `manual_handoff_commands.test.sql`; `private_portal_handoff_delivery.test.sql` | Rollback-only acceptance and regressions                                                   |
| New      | This annexure                                                                                                                                                              | Implementation, decisions, lessons, evidence and activation boundaries                     |
| Modified | Sprint 10 plan; Phase 02 README; debt registry; audit runbook; RAG current state/limitations/index                                                                         | Synchronised implementation and activation status                                          |

Public copy and dependencies are unchanged. Route-tree and Worker types were regenerated by tools.
The original local implementation did not change ignored environment files; the later owner-approved
credential setup is recorded above without secret content. Existing owner-staged work was preserved;
additional edits are unstaged. No Git index, branch, commit, push or application deployment was changed.
