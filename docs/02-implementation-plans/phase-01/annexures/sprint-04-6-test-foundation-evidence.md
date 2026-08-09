---
evidence_id: phase-01-sprint-04-task-06
title: Sprint 04.6 Test Foundation Evidence
status: verified-task-evidence
date: 2026-08-09
source_baseline: 68606a5
owner: "@Muhns13G"
related_debt: [TD-021, TD-023]
---

# Sprint 04.6 — Test Foundation Evidence

## Purpose and Boundary

Task 4.6 adds deterministic unit, component, and route-integration testing without changing product
source or public wording. Playwright, axe, full route/viewport coverage, and automated 404 checks
remain Task 4.7. Enabled server submission success/failure remains coupled to Sprint 05's real
server boundary.

## Tooling Contract

| Tool                  | Version | Role                                                                         |
| --------------------- | ------: | ---------------------------------------------------------------------------- |
| Vitest                |  4.1.10 | Deterministic runner through `bun run test`; watch mode is separately named. |
| jsdom                 |  30.0.1 | Browser-like DOM for component tests at a reserved `.invalid` origin.        |
| React Testing Library |  16.3.2 | User-facing component queries and lifecycle cleanup.                         |
| user-event            |  14.6.3 | Realistic menu and retry interactions.                                       |
| jest-dom              |   7.0.0 | Accessible DOM assertions through the Vitest integration.                    |
| V8 coverage           |  4.1.10 | Diagnostic text/JSON/HTML reporting through `test:coverage`.                 |

`vitest.config.ts` intentionally loads only React and TypeScript-path plugins, not the Cloudflare
Worker plugin. Tests run serially by file, restore mocks, clean the DOM after each test, fail when no
tests are found, and suppress only jsdom's unimplemented `scrollTo` API. `coverage/` is ignored.

## Safe Fixtures

`src/test/fixtures/non-production.ts` contains only synthetic campaign expectations, inactive gate
copy, and an artificial error. It contains no patient identity, health submission, production
credential, live vendor payload, or valid test email/domain. Future fixtures, snapshots, recordings,
and reports inherit this prohibition.

## Test Inventory

| Area                       | Files / tests | Evidence                                                                          |
| -------------------------- | ------------: | --------------------------------------------------------------------------------- |
| Campaign utilities         |         1 / 3 | Approved destinations and canonical public URLs.                                  |
| Compliance blockers        |         1 / 2 | All three accountable-party blocks remain and fixture identities are not exposed. |
| Campaign route integration |         1 / 2 | Both actual `beforeLoad` handlers throw 307 responses with approved attribution.  |
| Journey gates              |         1 / 2 | Safety/emergency copy renders; no form, textbox, or false-success control exists. |
| Navigation                 |         1 / 1 | Mobile menu opens/closes while approved targets remain present.                   |
| Error recovery             |         1 / 1 | Retry invalidates and resets; the safe home action remains `/`.                   |

All 11 tests pass across six files. The route integration filename uses TanStack's `-` prefix so it
remains colocated without entering the generated route tree.

## Risk-Based Coverage Expectations

| Risk boundary                                           | Required test posture                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Safety, activation, consent, clinical or regulated copy | Assert the fail-closed state and every material branch before change approval.                                            |
| Redirects and attribution                               | Assert status and exact destination for each campaign.                                                                    |
| Interactive components                                  | Assert accessible user actions and resulting visible state.                                                               |
| Future server mutations                                 | Cover authentication, validation, authorization, idempotency, rejection, success, audit and safe errors when implemented. |
| Routes, viewports and accessibility                     | Controlled Playwright plus axe in Task 4.7; manual assistive-technology review remains complementary.                     |
| Presentational marketing sections                       | Add focused regression coverage when logic or a previously observed defect justifies it.                                  |

`test:coverage` currently reports 14.37% statements and 15.27% lines across all product source. This
is a diagnostic starting point, not a pass/fail target: inactive prototypes and presentational
sections dominate the denominator, while the first suite intentionally targets higher-risk active
boundaries. No arbitrary global percentage can substitute for the matrix above.

## Dependency and Advisory Delta

Seven test-only direct development dependencies add 99 frozen installs and 96 package records,
moving the graph from 319/442 to 418/538. Bun also deduplicates compatible shared transitive
records. Runtime dependency declarations and production bundle topology remain unchanged.

The full audit remains 33 findings (17 high, 12 moderate, 4 low); the production-filtered audit
remains 26 (11 high, 11 moderate, 4 low). Vitest and jsdom add test-only paths to existing Vite and
Undici families. These paths are explicitly retained for Tasks 4.8–4.9 rather than force-updated in
this task.

## Validation

| Check                                                       | Result                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `bun install --frozen-lockfile`                             | Pass; 418 installs across 538 packages with no changes.   |
| `bun run test`                                              | Pass; 6 files and 11 tests, with no warning/error output. |
| `bun run test:coverage`                                     | Pass; ignored text/JSON/HTML reports generated.           |
| `bun run format:check`, `bun run lint`, `bun run typecheck` | Pass.                                                     |
| `bun run build` and `bun run deploy:dry-run`                | Pass without route-test warnings or deployment.           |
| Generated route tree                                        | No diff.                                                  |
| `bun audit` / `bun audit --prod`                            | Expected red at unchanged 33 / 26 findings.               |
| `git diff --check`                                          | Pass.                                                     |

The known upstream `punycode` warning and sandbox-only Wrangler log-write messages remain unchanged
and non-fatal.

## Debt Disposition

Task 4.6 is **Completed**. TD-023 is **In progress** until Task 4.7 adds controlled browser and
accessibility coverage and Task 4.10 enforces both suites in CI. TD-021 remains **In progress** for
the bounded advisory work in Tasks 4.8–4.9.
