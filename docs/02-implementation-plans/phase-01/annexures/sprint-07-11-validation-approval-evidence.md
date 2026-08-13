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
claim evidence and inactive measurement remain gated. The owner subsequently pushed the exact Task
7.11 commit, confirmed GitHub CI passes, and updated the Cloudflare deployment. Hosted intent
runtime-secret proof remains the final Task 7.11 owner checkpoint.

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
| Repository/business owner | Canonical journey, preserved-copy replacements, first-party measurement specification, default-off implementation, and MCP absence are approved. | Review and commit the runtime-secret correction.                                                                                          |
| Content governance        | One versioned source, lifecycle, mappings, and rollback boundary are verified.                                                                   | Twenty-eight retained claim variants remain pending domain evidence; rejected variants remain unpublished history.                        |
| Clinical/legal/pharmacy   | No named role-holder approval is recorded by this task.                                                                                          | Required evidence and approvals must be attached before affected claims or transactional pathways activate under TD-006/TD-007.           |
| Privacy/security          | Inactive controls and synthetic proofs pass; no collection is active.                                                                            | Measurement requires an approved public consent interface and explicit privacy/security release approval before `MEASUREMENT_MODE=pilot`. |
| MCP                       | Absence and future reintroduction gates are owner-approved and technically verified.                                                             | Any implementation requires a new use case, threat model, privacy/security review, domain review where applicable, and release decision.  |
| Release                   | Local CI-equivalent validation, build, dry-run, browser matrix, exact-commit GitHub CI, deployment, and hosted negative boundaries pass.         | The required runtime secret must be deployed to the active Worker and the hosted intent exercise must pass.                               |

## Configuration Finding

After the owner pushed the exact Task 7.11 commit and GitHub CI passed, the guarded hosted exercise
received the safe `303 /start` redirect without a `Set-Cookie` header. The route, origin, payload,
request-security and redirect boundaries therefore pass; the active Worker does not receive a
usable `JOURNEY_INTENT_ENCRYPTION_KEY_BASE64` runtime binding. The owner reports the intended
Cloudflare and ignored local values are the same, but secret values cannot and were not read back.

`wrangler.jsonc` now declares the binding as a required secret and generated Worker types include
it. This prevents a future Worker upload from silently omitting the runtime dependency. The owner
must confirm it exists under the Worker's runtime **Variables and Secrets**, deploy that binding to
the active version, and rerun `test:intent:hosted`. A build-only secret or an undeployed saved
version is insufficient. No secret value was printed or written to the repository.

## Owner Checkpoint

1. Review and commit the required-runtime-secret correction without secrets or generated test
   artefacts.
2. Confirm the key is a runtime Worker secret, deploy the binding, and rerun the guarded hosted
   intent exercise successfully.
3. Keep measurement disabled and claims/pathways gated unless the missing named approvals are
   separately supplied.
4. Record the correction commit, workflow, deployment, and hosted-intent result during Task 7.12
   closure.
