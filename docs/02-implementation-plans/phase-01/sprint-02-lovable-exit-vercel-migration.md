---
plan_id: phase-01-sprint-02
title: Lovable Exit and Vercel Migration
status: requires-refresh
primary_debt: [TD-025, TD-027, TD-041, TD-049, TD-051, TD-052, TD-053]
depends_on: [phase-01-sprint-01]
last_updated: 2026-08-07
owner: unassigned
---

# Sprint 02 — Lovable Exit and Vercel Migration

> **Planning hold:** The repository owner reopened the v1 hosting decision after this plan was
> drafted. Select Cloudflare or Vercel under ARC-007/TD-052, then refresh this plan's title,
> platform-removal scope, validation matrix, and acceptance evidence before implementation. The
> Vercel-specific instructions below remain historical planning input, not current authority.

## Mission

Remove unintended Lovable and Cloudflare runtime dependencies while preserving verified v1 behaviour on the supported TanStack Start deployment path for Vercel. Make every build plugin, runtime adapter, environment variable, asset, endpoint, and dependency explicit.

## Intended Outcome

The application installs and builds through standard TanStack Start, Nitro, React, Tailwind, and Vite configuration; runs on Vercel previews and production; contains no Lovable branding, telemetry, manifest, virtual asset, generated SDK imports, or Cloudflare/Wrangler deployment requirement; and has a documented rollback path.

## Scope

Primary debt: TD-025, TD-027, TD-041, TD-049, and TD-051–TD-053.

### Workstream 1 — Baseline and dependency ownership

1. Capture the pre-migration dependency graph, build output, routes, headers, server behaviour, and bundle artefacts.
2. Identify every default injected by `@lovable.dev/vite-tanstack-config` that the application actually requires.
3. Reclassify build-only and runtime dependencies and record which packages reach the deployed server/client.
4. Preserve the Bun lockfile and use bounded dependency changes.

### Workstream 2 — Explicit TanStack/Vercel configuration

1. Replace the Lovable Vite wrapper with explicit standard plugins and configuration for TanStack Start, Nitro, React, Tailwind, TypeScript paths, aliases, and required import protection.
2. Select the supported Vercel/Nitro preset and document any necessary `vercel.json` settings.
3. Remove `@cloudflare/vite-plugin`, `wrangler.jsonc`, `nodejs_compat`, Cloudflare output settings, and unused Cloudflare transitive assumptions.
4. Resolve the unknown Rollup `platform`, ignored directive, and overridden Wrangler warnings, or document remaining warnings with ownership and regression evidence.

### Workstream 3 — Lovable exit

1. Remove `@lovable.dev/vite-tanstack-config` and Lovable-only environment behaviour.
2. Remove Lovable metadata, author/social fallbacks, package-install exceptions, and virtual asset references.
3. Do not configure `LOVABLE_API_KEY`; prove no telemetry request is emitted.
4. Decide whether MCP is removed for the pilot or later rebuilt with a vendor-neutral SDK.
5. Remove `@lovable.dev/mcp-js`, generated MCP/OAuth routes, `.lovable/mcp/manifest.json`, and related configuration if MCP is deferred. If retained, replace the SDK and regenerate protocol tests without Lovable artefacts.

### Workstream 4 — Vercel environments and deployment

1. Document local, preview, and production build/runtime expectations and supported Bun/Node versions.
2. Define a secret-free environment-variable contract; secrets remain server-only and no secret uses a `VITE_` prefix.
3. Verify SSR, client navigation, direct route loads, assets, error/404 pages, server endpoints, headers, logs, and cold starts on a preview deployment.
4. Record the user-controlled production promotion and rollback procedure. The repository owner performs GitHub pushes and production actions.

## Required Decisions and Inputs

- Sprint 01 route and MCP pilot disposition.
- Vercel project ownership, environments, domains, and permitted runtime versions.
- Whether any server endpoint remains in v1 after containment.
- Approved canonical site URL and Meneer metadata.
- Access to deployment logs and preview URLs for verification.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| TD-025 | Build warning inventory shows each warning removed or explicitly accepted with regression evidence.                       |
| TD-027 | Dependency classification and production reachability are documented; build-only packages are correctly scoped.           |
| TD-041 | Rendered metadata and social previews use approved Meneer values on all route types.                                      |
| TD-049 | `LOVABLE_API_KEY` is absent and network/log evidence shows no Lovable telemetry in any environment.                       |
| TD-051 | No import, package, environment behaviour, or asset proxy from the Lovable Vite wrapper remains.                          |
| TD-052 | Cloudflare/Wrangler artefacts are absent and Vercel preview plus production paths are verified with rollback evidence.    |
| TD-053 | MCP is removed or vendor-neutrally implemented under an approved scope, with protocol, security, and rate-limit evidence. |

## Validation

- Run `bun install --frozen-lockfile` in a clean checkout or equivalent clean environment.
- Run `bunx tsc --noEmit`, `bun run lint`, and `bun run build` while recording known Sprint 04 lint debt separately.
- Search tracked source and build artefacts for `lovable`, `__l5e`, `LOVABLE_`, `cloudflare`, and `wrangler`; justify any retained historical documentation reference.
- Verify all page routes, direct deep links, 404/error paths, assets, security headers, and retained server endpoints locally and on Vercel preview.
- Inspect network and platform logs for unexpected external telemetry.
- Perform a controlled preview rollback; record the production rollback command/procedure without pushing on behalf of the owner.

## Non-Goals

- Migrating to Next.js.
- Selecting or implementing the complete patient backend.
- Replacing Lovable with proprietary Vercel domain logic.
- Reintroducing MCP without a named use case and approved boundary.

## Risks and Rollback

Hidden wrapper defaults may affect routing, aliases, import protection, HMR, SSR, or asset handling. Migrate one concern at a time and compare against the captured baseline. Keep the last known deployable configuration available as a reversible commit, and use immutable Vercel deployments for rollback. Never restore Lovable telemetry or Cloudflare targeting merely to mask an uninvestigated failure.

## Documentation and RAG Updates

- Add a Vercel deployment/environment guide and an architecture decision for the v1 runtime.
- Update AGENTS.md after Vercel becomes the verified current target.
- Update TD-025, TD-027, TD-041, TD-049, and TD-051–TD-053 only after verification.
- Refresh all platform references in `docs/RAG/02-current-state.md`, `03-platform-evolution.md`, `05-decision-register.md`, `06-known-limitations.md`, and `07-index.json`.
- Produce `docs/03-completion-reports/phase-01/sprint-02-lovable-exit-vercel-migration.md`.
