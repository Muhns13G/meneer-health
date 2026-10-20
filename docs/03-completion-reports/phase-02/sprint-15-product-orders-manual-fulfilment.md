---
report_id: phase-02-sprint-15-completion
title: Sprint 15 — Private Product Orders and Manual Fulfilment
status: completed-with-product-sales-gates
last_updated: 2026-10-21
owner: "@Muhns13G"
---

# Sprint 15 — Completion and Release Handoff

## Disposition

Tasks 15.1–15.10 are implemented and locally verified at their recorded boundaries, including
15.9's genuine isolated hosted/provider acceptance. The final clean dev-server matrix passes
all 366 desktop/mobile checks with zero retries; the final unit run passes 1,635 tests.
Task 15.10 reconciles validation, file inventory, debt and owner-controlled release.
The owner committed and deployed the application closure batch, and exact-commit CI is green.
Sprint 15 is closed at its engineering/rehearsal boundary. Product-sales GO remains a separate decision.

## Owner Release and CI Closeout — 21 October 2026 (SAST)

- Committed application: `f3e392dbe0036b45565d5cde8b288ca8d3e140c0`, branch `itws-I`.
  The working tree was clean before this evidence-only documentation amendment.
- Independently verified [CI run 39512739710](https://github.com/Muhns13G/meneer-health/actions/runs/39512739710):
  completed successfully for that exact SHA; last updated 21 October at 01:29:56 SAST.
- The owner confirms deploying that code. Independent Cloudflare readback shows main Worker
  version `28a4b38b-59e1-41b6-b70a-8106da3a56b2` serving 100%, activated 21 October at
  01:07:39 SAST. Version metadata contains no Git SHA, so source attribution is owner-confirmed,
  not a claimed independent build-to-commit attestation.
- Anonymous GET checks: homepage, `/start` and `/account/documents` return `200`; the two account
  pages retain private/no-store headers. These are rendering checks, not new sign-in, medical,
  payment or real-product acceptance.
- The separate rehearsal `/__rehearsal` still returns `503` with private/no-store headers.
  No configuration, fixtures, messages, charges or releases were changed by this readback.

The commit/CI/deployment prerequisites for engineering closure are satisfied. This post-release
amendment only records evidence; it needs no application redeployment, new secret, migration or
repeated sandbox capture. The owner retains staging/commit control for the documentation.

The agent did not replace, pause or reconfigure the active pilot. No messages, provider
transactions, hosted fixtures, migrations or releases were performed by the agent during
implementation or closeout readback; the owner's release is recorded above.
The existing separate rehearsal is closed; do not reactivate it to repeat an already accepted test.

## Delivered Tasks

| Task  | Delivered boundary                                                          | Authoritative evidence                                                                                                    |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 15.1  | Commercial rules and portable interest/quote inputs                         | [Contract](../../02-implementation-plans/phase-02/annexures/sprint-15-1-product-order-contract.md)                        |
| 15.2  | Versioned customer RRP provenance, private delivery/address preparation     | [Catalogue foundation](../../02-implementation-plans/phase-02/annexures/sprint-15-2-private-product-catalogue.md)         |
| 15.3  | Private post-onboarding browsing and optional interest                      | [Client catalogue](../../02-implementation-plans/phase-02/annexures/sprint-15-3-client-catalogue.md)                      |
| 15.4  | Assigned fresh-TOTP operations drafts and server-derived totals             | [Quote drafts](../../02-implementation-plans/phase-02/annexures/sprint-15-4-staff-quote-drafts.md)                        |
| 15.5  | Independently attributed exact-product clinical/provider evidence           | [Product evidence](../../02-implementation-plans/phase-02/annexures/sprint-15-5-product-evidence.md)                      |
| 15.6  | Issue, exact-term accept/decline, capped credit and balance Checkout        | [Issued quotes](../../02-implementation-plans/phase-02/annexures/sprint-15-6-issued-product-quotes.md)                    |
| 15.7  | Manual custody, courier, delivery and exception journal                     | [Manual fulfilment](../../02-implementation-plans/phase-02/annexures/sprint-15-7-manual-product-fulfilment.md)            |
| 15.8  | Clear next actions, private support and generic notification capture        | [Usability and manual acceptance](../../02-implementation-plans/phase-02/annexures/sprint-15-8-order-next-actions.md)     |
| 15.9  | Isolated hosted/provider acceptance, refunds, cleanup and shutdown          | [Hosted rehearsal](../../02-implementation-plans/phase-02/annexures/sprint-15-9-hosted-product-rehearsal.md)              |
| 15.10 | Final regression, narrow remediation, debt/report/index/file reconciliation | This report and [file inventory](../../02-implementation-plans/phase-02/annexures/sprint-15-10-closure-file-inventory.md) |

These are private approved-quote workflows, not a public shop, automatic prescription,
subscription, wallet, provider API integration or a framework rebuild. Optional product interest
does not authorise clinical treatment, payment or supply. Operations cannot impersonate clinicians.

## Accepted 15.9 Hosted Boundary — Not Repeated by 15.10

The packet records genuine native client activation/encrypted intake and five genuine fresh
TOTP/AAL2 staff sessions, independent product evidence, quote issue/acceptance and signed settlement.
The replacement journey uses R999 review deposit, R3,000 products and R100 delivery, capped R999
product credit, and a **R2,101** product balance. Seven custody events include exception/resolution;
exact replays do not duplicate transitions. Seven generic notification intents remain unsent.

All three approved cumulative sandbox captures, including the earlier aborted journey's deposit,
are fully refunded to their original methods: **409,900 minor units** total. No open test Sessions
remain. The exact temporary webhook is deleted and independently absent. Application baselines,
12 original Auth identities, four real client profiles and named immutable guards are preserved;
there are no remaining rehearsal tenants or synthetic fulfilment events.

The owner promoted separate shutdown version `4c9b441d-272d-4de7-8b49-5c8a421837b3`;
independent readback at `2026-10-20T21:51:15.011Z` and six anonymous/old-cookie probes confirm
`503`/no-store closure. Main version `c4be0ea5-2e9f-45b5-9022-a331d5b30d69` remained unchanged
and its homepage returned `200`. These are dated observations, not perpetual monitoring claims.

Scoped hosted encrypted record-level roundtrip covers fourteen synthetic record groups, checksums,
links and shipping decryption into isolated in-memory SQLite. It is **not** a hosted PostgreSQL
schema/ACL disaster restore. The separate populated local PostgreSQL restore covers that local
boundary. Eight concurrent revoked-staff denials preserve records; they do not prove successful
concurrent writers. Do not broaden either claim.

## Corrections Found During Final Validation

1. **Vite advisories:** move only Vite 7.3.6 → 7.3.7 in the dependency and override; synchronize
   `bun.lock`. Three newly reported advisories are patched: [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm),
   [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv),
   [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw).
   Windows/editor-tooling reachability is not evidence of a compromised deployed Worker.
   Lock resolution also deduplicates tinyglobby/picomatch; no dependency major is upgraded.
2. **Environment regression:** include the already implemented `STRIPE_SANDBOX_RETURN_ORIGIN`
   in the catalogue test. Baseline [CI 39458238580](https://github.com/Muhns13G/meneer-health/actions/runs/39458238580)
   failed this exact assertion (1 failed / 1,628 passed), not a provider payment.
3. **Local runner isolation:** nested Bun invocations for identity security, operations rehearsal
   and notification concurrency now explicitly disable dotenv loading too. Outer `--no-env-file`
   alone did not prevent a child process loading ignored hosted settings. Guards remain strict.
4. **Local financial fixture:** the fixed rollback-only live-mode simulation now supplies its
   explicitly synthetic attributed review-price prerequisite. It contacts no provider and does
   not change production functions or pretend to establish genuine payment funding.
5. **Scoped cleanup:** share the native generated-price discovery between the primary hosted
   driver and recovery cleanup tool. Tenant, catalogue, local-synthetic provenance and exact price
   version all constrain discovery; reject the real pilot tenant and malformed IDs. The newly
   wired primary path is unit-verified, not rerun against the closed hosted rehearsal. Earlier
   actual scoped cleanup is independently established by 15.9.
6. **Signup emergency links:** restore the existing approved 112/10177 telephone actions under
   unchanged emergency guidance, with touch targets and regression assertions. No health claim,
   authentication rule or eligibility wording changes.
7. **Browser-test drift:** update the medical work button's exact current accessible name and
   measure only visible controls, including native disclosure summaries. Inputs inside closed
   disclosures are not tab stops; dedicated product tests exercise expanded content. The
   rendering-only signup health packet uses an explicit no-send availability fixture; separate
   registration tests retain unavailable/fail-closed proof. Accept the exact availability-read
   hydration cancellation only after a later read demonstrably enables the form and the network
   settles; other errors remain fatal. Update the support assertion to the already approved
   Meneer Health (Pty) Ltd identity, not the superseded company. Unknown cross-origin OPTIONS may be
   Vite's empty 204 or the compiled Worker's ordinary 404; neither grants CORS authority, and
   the actual mutation remains 404. No production permission or CORS policy is relaxed.
8. **Route module boundary:** move `AccountDocumentsPage` unchanged into `src/components/` and
   import it from the route/test. The route now exports only `Route`, allowing TanStack's code
   splitting without the development console warning on every public page. React guidance keeps
   the existing state, effects, explicit acknowledgements and server contracts unchanged; seven
   focused document/signup tests pass, followed by the final full regression. No warning filter
   is added to hide the route-export issue.

No new migration, credential, live environment variable or product activation is needed for these
corrections. TD-067 records the patched tooling advisories; existing domain release debt is not
closed merely because synthetic engineering tests pass.

## Final Validation — 20/21 October

Use Bun 1.3.14 and supported Node 22.23.2. Results below are separate packets and overlap;
do not sum their assertion counts into a fictional single test run.

| Packet                                                                                            | Result                                                                                 |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Frozen install                                                                                    | Pass; no lock changes after install                                                    |
| Full / production dependency audits                                                               | Both zero findings after Vite patch                                                    |
| Final unit/component suite                                                                        | 200 files / 1,635 tests pass on supported Node 22                                      |
| Fresh fixed-local migration reset                                                                 | Pass; all committed migrations and synthetic seed apply                                |
| Full SQL regression                                                                               | 58 suites / 2,888 assertions pass                                                      |
| Identity security                                                                                 | 5 suites / 168 assertions pass                                                         |
| Operations rollback rehearsal                                                                     | 9 suites / 580 assertions; exact baseline/adapters restored                            |
| Live-mode local financial simulation                                                              | 2 suites / 126 assertions; exact rollback baseline                                     |
| Questionnaire encrypted recovery                                                                  | Four snapshots; deletion/restriction/hold/grant/quarantine checks pass                 |
| Populated product/shipping PostgreSQL recovery                                                    | 178 assertions plus crypto/quarantine checks pass                                      |
| Workforce Auth/MFA/context integration                                                            | Pass; genuine local TOTP/AAL2 and context-race/queue checks                            |
| Notification concurrency                                                                          | Eight requests, one winning shared-budget reservation; exact cleanup                   |
| Mobile claim / conversion / dispatch races                                                        | Eight competing requests each; one-shot reservation, local Auth and exact cleanup pass |
| Mobile security SQL                                                                               | 8 suites / 527 assertions; row/security/trigger/function fingerprints restored         |
| Local identity/authz/commands/audit/security/measurement/lifecycle/payment/fulfilment integration | Pass; no hosted targets or messages                                                    |
| Incident / synthetic encrypted recovery                                                           | Pass; 128 source/restore records reconcile                                             |
| Database lint                                                                                     | No error-level findings                                                                |
| Full desktop Chromium / Pixel 7 browser matrix                                                    | 366 passed in one clean dev-server run (12.3 minutes), zero retries                    |
| Typecheck / lint / formatting                                                                     | Pass                                                                                   |
| Portability / discovery / generated binding types                                                 | Pass                                                                                   |
| Public-signup workerd transport                                                                   | Two no-send probes; zero provider requests/accounts                                    |
| Production build / client canary / retired MCP absence                                            | Pass on Vite 7.3.7                                                                     |
| Cloudflare dry-run / generated route check                                                        | Pass; no deployment                                                                    |
| Manual VoiceOver / zoom                                                                           | Owner's fresh 15.8 staff/client acceptance retained; not retested by assumption        |

The first dev browser attempt was superseded: 141 passed, two failures, one interrupted and
222 not run. One real missing-link regression is corrected above. The questionnaire reset
coincided with source hot reload; its complete desktop/mobile regression passes against the
frozen compiled Worker. The first full compiled matrix has 352 passing / 14 failing cases;
all fourteen identified failures pass after the documented test corrections (12 on the first
targeted replay and the remaining two signup cases after the ready-form cancellation guard).
This is full compiled coverage plus targeted reruns, **not** a claim that one unchanged full
compiled invocation was green. The final clean full dev-server matrix is reported separately.
Both use the same projects, single worker, timeouts, controlled public video and zero retries.
An intervening dev run was stopped after the route-export warning was diagnosed: 168 passed,
eight public-health failures, one interrupted and 189 not run. The component extraction above
resolves the cause rather than suppressing the warning; that run is not clean acceptance evidence.
Loopback/log permission failures and one temporary-config working-directory error occurred before
browser execution; they are test setup failures, not application acceptance or product defects.

The first operations packet found legitimate immutable local audit residue left by an earlier
workforce integration. After verifying empty local Auth, only the fixed local database was reset;
the full SQL and operations packets then passed. No acceptance guard was weakened and no hosted
record was removed. Serialize database suites, run baseline-sensitive rollback packets before
workforce tests, and keep both runner layers free of ignored hosted environment loading.

Supplemental local recovery packets also pass: six recovery SQL suites / 334 assertions and
seven evidence suites / 418 assertions, with exact row/security/trigger/function restoration.
The evidence packet initially failed after other integration activity; it passes unchanged after
the documented fixed-local reset. Genuine local provider-loss/relink, contact re-verification,
fresh workforce MFA and membership reapproval pass; this does not prove hosted recovery or
domain-specific medical grant reapproval. Eight mobile orphan reservations yield one dispatch
owner; quarantine, managed local deletion/independent absence and encrypted older-copy restore
pass with exact cleanup. `copies_pending` remains truthful for that local-only exercise.
Final local Auth count is zero, error-level database lint is clear and the local stack is stopped
with its recoverable backup. No hosted record is involved in either reset or shutdown.

## Debt, Release Gates and Next Work

Registry total is **67: 60 Verified, seven non-Verified**, including locally verified TD-067.
Remaining items are TD-006, TD-007, TD-009, TD-010, TD-037, TD-038 and TD-043 at their
recorded scoped statuses; they are not seven newly discovered Sprint-15 defects. Prior owner
exceptions/deferrals remain scoped and do not fabricate professional agreement evidence.

Before real product sales, retain actual source/RRP review and approved import, real delivery
tariff/address/custody preparation, reviewed/published exact product terms, independently authorised
clinical/provider/pharmacy evidence, shipping-key custody/recovery, and explicit owner release GO.
No clinical/provider source record or agreement is invented. A paid deposit alone never triggers
dispensing. Generator access stays inactive until needed and separately approved. Blood uploads
remain deferred; do not add an upload prerequisite or restore old sessions/MFA from backup.

The broader onboarding usability/stability review and Laravel/React rebuild planning remain
subsequent owner decisions. This report does not start another sprint, rebuild or live send.

## Completed Owner Handoff

The owner committed the implementation/evidence batch and confirms deployment; exact-commit
green CI and active-version/anonymous readback are recorded above. The earlier failed
`ab649ca8c08a36e265931745ca3bbc520a6f8165` CI is historical and is not used as closure evidence.
Keep approved main-pilot settings and the separate rehearsal shutdown intact. No blanket switch
activation or replayed sandbox captures are required. Only this documentation-only evidence
amendment remains for the owner's next manual commit; it does not reopen application acceptance.

The [file inventory](../../02-implementation-plans/phase-02/annexures/sprint-15-10-closure-file-inventory.md)
uses the pre-15.1 baseline. It explicitly includes owner-approved interleaved SMS/email, public
onboarding and company-notice work; the entire net diff is not represented as pure Sprint-15 code.
