---
evidence_id: phase-01-sprint-04-task-12
title: Sprint 04.12 Closure Evidence
status: verified-task-evidence
date: 2026-08-09
source_commit: 8b23428
hosted_commit: b6331bd
failure_commit: 62a6a78045c6b544d7167efe105feb9b546967dc
passing_run: https://github.com/Muhns13G/meneer-health/actions/runs/31324807644
failure_run: https://github.com/Muhns13G/meneer-health/actions/runs/31336490260
failure_pr: https://github.com/Muhns13G/meneer-health/pull/10
owner: "@Muhns13G"
related_debt: [TD-021, TD-022, TD-023, TD-024, TD-026, TD-028, TD-029, TD-030, TD-031]
---

# Sprint 04.12 Closure Evidence

## Boundary

Task 4.12 verifies the committed Sprint 04 repository-health baseline. It does not change public
wording, application behaviour, dependencies, the generated route tree, or deployment state. Git
pushes, GitHub settings, workflow dispatches, merges, and deployments remain owner-only actions.

## Isolated clean-checkout proof

The committed `itws-I` HEAD `8b23428` was cloned without hard links into an isolated temporary
directory. No uncommitted source from the working repository was available to the clone.

| Check                                 | Result                                                       |
| ------------------------------------- | ------------------------------------------------------------ |
| Clean clone and committed HEAD        | Pass — clean at `8b2342847617e452feabdf9e9e939daefe8255bb`   |
| `bun install --frozen-lockfile`       | Pass — 482 installs across 524 packages; no lockfile change  |
| `bun run format:check`                | Pass                                                         |
| `bun run lint`                        | Pass — zero findings                                         |
| `bun run typecheck`                   | Pass                                                         |
| `bun run test`                        | Pass — 6 files, 11 tests                                     |
| `bun run audit`, `bun run audit:prod` | Pass — no vulnerabilities found                              |
| `bun run build`                       | Pass — 1,908 client and 1,994 SSR modules                    |
| `bun run check:generated`             | Pass — generated route tree unchanged                        |
| `bun run deploy:dry-run`              | Pass — 17 modules, 938.17 KiB; no bindings and no deployment |
| `CI=true bun run test:e2e`            | Pass — 48 desktop/mobile browser and accessibility checks    |
| Post-validation checkout status       | Pass — no tracked or untracked repository changes            |

The first sandboxed install attempt could not write Bun's temporary installation files and did not
produce `node_modules`. Repeating the same frozen command with ordinary filesystem permission
completed successfully. This was an agent sandbox constraint, not a repository or lockfile failure.
Wrangler retained its documented optional user-log permission warning while build and dry-run
exited successfully. The known upstream Node `punycode` deprecation also remains unchanged.

## Controlled failure proof

The committed ESLint configuration was given a synthetic TypeScript stdin fixture containing an
intentionally unused variable. ESLint rejected it with
`@typescript-eslint/no-unused-vars` and exit code 1. No repository file was created or modified.
This proves the configured validation gate distinguishes the green baseline from a controlled
source-quality failure. The hosted proof below independently verifies enforcement on GitHub.

## Hosted passing-run proof

Read-only local and GitHub inspection found:

- Local and hosted `itws-I` resolve to
  `b6331bdaf82593f658160ce583742a2e043a8ef4` with a clean working tree.
- GitHub Actions run
  [`31324807644`](https://github.com/Muhns13G/meneer-health/actions/runs/31324807644), triggered by
  the Task 4.12 push, completed successfully in 2m33s.
- Its `Repository validation` job completed successfully in 2m29s. The public run summary reports
  no artifact, consistent with failure-only artifact retention.
- `main` remains the stripped production/default branch, while `develop` is the canonical full
  engineering and documentation branch. Root production documentation uses absolute links to
  `develop`; contributor templates and CI remain available from `main`.

References: [GitHub template behaviour](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates)
and [protected branch availability](https://docs.github.com/en/rest/branches/branch-protection).

## Hosted controlled-failure and repository-control proof

- The owner protected both `main` and `develop` and configured `Repository validation` as a required
  check on the integration path.
- The owner enabled GitHub Issues and confirmed the structured Bug report form renders. Public API
  inspection confirms Issues are enabled and the body of PR #10 was prefilled by the repository PR
  template.
- [PR #10](https://github.com/Muhns13G/meneer-health/pull/10) targeted `develop` from `itws-XX`
  with one isolated two-line file at commit `62a6a78045c6b544d7167efe105feb9b546967dc`.
- [Hosted run `31336490260`](https://github.com/Muhns13G/meneer-health/actions/runs/31336490260)
  completed the required
  [`Repository validation` job](https://github.com/Muhns13G/meneer-health/actions/runs/31336490260/job/93303094741)
  with conclusion `failure` in 18 seconds. The format gate rejected the deliberate fixture before
  later gates could run.
- The owner-provided GitHub screenshot shows the failed check marked `Required` and the ordinary
  merge control disabled. GitHub's public API confirms the PR is closed, unmerged, and targeted
  `develop` at base commit `06c22dd`.
- The proof branch was deleted. Remote `develop` never contained
  `src/ci-controlled-failure.ts`; application and production code therefore remain unchanged.

## Current disposition

All repository-controlled and owner-controlled acceptance work is complete. The clean-clone matrix,
hosted passing and failing runs, rendered templates, protected branches, required merge check, and
safe proof-branch disposal verify Task 4.12. Sprint 04 is closed. TD-021–TD-024, TD-026, and
TD-028–TD-031 are Verified; no new technical-debt ID arose from closure.
