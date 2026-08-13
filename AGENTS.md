# Repository Guidelines

## Project Structure & Module Organization

This Bun 1.3.x-managed TanStack Start app uses React, TypeScript, Vite, Tailwind CSS, and Cloudflare
Workers on Node 22 build tooling.

- `src/routes/` contains file-based pages and server endpoints; nested campaign routes live under
  `src/routes/go/`.
- `src/components/` holds current site sections. Add shared UI primitives only when an implemented
  feature uses them; the unused shadcn/Radix scaffold was removed in Sprint 4.3.
- `src/hooks/` and `src/lib/` contain shared code. Images live in `src/assets/`; global styles are in
  `src/styles.css`.
- `e2e/` contains controlled Playwright/axe browser tests; `playwright.config.ts` owns the local
  server, desktop Chromium, and Pixel 7 profiles.
- `src/routeTree.gen.ts` and `worker-configuration.d.ts` are generated outputs; do not edit them
  manually.
- Root configuration lives in `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, and `wrangler.jsonc`.

## Build, Test, and Development Commands

Use Bun and keep `bun.lock` synchronized with dependency changes.

- `bun install` installs dependencies.
- `bun run dev` starts the local Vite development server.
- `bun run build` creates the production bundle and catches integration errors.
- `bun run build:dev` builds with development-mode settings.
- `bun run preview` serves the built output locally.
- `bun run test` runs the deterministic Vitest suite once; `bun run test:watch` watches locally.
- `bun run test:coverage` writes an ignored V8 coverage report under `coverage/`.
- `bun run db:start:test`, `db:reset`, `db:test`, `test:auth`, `test:authz`, `test:commands`,
  `test:audit`, `test:security-evidence`, `test:lifecycle`, `test:payments`, and `test:fulfilment`
  verify the synthetic local PostgreSQL, identity, payment, partner, and reconciliation boundaries;
  finish with `bun run db:stop`.
- `bun run test:measurement` proves strict measurement payloads, private access, opt-out, export,
  and disposable synthetic deletion against local Supabase. Hosted use requires the explicit
  `SUPABASE_INTEGRATION_TARGET=hosted-synthetic` guard.
- `bun --env-file=.env.production.local run test:payments:provider` performs the explicit no-charge
  Stripe sandbox exercise; never run it in ordinary CI or with live credentials.
- `bun run exercise:incident` runs the payload-free dependency/break-glass incident rehearsal.
- `bun run exercise:recovery` encrypts a synthetic logical backup, restores it into an isolated
  temporary database, and reconciles record counts/checksums without contacting hosted services.
- `bunx playwright install chromium` installs the managed browser once on a new workstation.
- `bun run test:e2e` runs the extension-free Playwright/axe matrix; `bun run test:e2e:headed` shows
  the same checks in managed Chromium.
- `bun run test:all` runs Vitest followed by Playwright.
- `bun run typecheck` runs strict TypeScript validation without emitting files.
- `bun run check:portability` verifies retained capabilities, contract majors, portable fixtures,
  and referenced schema migrations remain internally consistent.
- `bun run check:discovery` verifies committed robots and sitemap outputs match the approved route
  policy.
- `bun run check:mcp-absence` verifies the retired MCP files, dependencies, generated routes, and
  production-build markers remain absent; `bun run build` invokes it automatically.
- `bun run test:mcp:hosted` performs the explicitly guarded negative-path check against a hosted
  HTTPS origin; set only the documented base URL and confirmation value.
- `bun run check:cloudflare-types` rejects stale generated Worker binding/runtime types.
- `bun run deploy:dry-run` builds and validates the Cloudflare upload without deploying.
- `bun run lint` runs ESLint and Prettier checks.
- `bun run format` rewrites supported files with Prettier.
- `bun run format:check` checks Prettier formatting without changing files.
- `bun run audit` and `bun run audit:prod` check all and production dependency advisories.
- `bun run check:generated` rejects an uncommitted route-tree change after building.

## Coding Style & Naming Conventions

Prettier enforces 100-character lines, semicolons, double quotes, and trailing commas. TypeScript is
strict. Use two-space indentation, named exports, PascalCase components (`HowItWorks.tsx`),
kebab-case route files (`poster-thanks.tsx`), and the `@/` alias. Reuse existing Tailwind patterns;
do not add a component library or primitive before its first approved product use. Unused locals
and parameters fail validation; use a narrow, explained exception only for an approved preserved
prototype or generated boundary.

## Testing Guidelines

Vitest, jsdom, and React Testing Library cover unit/component/integration tests. Colocate
`*.test.ts(x)` files; prefix tests inside `src/routes/` with `-` so TanStack ignores them as routes.
Use only synthetic `.invalid` fixtures—never patient data or production credentials. Test risk and
behaviour rather than chasing an arbitrary percentage. Playwright owns its local server on port
8085 and checks both desktop and mobile profiles; failure-only artifacts under `test-results/` and
`playwright-report/` are ignored. Automated axe results supplement, not replace, manual keyboard and
assistive-technology review. Do not run concurrent build commands because they share `dist/`.

## Commit & Pull Request Guidelines

Existing history is informal (`Changes`, `Work in progress`, and occasional descriptive fixes). Prefer concise, imperative commits such as `Add peptide eligibility form` or `Fix campaign attribution redirect`. Keep each commit to
one concern.

Follow `CONTRIBUTING.md` and the pull-request template. Explain the change, list validation, link
relevant issues, and include screenshots for visual updates. Call out generated files, dependencies,
or Cloudflare configuration changes.

## Security & Configuration

Never commit secrets, patient information, `.dev.vars*`, or `*.local` files. Every `VITE_*` value is
public. Follow `docs/06-operations/cloudflare-environments-release-runbook.md`; only the repository
owner may push, deploy, promote, or roll back. Treat health claims, eligibility wording, and
privacy-related changes as sensitive and request domain review when their meaning changes.
