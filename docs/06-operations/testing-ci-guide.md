---
document_id: meneer-testing-ci-guide
title: Testing and CI Guide
status: active
last_updated: 2026-08-09
owner: "@Muhns13G"
audience: contributors
sensitivity: internal
---

# Testing and CI Guide

## Purpose

This guide defines the local and GitHub validation contract for the TanStack v1 repository. Tests
prove the current acquisition and containment boundaries; they do not prove that an unimplemented
patient, clinical, payment, pharmacy, or fulfilment workflow exists.

## Test Layers

| Layer                 | Command                                   | Scope                                                             |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| Formatting            | `bun run format:check`                    | Non-writing Prettier check                                        |
| Static analysis       | `bun run lint`                            | ESLint and repository rules                                       |
| Types                 | `bun run typecheck`                       | Strict TypeScript without output                                  |
| Unit/integration      | `bun run test`                            | Vitest, jsdom, components, utilities, and redirects               |
| Browser/accessibility | `bun run test:e2e`                        | Desktop/mobile Chromium, routes, gates, 404s, navigation, and axe |
| Dependencies          | `bun run audit`, `bun run audit:prod`     | Full and production-filtered advisory policy                      |
| Delivery              | `bun run build`, `bun run deploy:dry-run` | Production bundle and non-deploying Cloudflare upload validation  |
| Generated routes      | `bun run check:generated`                 | Rejects a route-tree diff after build                             |

Install Chromium once on a workstation with `bunx playwright install chromium`. Linux CI uses
`bunx playwright install --with-deps chromium`.

## Local Validation Sequence

Run build commands sequentially because they share `dist/`:

```bash
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run audit
bun run audit:prod
bun run build
bun run check:generated
bun run deploy:dry-run
bun run test:e2e
```

Use `bun run test:watch` during development and `bun run test:coverage` for an ignored local V8
report. Coverage informs risk review; no arbitrary global percentage substitutes for journey and
boundary evidence.

## GitHub CI

`.github/workflows/ci.yml` runs for pull requests, manual dispatch, and pushes to `main`, `itws-I`,
or `itws-I-preview`. The workflow has read-only repository permission and performs no deployment.
It pins Bun 1.3.14, reads Node from `.node-version`, uses frozen installation, and executes the
local scripts above with one Playwright worker.

Browser screenshots, traces, and HTML reports are uploaded only on failure and retained for seven
days. Task 4.12 proves the complete sequence and one controlled lint failure from an isolated clone.
Hosted run `31324807644` proves `Repository validation` passes at commit `b6331bd`. Hosted
deliberate-failure proof and required-check/merge control remain pending owner configuration.

GitHub reads issue and pull-request templates from the repository default branch. While `itws-I` is
the permanent source boundary but stale `main` remains the default, contributor templates cannot be
considered active. The owner must align those branch roles or merge the templates into the retained
default branch before accepting hosted template verification.

## Safe Fixtures and Artifacts

- Use synthetic values and reserved `.invalid` domains.
- Never use real patient, credential, payment, prescription, pharmacy, or production-log data.
- Keep browser video disabled unless a bounded debugging task explicitly requires it.
- Review artifacts before sharing; delete or quarantine anything unexpectedly sensitive.
- Do not commit `coverage/`, `playwright-report/`, `test-results/`, `dist/`, or browser binaries.

## Failure Triage

1. Identify the first failing gate; later failures may be consequential.
2. Reproduce it with the exact local script and pinned Bun/Node versions.
3. Distinguish source failure from registry/network, browser-install, extension, or sandbox effects.
4. Inspect generated diffs, test artifacts, and the Cloudflare dry-run without exposing secrets.
5. Fix the cause; do not weaken a rule, delete a test, refresh a snapshot, or accept an advisory
   merely to make CI green.
6. Record any unavoidable dependency exception with owner, controls, expiry, and review trigger.

The current Cloudflare toolchain emits a bounded Node `punycode` deprecation. Local sandbox runs may
also fail to write Wrangler's optional user-level log file while the build/dry-run exits successfully.
Treat new warnings or non-zero exits as regressions until investigated.
