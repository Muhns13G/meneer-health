---
task: 5.12
status: completed-repository-foundation
date: 2026-08-11
related_debt: [TD-013, TD-015, TD-017, TD-020]
---

# Sprint 05.12 — Observability and Incident Evidence

## Outcome

Task 5.12 implements the repository-owned privacy-safe observability and incident foundation without
deploying, migrating hosted Supabase, provisioning Better Stack, or activating a transaction.

- A strict portable `telemetry.event` contract permits only environment, event, severity, outcome,
  correlation, route class, reason, status class, and bounded duration bucket.
- The Worker emits structured request completion/denial events. Cloudflare automatic invocation
  logs are disabled so method/URL metadata does not undermine the application allowlist.
- The monitoring policy fixes pilot availability, acknowledgement, dependency, server-failure,
  abuse, and break-glass thresholds with named operational/security ownership.
- An identified authorization or disabled break-glass denial can append only through a validated
  service-role RPC into the existing tenant hash chain. Browser invocation, arbitrary actions, and
  unapproved break-glass roles fail closed.
- The deterministic incident exercise detects dependency and break-glass alerts, rejects prohibited
  telemetry fields, and completes detect, triage, contain, recover, and review.

## Validation Evidence

| Check                                           | Result                                  |
| ----------------------------------------------- | --------------------------------------- |
| Formatting, ESLint, TypeScript and RAG JSON     | Pass                                    |
| Vitest                                          | 28 files / 183 tests pass               |
| Clean local database reset                      | Pass; six migrations applied            |
| pgTAP                                           | 6 files / 195 assertions pass           |
| Supabase database lint                          | No findings                             |
| Five live synthetic Supabase integrations       | Pass, including browser-denial evidence |
| `bun run exercise:incident`                     | Pass                                    |
| Full and production dependency audits           | No vulnerabilities found                |
| Production build and client-bundle canary       | Pass                                    |
| Cloudflare binding types and deployment dry-run | Pass; no deployment performed           |
| Playwright/axe                                  | 52 desktop/mobile checks pass           |
| Generated route tree and `git diff --check`     | Pass                                    |

The local Wrangler log-file warning remains the bounded sandbox-only upstream behavior already
documented in the testing guide; build, type and dry-run commands exit successfully.

## Scope and Residual Gates

Task 5.12 is complete as a code, policy, runbook, and controlled local exercise. The owner must still
activate and test the Better Stack public monitor against the deployed production domain. Task 5.13
owns the backup heartbeat, restore, and recovery evidence. Consequently TD-020 remains **In
progress**. TD-013/TD-015/TD-017 also remain **In progress** because no authenticated customer route,
full sensitive-action coverage, or route-specific hosted abuse evidence is active.

Current official provider guidance supports this design: Cloudflare recommends structured JSON
objects for indexed Workers Logs, while Better Stack creates incidents from failed HTTP monitors and
missed heartbeats. Provider configuration remains non-authoritative and zero-fixed-cost constrained.
