---
evidence_id: phase-01-sprint-04-task-04
title: Sprint 04.4 Formatting Baseline Evidence
status: verified-task-evidence
date: 2026-08-09
source_baseline: bad96f8
owner: "@Muhns13G"
related_debt: [TD-022, TD-028]
---

# Sprint 04.4 — Formatting Baseline Evidence

## Purpose and Boundary

Task 4.4 clears the tracked Prettier backlog through a bounded mechanical rewrite. It changes no
approved wording, route, component structure, behaviour, dependency, lockfile, runtime
configuration, asset, or generated route output.

## Formatted Tracked Files

| Surface          | Files | Mechanical result                                                                 |
| ---------------- | ----: | --------------------------------------------------------------------------------- |
| Components       |     7 | JSX and long text/class attributes are wrapped consistently.                      |
| Homepage route   |     1 | Metadata string literals are wrapped without changing their values.               |
| Global CSS       |     1 | Whitespace, quote style, selector layout, and equivalent decimals are normalized. |
| Historical audit |     1 | Markdown tables and paragraphs are wrapped without changing findings.             |

The component files are `CtaSection.tsx`, `Discretion.tsx`, `Doctor.tsx`, `Footer.tsx`, `Hero.tsx`,
`Nav.tsx`, and `Treatments.tsx`. The other tracked files are `src/routes/index.tsx`,
`src/styles.css`, and `docs/01-audits/project-codebase-audit-2026-08-05.md`.

The initial local check also reported three files below `.archive/`. That directory is explicitly
ignored and those local working records are not part of this commit or the clean-checkout contract.

## Preservation Review

- String content is unchanged; only source line wrapping and JSX layout changed.
- The CSS decimal normalization from forms such as `0.10` to `0.1` is numerically equivalent.
- No route, conditional, link, state, import, export, class token, or metadata value changed.
- Build output retains the Task 4.3 sizes: 35.04 kB client CSS, 330.91 kB main client JavaScript,
  and 756.67 kB Worker entry, with 17 Worker modules and 28 static assets.

## Validation

| Check                                        | Result                                                            |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `bun run format:check`                       | Pass; every matched local file uses Prettier style.               |
| `bun run lint`                               | Pass with one pre-existing `src/router.tsx` Fast Refresh warning. |
| `bun run typecheck`                          | Pass.                                                             |
| `bun run build` and `bun run deploy:dry-run` | Pass; no deployment or binding mutation.                          |
| `git diff --check`                           | Pass.                                                             |

Wrangler again reports sandbox-only log-write messages and the known upstream `punycode`
deprecation; both remain non-fatal and unchanged.

## Debt Disposition

Task 4.4 is **Completed**. TD-022 remains **In progress** because Task 4.5 owns the last Fast Refresh
warning and scoped unused-code rules. TD-028 remains **In progress** until Task 4.10 enforces the
format and frozen-install contract in CI.
