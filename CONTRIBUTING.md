# Contributing to Meneer Health

## Start With the Accepted Scope

Before editing, read:

1. [AGENTS.md](AGENTS.md) for repository rules and commands.
2. The current sprint plan under `docs/02-implementation-plans/`.
3. The relevant entries in the
   [technical-debt registry](docs/04-technical-debt/technical-debt-registry-v1.md).
4. The [decision-record index](docs/07-decisions/README.md) and
   [verified current state](docs/RAG/02-current-state.md).

Do not infer that planned clinical, patient, payment, pharmacy, or operational capability already
exists. Unknown names, registrations, prices, approvals, and operating evidence remain explicit
gates; do not invent them.

## Make a Scoped Change

- Keep each task and commit to one concern. Use concise imperative subjects such as
  `Add CI validation workflow`.
- Preserve approved public messaging unless the task includes evidenced content review.
- Request the applicable domain review for health claims, eligibility, privacy, security,
  clinical, pharmacy, commercial, or fulfilment meaning.
- Add dependencies only with an implemented use, reachability evidence, and bounded audit review.
  Do not run broad or forced dependency updates.
- Do not manually edit `src/routeTree.gen.ts`; run the supported build and consistency check.
- Keep `itws-I` free of the preview-only video binary.

Only the repository owner may push, merge, deploy, promote, or roll back.

## Validate the Outcome

At minimum, run:

```bash
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run audit
bun run audit:prod
bun run build
bun run check:generated
bun run deploy:dry-run
```

Run `bun run test:e2e` for routes, redirects, navigation, rendering, accessibility, or other
browser-relevant changes. Include screenshots for visual changes. Use only synthetic fixtures and
review all logs, screenshots, traces, snapshots, and reports before sharing them.

The [testing and CI guide](docs/06-operations/testing-ci-guide.md) explains command ownership,
failure artifacts, and hosted validation.

## Document and Submit

Use the pull-request template. State the outcome, link the sprint task or debt item, identify risks
and domain approvals, list migrations/configuration/dependency effects, and record exact validation.
Include rollback notes where a change affects runtime, data, infrastructure, or an external service.

Update implementation plans, evidence annexures, the technical-debt registry, RAG documents, and
decision indexes when their asserted state changes. Do not mark debt Verified without its required
acceptance evidence.

For security issues, follow [SECURITY.md](SECURITY.md) and do not create a public issue.
