---
evidence_id: phase-01-sprint-04-task-05
title: Sprint 04.5 Lint and Unused-Code Evidence
status: verified-task-evidence
date: 2026-08-09
source_baseline: b76750f
owner: "@Muhns13G"
related_debt: [TD-022, TD-029]
---

# Sprint 04.5 — Lint and Unused-Code Evidence

## Purpose and Boundary

Task 4.5 restores a zero-finding local lint baseline and enforceable unused-code checks without
changing public wording, active route behaviour, or approved containment. It retains both inactive
route prototypes and removes only code proven to have no source or generated consumer.

## Configuration Outcome

- ESLint now treats `@typescript-eslint/no-unused-vars` as an error. Intentionally ignored argument,
  caught-error, or variable names must begin with `_`, and `reportUsedIgnorePattern` prevents using
  that convention to hide live values.
- TypeScript now enables `noUnusedLocals` and `noUnusedParameters` under the existing strict check.
- `src/routeTree.gen.ts` is excluded from ESLint as generated output; its generator remains the
  authority.
- No blanket file, source-directory, Fast Refresh, or unused-code suppression was added.

## Fast Refresh Resolution

`DefaultErrorComponent` moves unchanged from `src/router.tsx` to
`src/components/DefaultErrorComponent.tsx`. The router remains the TanStack factory and imports the
component as its `defaultErrorComponent`. This makes the component module component-only and clears
the final `react-refresh/only-export-components` warning without altering the error UI or actions.

## Reachability Disposition

| Item                      | Evidence                                                            | Disposition                                       |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| `StartFlow`               | Intentionally not rendered while `/start` uses `SafetyEntryGate`.   | Retained with exact TS6133 and ESLint exceptions. |
| `PeptidesPage`            | Intentionally not rendered while `/peptides` remains gated.         | Retained with exact TS6133 and ESLint exceptions. |
| `isPilotActivationReady`  | No source, route, generated, or configuration consumer.             | Removed as dead derived code.                     |
| `pilotComplianceProfile`  | Used only to derive exported activation blockers in its own module. | Retained as a private module constant.            |
| `CANONICAL_PUBLIC_ORIGIN` | Used only by `getCanonicalCampaignUrl` in its own module.           | Retained as a private module constant.            |

The two prototype exceptions are deliberately self-invalidating: if the functions become reachable,
TypeScript reports the now-unnecessary `@ts-expect-error`, requiring an explicit activation review.

## Validation

| Check                                        | Result                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `bun install --frozen-lockfile`              | Pass; 319 installs across 442 packages with no changes.                              |
| `bun run format:check`                       | Pass.                                                                                |
| `bun run lint`                               | Pass with zero errors and zero warnings.                                             |
| `bun run typecheck`                          | Pass with unused locals and parameters enabled.                                      |
| `bun run build` and `bun run deploy:dry-run` | Pass; no deployment or binding mutation.                                             |
| Local route matrix                           | Eight active routes return 200; retired MCP/OAuth and unknown paths return 404.      |
| Campaign redirects                           | Both routes retain 307 redirects and approved attribution.                           |
| Prototype boundary                           | Active route components remain the gates; both prototype functions remain in source. |
| `git diff --check`                           | Pass.                                                                                |

The known upstream `punycode` warning and sandbox-only Wrangler log-write messages remain unchanged
and non-fatal.

## Debt Disposition

Task 4.5 is **Completed**. TD-022 and TD-029 are **In progress** until Task 4.10 proves that the
format, lint, and typecheck gates are enforced in CI.
