---
evidence_id: phase-01-sprint-04-task-02
title: Sprint 04.2 Bun and Package Contract Evidence
status: verified-task-evidence
date: 2026-08-08
source_baseline: b4ceae5
owner: "@Muhns13G"
related_debt: [TD-028]
---

# Sprint 04.2 — Bun and Package Contract Evidence

## Purpose and Boundary

Task 4.2 replaces the remaining generic package identity, preserves the established Bun and Node
toolchain contract, adds a non-writing formatting command, and proves that Bun can install the
committed dependency graph without lockfile drift. It changes no application code, dependency
version, public wording, runtime configuration, or hosted environment.

## Implemented Contract

| Surface           | Result                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| Private package   | `package.json` is named `meneer-health`; `private: true` remains in force. |
| Lockfile identity | The root `bun.lock` workspace name is aligned to `meneer-health`.          |
| Package manager   | `packageManager: bun@1.3.14` remains the exact contributor/build pin.      |
| Bun engine        | `1.3.x` remains the supported Bun compatibility range.                     |
| Node engine       | `>=22.22.0 <23` remains the supported build-tool range.                    |
| Cloud build pin   | `.node-version` remains `22.23.2`; no runtime change was made.             |
| Formatting        | `bun run format:check` runs `prettier --check .` and never writes files.   |

The generic `tanstack_start_ts` identity had no product-source consumer. The new name matches the
existing Cloudflare Worker identity while remaining private, so this is repository metadata rather
than an npm publication or runtime rename.

## Lockfile Handling

`bun install --lockfile-only` on Bun 1.3.14 preserved the old informational root workspace name even
after `package.json` changed. A forced lockfile-only generation reproduced the same behaviour in an
isolated copy. The single root workspace metadata field was therefore aligned explicitly; no
package, version, integrity, resolution, override, or dependency edge changed.

The resulting graph was accepted by `bun install --frozen-lockfile`: Bun 1.3.14 checked 456 installs
across 566 packages and reported no changes.

## Non-Writing Format Baseline

`bun run format:check` executes successfully as a command and exits non-zero because it detects 13
pre-existing files with formatting differences:

- three archived/internal Markdown records;
- one historical audit document;
- seven active components;
- the homepage route; and
- the global stylesheet.

The command did not modify any file. This is intentionally a truthful repository-wide check: Task
4.2 does not hide existing debt with new exclusions, and Task 4.4 owns mechanical formatting while
preserving established public wording. Task 4.10 owns CI enforcement once that baseline is green.

## Validation

| Check                           | Result       | Evidence                                                                               |
| ------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| `bun --version`                 | Pass         | `1.3.14`, exactly matching `packageManager`.                                           |
| `node --version`                | Pass         | `v22.22.2`, inside the declared Node 22 range; Cloudflare remains pinned to `22.23.2`. |
| `bun install --frozen-lockfile` | Pass         | 456 installs, 566 packages, no changes.                                                |
| `bun run format:check`          | Expected red | Finds 13 existing files and performs no writes.                                        |
| `bun run typecheck`             | Pass         | Strict TypeScript validation completes without output.                                 |
| `bun run deploy:dry-run`        | Pass         | Production build and Cloudflare dry-run complete; no deployment occurs.                |

The known upstream `punycode` warning and sandbox-only Wrangler log-write messages remain unchanged
and non-fatal. The dry-run reports 17 Worker modules, 28 assets, 913.11 KiB total upload, 178.26 KiB
gzip, and no bindings.

## Debt Disposition

Task 4.2 is complete. TD-028 moves to **In progress**, not Verified: the package identity, pins,
lockfile contract, and local commands now exist, but Task 4.4 must make `format:check` green and Task
4.10 must enforce both formatting and frozen installation in CI before the debt can close.
