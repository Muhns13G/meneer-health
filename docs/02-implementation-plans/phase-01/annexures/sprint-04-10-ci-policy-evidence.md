---
evidence_id: phase-01-sprint-04-task-10
title: Sprint 04.10 CI Policy Evidence
status: verified-task-evidence
date: 2026-08-09
source_baseline: be1cdbb
owner: "@Muhns13G"
related_debt: [TD-021, TD-022, TD-023, TD-024, TD-028, TD-029]
---

# Sprint 04.10 CI Policy Evidence

## Boundary and outcome

Task 4.10 adds the first GitHub Actions validation workflow and matching local package scripts. It
does not deploy, promote, roll back, use production secrets, change application source, or alter
public wording. Local execution proves every repository command; hosted success, controlled failure,
and required-check enforcement remain Task 4.12 evidence.

## Workflow contract

`.github/workflows/ci.yml` runs one deterministic `Repository validation` job for pull requests,
manual dispatch, and pushes to `main`, `itws-I`, or `itws-I-preview`.

| Control               | Implementation                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Repository permission | Explicit `contents: read` only                                                             |
| Runtime               | `.node-version` through `actions/setup-node@v6`; Bun 1.3.14 through `oven-sh/setup-bun@v2` |
| Installation          | `bun install --frozen-lockfile`                                                            |
| Static checks         | Format, ESLint, TypeScript                                                                 |
| Automated tests       | 11 Vitest tests and 48 Playwright/axe checks                                               |
| Dependency policy     | Full and production-filtered Bun audits must both pass                                     |
| Delivery checks       | Production build and Cloudflare deployment dry-run; no deployment                          |
| Generated-file policy | Build, then fail if tracked `src/routeTree.gen.ts` differs                                 |
| Browser installation  | Chromium plus required Linux dependencies only                                             |
| Failure evidence      | Ignored local output uploaded only on failure for seven days                               |
| Concurrency           | New work on the same workflow/ref cancels the older run                                    |
| Timeout               | 30 minutes                                                                                 |

The workflow contains no write permission, third-party service credential, patient fixture, or
production release action. Playwright remains single-worker and synthetic. Cloudflare telemetry is
disabled for the job.

## Local command parity

`package.json` adds three non-mutating scripts used directly by CI:

- `bun run audit` runs the full dependency audit.
- `bun run audit:prod` runs the production-filtered audit.
- `bun run check:generated` rejects a route-tree diff after the build generator has run.

All other workflow commands use the existing repository scripts. This keeps local and hosted
configuration aligned rather than embedding alternate lint, test, build, or deployment options in
the workflow.

## Verification

| Check                           | Local result                                        |
| ------------------------------- | --------------------------------------------------- |
| Workflow YAML parse             | Pass                                                |
| `bun install --frozen-lockfile` | Pass — 482 installs across 524 packages, no changes |
| `bun run format:check`          | Pass                                                |
| `bun run lint`                  | Pass                                                |
| `bun run typecheck`             | Pass                                                |
| `bun run test`                  | Pass — 6 files, 11 tests                            |
| `bun run audit`                 | Pass — no vulnerabilities found                     |
| `bun run audit:prod`            | Pass — no vulnerabilities found                     |
| `bun run build`                 | Pass                                                |
| `bun run check:generated`       | Pass — route tree unchanged                         |
| `bun run deploy:dry-run`        | Pass — no bindings or deployment                    |
| `CI=true bun run test:e2e`      | Pass — 48 desktop/mobile checks                     |

The bounded upstream Node `punycode` deprecation and sandbox-only Wrangler log-file warning remain
non-failing messages. They do not change the command exit status or CI policy.

## Residual enforcement gate

The workflow is not represented as remotely enforced before it exists on GitHub. Task 4.12 must:

1. verify a clean hosted workflow run from the committed checkout;
2. prove a controlled validation failure blocks the workflow;
3. confirm the repository owner's required-check or merge-control setting where the hosting plan
   supports it; and
4. reconcile TD-021–TD-024, TD-028, and TD-029 using hosted run evidence.

## Task disposition

Task 4.10 is complete and ready for an owner commit. The affected debt remains In progress until
Task 4.12 provides hosted enforcement evidence.
