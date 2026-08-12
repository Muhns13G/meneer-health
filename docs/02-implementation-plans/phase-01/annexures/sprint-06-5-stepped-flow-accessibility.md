---
task: 6.5
status: completed
date: 2026-08-12
related_debt: [TD-038]
debt_status: open-manual-verification
---

# Sprint 06.5 — Stepped-Flow Accessibility

## Outcome

Task 6.5 implements a shared stepped-flow accessibility contract in the preserved `/start` and
`/peptides` prototypes. Neither prototype is activated: the current public gates, approved wording,
and non-transactional behavior remain unchanged.

## Implemented Contract

- Moving forward or backward focuses the newly displayed step heading without focusing the initial
  page heading on load.
- Invalid profile submission renders and focuses the existing linked `role="alert"` summary.
- Each active multi-step sequence exposes determinate `progressbar` values, an accessible current
  step label, and a polite atomic announcement. Progress animation respects reduced-motion
  preferences.
- Back navigation preserves condition, consent, profile, and acknowledgement state held by the
  preserved prototype; it does not place that state in a URL or external system.
- Shared focus logic and progress presentation avoid duplicating behavior between the two flows.

## Evidence and Remaining Gate

Focused component tests verify progress semantics and live text, heading focus after forward and
back transitions, error-summary focus, and retained synthetic profile values after Back navigation.
The full Vitest, Playwright/axe, typecheck, lint, formatting, build, and diff checks pass for this
task.

The prototypes currently perform no asynchronous server submission, so there is no truthful
pending/success/server-error state to expose. Any activated operation must add those live states and
their failure tests. TD-038 remains Open until Task 6.11 completes manual keyboard and
representative screen-reader verification; completion here does not approve either flow for use.
