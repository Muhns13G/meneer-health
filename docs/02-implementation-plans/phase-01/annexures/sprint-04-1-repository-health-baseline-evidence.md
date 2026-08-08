---
evidence_id: phase-01-sprint-04-task-01
title: Sprint 04.1 Repository Health Baseline and Inventories
status: verified-task-evidence
date: 2026-08-08
source_baseline: f88975e14eb85d66fdbb3473c1689256efbd5840
owner: "@Muhns13G"
related_debt: [TD-021, TD-022, TD-023, TD-024, TD-026, TD-028, TD-029, TD-030, TD-031]
---

# Sprint 04.1 — Repository Health Baseline and Inventories

## Purpose and Boundary

This evidence freezes the clean post-Sprint 03 starting point for Sprint 04. It inventories current
advisories, UI reachability, commands, generated output, and contributor documentation without
changing dependencies, components, configuration, application behaviour, or public wording.

The audit contains no secrets, patient information, production credentials, or hosted mutations.
Audit counts are dated observations; advisory-level reachability and safe remediation remain Tasks
4.8 and 4.9.

## Baseline Summary

| Area             | Observed state                                                                                                                   | Disposition                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Git              | Clean `itws-I` at `f88975e`; Sprint 03 closure is committed.                                                                     | Task 4.1 evidence begins from this immutable comparison point.        |
| Install          | Bun 1.3.14 checks 456 installs across 566 packages with no frozen-lockfile change.                                               | Reproducibility proof continues in Task 4.2 and CI.                   |
| Types/build      | Typecheck, production build, and Wrangler dry-run pass.                                                                          | Preserve as blocking gates.                                           |
| Lint             | 21 Prettier errors and 7 Fast Refresh warnings.                                                                                  | Mechanical formatting is Task 4.4; semantic/warning work is Task 4.5. |
| Tests/CI         | No test package, test script, test file, or CI workflow exists.                                                                  | Tasks 4.6, 4.7, and 4.10.                                             |
| Dependencies     | 43 runtime declarations and 21 development declarations.                                                                         | Remove only after reachability and regression evidence.               |
| UI surface       | 46 tracked `src/components/ui/*.tsx` files; no product-source import reaches the directory.                                      | Candidate removal is Task 4.3.                                        |
| Generated files  | `bun.lock` and `src/routeTree.gen.ts` are tracked generated artefacts.                                                           | Define generation-aware checks before CI.                             |
| Contributor docs | `AGENTS.md`, `.env.example`, decision index, and Cloudflare runbook exist; root onboarding/test/CI/contribution surfaces do not. | Task 4.11.                                                            |

## Dependency Advisory Inventory

`bun audit` reports 33 findings: 17 high, 12 moderate, and 4 low. `bun audit --prod` reports 26:
11 high, 11 moderate, and 4 low. The production-filtered command excludes the seven
`brace-expansion` findings but still includes framework/build paths; its label does not prove Worker
request-time reachability.

| Package and affected resolved instance |                  Findings | Observed path                                                                                     | Initial reachability classification                                                                          | Next evidence                                                                      |
| -------------------------------------- | ------------------------: | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `brace-expansion@5.0.5`                |        6 high, 1 moderate | TypeScript-ESLint/minimatch; Bun also prints ESLint paths and a separate unaffected 1.x instance. | Development lint only; absent from `--prod`.                                                                 | Confirm corrected ESLint/TypeScript-ESLint graph in Task 4.9.                      |
| `nanoid@3.3.11`                        |                    2 high | `vite -> postcss -> nanoid`                                                                       | Build/development path; no direct application import.                                                        | Resolve through bounded Vite/PostCSS parent updates in Task 4.8.                   |
| `postcss@8.5.9`                        |        2 high, 2 moderate | Vite CSS transform                                                                                | Build-time input handling; no direct application import.                                                     | Confirm source-map/CSS input assumptions and fixed parent graph.                   |
| `undici@7.25.0`                        | 4 high, 6 moderate, 2 low | TanStack plugin-core through Cheerio. Cloudflare/Miniflare already resolves `7.29.0`.             | Framework tooling path appears distinct from Worker `fetch`; deployed reachability is not yet proven absent. | Inspect built graph and update compatible parents in Task 4.8.                     |
| `@babel/core@7.29.0`                   |                     1 low | TanStack router tooling and Vite React plugin                                                     | Build/generation transform path.                                                                             | Verify fixed compatible parent release in Task 4.9.                                |
| `vite@7.3.2`                           |        1 high, 1 moderate | Direct build/dev tool and TanStack/plugin peers                                                   | Local/build server exposure; not a public Worker request handler.                                            | Apply bounded compatible Vite lane and regression tests in Task 4.8.               |
| `@tanstack/start-server-core@1.167.19` |                1 moderate | `@tanstack/react-start` server/plugin paths                                                       | Server-framework path; highest priority despite no current `createServerFn` use.                             | Update coordinated TanStack packages and test SSR/retired server-function surface. |
| `esbuild@0.27.7`                       |                     1 low | Vite/tsx/router generation; Wrangler already resolves `0.28.1`.                                   | Build/development path; advisory is Windows-specific.                                                        | Confirm corrected Vite/tsx path in Task 4.9.                                       |
| `js-yaml@4.1.1`                        |        2 high, 1 moderate | ESLint and TanStack XML tooling                                                                   | Development/build parsing; no application YAML input.                                                        | Resolve compatible parents or create an expiring exception in Task 4.9.            |

No advisory is accepted, waived, or closed by this inventory. Task 4.8 owns production-relevant and
framework paths; Task 4.9 owns development/tooling paths and any time-bounded exception. Broad
`bun update` and `bun update --latest` remain prohibited.

## UI Reachability Inventory

A repository-wide static import search found zero imports of `@/components/ui/*`, relative UI
modules, or `src/components/ui/` from outside that directory. The UI files do import one another,
so internal references do not establish product reachability.

All 46 tracked files are removal candidates:

- Radix-backed primitives (29): `accordion`, `alert-dialog`, `aspect-ratio`, `avatar`, `breadcrumb`,
  `button`, `checkbox`, `collapsible`, `context-menu`, `dialog`, `dropdown-menu`, `form`,
  `hover-card`, `label`, `menubar`, `navigation-menu`, `popover`, `progress`, `radio-group`,
  `scroll-area`, `select`, `separator`, `sheet`, `slider`, `switch`, `tabs`, `toggle-group`,
  `toggle`, and `tooltip`.
- Other third-party composites (8): `calendar`, `carousel`, `chart`, `command`, `drawer`,
  `input-otp`, `resizable`, and `sonner`.
- Local/composed primitives (9): `alert`, `badge`, `card`, `input`, `pagination`, `sidebar`,
  `skeleton`, `table`, and `textarea`.

The directory accounts for all 26 declared Radix packages plus `class-variance-authority`, `cmdk`,
`embla-carousel-react`, `input-otp`, `react-day-picker`, `react-hook-form`,
`react-resizable-panels`, `recharts`, `sonner`, and `vaul`. Its support graph is also the only
consumer of `src/hooks/use-mobile.tsx` and `src/lib/utils.ts`; `clsx` and `tailwind-merge` become
candidate direct-dependency removals if that support graph is removed.

Task 4.3 must repeat static/dynamic/generated checks, remove the complete approved set in one clean
commit, regenerate the lockfile through bounded package removals, and compare typecheck, build,
dry-run, route behaviour, and bundle output. This inventory does not itself delete or approve a
hypothetical future design system.

## Command and Gate Inventory

| Command                         | Result at baseline | Notes                                                                                      |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `bun install --frozen-lockfile` | Pass               | 456 installs across 566 packages; no change.                                               |
| `bun run typecheck`             | Pass               | Existing strict TypeScript command. Unused locals/parameters remain disabled for Task 4.5. |
| `bun run lint`                  | Expected fail      | 21 Prettier errors across product files; 6 UI and 1 router Fast Refresh warnings.          |
| `bun run build`                 | Pass               | Client and SSR bundles complete; known upstream `punycode` warning persists.               |
| `bun run deploy:dry-run`        | Pass               | 17 Worker modules, 28 assets, 913.11 KiB upload/178.26 KiB gzip, no bindings.              |
| `bun audit`                     | Expected fail      | 33 findings; produces advisory evidence rather than a usable pass/fail policy.             |
| `bun audit --prod`              | Expected fail      | 26 findings; still contains build/framework paths.                                         |
| `bun run test`                  | Missing            | No framework or script until Task 4.6.                                                     |
| `bun run test:e2e`              | Missing            | No Playwright/browser script until Task 4.7.                                               |
| `bun run format:check`          | Missing            | Existing `format` command writes; Task 4.2 adds a non-writing gate.                        |

The build/dry-run also emits sandbox-only Wrangler log-file permission messages while returning
success. Wrangler prints its CLI telemetry notice; application Web Analytics remains disabled.
Task 4.10 should make CLI metrics behaviour explicit in CI rather than confusing it with public-site
analytics.

## Generated and Ignored Output Inventory

| Surface                                        | Ownership                                                                                              | Required check                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `bun.lock`                                     | Bun-generated, tracked, authoritative dependency graph.                                                | Frozen install plus intentional diff for dependency changes.           |
| `src/routeTree.gen.ts`                         | TanStack Router-generated and tracked; header forbids manual edits and requests lint/format exclusion. | Regenerate through supported tooling and fail CI on unexplained drift. |
| `dist/`                                        | Vite/Cloudflare-generated, ignored.                                                                    | Rebuild; never commit.                                                 |
| `.output/`, `.vinxi/`, `.tanstack/`, `.nitro/` | Framework-generated, ignored.                                                                          | Keep out of Git and clean-checkout evidence.                           |
| `.wrangler/`                                   | Wrangler-local state, ignored.                                                                         | Never commit credentials or deploy state.                              |

Current ESLint ignores `dist`, `.output`, and `.vinxi`; `routeTree.gen.ts` self-disables ESLint but is
not yet protected from the repository-wide writing formatter. Tasks 4.2, 4.4, and 4.10 must define
one consistent generated-file policy.

## Documentation and Repository-Control Inventory

| Surface                              | State                                              | Required follow-through                                                                |
| ------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `AGENTS.md`                          | Present; current Bun/Cloudflare contributor rules. | Update commands after tests/CI exist.                                                  |
| `.env.example`                       | Present; secret-free current public variables.     | Link from root onboarding; future server variables belong to Sprint 05.                |
| `docs/07-decisions/README.md`        | Present; approved decision lifecycle/index.        | Link rather than duplicate it.                                                         |
| Cloudflare release runbook           | Present and owner-controlled.                      | Link rather than create obsolete Vercel v1 guidance.                                   |
| Root `README.md`                     | Missing.                                           | Task 4.11: orientation, install, commands, architecture/debt/decision/runbook routing. |
| Test strategy and command guide      | Missing.                                           | Tasks 4.6–4.7 and 4.11.                                                                |
| Vulnerability register and CI policy | Missing.                                           | Tasks 4.8–4.10.                                                                        |
| GitHub workflow                      | Missing; `.github/` contains only `CODEOWNERS`.    | Task 4.10.                                                                             |
| Contribution guide and PR template   | Missing.                                           | Task 4.11; require scope, plan/TD, risk, migrations, screenshots, and validation.      |

TD-030's older statement that no decision index, environment guide, deployment guide, or runbook
exists is therefore partially stale. Those durable sources now exist, but contributor onboarding
cannot close until a clean-checkout reader can discover and use them from the repository root.

## Task Disposition

- TD-021 moves to **In progress**: the current package families, advisory counts, paths, and
  provisional reachability are inventoried; fixes, exceptions, expiry, and CI policy remain.
- TD-026 moves to **In progress**: every UI file is accounted for and has no product-source importer;
  deletion, dependency pruning, and regression proof remain Task 4.3.
- TD-030 moves to **In progress**: existing durable sources are identified, while root onboarding,
  test/CI guidance, templates, and clean-checkout usability remain.
- TD-022 remains **Open** with its corrected 21-error/7-warning baseline. TD-023, TD-024, TD-028,
  TD-029, and TD-031 remain Open for their assigned tasks.

## Validation

- Clean baseline, tracked counts, source imports, package declarations, package paths, generated
  headers, ignore rules, scripts, and documentation surfaces were inspected directly.
- Frozen install, typecheck, build, and Wrangler dry-run pass; lint and both audits reproduce their
  recorded expected failures.
- The evidence contains no application edit, removal, package/lockfile change, public-copy change,
  generated-file edit, secret, patient information, deployment, or production action.
