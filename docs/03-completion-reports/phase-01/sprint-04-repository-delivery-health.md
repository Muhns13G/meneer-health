---
report_id: phase-01-sprint-04-completion
title: Sprint 04 Repository and Delivery Health
status: hosted-verification-pending
date: 2026-08-09
owner: "@Muhns13G"
---

# Sprint 04 Completion Report — Repository and Delivery Health

## Mission and Outcome

Sprint 04 converts the post-Lovable repository into a reproducible, testable, dependency-clean,
contributor-operable engineering baseline. Tasks 4.1–4.11 are complete. Task 4.12 has passed every
repository-controlled and clean-checkout check plus one hosted passing workflow, but Sprint 04
remains open until the owner completes the hosted failure, template, default-branch, and required-
check evidence.

## Work and Decisions

- Inventoried the dependency graph, tooling, commands, generated files, documentation, and 46
  unreferenced shadcn/Radix primitives before making removals.
- Established Bun 1.3.14, Node 22, frozen installation, package identity, non-writing formatting,
  strict TypeScript, generated-route consistency, and Cloudflare dry-run contracts.
- Removed the proven-unused UI surface and 38 direct packages; documented exact triggers for
  future reintroduction instead of retaining speculative scaffolding.
- Cleared the formatting baseline, Fast Refresh findings, and scoped unused-code findings while
  preserving two intentionally inactive workflow prototypes.
- Added 11 Vitest unit/component/integration checks and 48 Playwright/axe checks across desktop and
  mobile routes, redirects, 404s, navigation, gates, rendering, and accessibility.
- Cleared all production and development dependency audit findings through bounded, compatible
  package/lockfile changes; no broad update or force-fix was used.
- Added a read-only GitHub Actions workflow with local-command parity, pinned runtimes, frozen
  install, dual audits, tests, build, route generation, Cloudflare dry-run, and failure-only browser
  artifacts. It cannot deploy.
- Added repository orientation, contribution/security guidance, testing/CI operations, a PR
  template, and a structured no-PHI/no-secret bug form.
- Proved the full documented sequence from a clean clone and proved ESLint rejects a controlled
  synthetic violation.

## Deviations from the Plan

- Sprint 04 was delivered as twelve separately reviewable tasks rather than a single change.
- Task 4.3 removed all 46 candidate primitives after reachability proof; packages were not retained
  merely because Lovable had scaffolded them.
- Task 4.7 made four small accessibility presentation corrections required by axe findings without
  rewriting public messaging.
- Advisory remediation required exact transitive resolution work. A proposed global override was
  rejected because it crossed an older parent's declared major range.
- Task 4.12 found that the hosted `itws-I` branch remains seven commits behind local HEAD and that
  GitHub only activates issue/PR templates from the default branch. Because `main` remains default
  and stale, hosted template proof cannot follow from an `itws-I` push alone. The owner subsequently
  pushed through `b6331bd`, and the first hosted CI run passed.
- Task 4.12 necessarily uses an owner checkpoint commit/push followed by a final evidence commit:
  GitHub cannot execute or render files that have not yet reached the hosted repository.
- The completion report is therefore issued as `hosted-verification-pending`; it must not be treated
  as verified closure until the owner-controlled GitHub acceptance sequence is recorded.

## Lessons Learned

- Static reachability plus browser regression evidence supports safer repository reduction than
  either speculative retention or indiscriminate deletion.
- Development-only dependencies still belong in a production build environment when the host runs
  the build; dependency classification must follow runtime reachability, not installation location.
- Security overrides are acceptable only when every parent range remains compatible and the entire
  install/test/build/browser matrix passes.
- A locally valid workflow is not enforced CI until its hosted passing and failing paths are proven
  and the relevant branch requires the check.
- GitHub contributor templates are default-branch features. A permanent source branch that differs
  from the default branch creates an operational mismatch that documentation alone cannot solve.
- Clean-checkout validation catches hidden reliance on an existing working directory or chat
  context; sandbox failures must be separated from repository failures.

## Technical Debt and Residual Risk

No new technical-debt ID was introduced or discovered. TD-026 is Verified. TD-021–TD-024 and
TD-028–TD-031 remain In progress only for the owner-controlled hosted acceptance sequence recorded
in the Task 4.12 evidence. The local baseline, dependency policy, tests, CI declaration, onboarding,
and templates are implemented, and hosted CI passes; failure rejection, templates, and required
checks are not yet proven as enforced GitHub controls.

Sprint closure does not activate transactional, patient-data, clinical, pharmacy, payment, or
fulfilment capability and does not authorise pilot or public launch.

## Existing Files Modified

| File or group                                                         | Sprint change                                                                |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `.gitignore`, `AGENTS.md`                                             | Added test artifacts and current contributor/command guidance.               |
| `bun.lock`, `package.json`                                            | Normalised package identity/scripts and remediated dependencies.             |
| `eslint.config.js`, `tsconfig.json`                                   | Restored scoped lint quality and test/build typing boundaries.               |
| `docs/01-audits/project-codebase-audit-2026-08-05.md`                 | Reconciled repository-health evidence.                                       |
| `docs/02-implementation-plans/phase-01/sprint-04-*.md`                | Reconciled the twelve-task delivery and acceptance state.                    |
| `docs/04-technical-debt/technical-debt-registry-v1.md`                | Updated Sprint 04 debt evidence and remaining gates.                         |
| `docs/05-future-considerations/dependency-reintroduction-triggers.md` | Recorded removed-package reintroduction triggers.                            |
| `docs/RAG/02-current-state.md`, `05-decision-register.md`             | Reconciled implemented repository controls and decisions.                    |
| `docs/RAG/06-known-limitations.md`, `07-index.json`                   | Reconciled remaining hosted limitations and retrieval routes.                |
| `src/components/CtaSection.tsx`, `Discretion.tsx`, `Doctor.tsx`       | Mechanical formatting and bounded accessibility/lint corrections.            |
| `src/components/Footer.tsx`, `Hero.tsx`, `Nav.tsx`                    | Mechanical formatting plus navigation/accessibility/testability corrections. |
| `src/components/SafetyEntryGate.tsx`, `Treatments.tsx`                | Mechanical formatting and bounded accessibility/lint corrections.            |
| `src/lib/campaigns.ts`, `src/lib/compliance/pilot-profile.ts`         | Testable exports and scoped unused-code handling.                            |
| `src/router.tsx`                                                      | Extracted the reusable default error component.                              |
| `src/routes/contact.tsx`, `index.tsx`, `peptides.tsx`                 | Mechanical formatting and accessibility corrections; wording retained.       |
| `src/routes/privacy.tsx`, `start.tsx`, `terms.tsx`                    | Mechanical formatting and accessibility corrections; wording retained.       |
| `src/styles.css`                                                      | Removed unused UI animation surface and retained current product styles.     |

## Existing Files Deleted

| File or group              | Reason                                                                   |
| -------------------------- | ------------------------------------------------------------------------ |
| `components.json`          | Stale shadcn generator configuration with no retained primitive surface. |
| `src/components/ui/*.tsx`  | All 46 files were unreferenced after static/dynamic/generated checks.    |
| `src/hooks/use-mobile.tsx` | Support-only hook with no retained consumer.                             |
| `src/lib/utils.ts`         | Support-only helper with no retained consumer.                           |

## Files Created

| File or group                                                                 | Purpose                                                        |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `.github/workflows/ci.yml`                                                    | Read-only validation workflow.                                 |
| `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/bug-report.yml`   | Structured change and defect intake.                           |
| `README.md`, `CONTRIBUTING.md`, `SECURITY.md`                                 | Repository orientation, contribution, and private reporting.   |
| `docs/06-operations/testing-ci-guide.md`                                      | Local/hosted test and CI operating contract.                   |
| `docs/02-implementation-plans/phase-01/annexures/sprint-04-*-evidence.md`     | Task 4.1–4.12 evidence records.                                |
| `docs/03-completion-reports/phase-01/sprint-04-repository-delivery-health.md` | This sprint close-out record.                                  |
| `vitest.config.ts`, `src/test/*`                                              | Unit/component/integration configuration, setup, and fixtures. |
| `src/components/*.test.tsx`, `src/lib/*.test.ts`                              | Component and utility regression tests.                        |
| `src/routes/go/-campaign-redirects.test.ts`                                   | Campaign redirect integration tests.                           |
| `src/components/DefaultErrorComponent.tsx`                                    | Testable extracted application error boundary.                 |
| `playwright.config.ts`, `e2e/*.ts`                                            | Desktop/mobile route, boundary, navigation, and axe suite.     |

## Validation and Next Boundary

The isolated clean clone passes frozen install, format, lint, typecheck, 11 Vitest tests, both
zero-vulnerability audits, production build, generated-route consistency, Cloudflare dry-run, and
48 CI-mode Playwright/axe checks. A synthetic unused TypeScript variable is rejected with exit code
1, proving the configured lint gate fails closed. The post-validation clone remains clean. Hosted
GitHub run `31324807644` passes at commit `b6331bd` in 2m33s, including the complete 2m29s
`Repository validation` job.

The repository owner must now complete the hosted sequence in
[`sprint-04-12-closure-evidence.md`](../../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).
Only after those results are recorded may this report change to `verified-completion`, Sprint 04
close, and Sprint 05 begin under the approved architecture and repository controls.
