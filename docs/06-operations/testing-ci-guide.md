---
document_id: meneer-testing-ci-guide
title: Testing and CI Guide
status: active
last_updated: 2026-08-10
owner: "@Muhns13G"
audience: contributors
sensitivity: internal
---

# Testing and CI Guide

## Purpose

This guide defines the local and GitHub validation contract for the TanStack v1 repository. Tests
prove the current acquisition and inactive server boundaries; they do not prove that a functioning
patient, clinical, payment, pharmacy, partner, or fulfilment journey is publicly available.

## Test Layers

| Layer                  | Command                                                           | Scope                                                             |
| ---------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Formatting             | `bun run format:check`                                            | Non-writing Prettier check                                        |
| Static analysis        | `bun run lint`                                                    | ESLint and repository rules                                       |
| Types                  | `bun run typecheck`                                               | Strict TypeScript without output                                  |
| Cloudflare types       | `bun run check:cloudflare-types`                                  | Rejects generated runtime/binding type drift                      |
| Unit/integration       | `bun run test`                                                    | Vitest, jsdom, components, utilities, and redirects               |
| Database               | `bun run db:reset`, `db:test`, `db:lint`                          | Versioned schema, fixtures, RLS, privileges and database lint     |
| Managed identity       | `bun run test:auth`                                               | Synthetic passwordless, mapping, TOTP, sessions and revocation    |
| Authorisation          | `bun run test:authz`                                              | Synthetic role, tenant, assignment and service-scope boundaries   |
| Workflow commands      | `bun run test:commands`                                           | Atomic state, replay, concurrency and false-success boundaries    |
| Audit/integration      | `bun run test:audit`                                              | Audit chain, review access, inbox replay and outbox atomicity     |
| Security evidence      | `bun run test:security-evidence`                                  | Server-only denial append and direct-browser rejection            |
| Payment integration    | `bun run test:payments`                                           | Server Checkout, signed webhook, replay and browser denial        |
| Fulfilment integration | `bun run test:fulfilment`                                         | Synthetic partner hand-offs, replay, RLS and reconciliation       |
| Stripe sandbox         | `bun --env-file=.env.production.local run test:payments:provider` | Explicit no-charge provider exercise; local only                  |
| Incident exercise      | `bun run exercise:incident`                                       | Alert thresholds, redaction and incident-stage rehearsal          |
| Browser/accessibility  | `bun run test:e2e`                                                | Desktop/mobile Chromium, routes, gates, 404s, navigation, and axe |
| Dependencies           | `bun run audit`, `bun run audit:prod`                             | Full and production-filtered advisory policy                      |
| Delivery               | `bun run build`, `bun run deploy:dry-run`                         | Production bundle and non-deploying Cloudflare upload validation  |
| Generated routes       | `bun run check:generated`                                         | Rejects a route-tree diff after build                             |

Install Chromium once on a workstation with `bunx playwright install chromium`. Linux CI uses
`bunx playwright install --with-deps chromium`.

## Local Validation Sequence

Run build commands sequentially because they share `dist/`:

```bash
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run typecheck
bun run check:cloudflare-types
bun run test
bun run db:start:test
bun run db:reset
bun run db:test
bun run db:lint
bun run test:auth
bun run test:authz
bun run test:commands
bun run test:audit
bun run test:security-evidence
bun run test:lifecycle
bun run test:payments
bun run test:fulfilment
bun run exercise:incident
bun run exercise:recovery
bun run db:stop
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
local scripts above with one Playwright worker. Tasks 5.6–5.15 start only the local PostgreSQL, Auth,
gateway and Data API services, reset synthetic migrations, run pgTAP/database lint, exercise the
managed identity flow, and always stop the stack. Hosted Supabase credentials and data are never
used by CI. The Task 5.7 proof binds and accepts an invitation, preserves the original session origin
through TOTP elevation, completes recovery only after revocation, and creates/scopes/revokes a
synthetic service credential.
Task 5.8 then exercises own, assigned, cross-subject, cross-tenant, vertical-role,
cross-environment-service and direct-browser-denial boundaries without hosted credentials. Task
5.9 exercises validated server context, optimistic versions, exact and changed replays, concurrent
duplicate delivery, state prerequisites, atomic receipts, false-success rollback and direct browser
denial. Reset the local database before rerunning this state-changing integration.
Task 5.10 then proves the workflow/audit/outbox atomic transaction, append-only SHA-256 chain,
purpose-bound AAL2 audit review, access-review evidence, allow-listed metadata, fingerprint-bound
inbox replay and direct browser denial. Its second synthetic workflow keeps it independent from the
Task 5.9 command scenario.
Task 5.11 checks generated Cloudflare binding types, then proves transport caps, body-free reads,
mutation-probe limiting/denial, protected JSON origin/body/idempotency/anti-automation controls,
fail-closed dependencies, request deadlines, safe correlation and the browser's no-CORS boundary.
Task 5.12 adds strict custom telemetry/redaction tests, monitoring thresholds, identified denial and
disabled break-glass audit evidence, direct-browser rejection, and a deterministic incident
exercise. Hosted Better Stack and Supabase credentials remain absent from CI.
Task 5.13 adds verified export/erasure/hold/reconciliation tests, then encrypts a real logical dump,
restores it into an isolated temporary PostgreSQL database, reconciles counts/checksums, records
synthetic RPO/RTO evidence, and drops the temporary database. Hosted R2/Better Stack credentials
remain absent from CI.
Task 5.14 adds server-priced one-time Checkout, raw-body Stripe signature, replay, payment-state,
refund/dispute/reconciliation and browser-denial tests. The integration uses an SDK-generated test
signature and synthetic local Supabase; it makes no Stripe network request and uses no hosted key.
For the explicit provider-backed sandbox exercise, load the ignored local configuration and run
`bun --env-file=.env.production.local run test:payments:provider`. This creates no-charge test
Checkout Sessions only and must never run in ordinary CI or against live credentials.

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
