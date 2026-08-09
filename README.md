# Meneer Health

Meneer is a South African men's-health product evolving toward a clinically governed telehealth
service. This repository contains the TanStack Start v1 acquisition experience and preserved,
inactive workflow prototypes. It does **not** currently persist or transmit patient, clinical,
payment, pharmacy, fulfilment, or support records.

## Technology

- Bun 1.3.14 with authoritative `bun.lock`
- Node 22 build tooling
- TanStack Start, React 19, TypeScript, Vite, and Tailwind CSS
- Cloudflare Workers v1 hosting
- Vitest/React Testing Library and Playwright/axe validation

## Local Setup

Install [Bun](https://bun.sh/) 1.3.x, then run:

```bash
bun install --frozen-lockfile
bunx playwright install chromium
cp .env.example .env.local
bun run dev
```

The optional public `VITE_*` values are documented in [`.env.example`](.env.example). Never place a
secret or patient information in a `VITE_*` variable.

## Validation

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run audit
bun run audit:prod
bun run build
bun run check:generated
bun run deploy:dry-run
bun run test:e2e
```

`deploy:dry-run` validates the Cloudflare upload but does not deploy. See the
[testing and CI guide](docs/06-operations/testing-ci-guide.md) for test layers, artifacts, CI
behaviour, and troubleshooting.

## Repository Map

- `src/routes/` — file-based routes and campaign redirects
- `src/components/` — current product sections and shared components
- `src/lib/`, `src/hooks/` — shared logic and hooks
- `src/assets/`, `src/styles.css` — local assets and global styles
- `e2e/` — controlled desktop/mobile Playwright and axe checks
- `docs/` — blueprints, audits, implementation plans, evidence, decisions, and operations
- `.github/workflows/ci.yml` — read-only repository validation; no deployment

`src/routeTree.gen.ts` is generated. Do not edit it manually.

## Authoritative Guidance

Read [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md) before changing the repository.
Product and architecture direction comes from the
[master blueprint](docs/00-blueprints/master-blueprint-v1.md) and
[approved decision records](docs/07-decisions/README.md). The
[verified current state](docs/RAG/02-current-state.md) distinguishes implemented behaviour from
planned capability; the [technical-debt registry](docs/04-technical-debt/technical-debt-registry-v1.md)
owns remaining acceptance gates.

## Release Boundary

Cloudflare is the approved v1 host. `itws-I` is the permanent source boundary;
`itws-I-preview` temporarily carries the draft video and serves the canonical review deployment.
Only the repository owner may push, merge, deploy, promote, or roll back. Follow the
[Cloudflare release runbook](docs/06-operations/cloudflare-environments-release-runbook.md).

## Security

Never commit secrets, patient information, private source documents, `.dev.vars*`, or local
environment files. Report suspected vulnerabilities privately using [SECURITY.md](SECURITY.md),
not a public issue.
