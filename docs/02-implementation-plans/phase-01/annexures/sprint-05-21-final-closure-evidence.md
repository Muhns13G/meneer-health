---
task: 5.21
status: completed
date: 2026-08-12
related_debt: [TD-013, TD-017, TD-020]
---

# Sprint 05.21 — Final Validation and Closure Evidence

## Outcome

Sprint 05 is complete as an engineering-foundation sprint. The complete local matrix, current
hosted inactive boundary, Supabase migration state, security advisors, and synthetic-data cleanup
pass. This closure does not activate customer identity, health-data intake, payment, partner, or
fulfilment journeys.

TD-013, TD-017, and TD-020 are Verified for the implemented and deliberately inactive v1 boundary.
Every first-enabled route still requires its named owner, approved policy, environment configuration,
local/preview/hosted proof, monitoring, and release approval. Those capability-specific activation
gates remain governed by TD-006, TD-007, TD-009, TD-010, FC-001, and the release runbooks.

## Validation Matrix

| Boundary                        | Result                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Toolchain                       | Bun 1.3.14 and Node 22.22.2                                                                                       |
| Format, lint, strict TypeScript | Pass                                                                                                              |
| Vitest                          | 41 files / 245 tests pass                                                                                         |
| Playwright/axe                  | 54 desktop/mobile checks pass                                                                                     |
| Dependency audit                | Full and production: zero findings                                                                                |
| Build and generated checks      | Production build, client-bundle canary, route tree and portability pass                                           |
| Cloudflare                      | Worker types current; upload dry-run passes                                                                       |
| PostgreSQL                      | 12 migrations; error-level lint clean; 9 pgTAP files / 296 assertions pass                                        |
| Integrations                    | Auth, authorisation, commands, audit, security, lifecycle, payments and fulfilment pass                           |
| Incident and recovery           | Controlled incident passes; encrypted restore reconciles 125/125 records in 7 seconds                             |
| Hosted request security         | Public read 200; unregistered mutation, preflight and disabled checkout remain 404 with no CORS or logged payload |
| Hosted Supabase                 | Active/healthy; 12 migrations; no new security warning/error; intended deny-all RLS notices only                  |

## Preview-Branch CI Reconciliation

Preview CI initially exposed two separate test-contract gaps on `/peptides`. Run `31594260427`
failed because the shared fixture expected only the permanent branch's fail-closed heading, while
the preview branch intentionally renders the approved draft-video heading. After that heading
contract was reconciled, run `31596653547` exposed Chromium's normal media-preload cancellation:
Vite returned the 6.7 MB MP4 correctly as `206 Partial Content` and `video/mp4`, but Chromium stopped
the remaining transfer after reading metadata and reported `net::ERR_ABORTED`.

The final test contract accepts exactly the two approved headings, ignores only an aborted request
whose resource type is `media` and failure reason is `net::ERR_ABORTED`, and independently requests
each configured video source. A video must return `200` or `206` with a `video/mp4` content type;
a deliberate missing-media control correctly failed with `404`.

GitHub Actions run `31600466333` passed on `itws-I-preview` at commit
`2f0574bce488915252bcd344501bd6bcacbe9e44`. No route logic, video behavior, or customer-facing
wording changed during this correction.

## Hosted Cleanup and Advisor Review

The final read-only inventory found five orphaned synthetic provider identities created during the
Task 5.20 exercises. Exact dependency checks proved that they had no membership, session, recovery,
invitation, assignment, workflow, audit, rights, hold, or payment references. Their one synthetic
contact, five provider mappings, and five subjects were deleted transactionally by exact UUID.
Hosted state now contains zero Auth users, zero provider identities, zero subject contacts, and only
the three documented synthetic subjects retained by immutable denial evidence.

Supabase Security Advisor reports only INFO-level `rls_enabled_no_policy` notices. These are the
intended deny-all browser posture for server-owned tables. Performance Advisor retains INFO-level
unindexed-foreign-key and unused-index observations; they require measurement when real query volume
exists and do not block the inactive pilot foundation.

## Closure Boundary

No production data, live payment, customer Auth link, provider callback, or public mutation was
enabled or exercised. The preview branch's required repository workflow passes at the recorded
commit. The same correction must be present in the permanent branch before its production merge;
a later failed workflow reopens only the failed closure check, not the already verified hosted
provider evidence.
