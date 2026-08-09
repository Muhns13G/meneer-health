---
evidence_id: phase-01-sprint-04-task-12
title: Sprint 04.12 Closure Evidence
status: hosted-verification-pending
date: 2026-08-09
source_commit: 8b23428
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
source-quality failure. Hosted rejection remains a separate acceptance gate.

## Hosted-state inspection

Read-only local and GitHub inspection found:

- Local `itws-I` is seven commits ahead of `origin/itws-I`.
- Hosted `itws-I` remains at `b76750f`, the Task 4.4 formatting commit. It therefore does not yet
  contain Tasks 4.5–4.11, the CI workflow, contributor documents, or templates.
- The public repository's default branch is `main`, which remains an older pre-Sprint 04 surface.
- GitHub requires issue and pull-request templates to exist on the default branch. Templates held
  only on `itws-I` cannot render for contributors.

References: [GitHub template behaviour](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates)
and [protected branch availability](https://docs.github.com/en/rest/branches/branch-protection).

## Remaining owner-controlled acceptance sequence

1. Review and commit Task 4.12, then push `itws-I`.
2. Confirm the `CI / Repository validation` run passes at the pushed commit.
3. Create a temporary branch or pull request containing one harmless, deliberate lint failure;
   confirm the same check fails and prevents merge, then delete/close that temporary proof.
4. Align the repository default branch with the approved permanent source boundary (`itws-I`), or
   merge the contributor/template files into whichever branch remains default.
5. Confirm the bug form and pull-request template render without submitting either form.
6. Protect the active integration branch with `Repository validation` as a required check and
   retain repository-owner control over merges and releases.
7. Record the hosted run URLs/settings evidence, mark Task 4.12 Completed, and move TD-021–TD-024
   and TD-028–TD-031 to Verified.

## Current disposition

All repository-controlled and local acceptance work is complete. Sprint 04 is not yet fully closed
because hosted passing/failing workflow evidence, default-branch template rendering, and required-
check enforcement require an owner push and GitHub configuration. No new technical-debt ID is
needed; these are the explicit remaining acceptance criteria of the existing Sprint 04 items.
