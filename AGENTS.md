# Repository Guidelines

## Project Structure & Module Organization

This Bun-managed TanStack Start app uses React, TypeScript, Vite, Tailwind CSS, and Cloudflare.

- `src/routes/` contains file-based pages and server endpoints. Dynamic or special paths use bracketed folders, such as `src/routes/[.mcp]/`.
- `src/components/` holds site sections; reusable Radix/shadcn-style primitives live in `src/components/ui/`.
- `src/lib/mcp/` defines the public MCP server and its tools.
- `src/hooks/` and `src/lib/` contain shared code. Images and generated asset metadata live in `src/assets/`; global styles are in `src/styles.css`.
- `src/routeTree.gen.ts` is generated routing output; do not edit it manually.
- Root configuration lives in `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, and `wrangler.jsonc`.

## Build, Test, and Development Commands

Use Bun and keep `bun.lock` synchronized with dependency changes.

- `bun install` installs dependencies.
- `bun run dev` starts the local Vite development server.
- `bun run build` creates the production bundle and catches integration errors.
- `bun run build:dev` builds with development-mode settings.
- `bun run preview` serves the built output locally.
- `bun run lint` runs ESLint and Prettier checks.
- `bun run format` rewrites supported files with Prettier.
- `bun audit` checks installed packages for vulnerabilities.

No automated test command or test framework is currently configured. Until one is added, run `bun run lint` and `bun run build`, then manually verify affected routes and responsive states.

## Coding Style & Naming Conventions

Prettier enforces 100-character lines, semicolons, double quotes, and trailing commas. TypeScript runs in strict mode. Use two-space indentation, named component exports, PascalCase component files (`HowItWorks.tsx`), kebab-case route and MCP files (`poster-thanks.tsx`, `list-treatments.ts`), and the `@/` import alias. Follow existing Tailwind patterns and reuse `components/ui` primitives instead of duplicating them.

## Testing Guidelines

When adding tests, colocate `*.test.ts` or `*.test.tsx` near the code and add the runner to `package.json`. Prioritize routes, forms, navigation, and MCP responses. For MCP changes, verify both tool-listing and invocation endpoints. Document manual checks in the pull request.

## Commit & Pull Request Guidelines

Existing history is informal (`Changes`, `Work in progress`, and occasional descriptive fixes). Prefer concise, imperative commits such as `Add peptide eligibility form` or `Fix MCP treatment response`. Keep each commit scoped to one concern.

Pull requests should explain the change, list validation, link relevant issues, and include screenshots for visual updates. Call out generated files, dependencies, or Cloudflare configuration changes.

## Security & Configuration

Never commit secrets, patient information, `.dev.vars`, or `*.local` files. Document environment variables in the pull request. Treat health claims, eligibility wording, and privacy-related changes as sensitive and request domain review when their meaning changes.
