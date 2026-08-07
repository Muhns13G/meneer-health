---
report_id: phase-01-sprint-02-completion
title: Sprint 02 Lovable Exit and Cloudflare Runtime Ownership
status: verified-completion
date: 2026-08-08
owner: "@Muhns13G"
---

# Sprint 02 Completion Report — Lovable Exit and Cloudflare Runtime Ownership

## Mission and Outcome

Sprint 02 removed unintended Lovable coupling and made the TanStack Start application an explicit,
repository-owned Cloudflare Workers deployment without rewriting approved customer-facing copy.
Tasks 2.1–2.8 are complete and all seven primary debt items are Verified.

## Work and Decisions

- Selected Cloudflare for v1 and retained Vercel as a possible Next.js v2 host (DIR-030).
- Removed the Lovable Vite wrapper, SDK, telemetry, MCP/OAuth routes, manifest, tool definitions,
  package exceptions, virtual-asset behaviour, historical lockfile URLs, and fallback identity.
- Replaced hidden build behaviour with explicit Cloudflare, TanStack, React, Tailwind, path-alias,
  import-protection, and runtime configuration; pinned Bun 1.3.x and Node 22 expectations.
- Classified dependencies, removed six unused direct declarations, moved five build-only packages,
  and documented reintroduction triggers without broad version upgrades.
- Preserved route-specific metadata and established “Back to your best” messaging while replacing
  only the unowned Lovable root/author/social fallbacks.
- Defined local, review, temporary canonical-preview, permanent-source, secret, promotion, logging,
  post-deploy, and rollback boundaries. Only the owner pushes or changes production.
- Verified canonical routes, campaign redirects, assets, responsive navigation, hydration, logs,
  removed endpoints, cold-start behaviour, and immutable rollback availability.
- Kept Cloudflare Fonts and automatic Web Analytics disabled for the pilot. Fonts caused a React
  hydration mismatch; automatic analytics was not governed by the current privacy boundary.

## Deviations from the Plan

- The original Vercel migration plan was superseded after the owner selected Cloudflare for v1.
- MCP was removed rather than reimplemented because no pilot use case justified a public protocol
  surface; future AI clinical tooling remains a separate, vendor-neutral design problem.
- Task 2.7 hosted closure occurred after its repository commit and deployment, then was consolidated
  in Task 2.8 evidence.
- The Cloudflare build-version/runner alignment was completed after the initial Task 2.8 pass under
  explicit owner authorization. Both production and non-production rebuilds then passed, closing
  TD-052 without changing repository application code.
- An initial hydration investigation attributed risk to injected analytics. Disabling Web Analytics
  removed that beacon, but Cloudflare Fonts was the remaining direct cause. Disabling Fonts resolved
  hydration. The evidence records both facts rather than preserving the initial assumption.

## Lessons Learned

- Platform optimisations that rewrite HTML can break React hydration despite a clean application
  build; canonical browser verification must cover provider-injected behaviour.
- Dependency presence does not equal production reachability. Classification and built-output proof
  support safer removals than package-name assumptions.
- Hosted logs, browser network inspection, and direct HTTP checks answer different questions and
  are all required for a defensible platform exit.
- Preserve approved copy by default. Infrastructure remediation should not become an unreviewed
  content rewrite.

## Technical Debt and Residual Risk

No new registry item was created. TD-025, TD-027, TD-041, TD-049, and TD-051–TD-053 are Verified.
Existing TD-017 retains missing application security headers; TD-042 retains favicon/discovery
work; Sprint 04 retains 21 formatting errors, 7 Fast Refresh warnings, no automated tests/CI, and
31 full or 24 production-filtered audit findings.

Sprint closure does not approve pilot activation, clinical transactions, or public launch.

## Existing Files Modified

| File                                                          | Sprint change                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `.env.example`, `.gitignore`, `bunfig.toml`                   | Clarified environment/ignore contract and removed Lovable package-age behaviour.       |
| `AGENTS.md`, `package.json`, `bun.lock`                       | Documented Bun/Cloudflare commands, normalized dependencies, and pinned tooling.       |
| `vite.config.ts`, `wrangler.jsonc`                            | Replaced hidden wrapper behaviour and made Worker/runtime/log settings explicit.       |
| `src/routes/__root.tsx`, `src/routeTree.gen.ts`               | Replaced fallback identity and regenerated routing after MCP removal.                  |
| `docs/00-blueprints/master-blueprint-v1.md`                   | Reconciled v1 hosting and platform-exit direction.                                     |
| `docs/02-implementation-plans/phase-01/README.md`             | Reconciled Sprint 02 ownership and status.                                             |
| `docs/04-technical-debt/technical-debt-registry-v1.md`        | Updated Sprint 02 debt evidence and dispositions.                                      |
| `docs/RAG/00-governance.md` through `06-known-limitations.md` | Reconciled governance, current state, evolution, glossary, decisions, and limitations. |
| `docs/RAG/07-index.json`                                      | Added and refreshed retrieval routes for Sprint 02 evidence.                           |

## Files Created

| File                                                                                                   | Purpose                                                             |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `.node-version`                                                                                        | Pins Node 22.23.2 for build tooling.                                |
| `docs/02-implementation-plans/phase-01/sprint-02-lovable-exit-cloudflare-runtime.md`                   | Approved Cloudflare-specific Sprint 02 plan.                        |
| `docs/02-implementation-plans/phase-01/annexures/sprint-02-1-hosting-and-scope-decision-evidence.md`   | Host and MCP scope decision evidence.                               |
| `docs/02-implementation-plans/phase-01/annexures/sprint-02-2-pre-exit-baseline-evidence.md`            | Pre-exit comparison baseline.                                       |
| `docs/02-implementation-plans/phase-01/annexures/sprint-02-3-cloudflare-runtime-ownership-evidence.md` | Explicit runtime evidence.                                          |
| `docs/02-implementation-plans/phase-01/annexures/sprint-02-4-mcp-removal-evidence.md`                  | MCP/OAuth removal evidence.                                         |
| `docs/02-implementation-plans/phase-01/annexures/sprint-02-5-telemetry-dependency-evidence.md`         | Telemetry/dependency evidence.                                      |
| `docs/02-implementation-plans/phase-01/annexures/sprint-02-6-meneer-metadata-evidence.md`              | Identity/metadata evidence.                                         |
| `docs/02-implementation-plans/phase-01/annexures/sprint-02-7-cloudflare-release-evidence.md`           | Hosted release evidence.                                            |
| `docs/02-implementation-plans/phase-01/annexures/sprint-02-8-verification-and-closure-evidence.md`     | Final regression and debt disposition evidence.                     |
| `docs/05-future-considerations/dependency-reintroduction-triggers.md`                                  | Records evidence-based triggers for removed packages.               |
| `docs/06-operations/cloudflare-environments-release-runbook.md`                                        | Owner-controlled environment, release, log, and rollback procedure. |
| `docs/03-completion-reports/phase-01/sprint-02-lovable-exit-cloudflare-runtime.md`                     | This completion record.                                             |

## Files Removed or Relocated

| File(s)                                                                                                                                                  | Disposition                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `.lovable/mcp/manifest.json`                                                                                                                             | Removed obsolete Lovable MCP manifest.                         |
| `src/lib/mcp/index.ts`, `tools/about-meneer.ts`, `tools/how-it-works.ts`, `tools/list-treatments.ts`                                                     | Removed unsupported MCP implementation.                        |
| `src/routes/[.mcp]/invoke-tool/$tool.ts`, `src/routes/[.mcp]/list-tools.ts`, `src/routes/[.well-known]/oauth-protected-resource.ts`, `src/routes/mcp.ts` | Removed generated MCP/OAuth surfaces.                          |
| `sprint-02-lovable-exit-vercel-migration.md`                                                                                                             | Relocated unchanged to `old-deprecated/` for decision history. |

## Validation and Release Implication

Isolated frozen install, typecheck, build, Wrangler dry-run, local preview routes, hosted direct
requests, desktop/mobile browser flows, assets, redirects, console/network, persisted logs, and
rollback availability pass. Lint and audit results match recorded pre-existing debt. The permanent
`itws-I` source remains video-free; `itws-I-preview` remains the temporary canonical video branch.
Pinned production and non-production Cloudflare rebuilds also pass, and post-deploy smoke checks
return HTTP 200. The Task 2.8 documentation boundary is ready for owner review and manual commit.
