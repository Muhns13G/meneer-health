---
evidence_id: phase-01-sprint-04-task-09
title: Sprint 04.9 Tooling Advisory Remediation Evidence
status: verified-task-evidence
date: 2026-08-09
source_baseline: 6bcc6bb
owner: "@Muhns13G"
related_debt: [TD-021]
---

# Sprint 04.9 Tooling Advisory Remediation Evidence

## Boundary and outcome

Task 4.9 remediates the final development-tooling advisory family without a broad dependency
update, parent-tool upgrade, application-source change, or public-wording change. Both the full and
production-filtered Bun audits now report no vulnerabilities. No security exception is required.

| Audit surface      | Task 4.8 boundary            | Task 4.9 result        |
| ------------------ | ---------------------------- | ---------------------- |
| `bun audit --prod` | 0 findings                   | 0 findings             |
| Full `bun audit`   | 7 `brace-expansion` findings | 0 findings             |
| Exception register | Remediation required         | No exception necessary |

## Advisory path and remediation

The affected lockfile instance was `brace-expansion@5.0.5`, reached only through
`typescript-eslint -> @typescript-eslint/typescript-estree -> minimatch@10.2.5`. The parent accepts
`brace-expansion@^5.0.5`, so patched 5.0.9 is compatible.

The graph also contains legacy `minimatch@3.1.5`, whose declared range requires
`brace-expansion@^1.1.7`. A global 5.x override was tested and rejected immediately because Bun's
top-level override would have forced that legacy path outside its declared range. No such override
is retained.

A normal `bun install` refreshed the existing lockfile branches independently:

| Parent path        | Before                   | After                    | Compatibility      |
| ------------------ | ------------------------ | ------------------------ | ------------------ |
| `minimatch@3.1.5`  | `brace-expansion@1.1.14` | `brace-expansion@1.1.18` | Satisfies `^1.1.7` |
| `minimatch@10.2.5` | `brace-expansion@5.0.5`  | `brace-expansion@5.0.9`  | Satisfies `^5.0.5` |

Only `bun.lock` changes for dependency remediation. `package.json`, ESLint, TypeScript-ESLint, and
all direct dependency declarations remain unchanged from the committed Task 4.8 boundary.

## Reachability and exception decision

Both paths are development-only lint tooling and are absent from the production-filtered audit.
They were remediated rather than accepted because compatible patched releases exist. Consequently,
Task 4.9 records no exception owner, expiry, or compensating control. A future finding may only be
accepted through the exception fields required by the Sprint 04 plan.

TD-021 remains In progress until Task 4.10 enforces the clean full and production audit policy in
CI. The local advisory backlog itself is clear.

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
| `bun audit`                     | Pass — no vulnerabilities found                     |
| `bun audit --prod`              | Pass — no vulnerabilities found                     |
| `src/routeTree.gen.ts`          | Unchanged                                           |

The bounded upstream Node `punycode` deprecation and sandbox-only Wrangler log-file warning remain
non-failing tooling messages and are not dependency-audit findings.

## Task disposition

Task 4.9 is complete and ready for an owner commit. Task 4.10 now owns CI enforcement of the clean
dependency policy and the remaining acceptance evidence for TD-021.
