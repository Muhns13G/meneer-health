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
- `src/routeTree.gen.ts` is generated routing output; do not edit it manually.
- Root configuration lives in `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, and `wrangler.jsonc`.

## Build, Test, and Development Commands

Use Bun and keep `bun.lock` synchronized with dependency changes.

- `bun install` installs dependencies.
- `bun run dev` starts the local Vite development server.
- `bun run build` creates the production bundle and catches integration errors.
- `bun run build:dev` builds with development-mode settings.
- `bun run preview` serves the built output locally.
- `bun run typecheck` runs strict TypeScript validation without emitting files.
- `bun run deploy:dry-run` builds and validates the Cloudflare upload without deploying.
- `bun run lint` runs ESLint and Prettier checks.
- `bun run format` rewrites supported files with Prettier.
- `bun run format:check` checks Prettier formatting without changing files.
- `bun audit` checks installed packages for vulnerabilities.

No automated test command or test framework is currently configured. Until one is added, run lint, typecheck, build, and manual route/responsive checks.

## Coding Style & Naming Conventions

Prettier enforces 100-character lines, semicolons, double quotes, and trailing commas. TypeScript is
strict. Use two-space indentation, named exports, PascalCase components (`HowItWorks.tsx`),
kebab-case route files (`poster-thanks.tsx`), and the `@/` alias. Reuse existing Tailwind patterns;
do not add a component library or primitive before its first approved product use. Unused locals
and parameters fail validation; use a narrow, explained exception only for an approved preserved
prototype or generated boundary.

## Testing Guidelines

When adding tests, colocate future `*.test.ts(x)` files near the code and add the runner to `package.json`. Prioritize
routes, forms, navigation, redirects, and server responses. Record manual checks in the pull request.

## Commit & Pull Request Guidelines

Existing history is informal (`Changes`, `Work in progress`, and occasional descriptive fixes). Prefer concise, imperative commits such as `Add peptide eligibility form` or `Fix campaign attribution redirect`. Keep each commit to
one concern.

Pull requests should explain the change, list validation, link relevant issues, and include screenshots for visual updates. Call out generated files, dependencies, or Cloudflare configuration changes.

## Security & Configuration

Never commit secrets, patient information, `.dev.vars*`, or `*.local` files. Every `VITE_*` value is
public. Follow `docs/06-operations/cloudflare-environments-release-runbook.md`; only the repository
owner may push, deploy, promote, or roll back. Treat health claims, eligibility wording, and
privacy-related changes as sensitive and request domain review when their meaning changes.
