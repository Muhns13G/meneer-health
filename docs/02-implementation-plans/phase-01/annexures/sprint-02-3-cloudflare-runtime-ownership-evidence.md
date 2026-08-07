---
evidence_id: phase-01-sprint-02-task-03
title: Sprint 02 Task 2.3 Cloudflare Runtime Ownership Evidence
status: verified
date: 2026-08-07
source_commit: d6ab156adb9d9ffac75f19e3fd4bf940b10b32c9
owner: "@Muhns13G"
---

# Sprint 02 Task 2.3 — Cloudflare Runtime Ownership Evidence

## Purpose and Boundary

This task replaces the hidden Lovable Vite wrapper with explicit, repository-owned TanStack Start
and Cloudflare configuration. It preserves the established routes and messaging. MCP removal,
telemetry removal, broad dependency classification, metadata correction, and hosted release
operations remain assigned to Tasks 2.4–2.7.

No route, component, customer-facing copy, branch mapping, deployment, or production setting was
changed. The repository owner retains all commit, push, and deployment actions.

## Implemented Configuration

- Removed `@lovable.dev/vite-tanstack-config` from `package.json` and `bun.lock`.
- Added explicit Cloudflare, Tailwind, TypeScript-path, TanStack Start, React, alias,
  import-protection, dependency-deduplication, development-server, and file-watch configuration.
- Retained the Lovable MCP plugin temporarily because its removal is the isolated Task 2.4 boundary.
- Normalized `wrangler.jsonc` around the TanStack Worker entry, `nodejs_compat`, current
  compatibility date, and enabled observability.
- Added Wrangler as a direct development dependency and updated the Cloudflare Vite plugin and
  Wrangler to versions supporting the selected compatibility date.

The configuration follows Cloudflare's supported TanStack Start Vite integration and Workers
compatibility guidance:
[TanStack Start on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
and [compatibility dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/).

## Baseline Comparison

| Surface                | Task 2.2 baseline                                                    | Task 2.3 result                                                             |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Vite ownership         | Lovable wrapper injects build/runtime defaults                       | All required defaults are explicit in `vite.config.ts`                      |
| Cloudflare integration | Nitro Cloudflare-module output plus inactive Vite plugin             | Supported Cloudflare Vite plugin owns the Worker build                      |
| Build output           | `.output/server/index.mjs`                                           | `dist/client` and `dist/server/index.js`                                    |
| `bun run preview`      | Starts, but every route returns 500                                  | Serves the verified route matrix successfully                               |
| Build warnings         | Multiple TanStack, Rollup, directive, and Wrangler override warnings | Those warnings are absent; one upstream Node `punycode` deprecation remains |
| Lovable wrapper        | Present in config, package graph, and lockfile                       | Absent from active config, package graph, and lockfile                      |

## Validation Evidence

| Check                            | Result                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| `bun install --frozen-lockfile`  | Pass; 575 installs across 724 packages with no lockfile change         |
| `bunx tsc --noEmit`              | Pass                                                                   |
| `bun run build`                  | Pass; Cloudflare Worker and static assets generated under `dist/`      |
| `bun run preview`                | Pass on a non-default local port                                       |
| `bunx wrangler deploy --dry-run` | Pass; 17 modules and 28 static assets inspected without deployment     |
| `bun run lint`                   | Known baseline only: 30 Prettier errors and 7 Fast Refresh warnings    |
| Wrapper search                   | No Vite import, declared package, or lockfile package remains          |
| Working-tree scope               | Only package, lockfile, Vite, Wrangler, and task documentation changed |

Development and production-preview checks returned the expected result for `/`, `/peptides`,
`/start`, `/poster`, `/poster-thanks`, `/contact`, `/privacy`, `/terms`, both `/go/...` redirects,
the QR asset, MCP surfaces, OAuth metadata, and an unknown route. SSR content, exact campaign
attribution redirects, content types, and not-found behaviour match the recorded baseline.

## Warning Disposition and Forward Work

The earlier owned build warnings are resolved. Current Cloudflare tooling still emits Node's
`DEP0040` deprecation for its bundled `punycode` use. The warning persists with
`@cloudflare/vite-plugin` 1.51.1 and Wrangler 4.120.0, does not affect output or runtime checks, and
is accepted as a bounded upstream-tooling exception. TD-025 remains open until Task 2.5 and final
Sprint 02 verification confirm its durable disposition.

TD-051 is Verified: the wrapper, its import, its package, and its hidden runtime behaviour are no
longer active. TD-052 remains In progress until hosted behaviour, environment roles, logs,
promotion, and rollback are verified in Task 2.7. The obsolete wrapper name remains only in
`bunfig.toml`'s package-age exception; removing that inert package-management exception is already
the explicit Task 2.5 boundary.
