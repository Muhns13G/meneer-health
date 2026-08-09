## Outcome

<!-- State the user or repository outcome, not only the implementation steps. -->

## Scope and evidence

- Sprint task / issue / technical debt:
- Decision or blueprint links:
- Evidence annexure or completion report:

## Risk and review

- [ ] Public wording and product behaviour are unchanged, or changes are explained below.
- [ ] Clinical, pharmacy, legal/privacy, security, commercial, and operations review needs are identified.
- [ ] No patient information, credentials, private source documents, or production logs are included.
- [ ] Rollback or containment is described where the change affects runtime, data, infrastructure, or a provider.

### Domain approvals or unresolved gates

<!-- Name approved roles/evidence or state “Not applicable”. Never invent approval details. -->

## Change effects

- Dependencies and lockfile:
- Environment or configuration:
- Data, migrations, or external services:
- Generated files:
- Cloudflare/runtime implications:

## Validation

- [ ] `bun install --frozen-lockfile`
- [ ] `bun run format:check`
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `bun run audit`
- [ ] `bun run audit:prod`
- [ ] `bun run build`
- [ ] `bun run check:generated`
- [ ] `bun run deploy:dry-run`
- [ ] `bun run test:e2e` or an explanation below

### Results and exceptions

<!-- Record exact results, skipped checks, known warnings, and follow-up owners. -->

## Visual evidence

<!-- Add before/after screenshots for visual changes using synthetic content; otherwise state “Not applicable”. -->
