---
report_id: phase-02-sprint-14-completion
title: Sprint 14 — Mobile Pilot Invitations Completion and Release Handoff
status: completed-with-activation-gates
last_updated: 2026-10-09
implementation_checkpoint: c794e23
inventory_baseline: 04a1673
release_disposition: no-go-real-pilot
owner: "@Muhns13G"
---

# Sprint 14 — Completion Report

## Outcome

Tasks 14.1–14.10 are complete at their contract, implementation, controlled acceptance and reporting
boundaries. Staff can prepare a governed unique mobile invitation; its recipient supplies and
verifies email before the existing atomic profile/document activation. This task supplies the
completion report, release/runbook handoff, file inventory and synchronized debt/Phase/RAG routing.

**Release disposition remains NO-GO for real-client activation.** Engineering completion is not
permission to send the cohort list, collect real intake, enable uploads, charge live money or transfer
to the protocol generator. Phase 02 remains open for required uploads and retained acceptance gates.
The owner has not withdrawn the requirement for private client uploads before launch.

## Delivered Tasks

| Task  | Delivered boundary and authoritative evidence                                                                                                                                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14.1  | [Contract](../../02-implementation-plans/phase-02/annexures/sprint-14-1-mobile-invitation-contract.md): minimal roster, unique participant link, 48-hour lifetime, verified email, neutral wording and explicit assurance limit.                                        |
| 14.2  | [Foundation](../../02-implementation-plans/phase-02/annexures/sprint-14-2-private-mobile-invitation-foundation.md): private register, token/claim digests, expiry/version/revocation, RLS and journal.                                                                  |
| 14.3  | [Staff](../../02-implementation-plans/phase-02/annexures/sprint-14-3-governed-mobile-invitation-staff.md): assigned operations/AAL2 commands, masked roster and reviewed reservations.                                                                                  |
| 14.4  | [Delivery](../../02-implementation-plans/phase-02/annexures/sprint-14-4-mobile-delivery-intents.md): durable one-shot intent, segment/rolling-spend limits and uncertainty-preserving Telnyx adapter.                                                                   |
| 14.5  | [Receipts](../../02-implementation-plans/phase-02/annexures/sprint-14-5-attributed-mobile-delivery.md): signed/fresh/exactly attributed callbacks and governed reconciliation.                                                                                          |
| 14.6  | [Redemption](../../02-implementation-plans/phase-02/annexures/sprint-14-6-mobile-redemption.md): inert GET, protected claim, stripped fragment, immutable email and bounded interruption/decline.                                                                       |
| 14.7  | [Conversion](../../02-implementation-plans/phase-02/annexures/sprint-14-7-email-conversion.md): managed email OTP/session binding and existing atomic activation; register-only retention sweeps.                                                                       |
| 14.8  | [Local acceptance](../../02-implementation-plans/phase-02/annexures/sprint-14-8-security-accessibility.md): rollback security packet, real local concurrency/Auth tests and owner-confirmed VoiceOver/keyboard/zoom.                                                    |
| 14.9  | [Hosted acceptance](../../02-implementation-plans/phase-02/annexures/sprint-14-9-hosted-mobile-rehearsal.md): actual controlled handset/mailbox, genuine AAL2 and signed delivery, conversion, consumed-link denial, exact cleanup and explicitly disabled restoration. |
| 14.10 | This report, the [mobile operations runbook](../../06-operations/mobile-invitations-release-runbook.md), debt reconciliation, Phase checkpoint and RAG/index updates. No runtime or hosted mutation.                                                                    |

## Verified Evidence and Its Limits

14.9 is committed at `c794e23`; the working tree was clean when 14.10 began. Reviewed fixed code
is `73928cf`; canonical preview source `b8e59aa1cabc2a1562931deec6de50ccc92eb48d` has the intentional
peptide preview difference. Its [full CI run 37845605838](https://github.com/Muhns13G/meneer-health/actions/runs/37845605838)
passed and was independently rechecked in 14.10. The local GitHub default resolves to a different
owner repository; CI evidence here was explicitly queried for **Muhns13G/meneer-health**, not
inferred from that default or from a recovery-export workflow. The future closure commit is not
covered by a previous CI run.

The linked packets record:

- 14.8: eight local rollback suites / 463 assertions, local claim/email/dispatch races, representative
  desktop/mobile security/accessibility and owner-confirmed manual acceptance. Its 312-pass broad
  scan and corrected affected media checks are not represented as one clean final local run.
- Fixed-code 14.9 regression: 151 unit files / 1,133 tests, typecheck, production build/client
  exclusion, actual no-send workerd probes and full fixed-preview CI. These are dated acceptance
  results, not fresh database/browser tests performed by this reporting task.
- Six committed mobile migrations applied hosted with original filename versions; 13 private mobile
  tables have forced RLS. No local seed was imported.
- Third authorised SMS: application dispatch accepted and bound its exact provider message;
  two genuine signed callbacks include delivered. Owner confirmed handset receipt and page loading.
  All-in billing is **US$0.196 for two segments**, distinct from the callback's US$0.08 base projection.
- The harness claimed the exact link, received the owner-supplied email OTP and completed existing
  activation: one synthetic profile and two synthetic document receipts. The handset browser was
  not separately used to complete registration; its in-use screen was correctly denied after the
  harness claimed the link. No extra SMS was sent because of that screen.
- Hosted consumed-link, anonymous staff, wrong-origin and unsigned callback denials passed.
  Hosted inspection confirms 48-hour constraints/current expiry guards and six-digit/900-second
  Auth settings. Local expiry/revocation/race evidence is not an elapsed hosted 48-hour test.
- Scoped cleanup revoked/deleted disposable sessions/users and manifested application rows;
  independent full application count/hash and named-guard checks match the original baseline.
  Zero Auth users/sessions/refresh tokens, one suspended real tenant and 12 retained provider gates.
- Owner-promoted version **559d739a-1e61-4277-9ad0-3cbb076ea5d8** retains the reviewed code and
  explicitly disables mobile modes/readiness. Redemption/email return 503 and callback 404 with
  no-store headers. This is the verified mobile containment point, not an automatic rollback target
  for future incompatible schemas or a new activation decision.

The first dispatch had no confirmed provider delivery; the second delivered but the sender rewrite
prevented application attribution. The third proved complete attribution/conversion. Provider records
remain; application fixture cleanup is not provider-history deletion. No real clinical/payment data
was used. Secrets, phone, bearer, OTP, cookies and raw provider payloads are excluded from this report.

## Deviations and Lessons

Workers rejected the earlier redirect option and unbound native-fetch invocation; the reviewed
adapter fix uses manual redirects and a proper global wrapper. International sender substitution
needed an explicitly configured, case-sensitive alpha allowlist shared by dispatch and callbacks;
the outbound E.164 sender and shared profile/webhooks were not changed. Both issues have regression
and provider-backed evidence, not a generalized relaxation of signatures or attribution.

The previous nominally disabled rollback target restored the tenant binding but retained enabled
mode secrets. Independent HTTP inspection caught this; the owner promoted an explicitly disabled
same-code version. Future restoration must prove modes with harmless route probes, not rely on a
version label or an invalid invitation returning unavailable. A successful provider send is not
authentication, conversion or delivery attribution; a successful conversion is not complete erasure.

## Debt and Release Disposition

Registry: **66 items, 56 Verified, ten non-Verified**. TD-066 is the new Sprint-14 debt; no other ID
is added, repurposed or silently waived by reporting. Original acceptance criteria remain intact.

| Debt   | Status and remaining acceptance                                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-006 | In progress: truthful final claims/notices, exact issued versions and applicable domain approvals.                                                                                             |
| TD-007 | In progress: actual clinical/product/dispensing/custody authority before affected transactions.                                                                                                |
| TD-009 | In progress: factual contracting/responsibility/transfer arrangements; current generator evidence before real manual transfer.                                                                 |
| TD-010 | In progress: final real catalogue/delivery/tax/invoice/refund terms and merchant/provider live-money acceptance.                                                                               |
| TD-037 | Open: exhaustive released private-flow AT inventory with device/browser/AT references.                                                                                                         |
| TD-038 | Open: flow-specific released spoken pending/result/retry/expiry acceptance.                                                                                                                    |
| TD-043 | Open: finite operational/clinical coverage, unattended callback/capacity/headroom and response acceptance.                                                                                     |
| TD-064 | In progress: authenticated hosted conflict/unchanged-state acceptance and exact restoration; migration/static proof alone is insufficient.                                                     |
| TD-065 | In progress: complete identity/domain-authority recovery and required private-upload metadata/object-byte recovery; uploads remain unimplemented.                                              |
| TD-066 | Open: provenance-scoped unconverted provider/application identity retirement, staff recovery/reissue and copy/backup reconciliation, or an explicitly approved time-bounded operating control. |

Owner-reported reviewer approval of draft direction remains recorded; it does not supply missing
factual placeholders or publish exact legal/clinical instruments. Mansoer/Mikhail are operational
primary/alternate, Tasneem/Dr Ziyaad Noor nominated clinical lead/alternate; professional evidence
and coverage remain private acceptance inputs. Ordinary response target remains 24 hours where
possible, not emergency coverage. Generator renewal stays deferred until actual generation is needed.

## Next Release Boundary

Use the runbook's gated first-cohort checklist. Resolve applicable debts and required uploads,
refresh exact-source CI/runtime/schema/monitoring/recovery, settle exact truthful documents and
finite recipient/spend/operations limits, then obtain a separate owner GO. There is no assumed
first-cohort size or unlimited spending authority. The controlled handset authorisation and the
owner's removal of an ad hoc rehearsal cap are not authority to send to the real roster.

14.10 closes Sprint 14 engineering/reporting with activation gates; it **does not close Phase 02**
as ready-to-pilot, choose a new framework, activate real accounts or authorize live payments.

## Task 14.10 Validation and File Accounting

Validation and complete net-delivery inventory are recorded below. Existing versus new files are
classified against the pre-14.1 tree `04a1673`; this is a reproducible tree inventory, not a union
of unrelated merged historical changes. The preview-only peptide route/video divergence is explicitly
identified, not attributed to a new invitation feature. Generated route-tree changes were generated,
not manually edited. Ignored environment/provider artifacts are excluded.

No source, dependency, migration or generated file changes in 14.10; only the documentation batch
listed by the final working-tree status. Owner staging/commit/exact-commit CI/release remain separate.

Fresh 14.10 checks: strict typecheck, full ESLint and **151 unit files / 1,133 tests** pass, as do portability
(15 capabilities/20 contract majors/26 fixtures) and discovery checks. Documentation formatting,
relative links, index identities/paths and inventory consistency are checked separately below.
No fresh database/browser/provider exercise is implied by these reporting checks.

The documentation validator checks **410 relative links**, **216 existing indexed paths** and
**215 unique path-associated IDs**, plus exact agreement between all **88 inventory paths** and
the reproducible Git tree/untracked-file comparison. JSON parses and whitespace checks pass.
Formatting covers all 11 closure files; no previous CI is claimed for the uncommitted batch.

The 14.10 batch is **11 documentation files: two New, nine Modified, none Deleted**. The two new
files are this completion report and the mobile operations runbook. Existing changes are the Phase
plan/checkpoint, Sprint plan, debt registry, two existing runbooks and three RAG/index files.

Complete net-delivery inventory: **88 paths — 62 New, 25 Modified,
1 Deleted**. The removed draft binary and changed peptide route are the deliberate permanent/preview
branch separation: canonical `itws-I-preview` retains its demo media; this checkout does not.
They are not a mobile-invitation deletion or authority to remove the hosted preview video.

| Path                                                                                                  | Change relative to baseline |
| ----------------------------------------------------------------------------------------------------- | --------------------------- |
| `.env.example`                                                                                        | Modified                    |
| `.github/workflows/ci.yml`                                                                            | Modified                    |
| `AGENTS.md`                                                                                           | Modified                    |
| `config/environment-catalogue.ts`                                                                     | Modified                    |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-1-mobile-invitation-contract.md`           | New                         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-2-private-mobile-invitation-foundation.md` | New                         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-3-governed-mobile-invitation-staff.md`     | New                         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-4-mobile-delivery-intents.md`              | New                         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-5-attributed-mobile-delivery.md`           | New                         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-6-mobile-redemption.md`                    | New                         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-7-email-conversion.md`                     | New                         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-8-security-accessibility.md`               | New                         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-9-hosted-mobile-rehearsal.md`              | New                         |
| `docs/02-implementation-plans/phase-02/annexures/sprint-14-unconverted-identity-recovery.md`          | New                         |
| `docs/02-implementation-plans/phase-02/README.md`                                                     | Modified                    |
| `docs/02-implementation-plans/phase-02/sprint-14-mobile-pilot-invitations.md`                         | Modified                    |
| `docs/03-completion-reports/phase-02/phase-02-minimum-pilot-enablement.md`                            | Modified                    |
| `docs/03-completion-reports/phase-02/sprint-14-mobile-pilot-invitations.md`                           | New                         |
| `docs/04-technical-debt/technical-debt-registry-v1.md`                                                | Modified                    |
| `docs/06-operations/cloudflare-environments-release-runbook.md`                                       | Modified                    |
| `docs/06-operations/environment-secrets-runbook.md`                                                   | Modified                    |
| `docs/06-operations/mobile-invitations-release-runbook.md`                                            | New                         |
| `docs/RAG/02-current-state.md`                                                                        | Modified                    |
| `docs/RAG/06-known-limitations.md`                                                                    | Modified                    |
| `docs/RAG/07-index.json`                                                                              | Modified                    |
| `e2e/mobile-invitation-redemption.spec.ts`                                                            | New                         |
| `e2e/mobile-invitations.spec.ts`                                                                      | New                         |
| `package.json`                                                                                        | Modified                    |
| `playwright.config.ts`                                                                                | Modified                    |
| `public/media/peptides/peptide-explainer-draft.mp4`                                                   | Deleted                     |
| `public/robots.txt`                                                                                   | Modified                    |
| `scripts/lib/sprint14-security.test.ts`                                                               | New                         |
| `scripts/lib/sprint14-security.ts`                                                                    | New                         |
| `scripts/review-mobile-invitation.ts`                                                                 | New                         |
| `scripts/test-mobile-invitation-conversion.ts`                                                        | New                         |
| `scripts/test-mobile-invitation-dispatch-race.ts`                                                     | New                         |
| `scripts/test-mobile-invitation-redemption.ts`                                                        | New                         |
| `scripts/test-mobile-invitation-security.ts`                                                          | New                         |
| `scripts/test-sprint13-evidence-rehearsal.ts`                                                         | Modified                    |
| `scripts/test-sprint14-hosted-mobile.ts`                                                              | New                         |
| `src/adapters/identity/supabase/supabase-mobile-delivery-repository.test.ts`                          | New                         |
| `src/adapters/identity/supabase/supabase-mobile-delivery-repository.ts`                               | New                         |
| `src/adapters/identity/supabase/supabase-mobile-invitation-repository.test.ts`                        | New                         |
| `src/adapters/identity/supabase/supabase-mobile-invitation-repository.ts`                             | New                         |
| `src/adapters/identity/telnyx/telnyx-mobile-invitation-sender.test.ts`                                | New                         |
| `src/adapters/identity/telnyx/telnyx-mobile-invitation-sender.ts`                                     | New                         |
| `src/application/identity/mobile-invitation-delivery.ts`                                              | New                         |
| `src/application/identity/mobile-invitation.test.ts`                                                  | New                         |
| `src/application/identity/mobile-invitation.ts`                                                       | New                         |
| `src/components/StaffMobileInvitationsPage.test.tsx`                                                  | New                         |
| `src/components/StaffMobileInvitationsPage.tsx`                                                       | New                         |
| `src/components/StaffQueuePage.tsx`                                                                   | Modified                    |
| `src/config/environment.test.ts`                                                                      | Modified                    |
| `src/lib/public-route-policy.ts`                                                                      | Modified                    |
| `src/routes/peptides.tsx`                                                                             | Modified                    |
| `src/routes/staff.mobile-invitations.tsx`                                                             | New                         |
| `src/routeTree.gen.ts`                                                                                | Modified                    |
| `src/server.ts`                                                                                       | Modified                    |
| `src/server/identity/mobile-invitation-claim.ts`                                                      | New                         |
| `src/server/identity/mobile-invitation-delivery-config.ts`                                            | New                         |
| `src/server/identity/mobile-invitation-delivery-service.test.ts`                                      | New                         |
| `src/server/identity/mobile-invitation-delivery-service.ts`                                           | New                         |
| `src/server/identity/mobile-invitation-email-service.test.ts`                                         | New                         |
| `src/server/identity/mobile-invitation-email-service.ts`                                              | New                         |
| `src/server/identity/mobile-invitation-http.test.ts`                                                  | New                         |
| `src/server/identity/mobile-invitation-http.ts`                                                       | New                         |
| `src/server/identity/mobile-invitation-page.ts`                                                       | New                         |
| `src/server/identity/mobile-invitation-receipts.test.ts`                                              | New                         |
| `src/server/identity/mobile-invitation-receipts.ts`                                                   | New                         |
| `src/server/identity/mobile-invitation-redemption-http.test.ts`                                       | New                         |
| `src/server/identity/mobile-invitation-redemption-http.ts`                                            | New                         |
| `src/server/identity/mobile-invitation-retention.test.ts`                                             | New                         |
| `src/server/identity/mobile-invitation-retention.ts`                                                  | New                         |
| `src/server/identity/mobile-provider-sender.ts`                                                       | New                         |
| `src/server/security/request-security.ts`                                                             | Modified                    |
| `src/server/security/response-policy.ts`                                                              | Modified                    |
| `supabase/migrations/20261008130000_mobile_invitation_foundation.sql`                                 | New                         |
| `supabase/migrations/20261008143000_mobile_invitation_staff_commands.sql`                             | New                         |
| `supabase/migrations/20261008160000_mobile_invitation_delivery_intents.sql`                           | New                         |
| `supabase/migrations/20261008173000_mobile_invitation_delivery_receipts.sql`                          | New                         |
| `supabase/migrations/20261008200000_mobile_invitation_redemption.sql`                                 | New                         |
| `supabase/migrations/20261008200100_mobile_invitation_email_conversion.sql`                           | New                         |
| `supabase/tests/database/mobile_invitation_delivery_intents.test.sql`                                 | New                         |
| `supabase/tests/database/mobile_invitation_delivery_receipts.test.sql`                                | New                         |
| `supabase/tests/database/mobile_invitation_email_conversion.test.sql`                                 | New                         |
| `supabase/tests/database/mobile_invitation_foundation.test.sql`                                       | New                         |
| `supabase/tests/database/mobile_invitation_redemption.test.sql`                                       | New                         |
| `supabase/tests/database/mobile_invitation_staff_commands.test.sql`                                   | New                         |
