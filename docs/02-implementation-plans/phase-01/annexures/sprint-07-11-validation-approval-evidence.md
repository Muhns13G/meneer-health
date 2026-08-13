---
evidence_id: phase-01-sprint-07-task-11
title: Sprint 07 Task 7.11 Validation and Approval Evidence
status: owner-checkpoint
date: 2026-08-13
owner: "@Muhns13G"
source_baseline: 1a89b5c
---

# Sprint 07 Task 7.11 — Validation and Approval Evidence

## Outcome

The complete local validation matrix passes for the Sprint 07 implementation. The canonical hosted
boundary also confirms that measurement remains disabled, MCP remains absent, and inactive mutation
routes fail closed. Task 7.11 is ready for the repository-owner checkpoint; it is not release- or
activation-approved yet.

No clinical, legal, privacy, security, or release approval has been inferred. Existing pending
claim evidence and inactive measurement remain gated. The local branch is two commits ahead of
`origin/itws-I`, so the exact Sprint 07.9–7.11 state has not yet received hosted GitHub CI evidence.

## Complete Technical Evidence

| Boundary                | Result                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Toolchain and install   | Bun 1.3.14, Node 22.22.2, and frozen dependency installation pass.                                                                               |
| Static and unit checks  | Prettier, ESLint, strict TypeScript, Cloudflare types, discovery, portability, 58 Vitest files and 323 tests pass.                               |
| Database                | All 15 migrations reset cleanly; 11 pgTAP files and 336 assertions, database lint, and every synthetic integration exercise pass.                |
| Safety exercises        | Controlled incident and encrypted synthetic recovery exercises pass; recovery reconciles 125/125 records.                                        |
| Supply chain and build  | Full/production audits report no advisories; production build, client-bundle canary, generated routes, MCP absence, and Worker dry-run pass.     |
| Browser                 | 118/118 Playwright/axe checks pass across desktop Chromium and Pixel 7/mobile Chromium.                                                          |
| Hosted measurement      | Public read is 200; both measurement routes remain hidden with zero response payload fields, cookies, or CORS access.                            |
| Hosted MCP              | All five retired-route probes pass with ordinary GET 404s or generic POST denials and no protocol payload, cookie, or CORS access.               |
| Hosted request security | Unregistered, cross-origin preflight, and disabled-checkout probes return private no-store 404 boundaries with no CORS or logged payload fields. |

The canonical source, claim bindings, cross-channel mappings, metadata, campaign/support content,
and rendered routes are covered by the unit, contract, portability, build, and browser suites. The
measurement canaries cover prohibited identity, health, URL/referrer, free-text, replay, payment,
credential, retention, export, deletion, opt-out, and access paths. Local, built, and hosted checks
continue to prove MCP absence.

## Approval and Activation Inventory

| Authority                 | Recorded position                                                                                                                                | Remaining gate                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Repository/business owner | Canonical journey, preserved-copy replacements, first-party measurement specification, default-off implementation, and MCP absence are approved. | Review and commit this checkpoint; then obtain exact-commit GitHub CI evidence.                                                           |
| Content governance        | One versioned source, lifecycle, mappings, and rollback boundary are verified.                                                                   | Twenty-eight retained claim variants remain pending domain evidence; rejected variants remain unpublished history.                        |
| Clinical/legal/pharmacy   | No named role-holder approval is recorded by this task.                                                                                          | Required evidence and approvals must be attached before affected claims or transactional pathways activate under TD-006/TD-007.           |
| Privacy/security          | Inactive controls and synthetic proofs pass; no collection is active.                                                                            | Measurement requires an approved public consent interface and explicit privacy/security release approval before `MEASUREMENT_MODE=pilot`. |
| MCP                       | Absence and future reintroduction gates are owner-approved and technically verified.                                                             | Any implementation requires a new use case, threat model, privacy/security review, domain review where applicable, and release decision.  |
| Release                   | Local CI-equivalent validation, build, dry-run, browser matrix, and current hosted negative boundaries pass.                                     | The exact commit must pass required GitHub checks and be deployed/verified by the repository owner.                                       |

## Configuration Finding

The guarded hosted treatment-intent exercise confirmed that the Worker still issues a secure opaque
cookie, but the cookie could not be opened with the key in ignored `.env.production.local`. This
means the deployed Worker and local verification environment currently use different
`JOURNEY_INTENT_ENCRYPTION_KEY_BASE64` values. No secret value was printed or written to the
repository.

Before exact-release verification, the owner must choose the intended production key, align the
Cloudflare secret and ignored local verification record, deploy the exact approved commit, and rerun
`test:intent:hosted`. Rotating the key invalidates only the short-lived 30-minute navigation cookie;
it does not affect identity, consent, intake, or clinical records.

## Owner Checkpoint

1. Review and commit Task 7.11 without secrets or generated test artefacts.
2. Push the chosen engineering branch and confirm the required GitHub workflow passes at the exact
   commit.
3. Align the journey-intent key through the approved secret-management process, deploy, and rerun
   the guarded hosted intent exercise successfully.
4. Keep measurement disabled and claims/pathways gated unless the missing named approvals are
   separately supplied.
5. Record the commit, workflow, deployment, and hosted-intent result during Task 7.12 closure.
