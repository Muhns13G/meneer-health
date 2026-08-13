---
task: 7.3
status: completed
date: 2026-08-13
related_debt: [TD-040, TD-046]
debt_status: in-progress
source_baseline: 3c88b78
---

# Sprint 07.3 — Public-Content Governance Contract

## Outcome

Task 7.3 implements `public-content.catalogue@1` as a strict, framework-neutral contract in the
repository's portable `contracts/` boundary. It governs versioned public-content records,
localisation, ownership, required approvals, channel scope, effective/review/expiry dates, draft
history, release selection, archive evidence, emergency withdrawal, and fail-closed content
selection.

No existing website string, route metadata, campaign, support explanation, treatment card, journey
projection, or preserved prototype consumes the catalogue yet. Task 7.5 owns that migration after
Task 7.4 adds the claim register and claim-specific publication controls.

## Implemented Contract

- Contract identity: `public-content.catalogue@1` with strict-major compatibility.
- Catalogue identity: dated, monotonically revisable `YYYY.MM.DD.N` versions and an explicit
  default locale.
- Record identity: stable non-framework content IDs, a selected revision, and contiguous revision
  history with explicit supersession.
- Content kinds: treatments, canonical journey phases, channel projections, support routes,
  pricing state, policies, trust markers, metadata, and campaign messages.
- Canonical phase IDs: the five owner-approved Task 7.2 phases.
- Projection IDs: three-step marketing, four-event journey, intake progress, detailed confirmation,
  and campaign/metadata.
- Channels: homepage, route, legal, campaign, poster, metadata, social preview, support script,
  lifecycle message, and a deliberately future-only public MCP channel.
- Localisation: explicit BCP-47-style locale entries; every selected record must contain the
  catalogue default locale.
- Ownership: one accountable role plus unique required domain-approval roles per revision.
- Lifecycle: draft, approved, rejected, withdrawn, and archived states with strict state evidence.
- Dates: approved content requires effective and review timestamps; review/expiry must follow
  effectiveness and every approval must precede effectiveness.
- Emergency withdrawal: typed reason, time, accountable withdrawing role, and optional replacement
  content ID. Withdrawn content cannot resolve for publication.
- Archive: typed time, owner, and reason. Archived content cannot resolve for publication.

## Fail-Closed Selection

`selectPublicContent` returns a value only when all of the following agree:

1. the selected revision exists and is approved;
2. the requested channel is allowlisted;
3. the requested locale exists;
4. the effective time has started;
5. neither the review deadline nor optional expiry has been reached; and
6. every required approval role has approved the revision.

Draft, rejected, withdrawn, archived, missing, premature, overdue, expired, wrong-channel,
wrong-locale, or incomplete-approval content returns no publishable value. A newer draft may coexist
with the selected approved revision. Rollback selects an earlier still-eligible approved revision;
it does not mutate public copy or manufacture approval.

## Pricing and Sensitive-State Boundaries

The catalogue describes only approved public pricing state. An approved ZAR price requires a
version and integer minor-unit amount together; unpublished pricing cannot expose both as a
publishable price. The catalogue remains separate from authoritative clinical, payment, identity,
order, pharmacy, custody, delivery, cancellation, and refund state.

Content values contain serialisable public data only. Routes, React components, framework objects,
provider clients, database records, credentials, patient data, questionnaire answers, clinical
decisions, or other private runtime state are not accepted as catalogue fields.

## Portability Evidence

- The contract kind and schema are exported from `contracts/` and registered for v1 TanStack, v2
  Next.js, and v3 Laravel/React.
- CAP-001 now references `public-content.catalogue@1` as the portable authority for approved public
  site routes and brand content.
- Synthetic fixture PORT-021 proves another generation can validate the same content envelope.
- The portability checker now validates 14 capabilities, 15 contract majors, and 21 fixtures.

## Validation

- Focused Vitest: `contracts/public-content.test.ts` and `contracts/portability.test.ts` pass with
  14 tests.
- `bun run check:portability`: passes with 14 capabilities, 15 contract majors, and 21 fixtures.
- `bun run typecheck`: passes.
- Complete format, lint, test, build, generated-output, and diff validation are required before the
  task is committed.

## Debt Boundary

TD-046 moves to **In progress**. The portable governance contract exists, but the retained website
and channel representations still use their current local constants until Tasks 7.4–7.6 complete
claim governance, migration, and drift/rollback evidence. TD-040 remains In progress for the same
reason.

Task 7.3 does not approve any claim, close TD-006/TD-007, activate a transaction or future MCP,
choose an analytics provider, or create a CMS/database dependency.
