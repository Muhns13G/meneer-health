---
plan_id: phase-01-sprint-04
title: Repository and Delivery Health
status: in-progress
primary_debt: [TD-021, TD-022, TD-023, TD-024, TD-026, TD-028, TD-029, TD-030, TD-031]
depends_on: [phase-01-sprint-02, phase-01-sprint-03]
last_updated: 2026-08-08
owner: "@Muhns13G"
---

# Sprint 04 — Repository and Delivery Health

## Mission

Create a reproducible, enforceable engineering baseline after the platform migration. Reduce dependency exposure, restore lint quality, introduce an appropriate automated test pyramid and CI, remove unused generated surface, and make future changes traceable and operable by contributors other than the original Lovable workflow.

## Intended Outcome

A clean checkout installs deterministically with Bun and passes documented lint, typecheck, test, build, and dependency-policy gates. CI enforces those gates. The repository contains only intentional dependencies and UI primitives, has clear onboarding and operational documentation, and uses scoped change records rather than opaque `Changes` commits.

## Delivery Contract

Sprint 04 is repository-health work, not product-feature, backend, database, or public-content work.
Mechanical formatting must not alter established wording. Approved inactive prototypes remain
contained unless a separately evidenced retirement decision permits deletion. Every task is reviewed
and committed separately by the repository owner; the assistant does not push, deploy, promote, or
change repository-hosting settings.

## Reconciled Starting Point

The committed Sprint 03 boundary is `9ac2f18` on `itws-I`, with a clean working tree at planning
time. Sprint 03 approved the architecture Sprint 05 must implement; Sprint 04 must not imply that a
database, identity service, clinical workflow, or transactional backend now exists.

- TypeScript and the production build pass. Full lint currently fails with 21 Prettier errors and
  reports 7 Fast Refresh warnings, replacing the plan's older 62-error snapshot.
- On 8 August 2026, `bun audit` reports 33 findings (17 high, 12 moderate, 4 low), while
  `bun audit --prod` reports 26 (11 high, 11 moderate, 4 low). These are a dated starting snapshot,
  not a substitute for advisory-level reachability analysis.
- `packageManager: bun@1.3.14`, Bun/Node engine constraints, `.node-version`, `bun.lock`, and the
  `typecheck` script already exist. The package name remains generic, there is no non-writing format
  check, and CI does not yet enforce frozen installation.
- Forty-six `src/components/ui/` files exist with no imports from product source. Treat them as
  removal candidates only after generated, dynamic, style, and future-approved use checks.
- No automated test dependency, test script, test file, or CI workflow exists. `.github/` contains
  only `CODEOWNERS`.
- The decision index and Cloudflare environment/release/rollback runbook now exist. A root README,
  test strategy, vulnerability register, CI guide, and contribution/PR templates do not.
- Cloudflare is the v1 runtime. Vercel guidance belongs to the later Next.js decision. MCP was
  removed in Sprint 02; tests should assert its ordinary 404 boundary rather than retain it.

## Commit-Sized Task Plan

| Task | Commit-sized outcome                                                                                                                                  | Primary debt           | Status    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------- |
| 4.1  | Freeze the post-Sprint 03 baseline; create advisory, UI-reachability, command, generated-file, and documentation inventories.                         | TD-021, TD-026, TD-030 | Completed |
| 4.2  | Complete the Bun/package contract: rename the package, add a non-writing format check, and prove version-aligned frozen installation.                 | TD-028                 | Completed |
| 4.3  | Remove the verified-unused UI primitive surface and its now-unreachable direct dependencies in one bounded, reversible reduction.                     | TD-026                 | Planned   |
| 4.4  | Apply mechanical Prettier formatting to supported tracked source without changing public wording or behaviour.                                        | TD-022                 | Planned   |
| 4.5  | Resolve Fast Refresh findings, re-enable scoped unused-code rules, and remove only evidenced dead code while preserving approved gates/prototypes.    | TD-022, TD-029         | Planned   |
| 4.6  | Add Vitest, jsdom, React Testing Library, deterministic scripts, safe fixtures, and representative unit/component/integration tests.                  | TD-023                 | Planned   |
| 4.7  | Add Playwright plus axe browser/accessibility tests for active routes, redirects, 404s, gates, navigation, viewports, and error-free rendering.       | TD-023                 | Planned   |
| 4.8  | Remediate production-relevant advisories through bounded compatible updates with lockfile, test, build, and reachability evidence.                    | TD-021                 | Planned   |
| 4.9  | Remediate development/tooling advisories and record any unavoidable exception with owner, controls, expiry, and review trigger.                       | TD-021                 | Planned   |
| 4.10 | Add GitHub CI for frozen install, format, lint, typecheck, tests, build, Wrangler dry-run, audit policy, and generated-file consistency.              | TD-024                 | Planned   |
| 4.11 | Add the root contributor README, test/CI guidance, and contribution/PR templates linked to existing decisions and Cloudflare operations.              | TD-030, TD-031         | Planned   |
| 4.12 | Prove clean-checkout and controlled failing-CI enforcement, run final browser/regression checks, reconcile debt/RAG, and issue the completion report. | All Sprint 04 debt     | Planned   |

Tasks 4.8 and 4.9 may be split further only when the Task 4.1 reachability register identifies an
independent major-version or provider-tooling lane that cannot be reviewed safely in one commit.
No task may use `bun update`, `bun update --latest`, or an automated force-fix across the dependency
graph without an advisory-by-advisory plan and separate approval.

## Scope

Primary debt: TD-021–TD-024, TD-026, and TD-028–TD-031.

### Workstream 1 — Dependency and vulnerability programme

1. Re-run development and production dependency audits from the committed Sprint 03 boundary.
2. Map every advisory to its direct/transitive path, affected runtime, deployed reachability, exploit prerequisites, fix availability, and owner.
3. Apply bounded patch/minor upgrades first; isolate breaking upgrades behind separate tasks and regression evidence.
4. Remove unused packages and document time-bounded accepted exceptions with compensating controls and review dates.
5. Define the CI vulnerability policy for production and development dependencies.

### Workstream 2 — Formatting, lint, and TypeScript quality

1. Establish generated-file exclusions or generation-aware checks.
2. Apply Prettier to supported tracked files and resolve Fast Refresh warnings without weakening rules globally.
3. Re-enable appropriate unused-variable/import checks and remove dead code.
4. Preserve the existing explicit `typecheck` script and strict TypeScript configuration.
5. Make local commands and CI use identical configuration.

### Workstream 3 — Test foundation

1. Use Vitest through `bun run test`, jsdom, and React Testing Library for unit/component/integration
   tests; use Playwright and `@axe-core/playwright` for controlled browser/accessibility tests.
2. Add deterministic test scripts and configuration with non-production fixtures only.
3. Establish coverage for validation/content utilities, campaign redirects, active route rendering,
   critical navigation, non-transactional/no-false-success gates, errors, accessibility, and retired
   MCP 404s. Enabled server submission success/failure belongs with the Sprint 05 implementation.
4. Define coverage expectations by risk rather than relying only on a global percentage.
5. Prohibit real patient data and production credentials in fixtures, snapshots, recordings, and reports.
6. Run automated browser tests in a controlled, extension-free profile. Treat visible user-browser
   walkthroughs as supplementary evidence, and classify extension injection, client-side blocking,
   and other profile-specific effects separately from application failures.

### Workstream 4 — CI and release evidence

1. Add CI for frozen install, formatting/lint, typecheck, unit/integration/browser tests, production build, dependency policy, and generated-file consistency.
2. Make failures blocking for proposed changes once the baseline is green.
3. Retain useful logs and reports without secrets or health information.
4. Link the existing Cloudflare environment/release runbook and keep production promotion under
   repository-owner control. Do not add Vercel v1 deployment instructions.

### Workstream 5 — Repository reduction and contributor operations

1. Verify the 46 shadcn/Radix removal candidates and remove files/packages without an approved
   current use; do not retain components solely for hypothetical future work.
2. Rename the generic package, retain the existing Bun/Node pins, and make supported tool versions
   discoverable from the root README.
3. Add a root README and test/CI contributor guidance that link the existing decision index,
   `.env.example`, AGENTS guide, and Cloudflare environment/release runbook.
4. Add change/PR templates requiring outcome, plan/TD links, risks, migrations, screenshots, and validation.
5. Keep Git history intact while adopting concise imperative commit conventions for future work.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| TD-021 | Reachability register covers every current advisory; fixes/exceptions satisfy the approved CI policy.                 |
| TD-022 | `bun run lint` passes locally and in CI without blanket suppression.                                                  |
| TD-023 | Test framework and scripts cover representative unit, integration, browser, and accessibility risks.                  |
| TD-024 | CI runs all agreed gates and blocks a deliberately failing validation branch/change.                                  |
| TD-026 | Intentional UI inventory remains; unused primitives/packages are removed with build/browser evidence.                 |
| TD-028 | Package name is specific; existing version pins remain aligned; format-check and frozen-install enforcement pass.     |
| TD-029 | Appropriate unused-code rules are active and product dead code has been removed.                                      |
| TD-030 | A new contributor can install, validate, locate existing decisions/runbooks, and understand ownership from root docs. |
| TD-031 | Contribution templates and guidance require scoped, evidence-linked future changes.                                   |

## Validation

- Run `bun install --frozen-lockfile` in a clean environment.
- Run the new non-writing `bun run format:check` command.
- Run `bun run lint`, `bun run typecheck`, all test scripts, and `bun run build`.
- Run `bun audit` and `bun audit --prod`; compare results with the reachability register and policy.
- Run a clean CI workflow and a controlled failing change to demonstrate enforcement.
- Prove browser tests are reproducible in the controlled profile; document the browser/version and
  keep user-profile extension effects out of the acceptance baseline.
- Exercise critical routes after UI/dependency removal and compare bundle/dependency output.
- Follow the README from a clean checkout and record onboarding gaps.

## Test-Tooling Basis

- Vitest is Vite-native, supports TypeScript, and documents Bun package management with
  `bun run test`; the repository's Vite 7 and Node 22 baseline satisfies its published minimums.
- React Testing Library keeps component assertions oriented around rendered user behaviour.
- Playwright can own the local web-server lifecycle and controlled browser profile, while its
  documented axe integration provides automated accessibility checks. Automated accessibility
  results supplement rather than replace manual keyboard and assistive-technology review.

Authoritative references: [Vitest getting started](https://vitest.dev/guide/),
[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/),
[Playwright web server](https://playwright.dev/docs/test-webserver),
[Playwright CI](https://playwright.dev/docs/ci), and
[Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing).

## Non-Goals

- Bulk major upgrades without reachability analysis and regression coverage.
- Enforcing an arbitrary coverage percentage that ignores clinical or security risk.
- Rewriting Git history.
- Adding unused design-system components in anticipation of unspecified work.

## Risks and Rollback

Large formatting, dependency, and deletion changes can hide regressions. Separate mechanical formatting, package changes, and functional edits. Remove UI primitives in bounded batches and retain before/after builds. Each upgrade task must state rollback versions and lockfile effects. Never lower security or lint rules simply to make CI green without a recorded exception.

## Documentation and RAG Updates

- Add contributor README, Cloudflare environment/deployment routing, test strategy, vulnerability register, and CI documentation.
- Update AGENTS.md commands and current platform details.
- Update TD-021–TD-024, TD-026, and TD-028–TD-031 only after CI-backed verification.
- Refresh `docs/RAG/02-current-state.md`, `05-decision-register.md`, `06-known-limitations.md`, and `07-index.json`.
- Produce `docs/03-completion-reports/phase-01/sprint-04-repository-delivery-health.md`.
