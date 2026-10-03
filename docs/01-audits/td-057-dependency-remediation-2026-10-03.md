---
audit_id: td-057-dependency-remediation
title: TD-057 — Dependency Remediation Evidence
status: verified-local-and-ci
last_updated: 2026-10-03
baseline: daf1927
owner: "@Muhns13G"
---

# TD-057 — Dependency Remediation Evidence

## Outcome and Scope

The full and production-filtered Bun audits now report **No vulnerabilities found**. The
new advisory set discovered during Sprint 09 closeout is locally remediated; TD-057 is Verified
at this repository boundary. The owner committed remediation at
`1b41ed49d4a809baddd77be2cc598ee6668359bd`; exact-commit
[CI 37138262125](https://github.com/Muhns13G/meneer-health/actions/runs/37138262125) passed
on `itws-I`. Post-deploy smoke checks remain separate release evidence. No hosted service, data, secret, branch, staging,
commit, push or deployment was changed. Site wording and metadata text are unchanged.

Baseline `daf1927` contains the committed Sprint 09 closeout. Its initial 36 full/26 production
findings remain historical evidence in the completion report. These are dependency advisory
counts, not 36 independently proven vulnerabilities in the deployed Worker.

## Reachability and Bounded Remediation

| Family / dependency path                                           | Implemented resolution and boundary                                                                                                                                                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Start → router plugin → chokidar 3 → braces 3.0.3         | Update Start 1.167.65 → 1.168.60 and Router 1.169.2 → 1.170.41 together. The new plugin uses chokidar 5 and removes braces, whose advisory has no patched release. This watcher path is build/dev tooling, not evidence of a reachable patient endpoint. |
| Cloudflare plugin/Wrangler → Miniflare → sharp and undici 7        | Update the matched plugin 1.51.1 → 1.62.5 and Wrangler 4.120.0 → 4.147.0. Their common Miniflare pins patched sharp 0.35.4 and undici 7.29.1. No sharp override remains. These are emulator/build/deployment-tool paths.                                 |
| Vitest/mocker                                                      | Update Vitest and coverage-v8 4.1.10 → 4.1.11 together. Test-only graph; no new production test endpoint.                                                                                                                                                |
| ESLint → eslintrc/humanfs/js-yaml                                  | Update ESLint 9.39.4 → 9.39.5, pin humanfs/node 0.16.8 and refresh the existing js-yaml override to 4.3.2. Preserve the Node 22-compatible humanfs major instead of using 0.17's Node 24 requirement.                                                    |
| Babel browser-target resolution                                    | Pin browserslist 4.29.3 and baseline-browser-mapping 2.11.27 through root overrides. Build tooling; no marketing measurement is enabled.                                                                                                                 |
| jsdom → undici 8                                                   | Lockfile patch 8.10.0 → 8.11.2 within its existing compatible range; isolated test runtime. Do not force Miniflare's separate undici 7 path to major 8.                                                                                                  |
| Legacy minimatch and TypeScript-ESLint minimatch → brace-expansion | Resolve legacy major 1 to 1.1.21 and nested major 5 to 5.0.12 in the lockfile. Preserve each parent's API major rather than a global cross-major override.                                                                                               |
| TanStack → seroval-plugins → seroval                               | Raise the existing seroval override floor from ^1.6.2 to ^1.6.7 (resolved 1.6.8). The updated plugin calls `isStream`; the old forced version lacked that API. This is a runtime/build compatibility fix, not an additional advisory claim.              |

React, Supabase, Stripe, Vite, TypeScript, jsdom and Playwright direct versions remain unchanged.
Transitive packages owned by updated parents necessarily change with them. Registry integrity
and frozen installation were checked; no unused direct dependency, audit suppression, duplicate
`resolutions` section or security exception was introduced.

Remove each override when the responsible upstream parent resolves a patched compatible
version without it, then repeat frozen install, both audits and regression. Existing unrelated
overrides remain unchanged. Lockfile-only leaf patches must survive future regeneration; both
CI audit gates remain mandatory. A nested override experiment was ignored by Bun 1.3.14 and was
removed; a broad experimental lock refresh was reverted before constructing this bounded result.

Sources: [Bun overrides](https://bun.sh/docs/pm/overrides),
[braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
[brace-expansion advisory](https://github.com/advisories/GHSA-qhr7-859c-m2p7),
[humanfs advisory](https://github.com/advisories/GHSA-p498-v437-472g).

## Compatibility Findings Resolved During Verification

- The new error-component contract accepts `unknown`; narrow actual `Error` values before
  rendering development diagnostics. A regression rejects display of non-Error private text.
- Streaming now returns a response wrapper with cleanup ownership/disposal metadata. Preserve
  that wrapper while applying existing response headers; three tests cover plain and wrapped
  responses without invoking disposal early.
- The stream captures its CSP nonce before the render callback. Late nonce assignment caused
  blocked bootstrap scripts, failed hydration and missing browser titles. Generate the nonce
  at request-router construction and reuse its existing meta value on hydration. Browser tests
  verify inline bootstrap nonces match the response policy; no CSP relaxation or wording edit.
- Regenerate route and Worker types using their tools. Route imports and all 24 path/id values
  match the baseline; ordering changes only. The route-tree SHA-256 remained
  `63ca19e9ecd8d5030961208777db96f344bc7a6de6ef1ec2e1c3a4b5f011ad18` across generation/build.
  Worker types reflect the upgraded runtime and existing required secret name, never its value.

## Validation

| Check                                                                                                 | Result                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bun 1.3.14 frozen install                                                                             | 433 installs / 527 packages; no changes.                                                                                                                          |
| Full and production audit                                                                             | Both exit 0; no vulnerabilities found.                                                                                                                            |
| Unit/component/integration suite                                                                      | 77 files, 443 tests passed.                                                                                                                                       |
| Desktop/mobile Playwright and axe                                                                     | 156 passed, including nonce/hydration regression; no test waiver.                                                                                                 |
| Database replay / pgTAP                                                                               | All 21 migrations; 16 files / 495 assertions passed.                                                                                                              |
| Focused identity security                                                                             | 157 assertions passed.                                                                                                                                            |
| Auth, authorisation, commands, audit, security evidence, measurement, lifecycle, payments, fulfilment | All local synthetic integration packets passed; database lint clean.                                                                                              |
| Incident and encrypted recovery exercises                                                             | Passed; 125 synthetic source/restored records reconciled. Local database stopped.                                                                                 |
| Types, lint, portability, discovery                                                                   | Passed; 14 capabilities, 18 contract majors, 22 portable fixtures.                                                                                                |
| Production build and Wrangler upload dry-run                                                          | Passed; client canary and MCP-absence checks pass. No upload/deployment performed.                                                                                |
| Cloudflare generated types                                                                            | `wrangler types --check` passed.                                                                                                                                  |
| Generated route gate                                                                                  | Expected exit 1 until the owner commits the regenerated file; stable generation and unchanged route set independently verified. Gate is not bypassed or weakened. |

Local workstation Node defaults to 24.21.0; a temporary Node 22.23.2 runtime separately passed
the 443-test unit suite, 156-test browser matrix, lint/types, build, dry-run and binding check.
The repository runtime pin and workflow remain unchanged.
The complete owner-run CI, including committed generated-output comparison, subsequently passed
at the exact commit/run above. The table preserves the original local checkpoint; its generated
gate is now satisfied by the committed file and passing CI, not bypassed.
Local synthetic and browser evidence does not replace final live accessibility, clinical,
commercial or operational approval.

## Modified and New Files

The built Worker also passed an eight-route local production-browser smoke: HTTP 200, original
titles, matching CSP nonces and zero console/hydration errors. The first smoke inherited the
local preview-only draft-video URL and correctly reported its missing asset on `itws-I`.
For the permanent-branch smoke, the two optional media variables were unset only for the build
command. No environment file, preview-branch asset, hosted binding or media policy was changed.

| Existing files modified                                                                                      | Purpose                                                                     |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `package.json`, `bun.lock`                                                                                   | Bounded compatible updates, override rationale and reproducible graph.      |
| `src/components/DefaultErrorComponent.tsx`, its `.test.tsx`                                                  | Unknown-error compatibility and non-disclosure regression.                  |
| `src/router.tsx`, `src/server.ts`                                                                            | Early request nonce and stream-wrapper policy integration.                  |
| `e2e/metadata.spec.ts`                                                                                       | Bootstrap nonce and hydrated-title regression.                              |
| `src/routeTree.gen.ts`, `worker-configuration.d.ts`                                                          | Tool-regenerated route/runtime types; not manual edits.                     |
| Blueprint; Phase 02 README; Sprint 09/10 plans; Sprint 09 report; debt registry; RAG 01, 02, 06 and 07 index | Current-state reconciliation while preserving initial failed-audit history. |

| New files                                                    | Purpose                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `src/server/security/ssr-response-policy.ts`, its `.test.ts` | Typed response-wrapper preservation and three compatibility proofs. |
| This audit document                                          | Remediation, lessons, exact scope and release evidence.             |

## Handoff and Remaining Debt

Current registry: **57 items, 50 Verified, seven non-Verified**. TD-006, TD-007, TD-009, TD-010,
TD-037, TD-038 and TD-043 retain their existing acceptance gates. No new debt ID accrued from
this remediation. Keep Sprint 09's inventory scoped to its original commits; this is a separate
post-closeout repair.

Owner commit and exact-commit CI are verified. The owner still uses the existing release runbook
for deployment/smoke checks. Rollback is the owner-controlled
baseline package, lock, compatibility code and generated outputs together—not just one override.
Sprint 10 may proceed at this verified commit/CI checkpoint; no pilot activation
permission is implied. Verification and React guidance kept the compatibility work bounded,
preserved stream ownership and separated passing local flows from hosted release approval.
