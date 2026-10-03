---
report_id: phase-02-sprint-09-completion
title: Sprint 09 — Identity, Profile and Consent Completion Report
status: completed-with-activation-gates
last_updated: 2026-10-03
implementation_checkpoint: 0511752
inventory_baseline: ee2b29b
owner: "@Muhns13G"
---

# Sprint 09 — Identity, Profile and Consent Completion Report

## Outcome and Mission

Deliver the minimum invite-only client account boundary: first-party verification, durable
non-clinical profile, exact-version document acknowledgements and an authenticated portal.
Tasks 9.1–9.10 are implemented/reconciled at the bounded synthetic boundary. This is not
real-client activation, legal publication approval, clinical intake or payment activation.

Task 9.9 is committed at `0511752`; this report and closure reconciliation await the owner's
commit. Functional validation passes, but final dependency audits discovered **TD-057** and
currently fail. Therefore **a clean security/CI release is not claimed**. Remediate this new
finding before normal Sprint 10 feature work or real-client activation; do not equate functional
sprint completion with unconditional production readiness.

## Delivered Work and Decisions

| Task | Delivered outcome                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 9.1  | Frozen identity/profile/instrument contracts, state transitions, route policy and threat model.                                                                          |
| 9.2  | Portable profile, publication, immutable receipt and lifecycle migrations; tenant-scoped RLS and least-privilege commands.                                               |
| 9.3  | Governed staff-created invitation helper with expiry, single-use consumption, tenant/purpose restrictions, replay and rate controls. No operational staff UI is implied. |
| 9.4  | First-party code-only invitation verification and encrypted preactivation proof; provider credentials stay server-side.                                                  |
| 9.5  | Patient sign-in, secure session establishment/renewal, logout, expiry, separate provider/application revocation and recovery.                                            |
| 9.6  | Minimal profile and exact document-version acknowledgement UI, committed atomically with invitation consumption/account activation; failure cannot show success.         |
| 9.7  | Authenticated own-account portal with approved non-clinical projection; hidden fields and other tenants remain unavailable.                                              |
| 9.8  | Durable correction/export/account-support request entry and receipt. Request receipt is not completed staff processing or export fulfilment.                             |
| 9.9  | Local and hosted synthetic SQL/API/provider/mailbox proof, configuration alignment, separately approved migration-history alignment and scoped cleanup verification.     |
| 9.10 | This report, exact Git-derived inventory, debt reconciliation, RAG/index updates and Sprint 10 prerequisite clarification.                                               |

Public registration remains disabled. Authenticated endpoints derive authority server-side;
clients cannot choose tenant, role, clinical authority or completion state. No clinical
questionnaire, diagnosis, prescription or protocol payload was introduced.

The owner accepted retaining useful existing transactional tracking unless it harms
authentication, delivery or production reliability. Code-only OTP protection remains mandatory;
codes, sessions, clinical content and credential URLs must not enter tracking. No Brevo
tracking setting changed and no new collection was enabled. Marketing measurement remains its
separate approved boundary. See DIR-091 and [FC-001](../../05-future-considerations/postgres-auth-email-vendor-strategy.md).

## Evidence and Validation

### Fresh Task 9.10 checks (2026-10-03)

| Check                                               | Result                                                                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run test`                                      | 76 files; 439 tests passed.                                                                                                                  |
| `bun run test:e2e`                                  | 154 desktop/mobile Chromium checks passed. Controlled/intercepted positive account UI and axe evidence are not live hosted browser approval. |
| `bun run db:reset && bun run db:test`               | All 21 migrations replayed; 16 pgTAP files, 495 assertions passed. Local disposable data only.                                               |
| `bun run test:identity:security`                    | 157 focused assertions passed.                                                                                                               |
| `bun run test:auth && bun run test:authz`           | Both local synthetic integration packets passed.                                                                                             |
| `bun run typecheck`, `lint`, `format:check`         | Passed; final edited-document formatting is checked again before handoff.                                                                    |
| `bun run check:portability`                         | Passed: 14 capabilities, 18 contract majors, 22 fixtures.                                                                                    |
| `bun run check:discovery`                           | Passed.                                                                                                                                      |
| `bun run build`                                     | Production client/server build, client configuration canary and MCP-absence checks passed.                                                   |
| `bun run check:generated`, `check:cloudflare-types` | Passed; no manually edited generated output or binding drift.                                                                                |
| `bun run audit`                                     | **Failed, exit 1:** 36 findings: 14 high, 16 moderate, 6 low.                                                                                |
| `bun run audit:prod`                                | **Failed, exit 1:** 26 findings: 9 high, 11 moderate, 6 low.                                                                                 |
| Local database shutdown                             | `bun run db:stop` passed; local backup retained.                                                                                             |
| GitHub CI for this closeout                         | Owner commit/run pending; no remote result inferred from local checks. Audit gates currently prevent a clean full matrix.                    |

These are advisory finding counts, not independently deduplicated deployed vulnerabilities.
Bun's production-filtered graph also reports tooling/transitive paths; deployed Worker
reachability still requires investigation. No dependency or lockfile was changed in Task 9.10.

### Inherited, completed Task 9.9 hosted evidence

The [security annexure](../../02-implementation-plans/phase-02/annexures/sprint-09-9-security-hosted-proof.md)
is authoritative for hosted exercises, not a claim that this documentation task reran them:

- Five Sprint 09 migrations and approved migration-history alignment matched the committed
  files; hosted parity was 21 migrations. The rollback-only hosted packet passed 157 assertions.
- Seven anonymous HTTPS denial cases passed against the canonical origin.
- Actual invitation, sign-in and recovery codes reached the approved controlled mailbox.
  Six-digit codes/900-second validity were configured; generic delivery responses alone were
  not accepted as proof.
- Invitation verification returned 204 with secure encrypted preactivation proof; preparation
  returned exactly two synthetic documents, then atomic activation returned 204.
- Sign-in and renewal returned 204 with secure encrypted cookies and own-account projection
  returned 200. Wrong contact/replay returned 422; tamper/expired-cookie cases returned 401.
- Logout cleared the cookie and denied old access. Recovery invalidated previous access;
  fresh sign-in succeeded. Provider-only and application-only revocation independently denied
  the portal even when the other authority remained live.
- Approved isolated synthetic publications were explicitly nonbinding. Scoped transactional
  cleanup restored zero Auth users/sessions, subjects, profiles, publications, receipts,
  commands, rights and audit/chain-head evidence. One suspended pilot tenant and 12 provider
  gates remained; all seven named immutable/append-only triggers were enabled.
- Independent direct/private SQL checks supplemented the 39-table service baseline, including
  nine service-unreadable tables and anonymous denial. No real legal instrument or pilot flow
  was activated.

Positive hosted proof used APIs/provider and mailbox, not a live browser/assistive-technology
walkthrough. Cookie expiry used an authenticated synthetic past deadline; elapsed live OTP
expiry was not waited out. These evidence classes must remain distinct.

## Deviations and Scope Clarifications

- Final instrument publication and responsible-party approval were unavailable. Synthetic
  nonbinding versions proved exact receipt/activation mechanics without misrepresenting approval.
- Staff invitation logic was implemented, but staff AAL2/UI/queue integration remains Sprint 10.
- Rights request entry is implemented; operational processing, secure export delivery, retention
  decisions and contact-change step-up remain existing DR-014/TD-009/TD-016 release obligations.
  No automatic sensitive email export or clinical support workflow was added.
- Hosted provider/mailbox proof supplements controlled browser coverage; live released-flow
  keyboard and assistive-technology acceptance remains Sprint 12, not silently waived.
- Tracking concerns were resolved by the owner's scoped retention decision, rather than disabling
  all useful tracking. Credential protection was preserved.
- The final audit unexpectedly identified TD-057. Recording it is complete; remediation is a
  separate prerequisite, not an untested bulk dependency upgrade during closeout.

## Lessons Learned

- A generic accepted HTTP response is not evidence that a mailbox received a code or that a
  provider session exists; prove delivery, consumption and downstream authority separately.
- Replay, expiry, provider revocation and application revocation require distinct negative proofs.
- Atomic activation and immutable receipts prevent false-success UI and version drift.
- Keep synthetic seed-count integration tests isolated from hosted empty-baseline exercises;
  serialize database-backed suites and verify the database before diagnosing fixture failures.
- pgTAP must finish/raise on assertion failure; redacted summary output must not hide failures.
- Migration metadata corrections need explicit approval and exact file parity. Scoped evidence
  cleanup must restore append-only triggers and independently verify hidden/private tables.
- Functional passing tests do not establish a clean dependency security posture. Advisory feeds
  can change without a source commit; capture current evidence instead of copying old green results.

## Technical Debt and Activation Gates

The original 56-item cohort retains 49 Verified items and seven non-Verified obligations.
Task 9.10 adds **TD-057**: total **57**, **49 Verified**, **eight non-Verified**.
No new product-feature debt arose from the account implementation; the advisory set is newly
discovered security debt, not proof that Sprint 09 introduced each affected package.

| Debt   | What remains / acceptance owner                                                                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-006 | Approved substantiation and clinical review of public claims; no account test substitutes for claim approval.                                                                 |
| TD-007 | Product-specific authority, clinical/dispensing scope and protocol concentration/dosing reconciliation.                                                                       |
| TD-009 | Final parties, publications, partner/manual hand-off and operational rights responsibilities; staff bridge in Sprint 10, external approvals before activation.                |
| TD-010 | Approved commercial/merchant/delivery/tax terms and payment-ready offers; Sprint 11 and accountable business owners.                                                          |
| TD-037 | Live released-flow keyboard/focus/interaction review; Sprint 12 acceptance.                                                                                                   |
| TD-038 | Live assistive-technology and async/error/status review; Sprint 12 acceptance.                                                                                                |
| TD-043 | Operational clinical/support escalation acceptance; staff/rehearsal work and Sprint 12 release gate.                                                                          |
| TD-057 | New dependency advisories: owner @Muhns13G; dedicated reachability/remediation task before normal Sprint 10 feature work/activation, then passing audits and full regression. |

TD-013/TD-017 and TD-016 retain earlier Verified inactive-foundation evidence; this does not
grant final legal approval, operational rights fulfilment or real-client release permission.
See the [registry](../../04-technical-debt/technical-debt-registry-v1.md) for required outcomes.

## Exact Sprint File Inventory

Inventory reconciles `git diff --name-status ee2b29b..0511752` (Tasks 9.1–9.9) with
Task 9.10's documentation changes. Files modified several times appear once. Baseline files
belong in the modified table even if first touched by this closeout. No file was deleted.
Ignored credentials, generated build output, local database state and browser artifacts are
excluded. Counts: **50 modified; 83 newly created**.

### Existing Files Modified

| File                                                                              | Sprint change                                                                   |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `.env.example`                                                                    | Configuration, generated routing or delivery integration.                       |
| `.github/workflows/ci.yml`                                                        | Configuration, generated routing or delivery integration.                       |
| `AGENTS.md`                                                                       | Configuration, generated routing or delivery integration.                       |
| `config/environment-catalogue.ts`                                                 | Configuration, generated routing or delivery integration.                       |
| `docs/00-blueprints/master-blueprint-v1.md`                                       | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/README.md`                                 | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/sprint-09-identity-profile-consent.md`     | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/sprint-10-staff-queue-protocol-handoff.md` | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/04-technical-debt/technical-debt-registry-v1.md`                            | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/05-future-considerations/postgres-auth-email-vendor-strategy.md`            | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/06-operations/environment-secrets-runbook.md`                               | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/06-operations/http-security-cache-policy.md`                                | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/RAG/01-project-context.md`                                                  | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/RAG/02-current-state.md`                                                    | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/RAG/03-platform-evolution.md`                                               | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/RAG/04-domain-glossary.md`                                                  | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/RAG/05-decision-register.md`                                                | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/RAG/06-known-limitations.md`                                                | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/RAG/07-index.json`                                                          | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `e2e/discovery.spec.ts`                                                           | Synthetic regression, browser or security evidence.                             |
| `package.json`                                                                    | Configuration, generated routing or delivery integration.                       |
| `public/robots.txt`                                                               | Configuration, generated routing or delivery integration.                       |
| `scripts/test-supabase-auth-integration.ts`                                       | Guarded synthetic verification tooling.                                         |
| `src/adapters/identity/supabase/supabase-identity-governance-repository.test.ts`  | Synthetic regression, browser or security evidence.                             |
| `src/adapters/identity/supabase/supabase-identity-governance-repository.ts`       | Supabase identity or persistence adapter.                                       |
| `src/adapters/identity/supabase/supabase-identity-session-repository.ts`          | Supabase identity or persistence adapter.                                       |
| `src/adapters/identity/supabase/supabase-managed-identity-provider.test.ts`       | Synthetic regression, browser or security evidence.                             |
| `src/adapters/identity/supabase/supabase-managed-identity-provider.ts`            | Supabase identity or persistence adapter.                                       |
| `src/adapters/persistence/supabase/supabase-access-repository.test.ts`            | Synthetic regression, browser or security evidence.                             |
| `src/adapters/persistence/supabase/supabase-access-repository.ts`                 | Supabase identity or persistence adapter.                                       |
| `src/application/identity/identity-governance-repository.ts`                      | Framework-neutral identity application port/service.                            |
| `src/application/identity/identity-session-repository.ts`                         | Framework-neutral identity application port/service.                            |
| `src/application/identity/managed-identity-governance-service.test.ts`            | Synthetic regression, browser or security evidence.                             |
| `src/application/identity/managed-identity-governance-service.ts`                 | Framework-neutral identity application port/service.                            |
| `src/application/identity/managed-identity-provider.ts`                           | Framework-neutral identity application port/service.                            |
| `src/application/persistence/access-repository.ts`                                | Framework-neutral identity application port/service.                            |
| `src/components/Footer.tsx`                                                       | Account/portal UI and controlled navigation.                                    |
| `src/components/Nav.tsx`                                                          | Account/portal UI and controlled navigation.                                    |
| `src/config/environment.test.ts`                                                  | Synthetic regression, browser or security evidence.                             |
| `src/lib/public-route-policy.test.ts`                                             | Synthetic regression, browser or security evidence.                             |
| `src/lib/public-route-policy.ts`                                                  | Configuration, generated routing or delivery integration.                       |
| `src/routeTree.gen.ts`                                                            | Configuration, generated routing or delivery integration.                       |
| `src/server.ts`                                                                   | Configuration, generated routing or delivery integration.                       |
| `src/server/security/request-security.test.ts`                                    | Synthetic regression, browser or security evidence.                             |
| `src/server/security/request-security.ts`                                         | Server identity boundary, secure cookies or request/response controls.          |
| `src/server/security/response-policy.test.ts`                                     | Synthetic regression, browser or security evidence.                             |
| `src/server/security/response-policy.ts`                                          | Server identity boundary, secure cookies or request/response controls.          |
| `supabase/config.toml`                                                            | Configuration, generated routing or delivery integration.                       |
| `supabase/tests/database/identity_governance.test.sql`                            | Synthetic regression, browser or security evidence.                             |
| `vitest.config.ts`                                                                | Configuration, generated routing or delivery integration.                       |

### Newly Created Files

| File                                                                                               | Sprint change                                                                   |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `docs/02-implementation-plans/phase-02/annexures/sprint-09-1-identity-profile-consent-contract.md` | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/annexures/sprint-09-2-profile-instrument-persistence.md`    | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/annexures/sprint-09-3-governed-patient-invitations.md`      | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/annexures/sprint-09-4-first-party-invitation-otp.md`        | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/annexures/sprint-09-5-patient-session-lifecycle.md`         | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/annexures/sprint-09-6-atomic-profile-acknowledgement.md`    | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/annexures/sprint-09-7-authenticated-client-portal.md`       | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/annexures/sprint-09-8-profile-correction-rights-entry.md`   | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/02-implementation-plans/phase-02/annexures/sprint-09-9-security-hosted-proof.md`             | Sprint contract/evidence, operational guidance or current-state reconciliation. |
| `docs/03-completion-reports/phase-02/sprint-09-identity-profile-consent.md`                        | Sprint completion, validation and exact change inventory.                       |
| `e2e/identity-activation.spec.ts`                                                                  | Synthetic regression, browser or security evidence.                             |
| `e2e/identity-invite.spec.ts`                                                                      | Synthetic regression, browser or security evidence.                             |
| `e2e/identity-session.spec.ts`                                                                     | Synthetic regression, browser or security evidence.                             |
| `e2e/patient-portal.spec.ts`                                                                       | Synthetic regression, browser or security evidence.                             |
| `e2e/patient-rights.spec.ts`                                                                       | Synthetic regression, browser or security evidence.                             |
| `scripts/lib/sprint09-hosted-http-proof.test.ts`                                                   | Synthetic regression, browser or security evidence.                             |
| `scripts/lib/sprint09-hosted-http-proof.ts`                                                        | Guarded synthetic verification tooling.                                         |
| `scripts/lib/sprint09-security-proof.test.ts`                                                      | Synthetic regression, browser or security evidence.                             |
| `scripts/lib/sprint09-security-proof.ts`                                                           | Guarded synthetic verification tooling.                                         |
| `scripts/test-sprint09-hosted-auth.ts`                                                             | Guarded synthetic verification tooling.                                         |
| `scripts/test-sprint09-hosted-http.ts`                                                             | Guarded synthetic verification tooling.                                         |
| `scripts/test-sprint09-security.ts`                                                                | Guarded synthetic verification tooling.                                         |
| `scripts/test-supabase-patient-session-email.ts`                                                   | Guarded synthetic verification tooling.                                         |
| `src/adapters/identity/supabase/supabase-patient-activation-repository.test.ts`                    | Synthetic regression, browser or security evidence.                             |
| `src/adapters/identity/supabase/supabase-patient-activation-repository.ts`                         | Supabase identity or persistence adapter.                                       |
| `src/adapters/identity/supabase/supabase-patient-portal-repository.test.ts`                        | Synthetic regression, browser or security evidence.                             |
| `src/adapters/identity/supabase/supabase-patient-portal-repository.ts`                             | Supabase identity or persistence adapter.                                       |
| `src/adapters/identity/supabase/supabase-patient-rights-repository.test.ts`                        | Synthetic regression, browser or security evidence.                             |
| `src/adapters/identity/supabase/supabase-patient-rights-repository.ts`                             | Supabase identity or persistence adapter.                                       |
| `src/application/identity/patient-activation-service.test.ts`                                      | Synthetic regression, browser or security evidence.                             |
| `src/application/identity/patient-activation-service.ts`                                           | Framework-neutral identity application port/service.                            |
| `src/application/identity/patient-invitation-verification-service.test.ts`                         | Synthetic regression, browser or security evidence.                             |
| `src/application/identity/patient-invitation-verification-service.ts`                              | Framework-neutral identity application port/service.                            |
| `src/application/identity/patient-portal-service.test.ts`                                          | Synthetic regression, browser or security evidence.                             |
| `src/application/identity/patient-portal-service.ts`                                               | Framework-neutral identity application port/service.                            |
| `src/application/identity/patient-rights-service.test.ts`                                          | Synthetic regression, browser or security evidence.                             |
| `src/application/identity/patient-rights-service.ts`                                               | Framework-neutral identity application port/service.                            |
| `src/application/identity/patient-session-service.test.ts`                                         | Synthetic regression, browser or security evidence.                             |
| `src/application/identity/patient-session-service.ts`                                              | Framework-neutral identity application port/service.                            |
| `src/application/identity/staff-patient-invitation-service.test.ts`                                | Synthetic regression, browser or security evidence.                             |
| `src/application/identity/staff-patient-invitation-service.ts`                                     | Framework-neutral identity application port/service.                            |
| `src/components/AccountCodePage.tsx`                                                               | Account/portal UI and controlled navigation.                                    |
| `src/components/PatientPortalPage.tsx`                                                             | Account/portal UI and controlled navigation.                                    |
| `src/components/PatientRightsPanel.tsx`                                                            | Account/portal UI and controlled navigation.                                    |
| `src/domain/identity/patient-portal.ts`                                                            | Validated activation, portal or rights model.                                   |
| `src/domain/identity/patient-rights.ts`                                                            | Validated activation, portal or rights model.                                   |
| `src/domain/identity/pilot-activation.ts`                                                          | Validated activation, portal or rights model.                                   |
| `src/routes/account/activate.tsx`                                                                  | First-party account or authenticated portal route.                              |
| `src/routes/account/recover.tsx`                                                                   | First-party account or authenticated portal route.                              |
| `src/routes/account/sign-in.tsx`                                                                   | First-party account or authenticated portal route.                              |
| `src/routes/account/sign-out.tsx`                                                                  | First-party account or authenticated portal route.                              |
| `src/routes/account/verify.tsx`                                                                    | First-party account or authenticated portal route.                              |
| `src/routes/portal.index.tsx`                                                                      | First-party account or authenticated portal route.                              |
| `src/routes/portal.profile.tsx`                                                                    | First-party account or authenticated portal route.                              |
| `src/routes/portal.rights.tsx`                                                                     | First-party account or authenticated portal route.                              |
| `src/server/identity/patient-activation-http.test.ts`                                              | Synthetic regression, browser or security evidence.                             |
| `src/server/identity/patient-activation-http.ts`                                                   | Server identity boundary, secure cookies or request/response controls.          |
| `src/server/identity/patient-portal-http.test.ts`                                                  | Synthetic regression, browser or security evidence.                             |
| `src/server/identity/patient-portal-http.ts`                                                       | Server identity boundary, secure cookies or request/response controls.          |
| `src/server/identity/patient-rights-http.test.ts`                                                  | Synthetic regression, browser or security evidence.                             |
| `src/server/identity/patient-rights-http.ts`                                                       | Server identity boundary, secure cookies or request/response controls.          |
| `src/server/identity/patient-session-cookie.test.ts`                                               | Synthetic regression, browser or security evidence.                             |
| `src/server/identity/patient-session-cookie.ts`                                                    | Server identity boundary, secure cookies or request/response controls.          |
| `src/server/identity/patient-session-http.test.ts`                                                 | Synthetic regression, browser or security evidence.                             |
| `src/server/identity/patient-session-http.ts`                                                      | Server identity boundary, secure cookies or request/response controls.          |
| `src/server/identity/patient-verification-http.test.ts`                                            | Synthetic regression, browser or security evidence.                             |
| `src/server/identity/patient-verification-http.ts`                                                 | Server identity boundary, secure cookies or request/response controls.          |
| `src/server/identity/preactivation-cookie.test.ts`                                                 | Synthetic regression, browser or security evidence.                             |
| `src/server/identity/preactivation-cookie.ts`                                                      | Server identity boundary, secure cookies or request/response controls.          |
| `src/test/patient-portal-fixture.ts`                                                               | Configuration, generated routing or delivery integration.                       |
| `supabase/migrations/20261002201514_pilot_client_profile_instruments.sql`                          | Portable governed database boundary, RLS and validated commands.                |
| `supabase/migrations/20261002205048_governed_patient_invitations.sql`                              | Portable governed database boundary, RLS and validated commands.                |
| `supabase/migrations/20261003000011_pilot_account_activation.sql`                                  | Portable governed database boundary, RLS and validated commands.                |
| `supabase/migrations/20261003103425_patient_portal_projection.sql`                                 | Portable governed database boundary, RLS and validated commands.                |
| `supabase/migrations/20261003111144_patient_account_rights.sql`                                    | Portable governed database boundary, RLS and validated commands.                |
| `supabase/templates/invite.html`                                                                   | Code-only provider email template.                                              |
| `supabase/templates/magic-link.html`                                                               | Code-only provider email template.                                              |
| `supabase/templates/recovery.html`                                                                 | Code-only provider email template.                                              |
| `supabase/tests/database/governed_patient_invitations.test.sql`                                    | Synthetic regression, browser or security evidence.                             |
| `supabase/tests/database/patient_account_rights.test.sql`                                          | Synthetic regression, browser or security evidence.                             |
| `supabase/tests/database/patient_portal_projection.test.sql`                                       | Synthetic regression, browser or security evidence.                             |
| `supabase/tests/database/pilot_account_activation.test.sql`                                        | Synthetic regression, browser or security evidence.                             |
| `supabase/tests/database/pilot_client_profile_instruments.test.sql`                                | Synthetic regression, browser or security evidence.                             |

## Handoff

This closeout is ready for owner review/commit, but its clean CI/security gate remains blocked
by TD-057. Stage and commit manually; resolve advisories with tested, bounded changes and verify
the resulting owner-run CI before treating the release as green. No branch, staging, commit,
push, deployment, hosted data or tracking-setting change was performed by Task 9.10.

After remediation, begin Sprint 10 at Task 10.1's staff contract. Do not infer authorization to
implement the queue, publish legal instruments, charge clients or activate real patient intake
from this report. The verification skill informed the separation of controlled UI, database and
actual provider/mailbox evidence.
