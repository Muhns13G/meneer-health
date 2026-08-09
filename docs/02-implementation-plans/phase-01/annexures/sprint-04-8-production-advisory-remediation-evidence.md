---
evidence_id: phase-01-sprint-04-task-08
title: Sprint 04.8 Production Advisory Remediation Evidence
status: verified-task-evidence
date: 2026-08-09
source_baseline: 71173b8
owner: "@Muhns13G"
related_debt: [TD-021]
---

# Sprint 04.8 Production Advisory Remediation Evidence

## Boundary and outcome

Task 4.8 remediates the production/framework advisory lane through reviewed compatible updates and
exact transitive security overrides. It does not broadly update the repository, change public
wording, alter application source, or close the remaining development-tooling lane.

| Audit surface       | Before                | After                  | Outcome                          |
| ------------------- | --------------------- | ---------------------- | -------------------------------- |
| `bun audit --prod`  | 26 findings           | 0 findings             | Production-filtered lane clear   |
| Full `bun audit`    | 33 findings           | 7 findings             | Six high and one moderate remain |
| Remaining full path | Nine package families | `brace-expansion` only | Lint-only; assigned to Task 4.9  |

## Bounded dependency changes

| Package or path                    | Prior resolution | Task 4.8 resolution   | Rationale                                                                   |
| ---------------------------------- | ---------------- | --------------------- | --------------------------------------------------------------------------- |
| `@tanstack/react-start`            | 1.167.39         | exact 1.167.65        | Retains the reviewed 1.167 line and selects fixed server-core dependencies. |
| `@tanstack/start-server-core`      | 1.167.19         | 1.167.30              | Removes the affected runtime server-core resolution.                        |
| `vite`                             | 7.3.2            | exact 7.3.6           | Applies fixes and unifies the root and test-tooling resolution.             |
| `postcss`                          | 8.5.9            | 8.5.26                | Raises the transitive security floor within parent ranges.                  |
| `nanoid`                           | 3.3.11           | 3.3.18                | Raises the transitive security floor within parent ranges.                  |
| `undici`                           | 7.25.0           | 7.29.0                | Removes the affected transitive HTTP-client resolution.                     |
| `@babel/core`                      | 7.29.0           | 7.29.7                | Raises the transitive compiler security floor.                              |
| affected `esbuild`                 | 0.27.7           | 0.28.1                | Eliminates the vulnerable optional/build resolution.                        |
| `js-yaml`                          | 4.1.1            | 4.3.1                 | Raises the transitive parser security floor.                                |
| affected optional `tsx` resolution | 4.21.0           | absent; floor 4.23.11 | Removes the stale instance and prevents the old optional peer returning.    |

`@tanstack/react-start` is exact because a caret range beginning at 1.167 would also permit an
unreviewed 1.168 release. The root `overrides` field is the single authority for the reviewed
transitive versions under Bun; a duplicate Yarn-compatible `resolutions` policy is deliberately
not retained. No direct package was removed or added.

## Reachability and residual risk

The server-core path was treated as runtime-relevant and updated directly. Vite, PostCSS, Babel,
esbuild, js-yaml, nanoid, and tsx are reached through build or development tooling; the bounded
overrides remove their affected lockfile instances. Searches of `dist/client` and `dist/server`
find none of the audited package names, while the production-filtered audit is clear.

The seven remaining full-audit findings all resolve through
`typescript-eslint -> @typescript-eslint/typescript-estree -> minimatch -> brace-expansion@5.0.5`.
That path is lint-only and absent from `bun audit --prod`. Task 4.9 must remediate it or record a
time-bounded exception. TD-021 remains In progress until Task 4.9 and Task 4.10 policy enforcement
are complete.

## Verification

| Check                           | Result                                              |
| ------------------------------- | --------------------------------------------------- |
| `bun install --frozen-lockfile` | Pass — 482 installs across 524 packages, no changes |
| `bun run format:check`          | Pass                                                |
| `bun run lint`                  | Pass                                                |
| `bun run typecheck`             | Pass                                                |
| `bun run test`                  | Pass — 6 files, 11 tests                            |
| `bun run build`                 | Pass                                                |
| `bun run deploy:dry-run`        | Pass                                                |
| `bun run test:e2e`              | Pass — 48 desktop/mobile checks                     |
| `bun audit --prod`              | Pass — no vulnerabilities found                     |
| `src/routeTree.gen.ts`          | Unchanged                                           |

A forced reinstall was used once to remove a stale, untracked nested Vite installation after the
lockfile was unified. The subsequent frozen install is clean and reproducible. The bounded upstream
Node `punycode` deprecation and sandbox-only Wrangler log-file warning remain non-failing tooling
messages; neither changes this task's audit result.

## Task disposition

Task 4.8 is complete and ready for an owner commit. TD-021 is not yet Verified: Task 4.9 owns the
remaining lint-tooling advisory family, and Task 4.10 owns CI enforcement.
