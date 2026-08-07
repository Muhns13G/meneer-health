---
evidence_id: phase-01-sprint-02-task-04
title: Sprint 02 Task 2.4 MCP Removal Evidence
status: verified
date: 2026-08-07
source_commit: a6abbab
owner: "@Muhns13G"
---

# Sprint 02 Task 2.4 — MCP Removal Evidence

## Purpose and Boundary

This task removes the optional Lovable-backed Model Context Protocol surface approved for retirement
under DIR-031. Meneer v1 has no pilot use case for MCP, and the removed routes served only duplicated
public marketing information. No customer-facing page, copy, campaign redirect, asset, Cloudflare
configuration, branch mapping, deployment, or production setting was changed.

The repository owner retains all commit, push, and deployment actions. Hosted verification remains
part of Task 2.7 after this source boundary is committed and deployed.

## Removed Surface

- Removed `@lovable.dev/mcp-js` and its `mcpPlugin()` Vite integration.
- Removed the MCP server definition and the `about_meneer`, `list_treatments`, and `how_it_works`
  tool definitions.
- Removed `/mcp`, `/.mcp/list-tools`, `/.mcp/invoke-tool/$tool`, and
  `/.well-known/oauth-protected-resource` route files.
- Removed `.lovable/mcp/manifest.json`.
- Regenerated `src/routeTree.gen.ts` through the TanStack build plugin; it was not edited manually.
- Regenerated `bun.lock`; neither the Lovable MCP SDK nor `@modelcontextprotocol/sdk` remains in the
  resolved graph.

## Validation Evidence

| Check                             | Result                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`   | Pass; 490 installs across 643 packages with no change                              |
| `bun run build`                   | Pass; 1,916 server modules transformed                                             |
| Development route matrix          | Pass                                                                               |
| Production-preview route matrix   | Pass                                                                               |
| `bunx wrangler deploy --dry-run`  | Pass without deploying                                                             |
| Active source/package/lock search | No Lovable MCP SDK, protocol SDK, tool, manifest, or route reference               |
| Built-output search               | No MCP SDK, protocol SDK, tool name, Lovable telemetry URL, or MCP route reference |

The retained `/`, `/peptides`, `/start`, `/poster`, `/poster-thanks`, `/contact`, `/privacy`, and
`/terms` routes return `200 text/html`. Both `/go/...` routes retain their exact `307` attribution
redirects, and the tested QR asset returns `200 image/svg+xml`.

In both development and production preview, GET requests to `/mcp`, `/.mcp/list-tools`,
`/.mcp/invoke-tool/about_meneer`, and `/.well-known/oauth-protected-resource` return the ordinary
`404 text/html` response. POST to the former invocation URL also returns `404 text/html`, matching an
unknown route and exposing no protocol response.

## Output Comparison

| Measure             |                       Task 2.3 |                     Task 2.4 |
| ------------------- | -----------------------------: | ---------------------------: |
| Installed packages  |    575 installs / 724 packages |  490 installs / 643 packages |
| Server transforms   |                  2,412 modules |                1,916 modules |
| Server router chunk |                    1,157.57 kB |                    115.53 kB |
| Wrangler upload     | 1,930.40 KiB / 377.52 KiB gzip | 912.65 KiB / 178.23 KiB gzip |

The MCP removal therefore cuts the dry-run Worker upload by approximately 53% without changing the
retained route behaviour.

## Debt Disposition and Forward Work

Task 2.4 is complete at the source and local-runtime boundary. TD-053 remains **In progress** only
because its final acceptance also requires the removed endpoints to be verified on the owner-deployed
Cloudflare environment. Task 2.7 owns that hosted check.

The removal also eliminates the Lovable MCP telemetry implementation from source, packages,
lockfile, and built output. TD-049 remains **In progress** until Task 2.5 removes obsolete
package-install exceptions, performs the full environment/static-search proof, and records the
required telemetry disposition. Root Lovable metadata remains Task 2.6 work.
