---
task: 7.6
status: completed
date: 2026-08-13
related_debt: [TD-040, TD-046, TD-047]
debt_status: verified-and-regression-assurance
source_baseline: f3a240f
---

# Sprint 07.6 — Cross-Channel Content Verification

## Outcome

Task 7.6 adds a versioned framework-neutral runtime governance map and automated evidence that the
canonical source remains consistent across journey, treatment, policy, support and trust
representations. The map identifies 34 representations: 17 journey projections, five treatments,
two policies, six support routes/states and four trust markers. Duplicate identifiers fail.

The audit found one retained claim sentence still local in the preserved `/start` confirmation.
That exact sentence now derives from the canonical source without changing its wording. All 31
retained claim variants are accounted for: 28 active/preserved variants occur in the canonical
source and the three deliberately displaced timing variants remain rejected history only.

## Verification Boundary

- Five stable journey phase IDs govern three-step marketing, four-event timeline, intake-progress,
  detailed-confirmation and metadata projections; every projection uses known phases in order.
- Treatment cards remain aligned with their five corresponding navigation entries.
- Privacy/Terms navigation and metadata remain paired, while verified and unavailable support
  states remain attached to the canonical support boundary.
- Trust markers are exact-text bound to their claim family/variant records.
- Synthetic lifecycle tests exercise journey, treatment, policy, support and trust content. Draft,
  expired and emergency-withdrawn revisions fail closed; rollback succeeds only by explicitly
  selecting a still-eligible approved historical revision.
- Catalogue duplication, missing selection and invalid/non-contiguous revision histories fail.

## Debt Boundary

TD-040 and TD-046 are **Verified** at the repository content-model boundary. The approved journey
projections and migrated public representations now have one versioned source plus automated drift,
duplicate, lifecycle, withdrawal and rollback evidence. TD-047 remains **Verified** regression
assurance: MCP is still absent and no duplicate MCP content was introduced.

This does not make pending claims domain-approved, close TD-006/TD-007, activate a route or
transaction, or supply missing clinical, legal/privacy, pharmacy, commercial, security or
operational evidence. Claim publication remains fail-closed until those requirements are complete.

## Validation

- Focused runtime-governance, canonical-source, portable-content and claim-register tests pass.
- The complete Vitest suite passes: 54 files and 308 tests.
- The Playwright/axe desktop and mobile matrix passes: 110 tests.
- TypeScript, ESLint, Prettier, production build, generated-output, discovery, portability and
  Cloudflare-type checks pass.
- Bun's full and production dependency audits report no vulnerabilities.
