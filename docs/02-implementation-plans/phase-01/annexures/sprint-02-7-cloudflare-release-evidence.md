---
evidence_id: phase-01-sprint-02-task-07
title: Sprint 02 Task 2.7 Cloudflare Release Evidence
status: in-progress-owner-action
date: 2026-08-07
source_commit: 774839d
owner: "@Muhns13G"
---

# Sprint 02 Task 2.7 — Cloudflare Release Evidence

## Purpose and Boundary

This task makes the Cloudflare v1 environment, release, observability, and rollback contract
explicit. Repository configuration and documentation are implemented locally. The owner has
deployed the Sprint 2.6 application baseline; hosted closure remains pending until the Task 2.7
configuration is committed, promoted, and verified.

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

| Item                    | Observed state on 7 August 2026                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Worker                  | `meneer-health`; workers.dev and version previews enabled                                                       |
| Canonical domain        | `meneerhealth.co.za`, enabled as the production custom domain                                                   |
| Production branch       | `itws-I-preview`                                                                                                |
| Production build/deploy | `bun run build`; `npx wrangler deploy`                                                                          |
| Non-production builds   | All branches except `itws-I-preview`; `npx wrangler versions upload`                                            |
| Active canonical source | Commit `2e83767` from `itws-I-preview`; Worker version `6ee13f0c-cde2-4ad7-aa37-9325452b274f`                   |
| `itws-I` review source  | Commit `774839d`, uploaded as Worker version `727d9701-beb9-4e92-b694-93ee72582fd8`                             |
| Version history         | At least six retained Worker versions and five deployments; rollback target history exists                      |
| Hosted runtime          | Compatibility date `2026-08-07`, `nodejs_compat`, assets binding only; Task 2.7 persisted logs are not deployed |

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

Independent direct requests completed without initialization errors. Response timing is a smoke
check only, not a guaranteed cold-start or latency measurement. The in-app browser connection was
unavailable during this pass, so hosted client-navigation and console evidence remain pending.

The canonical HTML now contains the approved Meneer title and author metadata. Both the custom
domain and workers.dev URL serve the Sprint 2.6 boundary, while the preview-only draft video remains
correctly isolated to `itws-I-preview`.

## Logs and Rollback

The repository now explicitly enables persisted invocation logs, but that Task 2.7 configuration
is not included in the active Sprint 2.6 deployment. A prior one-hour Workers Logs query returned
no events after route probes. Hosted no-error and no-Lovable-network log proof therefore remains
pending the Task 2.7 deployment.

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
| Canonical route, redirect, metadata, and removed-route probes        | Pass for the deployed Sprint 2.6 boundary            |
| Cloudflare build, branch, domain, version, and deployment inspection | Pass, read-only                                      |
| Sprint 2.6 hosted route parity                                       | Pass                                                 |
| Hosted MCP/Lovable application identity absence                      | Pass                                                 |
| Task 2.7 runtime/observability deployment                            | Pending owner commit, merge, and deploy              |
| Hosted logs and client navigation                                    | Pending Task 2.7 deployment/browser availability     |
| Rollback availability                                                | Verified read-only; no production mutation performed |

## Debt Disposition

- **TD-052 — In progress:** the environment/release/rollback contract now exists, but its runtime
  pins, persisted logs, browser checks, and post-deploy evidence remain outstanding.
- **TD-049 — In progress:** hosted application identity and route probes show no Lovable boundary;
  persisted-log and browser-network proof still require the Task 2.7 deployment.
- **TD-053 — Verified:** the canonical and workers.dev deployments now return ordinary HTML 404
  responses for the removed MCP and OAuth paths.

After the owner deploys Task 2.7, repeat the runbook matrix and append the deployed SHA, Worker
version, log result, navigation/console result, and final debt disposition before Task 2.7 is
marked verified.
