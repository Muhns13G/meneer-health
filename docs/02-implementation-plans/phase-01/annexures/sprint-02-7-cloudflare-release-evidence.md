---
evidence_id: phase-01-sprint-02-task-07
title: Sprint 02 Task 2.7 Cloudflare Release Evidence
status: verified
date: 2026-08-07
verified_on: 2026-08-08
source_commit: ce2bcdf
owner: "@Muhns13G"
---

# Sprint 02 Task 2.7 — Cloudflare Release Evidence

## Purpose and Boundary

This task makes the Cloudflare v1 environment, release, observability, and rollback contract
explicit. The owner committed, pushed, merged, and deployed the Task 2.7 repository boundary.
Hosted behaviour, logs, and rollback availability were then verified without changing production.

## Implemented Repository Boundary

- The Wrangler target is explicitly named `meneer-health`; the compatibility date remains
  `2026-08-07` with `nodejs_compat`.
- Public preview URLs and persisted invocation logs are explicitly enabled.
- Bun 1.3.14 and Node 22 are documented and pinned through `packageManager`, `engines`, and
  `.node-version`; Cloudflare Builds must receive non-secret `BUN_VERSION=1.3.14`.
- The environment contract states that `VITE_*` is public, server secrets use ignored `.dev.vars*`
  locally and Cloudflare secrets when hosted, and `LOVABLE_API_KEY` is forbidden.
- The owner-only runbook defines review, temporary preview-video promotion, permanent branch
  handoff, route/log checks, and version rollback without rewriting Git history.

## Read-Only Cloudflare Account Evidence

| Item                    | Observed state on 7 August 2026                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Worker                  | `meneer-health`; workers.dev and version previews enabled                                                |
| Canonical domain        | `meneerhealth.co.za`, enabled as the production custom domain                                            |
| Production branch       | `itws-I-preview`                                                                                         |
| Production build/deploy | `bun run build`; `npx wrangler deploy`                                                                   |
| Non-production builds   | All branches except `itws-I-preview`; `npx wrangler versions upload`                                     |
| Active canonical source | `itws-I-preview` commit `0838c2d`; Worker version `bcb4a4c1-f47f-46ce-8c80-fed52cf46f`                   |
| `itws-I` review source  | Commit `ce2bcdf`, uploaded as non-production Worker version `f0960eb1`                                   |
| Version history         | Immutable current and prior Worker versions remain available for rollback                                |
| Hosted runtime          | Compatibility date `2026-08-07`, `nodejs_compat`, no runtime bindings; persisted invocation logs enabled |

No Cloudflare setting, version, route, branch mapping, secret, or deployment was mutated during
this inspection.

## Current Hosted Route and Header Matrix

| Surface                                   | Result                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/`, `/peptides`, `/start`                | HTTP 200 HTML                                                                                            |
| `/go/dads`                                | HTTP 307 to attributed `/start`; followed destination HTTP 200                                           |
| `/go/thanks-dad`                          | HTTP 307 to attributed `/start`; followed destination HTTP 200                                           |
| Unknown route                             | HTTP 404 HTML                                                                                            |
| `/mcp`                                    | HTTP 404 HTML; retired MCP route is absent                                                               |
| `/.mcp/list-tools`                        | HTTP 404 HTML; retired MCP route is absent                                                               |
| `/.well-known/oauth-authorization-server` | HTTP 404 HTML; retired OAuth route is absent                                                             |
| Headers                                   | Cloudflare transport/reporting headers present; application security headers remain separate TD-017 work |

Independent direct requests completed without initialization errors. Two canonical smoke requests
completed in approximately 108 ms and 107 ms; these are observations, not latency guarantees.
Desktop and 390-pixel browser checks passed direct loads, client navigation, responsive overflow,
metadata, images, draft-video presence, console, and network inspection.

The canonical HTML now contains the approved Meneer title and author metadata. Both the custom
domain and workers.dev URL serve the Task 2.7 boundary, while the preview-only draft video remains
correctly isolated to `itws-I-preview`.

## Logs and Rollback

Persisted invocation logs are active. A compact 30-minute query returned 60 successful events with
no error outcomes and no Lovable matches. The observed 404s were expected probes of retired or
unknown routes. Browser-network inspection likewise found no Lovable or automatic Web Analytics
request after the owner disabled automatic Web Analytics.

Cloudflare Fonts initially rewrote the document head and triggered React hydration error 418. The
owner disabled that setting; canonical SSR and hydration then matched with no console errors or
warnings. Both Cloudflare Fonts and automatic Web Analytics remain intentionally off for the pilot.

Cloudflare's retained version/deployment history and documented `wrangler rollback VERSION_ID`
path were verified read-only. An actual rollback was correctly not performed against the canonical
site merely as a test. The runbook requires recording the active and fallback versions, executing
an owner-approved rollback only during a rehearsal or incident, and reconciling Git afterward.

## Current Validation

| Check                                                                | State                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| `bun install --frozen-lockfile`                                      | Pass; 456 installs across 566 packages, no changes   |
| `bun run typecheck`                                                  | Pass                                                 |
| `bun run deploy:dry-run`                                             | Pass; build and 17-module/28-asset upload validation |
| Generated Worker configuration                                       | Pass; name, runtime date, previews, logs, and assets |
| Local production-preview route matrix                                | Pass; retained routes/assets and removed-path 404s   |
| `bun run lint`                                                       | Known baseline: 21 Prettier errors and 7 warnings    |
| Canonical route, redirect, metadata, and removed-route probes        | Pass for the deployed Task 2.7 boundary              |
| Cloudflare build, branch, domain, version, and deployment inspection | Pass, read-only                                      |
| Desktop/mobile direct loads, client navigation, console, and network | Pass                                                 |
| Hosted MCP/Lovable application identity absence                      | Pass                                                 |
| Task 2.7 runtime/observability deployment                            | Pass; owner committed, pushed, merged, and deployed  |
| Hosted persisted logs                                                | Pass; successful outcomes, no errors/Lovable matches |
| Rollback availability                                                | Verified read-only; no production mutation performed |

## Debt Disposition

- **TD-052 — Verified:** on 8 August 2026, the owner explicitly authorized a bounded configuration
  and rebuild action. Both triggers now define `BUN_VERSION=1.3.14`; production uses
  `bunx wrangler deploy`; non-production uses `bunx wrangler versions upload`. Both builds succeeded
  with Bun 1.3.14 and Node 22.23.2, and canonical post-deploy smoke routes returned HTTP 200.
- **TD-049 — Verified:** source, build, browser-network, and persisted-log checks show no active
  Lovable SDK, telemetry, environment, or request path.
- **TD-053 — Verified:** the canonical and workers.dev deployments now return ordinary HTML 404
  responses for the removed MCP and OAuth paths.

Task 2.8 records the complete regression comparison and final Sprint 02 dispositions.
