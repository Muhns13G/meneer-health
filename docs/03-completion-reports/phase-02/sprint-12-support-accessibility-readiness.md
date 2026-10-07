---
report_id: phase-02-sprint-12-completion
title: Sprint 12 — Notifications, Support, and Accessibility
status: completed-with-activation-gates
last_updated: 2026-10-07
implementation_checkpoint: 654f51f
inventory_baseline: e1ed794
owner: "@Muhns13G"
---

# Sprint 12 — Completion Report

## Outcome and Mission

Sprint 12 makes private client and staff journeys understandable and supportable: durable generic
notifications, purpose-bound human support ownership, safe follow-up, and accessible forms and
asynchronous transitions. The [plan](../../02-implementation-plans/phase-02/sprint-12-support-accessibility-readiness.md)
and its nine annexures are the detailed implementation/evidence sources.

Tasks 12.1–12.9 are committed at `654f51f`. Task 12.10 supplies this report, full file inventory,
synchronized plan/debt/RAG records and final local validation. This closure batch awaits owner
commit and exact-commit GitHub CI. No new remote CI pass, source deployment or pilot activation
is inferred. The pilot remains suspended; this report does not close Phase 02.
All ten tasks are now complete within their stated evidence boundaries; released-flow accessibility
and actual operational coverage/provider activation remain the explicitly retained release gates.

## Delivered Work and Decisions

| Task  | Delivered outcome                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 12.1  | Frozen notification events, generic templates, recipient authority, privacy, shared budget, bounded retry and uncertainty rules.                             |
| 12.2  | Durable atomic notification intents, private delivery journal, recipient revalidation, shared sender lock/budget and authenticated bounded callback.         |
| 12.3  | Private client support requests, purpose-specific current primary/alternate coverage, human acknowledgement and emergency containment.                       |
| 12.4  | AAL2 staff queues, minimal delivery review, immutable responses, suppression-preserving resend and independent time-limited uncertainty reconciliation.      |
| 12.5  | Routed client-form keyboard, reflow, display preferences and questionnaire-section coverage; owner-confirmed representative local VoiceOver and actual zoom. |
| 12.6  | Persistent pending/results, settled focus, section progress, safe retries and hydration/input-reuse corrections; representative VoiceOver confirmation.      |
| 12.7  | Staff keyboard/reflow, contained tables, settled focus, masking and expiry even during stalled reads; separate owner-confirmed staff acceptance.             |
| 12.8  | Isolated hosted Auth/TOTP/AAL2 support and real generic email proof, exact provider delivery attribution/replay, faults and independently verified cleanup.  |
| 12.9  | Criterion-by-criterion debt reconciliation; retained release and operational requirements rather than unsupported Verified statuses.                         |
| 12.10 | This closure report, complete modified/new-file tables, synchronized records, final regression and narrow dependency remediation.                            |

Key decisions retained throughout:

- Managed Supabase Auth and existing generic operations/safety messages remain intact. No new
  clinical decision, payment authority, emergency service or public marketing claim was introduced.
- Email contains no questionnaire answers, protocol, clinical reason, profile, amount or provider token.
  Sensitive support is authenticated and purpose-bound, not an ordinary mailbox-body ingestion path.
- All non-Auth senders share the 50-attempt UTC-day budget; three attempts, backoff and recipient
  authority are enforced together. Auth quota/headroom requires release verification.
- Provider acceptance is not delivery; delivery is not human acknowledgement or clinical resolution.
  Timeout/uncertain transport does not permit blind resend. Independent reconciliation, current
  authority, suppression, quota and late-evidence containment still govern requeue.
- Real support coverage is not invented from synthetic roster references. Emergency handling produces
  guidance, not an ordinary support case or promise of an immediate email response.
- Accessibility automation supplements human review. Representative local owner acceptance is
  recorded as such, not exhaustive released-flow screen-reader certification.

## Deviations and Corrections

1. **Evidence boundaries retained:** local controlled browser tests and representative human review
   close engineering task acceptance, but broader released-flow obligations remain TD-037/TD-038.
   The plan's live/release aspirations are not relabelled as wholly proved in production.
2. **Provider push not activated:** 12.8 used actual accepted message references and verified Brevo
   delivered events, then authenticated callback replay. It did not install unattended provider push.
   Actual coverage, provider setup and quota/headroom remain TD-043 activation inputs.
3. **Forward conflict corrections:** two additional migrations change intentional business conflicts
   from SQLSTATE `40001` to `PT409`, avoiding PostgREST transaction retries/timeouts while retaining
   ownership, ACLs, security-definer settings and fail-closed behaviour. Migration history is preserved.
4. **Accessibility fixes:** input/button reuse, pre-hydration controls, settled focus and stalled-read
   expiry were repaired within the approved flows. The 12.9 focus regression test now waits for
   the same passive-effect focus assertion; no runtime gate was weakened.
5. **Narrow audit remediation in 12.10:** final audit discovered `sharp@0.35.4` under Miniflare
   (Cloudflare development tooling). [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)
   identifies `0.35.5` as patched. A single compatible override and synchronized lockfile replace it;
   no direct application dependency or broad upgrade is added. Production audit was already clean.
   The finding is tracked as TD-059, not silently folded into an older debt ID.
6. **Execution restrictions distinguished from defects:** initial Docker/CLI and browser runs hit
   sandbox filesystem/socket restrictions. Permission-enabled reruns are the acceptance evidence,
   not changes to application security or hosting policy.
7. **Local preview-media mismatch:** the first full browser run correctly rejected the configured
   draft video with HTTP 404: the ignored local environment enables preview media absent from this
   permanent-branch checkout. Final regression explicitly leaves both public peptide media values
   empty, matching the permanent-branch CI gate. No media assertion, preview-branch asset or local
   environment file is changed; the failed configured-media run is not reported as a clean pass.

## Validation and Evidence

The final local matrix and focused configuration-corrected browser retest are accepted below.
Earlier task counts are historical and are not substituted for this final evidence.

| Boundary                             | Fresh Task 12.10 result                                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit regression                      | 129 files / 829 tests pass both before and after the narrow dependency patch.                                                                                                                                                                                                  |
| Browser regression                   | Full desktop/Pixel 7 run: 270 passed, two peptide-media HTTP-404 failures (16.5 minutes). Exact desktop/mobile peptide checks then pass 2/2 with preview-only media disabled (22.7 seconds). This is not a single 272/272 clean run; exact-commit CI remains owner-controlled. |
| Frozen install and dependency audits | Patched installation succeeds; both full and production audits report no vulnerabilities.                                                                                                                                                                                      |
| Static checks                        | Formatting, ESLint, strict TypeScript, portability (15 capabilities / 20 majors / 26 fixtures) and public discovery pass.                                                                                                                                                      |
| Fresh local database                 | All migrations replay; 33 pgTAP suites / 1,550 assertions pass; database lint reports no errors.                                                                                                                                                                               |
| Notification race                    | Eight concurrent claims, one winner; shared budget 50; baseline restored, no provider contact/email.                                                                                                                                                                           |
| Rollback-only security/operations    | Identity: five suites / 168 assertions. Operations: nine suites / 513 assertions; baseline restored and payment adapters unchanged.                                                                                                                                            |
| Synthetic integrations               | Auth, workforce TOTP/AAL2/session/concurrent queue claims, authorisation, commands, audit/inbox/outbox, security evidence, measurement, lifecycle, payments and fulfilment all pass.                                                                                           |
| Incident/recovery                    | Incident exercise passes; encrypted recovery restores/reconciles 132 records, with zero heartbeat payload fields. Local stack stopped with backup preserved.                                                                                                                   |
| Production tooling                   | Node 22.23.2 build, client-bundle/MCP absence, generated-route check, Worker type check and Cloudflare upload dry-run pass. Nothing deployed.                                                                                                                                  |
| Documentation                        | Eight changed Markdown documents / 324 relative links and 191 indexed paths resolve; all 88 touched files appear in the inventory. Final closure checks pass.                                                                                                                  |

Local integration scripts were invoked with Bun's `--no-env-file` option after the guard correctly
rejected automatically loaded hosted configuration. The guard was not removed or bypassed with
hosted credentials; all integration targets above are synthetic local services.

The [12.8 hosted packet](../../02-implementation-plans/phase-02/annexures/sprint-12-8-hosted-support-rehearsal.md)
remains authoritative hosted proof: genuine AAL2, wrong-purpose denial, alternate ownership,
acknowledgement ordering, emergency containment, two owner-confirmed actual deliveries and exact
provider-event replay. Its independent restoration checked 22 application tables empty, Auth empty,
the pilot suspended and security controls intact; wider aggregate baseline and migration dry run
also passed. Task 12.10 sends no emails and changes no hosted data or settings.

## Lessons Learned

- Retry semantics span application, database and PostgREST: a serialization code is inappropriate
  for an intentional business conflict. Test the deployed HTTP status as well as the SQL rejection.
- Install authority-expiry clearing before awaiting network reads; late responses must never restore
  expired private data.
- Focus and announcement checks must wait for settled effects, while still asserting the actual
  keyboard target. Stable labels alone do not establish usable asynchronous flows.
- Correlate delivery to the exact accepted provider reference. Inbox confirmation and manual callback
  replay have different provenance from an unattended webhook.
- Refresh dependency audits at closure: yesterday's clean lockfile can acquire a new advisory.

## Technical Debt and Release Handoff

Existing non-Verified items remain **TD-006, TD-007, TD-009, TD-010, TD-037, TD-038 and TD-043**.
No existing acceptance criterion is waived. The
[12.9 reconciliation](../../02-implementation-plans/phase-02/annexures/sprint-12-9-debt-reconciliation.md)
details the three Sprint 12 debts:

| Debt   | Remaining acceptable closure evidence                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-037 | Exact released private-form inventory and assistive-technology acceptance, beyond representative local review.                                                                                          |
| TD-038 | Released stepped/asynchronous transition inventory, pending/result/retry/expiry announcements and assistive-technology acceptance.                                                                      |
| TD-043 | Actual privately approved purpose/clinical primary and alternate owners, deadlines/hours/fallback/absence coverage, unattended authenticated provider callback, quota/headroom and released acceptance. |
| TD-059 | Newly discovered development-tool advisory; narrow patched resolution and final audit/build/browser evidence, recorded separately.                                                                      |

TD-059 is **Verified** by patched frozen installation, both clean audits, production tooling and
browser regression above. Current registry total: **59 items — 52 Verified, seven non-Verified**.

The resolved conflict and accessibility defects add no unresolved debt. The security override has
a maintenance trigger: remove it only when the parent Cloudflare/Miniflare chain selects a patched
compatible version naturally, with frozen installation, clean audits, build and browser regression.

Sprint 13 remains the end-to-end pilot rehearsal/release decision. Actual publications, commercial/
clinical authority, generator reactivation and the other retained activation debts must be reconciled
there. Engineering sprint closure is not permission to enable real clients or live charges.

## Complete Sprint File Inventory

Baseline `e1ed794` → committed `654f51f`, plus this 12.10 closure batch. Classification is relative
to the Sprint 12 baseline; a newly created file later modified in the sprint remains “New”.
Generated route-tree and Worker types were regenerated, not manually authored. No file was deleted.
The tables cover **88 files: 42 existing files modified and 46 newly created**, checked against
the union of sprint commit history and the current closure batch, not only the final net diff.
Ignored local environments, provider credentials, patient data and build/test artifacts are excluded.

### Existing files modified

| File                                                                                 | Kind                |
| ------------------------------------------------------------------------------------ | ------------------- |
| `.env.example`                                                                       | Configuration       |
| `.github/workflows/ci.yml`                                                           | Configuration       |
| `AGENTS.md`                                                                          | Configuration       |
| `bun.lock`                                                                           | Dependency lock     |
| `config/environment-catalogue.ts`                                                    | Configuration       |
| `docs/02-implementation-plans/phase-02/README.md`                                    | Documentation       |
| `docs/02-implementation-plans/phase-02/sprint-12-support-accessibility-readiness.md` | Documentation       |
| `docs/04-technical-debt/technical-debt-registry-v1.md`                               | Documentation       |
| `docs/06-operations/cloudflare-environments-release-runbook.md`                      | Documentation       |
| `docs/RAG/01-project-context.md`                                                     | Documentation       |
| `docs/RAG/02-current-state.md`                                                       | Documentation       |
| `docs/RAG/06-known-limitations.md`                                                   | Documentation       |
| `docs/RAG/07-index.json`                                                             | Documentation       |
| `e2e/boundaries.spec.ts`                                                             | Regression coverage |
| `e2e/identity-activation.spec.ts`                                                    | Regression coverage |
| `e2e/medical-intake.spec.ts`                                                         | Regression coverage |
| `e2e/patient-rights.spec.ts`                                                         | Regression coverage |
| `package.json`                                                                       | Configuration       |
| `src/components/AccountCodePage.tsx`                                                 | Application         |
| `src/components/MedicalIntakePage.test.tsx`                                          | Regression coverage |
| `src/components/MedicalIntakePage.tsx`                                               | Application         |
| `src/components/MedicalWorkPage.tsx`                                                 | Application         |
| `src/components/OrderReviewPage.tsx`                                                 | Application         |
| `src/components/PatientPortalPage.tsx`                                               | Application         |
| `src/components/PatientRightsPanel.tsx`                                              | Application         |
| `src/components/PaymentStatusPanel.tsx`                                              | Application         |
| `src/components/RefundPanel.tsx`                                                     | Application         |
| `src/components/StaffAlertsPage.test.tsx`                                            | Regression coverage |
| `src/components/StaffAlertsPage.tsx`                                                 | Application         |
| `src/components/StaffHandoffEvidencePanel.tsx`                                       | Application         |
| `src/components/StaffQueuePage.tsx`                                                  | Application         |
| `src/components/WorkforceSignInPage.tsx`                                             | Application         |
| `src/config/environment.test.ts`                                                     | Regression coverage |
| `src/routes/account/activate.tsx`                                                    | Application         |
| `src/routes/account/sign-out.tsx`                                                    | Application         |
| `src/routes/account/verify.tsx`                                                      | Application         |
| `src/routeTree.gen.ts`                                                               | Generated           |
| `src/server.ts`                                                                      | Application         |
| `src/server/security/request-security.test.ts`                                       | Regression coverage |
| `src/server/security/request-security.ts`                                            | Application         |
| `worker-configuration.d.ts`                                                          | Generated           |
| `wrangler.jsonc`                                                                     | Configuration       |

### Newly created files

| File                                                                                       | Kind                |
| ------------------------------------------------------------------------------------------ | ------------------- |
| `docs/02-implementation-plans/phase-02/annexures/sprint-12-1-notification-contract.md`     | Documentation       |
| `docs/02-implementation-plans/phase-02/annexures/sprint-12-2-durable-notifications.md`     | Documentation       |
| `docs/02-implementation-plans/phase-02/annexures/sprint-12-3-purpose-support-routing.md`   | Documentation       |
| `docs/02-implementation-plans/phase-02/annexures/sprint-12-4-staff-support-followup.md`    | Documentation       |
| `docs/02-implementation-plans/phase-02/annexures/sprint-12-5-client-form-accessibility.md` | Documentation       |
| `docs/02-implementation-plans/phase-02/annexures/sprint-12-6-journey-announcements.md`     | Documentation       |
| `docs/02-implementation-plans/phase-02/annexures/sprint-12-7-staff-accessibility.md`       | Documentation       |
| `docs/02-implementation-plans/phase-02/annexures/sprint-12-8-hosted-support-rehearsal.md`  | Documentation       |
| `docs/02-implementation-plans/phase-02/annexures/sprint-12-9-debt-reconciliation.md`       | Documentation       |
| `docs/03-completion-reports/phase-02/sprint-12-support-accessibility-readiness.md`         | Documentation       |
| `e2e/client-form-accessibility.spec.ts`                                                    | Regression coverage |
| `e2e/client-form-checks.ts`                                                                | Regression coverage |
| `e2e/journey-announcements.spec.ts`                                                        | Regression coverage |
| `e2e/purpose-support.spec.ts`                                                              | Regression coverage |
| `e2e/staff-accessibility.spec.ts`                                                          | Regression coverage |
| `e2e/staff-support.spec.ts`                                                                | Regression coverage |
| `scripts/hosted-support-transport.ts`                                                      | Configuration       |
| `scripts/sql/sprint-12-hosted-support-baseline.sql`                                        | Configuration       |
| `scripts/test-hosted-support-denials.ts`                                                   | Configuration       |
| `scripts/test-hosted-support-rehearsal.ts`                                                 | Configuration       |
| `scripts/test-notifications-concurrency.ts`                                                | Configuration       |
| `src/application/notifications/transactional-notifications.ts`                             | Application         |
| `src/components/AccountCodePage.test.tsx`                                                  | Regression coverage |
| `src/components/StaffSupportPage.test.tsx`                                                 | Regression coverage |
| `src/components/StaffSupportPage.tsx`                                                      | Application         |
| `src/components/SupportPanel.test.tsx`                                                     | Regression coverage |
| `src/components/SupportPanel.tsx`                                                          | Application         |
| `src/domain/support/staff-followup.test.ts`                                                | Regression coverage |
| `src/domain/support/staff-followup.ts`                                                     | Application         |
| `src/domain/support/support.ts`                                                            | Application         |
| `src/routes/portal.support.tsx`                                                            | Application         |
| `src/routes/staff.support.tsx`                                                             | Application         |
| `src/server/notifications/notification-dispatch.test.ts`                                   | Regression coverage |
| `src/server/notifications/notification-dispatch.ts`                                        | Application         |
| `src/server/notifications/notification-receipts.test.ts`                                   | Regression coverage |
| `src/server/notifications/notification-receipts.ts`                                        | Application         |
| `src/server/support/support-http.test.ts`                                                  | Regression coverage |
| `src/server/support/support-http.ts`                                                       | Application         |
| `supabase/migrations/20261006133000_transactional_notifications.sql`                       | Configuration       |
| `supabase/migrations/20261006152000_purpose_support_routes.sql`                            | Configuration       |
| `supabase/migrations/20261006152001_staff_support_followup.sql`                            | Configuration       |
| `supabase/migrations/20261007033744_support_business_conflict_status.sql`                  | Configuration       |
| `supabase/migrations/20261007073348_notification_business_conflict_status.sql`             | Configuration       |
| `supabase/tests/database/purpose_support_routes.test.sql`                                  | Regression coverage |
| `supabase/tests/database/staff_support_followup.test.sql`                                  | Regression coverage |
| `supabase/tests/database/transactional_notifications.test.sql`                             | Regression coverage |
