---
evidence_id: phase-01-sprint-07-task-11
title: Sprint 07 Task 7.11 Validation and Approval Evidence
status: completed
date: 2026-08-14
owner: "@Muhns13G"
source_baseline: 7b3bda5
---

# Sprint 07 Task 7.11 — Validation and Approval Evidence

## Outcome

The complete local validation matrix passes for the Sprint 07 implementation. The canonical hosted
boundary also confirms that measurement remains disabled, MCP remains absent, and inactive mutation
routes fail closed. The owner confirmed GitHub CI, deployed the required runtime secret and
clock-skew correction, and passed the guarded canonical hosted treatment-intent exercise. Task 7.11
is technically completed; it does not activate gated capabilities.

No clinical, legal, privacy, security, or release approval has been inferred. Existing pending
claim evidence and inactive measurement remain gated.

## Complete Technical Evidence

| Boundary                | Result                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Toolchain and install   | Bun 1.3.14, Node 22.22.2, and frozen dependency installation pass.                                                                                                       |
| Static and unit checks  | Prettier, ESLint, strict TypeScript, Cloudflare types, discovery, portability, 58 Vitest files and 323 tests pass.                                                       |
| Database                | All 15 migrations reset cleanly; 11 pgTAP files and 336 assertions, database lint, and every synthetic integration exercise pass.                                        |
| Safety exercises        | Controlled incident and encrypted synthetic recovery exercises pass; recovery reconciles 125/125 records.                                                                |
| Supply chain and build  | Full/production audits report no advisories; production build, client-bundle canary, generated routes, MCP absence, and Worker dry-run pass.                             |
| Browser                 | 118/118 Playwright/axe checks pass across desktop Chromium and Pixel 7/mobile Chromium.                                                                                  |
| Hosted measurement      | Public read is 200; both measurement routes remain hidden with zero response payload fields, cookies, or CORS access.                                                    |
| Hosted MCP              | All five retired-route probes pass with ordinary GET 404s or generic POST denials and no protocol payload, cookie, or CORS access.                                       |
| Hosted request security | Unregistered, cross-origin preflight, and disabled-checkout probes return private no-store 404 boundaries with no CORS or logged payload fields.                         |
| Hosted treatment intent | Valid opaque selection, secure cookie attributes, invalid-selection fail-closed behaviour, tamper rejection, expiry rejection, and zero URL/response intent fields pass. |

The canonical source, claim bindings, cross-channel mappings, metadata, campaign/support content,
and rendered routes are covered by the unit, contract, portability, build, and browser suites. The
measurement canaries cover prohibited identity, health, URL/referrer, free-text, replay, payment,
credential, retention, export, deletion, opt-out, and access paths. Local, built, and hosted checks
continue to prove MCP absence.

## Approval and Activation Inventory

| Authority                 | Recorded position                                                                                                                                             | Remaining gate                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Repository/business owner | Canonical journey, preserved-copy replacements, first-party measurement specification, default-off implementation, and MCP absence are approved.              | Commit this completed Task 7.11 evidence before Task 7.12 closure.                                                                        |
| Content governance        | One versioned source, lifecycle, mappings, and rollback boundary are verified.                                                                                | Twenty-eight retained claim variants remain pending domain evidence; rejected variants remain unpublished history.                        |
| Clinical/legal/pharmacy   | No named role-holder approval is recorded by this task.                                                                                                       | Required evidence and approvals must be attached before affected claims or transactional pathways activate under TD-006/TD-007.           |
| Privacy/security          | Inactive controls and synthetic proofs pass; no collection is active.                                                                                         | Measurement requires an approved public consent interface and explicit privacy/security release approval before `MEASUREMENT_MODE=pilot`. |
| MCP                       | Absence and future reintroduction gates are owner-approved and technically verified.                                                                          | Any implementation requires a new use case, threat model, privacy/security review, domain review where applicable, and release decision.  |
| Release                   | Local CI-equivalent validation, build, dry-run, browser matrix, exact-commit GitHub CI, deployment, hosted negative boundaries, and hosted intent proof pass. | Activation still requires the separately named domain and privacy/security approvals.                                                     |

## Configuration Finding

The initial hosted exercise exposed two configuration/runtime defects. First, the active Worker did
not receive the required `JOURNEY_INTENT_ENCRYPTION_KEY_BASE64` binding. `wrangler.jsonc` now
declares the secret as required and generated Worker types include it, preventing future uploads
from silently omitting the dependency.

After the owner deployed the runtime secret, cryptographic diagnostics proved that AES-GCM
authentication succeeded and the payload contained the expected synthetic `hair` intent. The
remaining rejection came from a 457 ms Worker/local clock difference: the decoder previously
rejected any positive `issuedAt` skew. A bounded 60-second clock-skew tolerance now accepts ordinary
distributed-runtime drift while the 30-minute expiry, malformed-state and tamper checks remain
fail-closed. The owner deployed the correction and `test:intent:hosted` passed. No secret or cookie
value was printed or written to the repository.

## Closure Checkpoint

1. Commit the clock-skew correction, regression test, and completed evidence without secrets or
   generated test artefacts.
2. Keep measurement disabled and claims/pathways gated unless the missing named approvals are
   separately supplied.
3. Record the correction commit, workflow, deployment, and hosted-intent result during Task 7.12
   closure.
