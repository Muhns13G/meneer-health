---
task: 6.2
status: completed
date: 2026-08-12
related_debt: [TD-035]
---

# Sprint 06.2 — Route-Aware Shared Navigation

## Outcome

Task 6.2 replaces shared page-local hashes with route-aware TanStack Router links. Treatment links
now resolve to `/#treatments`, “How It Works” resolves to `/#how`, and Peptides continues to resolve
to `/peptides`. The change preserves all approved customer-facing wording and does not alter route
availability, treatment intent, campaign attribution, or mobile disclosure behaviour.

## Verified Surface

The shared navigation matrix covers every retained route that consistently renders both the shared
header and footer: `/`, `/contact`, `/privacy`, and `/terms`. On desktop and Pixel 7 profiles it
verifies:

- the logo/home destination and Start call to action;
- all four treatment links, Peptides, and “How It Works”;
- Privacy, Terms, and Contact footer destinations; and
- an actual cross-route “How It Works” transition ending at a visible `/#how` section.

Restricted and campaign routes intentionally use gates or campaign-specific chrome, so they are not
represented as shared-navigation surfaces. Mobile menu disclosure semantics, focus handling, Escape
behaviour, and resize/route-change closure remain Task 6.6 and TD-039.

## Evidence

- `src/components/Nav.test.tsx` asserts the exact route-aware destinations.
- `e2e/navigation.spec.ts` passes 10 focused desktop/mobile navigation cases.
- The complete Sprint 6.2 validation matrix passes before handoff.

TD-035 is Verified. No new technical debt was introduced.
