---
evidence_id: phase-01-sprint-05-task-17
title: Sprint 05.17 Verification and Closure Evidence
status: owner-checkpoint
date: 2026-08-11
owner: "@Muhns13G"
---

# Sprint 05.17 Verification and Closure Evidence

## Outcome

The complete local Sprint 05 implementation and the currently deployed public boundary pass their
applicable validation. One closure defect was found and corrected: the recovery exercise still
dumped only the schemas present at Task 5.13, so the later `fulfilment_private` trigger dependency
could not restore. The exercise now derives its governed schema set through the latest Task 5.15
migration and restores all six application schemas.

Task 5.17 is ready for the repository-owner checkpoint. Final Sprint 05 closure still requires the
owner to commit and push this task and confirm the required hosted repository workflow passes at
that exact commit. No deployment, provider activation, or real-data operation is authorised.

## Local Evidence

- Bun 1.3.14 and Node 22.22.2 satisfy the repository contract.
- Format, ESLint, strict TypeScript, generated Cloudflare types, route generation, client-bundle
  canary, portability drift, full and production audits, production build, and Cloudflare dry run
  pass.
- Vitest passes 40 files / 237 tests. Playwright passes all 54 desktop/mobile route,
  accessibility, navigation, denial, redirect, security-header, and cache checks.
- Nine migrations reset cleanly. Nine pgTAP suites / 293 assertions and all identity,
  authorisation, command, audit, security-evidence, lifecycle, payment, and fulfilment integration
  exercises pass using synthetic data.
- The controlled incident exercise raises dependency and disabled-break-glass alerts, rejects
  prohibited telemetry fields, and completes detect, triage, contain, recover, and review.
- The encrypted logical recovery exercise restores 125/125 records with matching checksums in nine
  seconds. The isolated database and plaintext working material are removed after the run.

## Current Hosted Boundary

Read-only checks against `https://meneerhealth.co.za` confirm 200 responses for the approved public,
policy, gated and campaign pages; no rendered forms; public/sensitive cache separation; CSP and
HSTS; ordinary private/no-store 404s for unknown, retired MCP, and inactive payment endpoints; and
307 campaign redirects that preserve the approved `/start` attribution parameters.

The managed browser was unavailable after the workstation restart. The complete local managed
Chromium matrix therefore supplies current visual/runtime automation, while the hosted checkpoint
uses direct HTTPS response and rendered-title inspection. Earlier hosted browser evidence remains
historical only. The owner-hosted CI run at the Task 5.17 commit is still required.

## Debt Reconciliation

- Verified: TD-014, TD-015, TD-016, TD-018, TD-019, and TD-055.
- In progress: TD-013, TD-017, and TD-020 retain activation-specific authenticated-journey,
  route-specific abuse, hosted alert/WAF, R2/Better Stack, hosted Stripe webhook, and approved
  partner-callback evidence. Their inactive foundations are complete and fail closed.
- No new technical-debt ID is required. The recovery-schema drift was corrected inside Task 5.17
  before closure and is covered by the repeatable recovery exercise.

## Owner Checkpoint

1. Review and commit the Task 5.17 source and documentation changes without local secrets or test
   artefacts.
2. Push the chosen engineering branch and confirm the required `Repository validation` workflow
   passes at the exact commit.
3. Record the commit and hosted run in this evidence, then change the plan/report state from owner
   checkpoint to verified completion.
