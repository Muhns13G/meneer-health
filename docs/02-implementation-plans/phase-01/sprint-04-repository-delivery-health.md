---
plan_id: phase-01-sprint-04
title: Repository and Delivery Health
status: planned
primary_debt: [TD-021, TD-022, TD-023, TD-024, TD-026, TD-028, TD-029, TD-030, TD-031]
depends_on: [phase-01-sprint-02]
last_updated: 2026-08-06
owner: unassigned
---

# Sprint 04 — Repository and Delivery Health

## Mission

Create a reproducible, enforceable engineering baseline after the platform migration. Reduce dependency exposure, restore lint quality, introduce an appropriate automated test pyramid and CI, remove unused generated surface, and make future changes traceable and operable by contributors other than the original Lovable workflow.

## Intended Outcome

A clean checkout installs deterministically with Bun and passes documented lint, typecheck, test, build, and dependency-policy gates. CI enforces those gates. The repository contains only intentional dependencies and UI primitives, has clear onboarding and operational documentation, and uses scoped change records rather than opaque `Changes` commits.

## Scope

Primary debt: TD-021–TD-024, TD-026, and TD-028–TD-031.

### Workstream 1 — Dependency and vulnerability programme

1. Re-run development and production dependency audits after Sprint 02 removes platform packages.
2. Map every advisory to its direct/transitive path, affected runtime, deployed reachability, exploit prerequisites, fix availability, and owner.
3. Apply bounded patch/minor upgrades first; isolate breaking upgrades behind separate tasks and regression evidence.
4. Remove unused packages and document time-bounded accepted exceptions with compensating controls and review dates.
5. Define the CI vulnerability policy for production and development dependencies.

### Workstream 2 — Formatting, lint, and TypeScript quality

1. Establish generated-file exclusions or generation-aware checks.
2. Apply Prettier to supported tracked files and resolve Fast Refresh warnings without weakening rules globally.
3. Re-enable appropriate unused-variable/import checks and remove dead code.
4. Add an explicit `typecheck` script and keep strict TypeScript enabled.
5. Make local commands and CI use identical configuration.

### Workstream 3 — Test foundation

1. Select Bun-compatible unit/component, integration, and browser test tools.
2. Add deterministic test scripts and configuration with non-production fixtures only.
3. Establish coverage for validation/content utilities, routes/server boundaries, critical navigation, submission failure/success, accessibility, and any retained MCP endpoints.
4. Define coverage expectations by risk rather than relying only on a global percentage.
5. Prohibit real patient data and production credentials in fixtures, snapshots, recordings, and reports.

### Workstream 4 — CI and release evidence

1. Add CI for frozen install, formatting/lint, typecheck, unit/integration/browser tests, production build, dependency policy, and generated-file consistency.
2. Make failures blocking for proposed changes once the baseline is green.
3. Retain useful logs and reports without secrets or health information.
4. Document preview deployment responsibility and keep production promotion under repository-owner control.

### Workstream 5 — Repository reduction and contributor operations

1. Inventory the 46 shadcn/Radix primitives and remove files/packages without an approved near-term use.
2. Rename the generic package, pin the supported Bun version through `packageManager`, and document tool versions.
3. Add README, architecture/decision index, environment guide, Vercel deployment guide, and operational/runbook structure.
4. Add change/PR templates requiring outcome, plan/TD links, risks, migrations, screenshots, and validation.
5. Keep Git history intact while adopting concise imperative commit conventions for future work.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| TD-021 | Reachability register covers every current advisory; fixes/exceptions satisfy the approved CI policy.                |
| TD-022 | `bun run lint` passes locally and in CI without blanket suppression.                                                 |
| TD-023 | Test framework and scripts cover representative unit, integration, browser, and accessibility risks.                 |
| TD-024 | CI runs all agreed gates and blocks a deliberately failing validation branch/change.                                 |
| TD-026 | Intentional UI inventory remains; unused primitives/packages are removed with build/browser evidence.                |
| TD-028 | Package name, `packageManager`, supported Bun version, and frozen-install enforcement are present.                   |
| TD-029 | Appropriate unused-code rules are active and product dead code has been removed.                                     |
| TD-030 | A new contributor can install, validate, locate decisions, and understand deployment/ownership from repository docs. |
| TD-031 | Contribution templates and guidance require scoped, evidence-linked future changes.                                  |

## Validation

- Run `bun install --frozen-lockfile` in a clean environment.
- Run `bun run format --check` or add an equivalent non-writing format check.
- Run `bun run lint`, `bun run typecheck`, all test scripts, and `bun run build`.
- Run `bun audit` and `bun audit --prod`; compare results with the reachability register and policy.
- Run a clean CI workflow and a controlled failing change to demonstrate enforcement.
- Exercise critical routes after UI/dependency removal and compare bundle/dependency output.
- Follow the README from a clean checkout and record onboarding gaps.

## Non-Goals

- Bulk major upgrades without reachability analysis and regression coverage.
- Enforcing an arbitrary coverage percentage that ignores clinical or security risk.
- Rewriting Git history.
- Adding unused design-system components in anticipation of unspecified work.

## Risks and Rollback

Large formatting, dependency, and deletion changes can hide regressions. Separate mechanical formatting, package changes, and functional edits. Remove UI primitives in bounded batches and retain before/after builds. Each upgrade task must state rollback versions and lockfile effects. Never lower security or lint rules simply to make CI green without a recorded exception.

## Documentation and RAG Updates

- Add contributor README, environment/deployment guidance, test strategy, vulnerability register, and CI documentation.
- Update AGENTS.md commands and current platform details.
- Update TD-021–TD-024, TD-026, and TD-028–TD-031 only after CI-backed verification.
- Refresh `docs/RAG/02-current-state.md`, `05-decision-register.md`, `06-known-limitations.md`, and `07-index.json`.
- Produce `docs/03-completion-reports/phase-01/sprint-04-repository-delivery-health.md`.
