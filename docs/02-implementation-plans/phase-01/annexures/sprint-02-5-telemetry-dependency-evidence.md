---
evidence_id: phase-01-sprint-02-task-05
title: Sprint 02 Task 2.5 Telemetry and Dependency Evidence
status: verified-local
date: 2026-08-07
source_commit: ab47279
owner: "@Muhns13G"
---

# Sprint 02 Task 2.5 — Telemetry and Dependency Evidence

## Purpose and Boundary

This task removes the remaining Lovable package-install behaviour, proves that the removed Lovable
telemetry path is absent locally, and normalizes direct package ownership without broad upgrades.
It does not change application routes, public messaging, metadata, Cloudflare environments, branch
mapping, or deployments. The repository owner retains commit, push, and deployment actions.

## Lovable Environment and Telemetry Proof

- Removed both obsolete `minimumReleaseAgeExcludes` entries from `bunfig.toml`.
- `LOVABLE_API_KEY` is absent from `.env.example` and was unset in the verification process.
- Static searches found no `LOVABLE_`, `@lovable.dev`, `api.lovable.dev`, or `__l5e` reference in
  application source, active configuration, declared packages, `bun.lock`, or current `dist/` output.
- The stale ignored 2.8 MB `.output/` directory created by the retired Nitro/Lovable build was moved
  to `/tmp/meneer-stale-output-task-2-5`; it is recoverable and is not part of the working tree.
- Wrangler's CLI reports its own Cloudflare telemetry notice during dry runs. That development-tool
  telemetry is distinct from the removed Lovable application telemetry and is not deployed in the
  application Worker.

The current source and build therefore contain no executable Lovable request path. Hosted network
confirmation remains Task 2.7 after the repository owner commits and deploys this boundary.

## Dependency Classification

| Classification                     | Packages and disposition                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployed application/runtime       | React, React DOM, TanStack Start/Router, Lucide, and dependencies imported by retained routes and components remain under `dependencies`.                                                                                                               |
| Source-only UI inventory           | Radix primitives, form/UI packages, charts, carousel, calendar, panels, and utility packages remain runtime dependencies because tracked components import and typecheck against them, even though current public-route chunks tree-shake most of them. |
| Build/development only             | `@cloudflare/vite-plugin`, `@tailwindcss/vite`, `tailwindcss`, `tw-animate-css`, and `vite-tsconfig-paths` moved to `devDependencies`; Vite, React plugin, Wrangler, TypeScript, ESLint, and Prettier remain there.                                     |
| Removed unused direct declarations | `@hookform/resolvers`, `@tanstack/react-query`, `@tanstack/router-plugin`, `date-fns`, `nitro`, and Zod had no remaining direct import. Required transitive copies remain owned by TanStack or `react-day-picker` where applicable.                     |

The obsolete TanStack Query deduplication entries were also removed from `vite.config.ts` after the
package left the resolved graph.

## Lockfile and Runtime Validation

| Check                           | Result                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Bounded `bun install`           | Pass; `bun.lock` regenerated without a broad update                              |
| `bun install --frozen-lockfile` | Pass; 456 installs across 566 packages with no change                            |
| `bunx tsc --noEmit`             | Pass                                                                             |
| `bun run build`                 | Pass; output remains equivalent to Task 2.4                                      |
| Production-preview route matrix | Pass; retained pages, redirects, assets, and removed endpoint 404s are unchanged |
| Static Lovable search           | Pass across source, config, package, lockfile, and current build output          |
| Wrangler deployment dry-run     | Pass without deployment                                                          |

The resolved graph reduced from Task 2.4's 490 installs across 643 packages to 456 installs across
566 packages. This is a declaration and reachability cleanup, not a general version upgrade.

## Audit Results

| Audit              |               Task 2.2 baseline |                 Task 2.5 result |
| ------------------ | ------------------------------: | ------------------------------: |
| `bun audit`        | 41: 20 high, 17 moderate, 4 low | 31: 15 high, 12 moderate, 4 low |
| `bun audit --prod` |        Not recorded in Task 2.2 |  24: 9 high, 11 moderate, 4 low |

Remaining findings are owned by Vite/PostCSS, TanStack Start server/build internals, Cloudflare
Miniflare/Wrangler, Babel, esbuild, YAML parsing, and lint tooling. Bun's production traversal still
reaches some build packages through TanStack Start's direct runtime package graph; the count must not
be interpreted as 24 vulnerabilities proven reachable in the deployed Worker.

No `bun update`, `bun audit fix`, forced downgrade, override, or major-version upgrade was applied.
Coordinated remediation and regression testing remain assigned to Sprint 04 rather than being mixed
into this de-platforming task.

## Debt Disposition

- **TD-025 — Verified:** all owned adapter warnings are removed; the sole remaining Node `punycode`
  warning is traced to current Cloudflare tooling, bounded to build/development commands, and covered
  by passing build, preview, and dry-run evidence.
- **TD-027 — Verified:** direct dependencies are classified by reachability, build-only tools are
  scoped as development dependencies, unused direct declarations are removed, and both audits are
  recorded.
- **TD-049 — In progress:** the Lovable telemetry implementation and environment references are
  absent locally. Final hosted network/log verification remains Task 2.7.
