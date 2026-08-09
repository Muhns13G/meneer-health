---
evidence_id: phase-01-sprint-02-task-02
title: Sprint 02 Task 2.2 Pre-Exit Baseline Evidence
status: verified
date: 2026-08-07
source_commit: f1fcff63c1196e71083f2d61a29c1997ff962a90
owner: "@Muhns13G"
---

# Sprint 02 Task 2.2 — Pre-Exit Baseline Evidence

## Purpose and Boundary

This annexure records the last verified Lovable-coupled baseline before Tasks 2.3–2.6 change
configuration, routes, packages, telemetry, and metadata. Evidence was collected from an isolated
archive of commit `f1fcff63c1196e71083f2d61a29c1997ff962a90`; no application source, dependency,
lockfile, branch mapping, or deployment was changed.

The reversible source boundary is the Task 2.1 commit above. Later task commits must be independently
revertible and compared with this document.

## Toolchain and Dependency Graph

- Bun `1.3.14`, Node.js `22.22.2`, Vite `7.3.2`, Wrangler `4.82.2`, and Nitro
  `3.0.260603-beta` were resolved from the committed lockfile.
- `package.json` declares 55 runtime and 16 development dependencies. The installed graph produced
  741 `bun pm ls --all` entries, 776 package manifests, and a 546 MB `node_modules` directory.
- An isolated `bun install --frozen-lockfile` passed without changing `bun.lock`.

| Reachability              | Direct packages and evidence                                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build/configuration       | `@lovable.dev/vite-tanstack-config` actively composes Tailwind, TypeScript paths, TanStack Start, Nitro, React, alias, import-protection, error-logging, HMR, and asset-proxy behaviour. `nitro`, `@tailwindcss/vite`, `@vitejs/plugin-react`, and `vite-tsconfig-paths` are reached through it. |
| Cloudflare tooling        | `@cloudflare/vite-plugin` is installed but is not imported by repository configuration or the Lovable wrapper. The active production target is instead the wrapper's Nitro `cloudflare-module` preset plus `wrangler.jsonc`.                                                                     |
| Server runtime            | `@lovable.dev/mcp-js` is imported by eight MCP definition/route files. Its server bundle retains `@modelcontextprotocol/sdk`, Zod, AJV, JOSE, and related libraries. TanStack Start, Router, React, and Nitro provide SSR and request handling.                                                  |
| Client/runtime routes     | The reachable direct application imports are React, `@tanstack/react-router`, `lucide-react`, and CSS compiled from Tailwind plus `tw-animate-css`. React DOM and TanStack internals are framework-reached.                                                                                      |
| Source-only UI inventory  | Radix packages, form libraries, charts, carousel, command palette, date picker, panels, Sonner, Vaul, CVA, `clsx`, and `tailwind-merge` are referenced by unused `src/components/ui/` inventory but are absent from the observed public-route chunks.                                            |
| No observed source import | `@hookform/resolvers`, `@tanstack/react-query`, `@tanstack/router-plugin`, `date-fns`, and some supporting direct packages have no application import. Task 2.5 must confirm disposition rather than deleting them as part of this baseline.                                                     |

The lockfile also resolves numerous packages through Lovable's Google Artifact Registry cache. Task
2.5 must regenerate and inspect it after the Lovable packages are removed.

## Validation Baseline

| Check                    | Result             | Evidence                                                                                                                                                                                                                                       |
| ------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean frozen install     | Pass               | Isolated archive installed with `bun install --frozen-lockfile`.                                                                                                                                                                               |
| TypeScript               | Pass               | `bunx tsc --noEmit` exited 0.                                                                                                                                                                                                                  |
| Lint                     | Fail, pre-existing | 30 Prettier errors and 7 Fast Refresh warnings. No formatter was run.                                                                                                                                                                          |
| Production build         | Pass with warnings | Client, SSR, and Nitro Cloudflare-module builds completed. Warnings cover unused TanStack imports, unknown Rollup `platform`, ignored dependency `"use client"` directives, and root Wrangler `main` being overridden.                         |
| Generic preview          | Fail               | `bun run preview` starts Vite but every request returns 500 because it looks for `dist/server/server.js`; the build emits `.output/server/index.mjs`.                                                                                          |
| Generated Worker preview | Pass               | Running Wrangler from `.output/` used the redirected generated configuration and served the full route matrix.                                                                                                                                 |
| Dependency audit         | Fail, pre-existing | `bun audit` reported 41 findings: 20 high, 17 moderate, and 4 low. Affected paths include Vite, TanStack server core, the MCP graph, Cloudflare/Miniflare tooling, and lint/build dependencies. Remediation belongs to Task 2.5 and Sprint 04. |

## Build Output

- Total output: 2.8 MB; public output: 740 KB across 21 files; server output: 2.1 MB
  across 53 files.
- Largest client JavaScript: 330.52 KB (104.99 KB gzip); stylesheet: 87.77 KB (14.93 KB
  gzip).
- Local image assets: 107.45 KB logo and 115.22 KB hero image.
- Wrangler reported 51 Worker modules totalling 1,961.20 KiB.
- The server output includes `lovable.dev__mcp-js` (48.35 KB),
  `modelcontextprotocol__sdk` (175.75 KB), Zod (261.34 KB), and AJV (423.14 KB).
- Lovable remains identifiable in compiled server files. No active `__l5e` asset URL was found.

## Runtime Configuration

The committed `vite.config.ts` contains only the Lovable `defineConfig` wrapper and `mcpPlugin()`.
The wrapper silently provides the application plugin order and Cloudflare Nitro preset. It also
recognises `LOVABLE_PREVIEW_HOST`, `LOVABLE_FEATURE_BUNDLED_DEV`, `LOVABLE_SANDBOX`, and
`DEV_SERVER__PROJECT_PATH`, installs development error loggers, and can proxy `/__l5e/assets-v1/`.

The committed `wrangler.jsonc` uses the generic Worker name `tanstack-start-app`, compatibility date
`2025-09-24`, `nodejs_compat`, and `@tanstack/react-start/server-entry`. Nitro overrides that entry
and generates `.output/server/wrangler.json` with `index.mjs`, an `ASSETS` binding,
`../public`, `no_bundle`, and immutable cache headers for `/assets/*`. There is no committed CI
workflow, deploy script, environment matrix, or rollback command.

The secret-free `.env.example` contains only `VITE_PEPTIDE_VIDEO_URL`,
`VITE_PEPTIDE_VIDEO_POSTER_URL`, and `VITE_CAMPAIGN_PRINT_PROOF`. No `LOVABLE_API_KEY` is present.

## Route and Hosted Behaviour

Development mode and the generated Wrangler Worker returned the same route outcomes:

| Routes                                                                                    | Expected baseline                                                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `/`, `/peptides`, `/start`, `/poster`, `/poster-thanks`, `/contact`, `/privacy`, `/terms` | `200 text/html` with SSR content.                                                    |
| `/go/dads`                                                                                | `307` to `/start?utm_source=offline&utm_medium=poster&utm_campaign=dads`.            |
| `/go/thanks-dad`                                                                          | `307` to `/start?utm_source=offline&utm_medium=poster&utm_campaign=thanks_dad`.      |
| `/mcp` with an ordinary GET                                                               | `406 application/json`; the client must accept the MCP event stream.                 |
| `/.mcp/list-tools`                                                                        | `200 application/json` listing three public tools.                                   |
| `/.mcp/invoke-tool/{about_meneer,list_treatments,how_it_works}`                           | GET returns `405`; POST `{}` returns `200 application/json`.                         |
| `/.well-known/oauth-protected-resource`                                                   | `404 application/json` because no OAuth authorization-server metadata is configured. |
| Unknown route                                                                             | `404 text/html`.                                                                     |

The same status, redirect, and content-type matrix passed on both
`https://meneerhealth.co.za` and the `workers.dev` origin. All four campaign QR assets returned 200
locally and canonically. The canonical and `workers.dev` `/peptides` response includes the approved
preview-only draft video; the committed `itws-I` source baseline does not. This confirms the known
branch/deployment distinction rather than source equivalence.

Root SSR metadata still emits `author=Lovable` and `twitter:site=@Lovable` locally and canonically.
Neither the local root response nor the two hosted origins returned the planned CSP, HSTS,
`X-Content-Type-Options`, frame, referrer, or permissions-policy headers during this check.

## MCP and Telemetry Baseline

The MCP server exposes `about_meneer`, `list_treatments`, and `how_it_works`. Tool output includes
unverified operational claims and incorrectly identifies `meneer.co.za`, a domain not owned by this
project. A local invocation logged an attempted `cloudflare:workers` environment import, then read
`LOVABLE_MCP_LOG_LEVEL` and `LOVABLE_API_KEY`. With no API key it logged
`metrics.disabled_no_api_key` and did not send usage to `https://api.lovable.dev/v1/app-mcp-usage`.

This proves the telemetry path is dormant without the key, not absent. Task 2.4 removes the MCP
surface; Task 2.5 proves the telemetry and Lovable environment paths are gone.

## Findings Routed Forward

- **Task 2.3:** replace the wrapper, activate explicit supported Cloudflare configuration, preserve
  SSR/redirect behaviour, and establish a working production-like preview command.
- **Task 2.4:** remove the exposed MCP routes, stale content, OAuth route, tool definitions, manifest,
  and large server-runtime dependency chain.
- **Task 2.5:** remove Lovable environment/telemetry handling, regenerate the lockfile, classify
  direct packages, and reassess the 41 audit findings without broad uncontrolled upgrades.
- **Task 2.6:** replace Lovable root and social metadata while preserving approved page copy.
- **Task 2.7:** define branch/environment roles, supported versions, headers, logs, deploy, promotion,
  and rollback operations. Security-header ownership also remains under TD-017 for its assigned
  sprint.

Task 2.2 is evidence-only and closes after repository-owner review and manual commit. It does not
close any Sprint 02 technical-debt item and does not authorize deployment changes.
