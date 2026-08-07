---
plan_id: phase-01-sprint-02
title: Lovable Exit and Cloudflare Runtime Ownership
status: completed
primary_debt: [TD-025, TD-027, TD-041, TD-049, TD-051, TD-052, TD-053]
depends_on: [phase-01-sprint-01]
last_updated: 2026-08-08
owner: "@Muhns13G"
---

# Sprint 02 — Lovable Exit and Cloudflare Runtime Ownership

## Mission

Remove unintended Lovable ecosystem coupling while preserving verified v1 behaviour on an
explicit, supported TanStack Start deployment for Cloudflare Workers. Make every build plugin,
runtime adapter, environment variable, asset, endpoint, dependency, deployment action, and rollback
boundary owned and understandable.

## Approved Platform Direction

Cloudflare is the selected v1 host for the TanStack pilot. The current `itws-I-preview` build is
served at `https://meneerhealth.co.za` because it carries the isolated draft video. That mapping is
an approved temporary review boundary, not permission to merge the video into permanent `itws-I`
history or silently redefine branch ownership.

Vercel remains a possible v2 Next.js host, but it is not a Sprint 02 target. Vercel Hobby is limited
to non-commercial personal use, while Meneer is a commercial pilot. Moving v1 would also add a host
migration to the Lovable exit without improving the current verified deployment.

The public MCP surface is not required for the pilot and will be removed with its Lovable SDK,
generated routes, OAuth metadata, and manifest. The two canonical `/go/...` redirects and ordinary
TanStack SSR remain in scope.

### Decision basis

- Cloudflare officially supports TanStack Start through its Vite plugin and Workers runtime; the
  current repository already deploys successfully through that path.
- Workers Free documents 100,000 dynamic requests per day, 10 ms CPU per invocation, 128 MB memory,
  and free ordinary static-asset requests. These limits are suitable for the current lightweight
  review surface but must be monitored as server work grows.
- Vercel supports TanStack Start through Nitro, but its Hobby plan is restricted to non-commercial
  personal use. Meneer's commercial pilot would therefore require a paid Vercel plan.
- Selecting Cloudflare for v1 does not select Cloudflare-native patient storage or domain logic.
  Backend, data, identity, email, and payment decisions remain portable and belong to later sprints.

Official references: [Cloudflare TanStack Start](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[Vercel TanStack Start](https://vercel.com/docs/frameworks/full-stack/tanstack-start), and
[Vercel Hobby](https://vercel.com/docs/plans/hobby).

## Intended Outcome

The application installs, develops, builds, previews, and deploys through explicit TanStack Start,
React, Tailwind, Vite, and Cloudflare configuration. It contains no Lovable package, telemetry path,
manifest, virtual-asset dependency, generated SDK route, environment behaviour, or fallback
branding. Local and hosted behaviour, logs, branch roles, promotion, and rollback are documented
and verified without changing established customer-facing messaging.

## Scope

Primary debt: TD-025, TD-027, TD-041, TD-049, and TD-051–TD-053.

### Task 2.1 — Approve the host and refresh the sprint contract

1. Record Cloudflare as the selected v1 host under DIR-030 and TD-052.
2. Replace the obsolete Vercel-specific implementation plan and acceptance criteria.
3. Preserve Vercel as a later v2 consideration rather than a current dependency.
4. Synchronize the blueprint, phase index, debt registry, RAG corpus, and document routing.

Evidence: [`sprint-02-1-hosting-and-scope-decision-evidence.md`](annexures/sprint-02-1-hosting-and-scope-decision-evidence.md)
— verified 7 August 2026.

### Task 2.2 — Capture the pre-exit baseline

1. Record the dependency graph and classify build-time, runtime, client, and server reachability.
2. Capture clean install, typecheck, lint, build, warnings, output structure, routes, headers,
   server behaviour, bundle artefacts, and Lovable/Cloudflare references.
3. Capture local and canonical-host responses for retained routes, redirects, assets, and MCP before
   removal.
4. Record the current Cloudflare build/deploy configuration and reversible source boundary.

Evidence: [`sprint-02-2-pre-exit-baseline-evidence.md`](annexures/sprint-02-2-pre-exit-baseline-evidence.md)
— verified 7 August 2026.

### Task 2.3 — Own the TanStack and Cloudflare configuration

1. Replace `@lovable.dev/vite-tanstack-config` with explicit standard Vite configuration.
2. Configure the supported TanStack Start, Cloudflare, React, Tailwind, and TypeScript-path plugins
   in the required order.
3. Retain and normalize `@cloudflare/vite-plugin`, `wrangler.jsonc`, `nodejs_compat`, the Worker
   entry point, and the supported compatibility date.
4. Preserve routing, SSR, aliases, import protection, HMR, static assets, and preview behaviour.
5. Resolve owned build warnings or record a bounded, evidenced exception.

Evidence: [`sprint-02-3-cloudflare-runtime-ownership-evidence.md`](annexures/sprint-02-3-cloudflare-runtime-ownership-evidence.md)
— verified 7 August 2026.

### Task 2.4 — Remove the Lovable MCP surface

1. Remove `@lovable.dev/mcp-js` and its Vite plugin.
2. Remove generated MCP invocation, tool-listing, OAuth metadata, and `/mcp` routes.
3. Remove `.lovable/mcp/manifest.json` and the custom MCP definitions that no longer have a runtime
   consumer.
4. Regenerate the TanStack route tree through supported tooling; do not edit it manually.
5. Verify removed endpoints return the approved not-found response and no unrelated route changes.

Evidence: [`sprint-02-4-mcp-removal-evidence.md`](annexures/sprint-02-4-mcp-removal-evidence.md)
— verified locally 7 August 2026; hosted removal confirmed in Task 2.8.

### Task 2.5 — Remove telemetry behaviour and normalize dependencies

1. Remove Lovable-only environment handling and `bunfig.toml` package-age exceptions.
2. Prove `LOVABLE_API_KEY` is neither required nor referenced and no Lovable telemetry is emitted.
3. Classify dependencies by deployed reachability and move build-only packages where supported.
4. Regenerate and verify `bun.lock` through bounded Bun operations.
5. Re-run the production dependency audit and preserve unrelated remediation for its assigned sprint.

Evidence: [`sprint-02-5-telemetry-dependency-evidence.md`](annexures/sprint-02-5-telemetry-dependency-evidence.md)
— verified locally 7 August 2026; hosted network/log absence confirmed in Task 2.8.

### Task 2.6 — Replace remaining Lovable identity

1. Replace root, error, and fallback metadata with approved Meneer values.
2. Verify titles, descriptions, canonical behaviour, Open Graph, Twitter, author, and not-found
   rendering across route types.
3. Preserve established page messaging and route-specific metadata unless a separately approved
   correction is required.
4. Prove no active source or built output presents Lovable as the application or author.

Evidence: [`sprint-02-6-meneer-metadata-evidence.md`](annexures/sprint-02-6-meneer-metadata-evidence.md)
— verified locally 7 August 2026; hosted metadata confirmed in Task 2.8.

### Task 2.7 — Define Cloudflare environments and release operations

1. Document local, preview/review, and production-equivalent build/runtime expectations plus
   supported Bun and Node compatibility versions.
2. Define the secret-free environment-variable contract; secrets remain server-only and never use
   a `VITE_` prefix.
3. Record the temporary `itws-I-preview` canonical mapping and the permanent `itws-I` source
   boundary without silently changing either branch.
4. Verify SSR, client navigation, direct loads, assets, errors, redirects, retained server
   behaviour, headers, logs, and cold starts on Cloudflare.
5. Document owner-controlled deployment, promotion, rollback, and post-deploy verification. The
   repository owner performs GitHub pushes and production actions.

Evidence: [`sprint-02-7-cloudflare-release-evidence.md`](annexures/sprint-02-7-cloudflare-release-evidence.md)
— verified 7 August 2026 after the owner committed, pushed, and deployed the Task 2.7 boundary.

### Task 2.8 — Verify and close Sprint 02

1. Run clean-install, type, lint, build, audit, static-search, route, browser, log, and rollback
   validation proportionate to the changed boundary.
2. Compare results with the Task 2.2 baseline and explain every intentional difference.
3. Update TD-025, TD-027, TD-041, TD-049, and TD-051–TD-053 only where acceptance evidence passes.
4. Reconcile the implementation plan, technical-debt registry, blueprint, RAG corpus, and index.
5. Produce the Sprint 02 completion report using the approved recurring report structure.

Evidence: [`sprint-02-8-verification-and-closure-evidence.md`](annexures/sprint-02-8-verification-and-closure-evidence.md)
— verified 8 August 2026. All seven primary debt items are Verified and Sprint 02 is closed.

## Task and Commit Protocol

Each task is an independently reviewable boundary. After validation, stop for repository-owner
review and manual commit before beginning the next task. Do not combine later-task implementation,
unrelated formatting, dependency upgrades, or generated output into an earlier task. Codex does not
push to GitHub or perform production deployment actions.

## Required Inputs

- Sprint 01 route, asset, campaign, and containment evidence.
- Canonical public origin: `https://meneerhealth.co.za`.
- Current Cloudflare project/build access and hosted logs.
- Approved temporary branch/video boundary for `itws-I-preview` and permanent `itws-I`.
- Approved Meneer root metadata values derived from established page metadata.
- Repository-owner review and commit after every completed task.

No PostgreSQL, authentication, email, payment, clinical workflow, or health-information storage
provider is selected or implemented in this sprint.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| TD-025 | Warning inventory shows each selected-host build warning removed or explicitly accepted with owner, scope, and regression evidence.     |
| TD-027 | Dependency classification and production reachability are documented; build-only packages are correctly scoped and audits are recorded. |
| TD-041 | Rendered metadata and social previews use approved Meneer values on root, route, error, and not-found surfaces.                         |
| TD-049 | `LOVABLE_API_KEY` and the Lovable SDK are absent; local and hosted evidence shows no Lovable telemetry path.                            |
| TD-051 | No import, package, environment behaviour, hidden default, or asset proxy from the Lovable Vite wrapper remains.                        |
| TD-052 | Cloudflare is documented as the v1 host; explicit configuration, local/hosted behaviour, logs, branch roles, and rollback are verified. |
| TD-053 | MCP and its generated/OAuth surfaces are removed from routes, packages, manifests, build output, and hosted behaviour.                  |

## Validation

- Run `bun install --frozen-lockfile` in a clean checkout or equivalent isolated environment.
- Run `bunx tsc --noEmit`, `bun run lint`, and `bun run build`; distinguish known Sprint 04 lint
  debt from newly introduced failures.
- Search tracked source and built artefacts for `lovable`, `__l5e`, `LOVABLE_`, and `.lovable`;
  justify historical documentation references only.
- Verify every public page, direct deep link, 404/error path, asset, campaign redirect, header, and
  retained server boundary locally and on the canonical Cloudflare deployment.
- Verify removed MCP and OAuth routes no longer expose protocol responses.
- Inspect browser network activity and Cloudflare logs for unexpected telemetry or runtime errors.
- Prove the documented rollback path without pushing, changing the canonical deployment, or
  performing production actions on behalf of the owner.

## Non-Goals

- Migrating to Next.js or Vercel.
- Selecting or implementing the patient backend, database, authentication, email, payment, or
  clinical integrations.
- Replacing Lovable with Cloudflare-specific domain rules or authoritative patient state.
- Rewriting approved marketing copy or redesigning the website.
- Reintroducing MCP without a named use case and separately approved vendor-neutral boundary.

## Risks and Rollback

The Lovable wrapper currently hides plugin order, Nitro, sandbox, alias, import-protection, HMR, and
build defaults. Remove one concern at a time and compare it with Task 2.2 evidence. Cloudflare
Workers is not a general Node.js server; retained packages must be verified against the actual
runtime despite `nodejs_compat`.

Keep the last known deployable commit available throughout the sprint. Do not alter production
branch mapping or merge the preview-only video into permanent history as part of de-platforming.
If a task fails its acceptance boundary, revert only that bounded task before proceeding; never
restore Lovable telemetry merely to hide an unexplained failure.

## Documentation and RAG Updates

- Add a Cloudflare deployment/environment and rollback guide.
- Update `AGENTS.md` after the explicit runtime and commands are verified.
- Update the assigned debt only after verification.
- Refresh platform references in `docs/00-blueprints/master-blueprint-v1.md`, the Phase 1 index,
  `docs/RAG/01-project-context.md` through `06-known-limitations.md`, and `07-index.json` where the
  changed facts are in scope.
- Produce
  `docs/03-completion-reports/phase-01/sprint-02-lovable-exit-cloudflare-runtime.md` at Task 2.8.
