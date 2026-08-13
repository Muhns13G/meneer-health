---
task: 7.5
status: completed
date: 2026-08-13
related_debt: [TD-006, TD-040, TD-046]
debt_status: in-progress
source_baseline: 6ba020a
---

# Sprint 07.5 — Canonical Public-Content Migration

## Outcome

Task 7.5 introduces `content/public-content.ts` as the framework-neutral runtime source for the
active website, metadata, campaign, support and retained prototype representations. Twenty-two
React, route and shared-library consumers now import this source instead of maintaining independent
copies. The module contains no React, router, provider, database, workflow or private-data state and
can be retained across the planned framework generations.

Established Meneer voice and proposition wording remain intact. The owner approved exactly three
replacements needed to align rejected timing statements with Task 7.2:

- “Initial clinical review targeted within 48 hours of a complete intake.”
- “Five minutes of honesty. A real doctor on the other side. If treatment is approved, pharmacy
  and delivery follow.”
- “Target 3–5 business days after fulfilment approval.”

No other intentional customer-facing rewrite belongs to this task.

## Claim and Publication Boundary

The claim register retains the three displaced variants as rejected historical records and adds the
three replacements as `pending-evidence`. The current register therefore contains 31 variants: 28
pending evidence, three rejected and zero domain-approved. Centralising owner-approved wording does
not supply missing clinical, legal/privacy, pharmacy, commercial, security or operational evidence.

Task 7.5 changes no route availability, transaction, analytics, provider, MCP, CMS or database
capability. TD-006, TD-040 and TD-046 remain **In progress**. Task 7.6 owns exhaustive channel-drift,
duplicate, expiry, withdrawal, version and rollback proof before content-model debt can close.

## Validation

- A dedicated contract test pins the established brand/proposition wording and the three approved
  replacements.
- The test requires all 22 migrated consumers to import the canonical module and prevents the three
  rejected runtime variants from reappearing there.
- Each replacement is exact-text bound to its pending-evidence claim record.
- Campaign destinations, support channels and established metadata values remain pinned.
- Focused content/claim tests and strict TypeScript validation pass; the complete repository matrix
  is required before commit.
