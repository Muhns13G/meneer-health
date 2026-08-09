---
evidence_id: phase-01-sprint-02-task-08
title: Sprint 02 Task 2.8 Verification and Closure Evidence
status: verified
date: 2026-08-08
source_commit: ce2bcdf
owner: "@Muhns13G"
---

# Sprint 02 Task 2.8 — Verification and Closure Evidence

## Boundary

Task 2.8 verifies the complete Lovable-exit and Cloudflare-runtime change set without changing
approved public wording, pushing Git, or mutating the production deployment. The owner had already
committed and deployed Tasks 2.1–2.7 before this closure pass.

## Repository Validation

| Check                                                   | Result                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Isolated `bun install --frozen-lockfile`                | Pass; 456 installs across 566 packages, lockfile unchanged                                     |
| `bun run typecheck`                                     | Pass                                                                                           |
| `bun run lint`                                          | Known debt only: 21 Prettier errors and 7 Fast Refresh warnings                                |
| `bun run build`                                         | Pass; 1,874 client and 1,916 SSR modules                                                       |
| `bun run deploy:dry-run`                                | Pass; 17 Worker modules, 912.63 KiB, 178.23 KiB gzip, no bindings                              |
| `bun audit` / `bun audit --prod`                        | 31 total / 24 production-filtered findings; retained for Sprint 04                             |
| Active-source, package, build, and configuration search | No `lovable`, `__l5e`, `LOVABLE_`, or `.lovable` runtime trace                                 |
| Local production-preview route matrix                   | Public routes/assets pass; campaigns redirect correctly; retired/unknown paths return HTML 404 |

The sole emitted build warning is the previously bounded upstream Node `punycode` deprecation.
No dependency versions were broadly upgraded during verification.

## Baseline Comparison

| Measure                | Task 2.2 baseline |   Task 2.8 | Explanation                                                                                |
| ---------------------- | ----------------: | ---------: | ------------------------------------------------------------------------------------------ |
| Lint formatting errors |                30 |         21 | Nine errors removed through touched-file formatting; remaining debt is unchanged in nature |
| Fast Refresh warnings  |                 7 |          7 | Pre-existing and assigned to Sprint 04                                                     |
| Full audit findings    |                41 |         31 | Lovable/MCP and unused direct dependencies were removed                                    |
| Worker modules         |                51 |         17 | Removed Lovable MCP/OAuth implementation and obsolete adapter output                       |
| Worker upload          |      1,961.20 KiB | 912.63 KiB | 1,048.57 KiB reduction, approximately 53.5%                                                |

The prior adapter, Rollup-platform, ignored-directive, and Wrangler-entry warnings are gone. Generic
production preview now works; the former MCP/OAuth endpoints intentionally return ordinary 404s.

## Canonical Cloudflare Evidence

- `meneerhealth.co.za` and the workers.dev origin return 200 for all eight public pages, correct 307
  campaign redirects, and HTML 404s for removed MCP/OAuth and unknown routes.
- Both QR campaign asset pairs return the correct image type, and the preview-only draft video
  returns a 6,703,712-byte MP4 from `itws-I-preview`.
- Desktop and 390×844 browser checks pass direct loads, client navigation, responsive overflow,
  metadata, images, video presence, console, and network inspection.
- Persisted logs show successful outcomes, no runtime errors, and no Lovable matches. Two independent
  canonical smoke requests completed without initialization failure.
- Cloudflare Fonts initially caused React hydration error 418 by rewriting the document head.
  Disabling it restored clean hydration. Automatic Web Analytics is also disabled for the pilot,
  avoiding an ungoverned analytics beacon and matching the current privacy boundary.
- Version history and `bunx wrangler rollback [version-id]` availability are verified read-only.
  No production rollback was executed merely as a test.

## Debt Disposition

- TD-025, TD-027, TD-041, TD-049, and TD-051–TD-053 are **Verified**.
- On 8 August 2026, both Cloudflare Build triggers were aligned to `BUN_VERSION=1.3.14` and the
  documented `bunx wrangler` commands. Production build `425bdc48-23f2-4c40-8f83-23c1a0f11f00`
  and non-production build `69d0d711-ccc7-4135-a310-71826242fd24` succeeded. Production version
  `ee3a151d-e25b-47b8-a036-c041a9225d13` serves 100% of traffic; non-production version
  `641f728e-b460-4cd9-bbea-4448f98f7fba` retains the `itws-i` alias.
- The post-alignment canonical matrix reconfirmed HTTP 200 for all eight public pages, correct 307
  attribution redirects, and HTML 404 for removed MCP/OAuth and unknown paths.
- Existing TD-017 retains missing application security headers; TD-042 retains favicon/discovery
  work; Sprint 04 retains lint, automated-test, CI, and dependency-advisory remediation.

Sprint 02 is fully implemented, verified, and closed. This engineering closure does not activate
the clinical pilot or public launch.
