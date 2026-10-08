---
plan_id: phase-02-sprint-13-8
title: Full Quality Matrix and Released Accessibility Acceptance
status: completed-owner-acceptance
last_updated: 2026-10-08
source_commit: 260116c59c0e121a287b24dc1bd9b73d68f1912c
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Task 2.13.8 — Quality and Accessibility

## Scope and Isolation

Execute the [13.1 contract](sprint-13-1-rehearsal-contract.md), not pilot activation. Source started
clean on `itws-I` at the commit above. Git staging, commits, branch changes, pushes and deployments
remain owner-controlled. Task 13.7's scheduled recovery acceptance is now independently completed
at the owner's agreed initial threshold; ongoing cadence and Auth/Storage coverage are not waived.
No new hosted fixtures, email, charge, generator action or configuration mutation is authorised here.

The ignored workstation `.env` contains hosted configuration. Local integration runners were invoked
directly with `bun --no-env-file scripts/<runner>.ts`, rather than allowing a child Bun script to
autoload it. Database-backed packets were serialized against the fixed local synthetic stack.
Playwright now starts Vite through Node and disables Cloudflare dotenv loading. Run its parent
without dotenv/inherited hosted credentials as well; this setting does not sanitise an explicitly
inherited environment or permit a credential-bearing `.dev.vars` file. Vite's public `VITE_*`
configuration remains public. The permanent-branch matrix explicitly leaves peptide media values
empty; the separately deployed preview asset is checked over HTTP.

An initial browser invocation directly under Bun stalled with runtime WebSocket warnings. Only
those two task-owned processes were stopped. The corrected invocation uses Node 22; the stalled
attempt is not counted as passing browser evidence.

## Observed Matrix — 8 October 2026

| Boundary                         | Result / limitation                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/component/contract tests    | 139 files / 954 tests pass under Node 22.23.2 (414.27 seconds), independently repeating the earlier passing workstation Node 24 run.                                                                                                                                                                                                                                                                                                          |
| Static checks                    | Typecheck, ESLint, Prettier, discovery and portability pass. Portability covers 15 capabilities, 20 contract majors and 26 fixtures.                                                                                                                                                                                                                                                                                                          |
| SQL and lint                     | Local reset, 35 pgTAP files / 1,599 assertions and error-level database lint pass.                                                                                                                                                                                                                                                                                                                                                            |
| Fixed security/rehearsal packets | Sprint 9: 168; Sprint 10: 546; Sprint 13 recovery: 334; evidence: 418 assertions pass. These overlap the database suite and are not added as distinct total coverage. Rollback/baseline restoration passes.                                                                                                                                                                                                                                   |
| Local integration                | Notification-budget race, Auth, workforce AAL2/session/claim controls, authorisation, commands, audit, security evidence, measurement, lifecycle, signed synthetic payments and fulfilment pass. No provider contacted or real email sent.                                                                                                                                                                                                    |
| Incident and recovery            | Incident redaction/detection passes. Encrypted synthetic restore reconciles 132 source/restored records; heartbeat payload fields: zero. This is local, not scheduled hosted recovery proof.                                                                                                                                                                                                                                                  |
| Delivery                         | Node 22 production build, client-bundle canaries, retired MCP absence, unchanged generated route tree, Worker binding types and upload dry-run pass. No deployment performed.                                                                                                                                                                                                                                                                 |
| Advisories                       | Full and production dependency audits report no vulnerabilities.                                                                                                                                                                                                                                                                                                                                                                              |
| Hosted anonymous denials         | Request security, seven identity denials, five retired-MCP probes and default-off measurement pass on the canonical origin. No authenticated positive-session proof is inferred.                                                                                                                                                                                                                                                              |
| Released public headers/media    | Canonical home returns 200 with HSTS, nonce CSP, frame denial, nosniff, referrer and permissions policies. Draft MP4 returns 200 with `video/mp4`; no download was needed.                                                                                                                                                                                                                                                                    |
| Controlled browser matrix        | Node 22 desktop Chromium / Pixel 7: 279 passed, one failed in 12.0 minutes due to ENOSPC on desktop staff-support artifacts. Exact desktop file retest: 2/2 passed in 17.7 seconds, including screenshot and denial/clearing assertions. All 280 distinct cases now have passing evidence across these runs; the original full run is not labelled clean. Synthetic intercepted responses are UI proof, not hosted identity/provider success. |
| Exact-code CI                    | Baseline runs 37713091914 (`itws-I`), 37713114358 (preview) and 37713175232 (`main`) passed. They do not include this task's uncommitted harness/documentation changes.                                                                                                                                                                                                                                                                       |
| Released manual acceptance       | Pending named reviewer, exact deployed version and desktop/mobile keyboard, actual zoom and screen-reader observations. Prior Sprint-12 confirmations remain historical local evidence.                                                                                                                                                                                                                                                       |

Hosted checks used only the existing anonymous-only/inactive-route guards. Response payloads,
cookies, OTPs, encryption/API keys and clinical answers are not stored in this packet.

Baseline CI references: [itws-I](https://github.com/Muhns13G/meneer-health/actions/runs/37713091914)
at `260116c59c0e121a287b24dc1bd9b73d68f1912c`,
[preview](https://github.com/Muhns13G/meneer-health/actions/runs/37713114358)
at `7fdb4b6dff2c3168be6a04bedd4b3dea4cec336f`, and
[main](https://github.com/Muhns13G/meneer-health/actions/runs/37713175232)
at `1610efad14f29f132f2d46a3df0ae3ea972991f2`. These distinct branch hashes must not be presented
as one identical deployed version. Public HTTP observations alone do not establish a source hash;
tie the manual acceptance to the owner's exact release record before closing it.

The failed desktop staff-support scenario reached its axe/success-state checks, but could not write
the required screenshot and therefore did not complete its subsequent denial/clearing assertions.
It is not counted as a functional pass. A later read-only filesystem check found 5.1 GiB available;
no files were deleted. The exact desktop file is retested with a separate temporary output directory
and list reporter to preserve the original full-run failure evidence. The retest passes both tests,
including the previously interrupted screenshot and later denial/clearing checks. Disk headroom is a workstation
limitation, not evidence that screenshots or trace requirements should be removed.

## Manual Acceptance Checklist

Record reviewer name, date, exact deployed source/Worker version, OS/browser/AT versions and device.
Use only approved disposable synthetic fixtures for private hosted journeys. The suspended real pilot
must not be enabled to obtain a screenshot. Existing local controlled browser fixtures can prepare
the review, but cannot substitute for released acceptance. New hosted fixtures/settings require a
separately bounded approval and exact cleanup. Do not use real client data.

| Representative flow                                        | Required observations                                                                                                                                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invitation, sign-in and recovery                           | Email/code labels, expiry/error association, pending/result announcements, keyboard order, visible focus and no duplicate submission.                                                              |
| Profile and document acknowledgement                       | Names/contact preference, checkbox state, exact document presentation, step heading/focus, validation and success/failure feedback.                                                                |
| Questionnaire                                              | Section headings, branching, labels, validation summary, review/back navigation, urgent guidance and clear save/submission outcomes without reading private responses aloud to bystanders.         |
| Client portal, order and support                           | Own-client status, monetary distinctions, pending/held/refund states, support purpose, expiry masking and focus after async changes. Do not perform an actual checkout.                            |
| Staff queue, intake, handoff, payments, alerts and support | Purpose/assignment denials, queue controls, status announcements, expiry/redaction, keyboard access, late-response masking and focus restoration. Do not execute a clinical or money action.       |
| Desktop actual 200% and 400% zoom                          | No lost content, overlapping controls or unusable horizontal scrolling; error/status content remains readable and actionable. CSS/device scaling tests alone do not establish actual browser zoom. |
| Mobile browser / AT                                        | Touch targets, reflow, navigation, label/state/result announcements and readable text on an actual supported device/AT. Pixel 7 emulation alone is not this acceptance.                            |

For each row record pass/fail/not-reviewed, evidence reference and defects/retest outcome. A failure
blocks that affected flow until corrected/retested. Axe, tab automation and previous local verbal
confirmations must not be relabelled a comprehensive screen-reader pass.

## Owner Accessibility Confirmation — 8 October 2026

Mansoer Gallie confirmed that VoiceOver works, then explicitly confirmed all three requested
checks: desktop VoiceOver, actual 200%/400% browser zoom, and a phone's screen reader. This is
owner-reported manual acceptance, not an agent-observed review or an emulated-device result.
No defect was reported. It is fresh confirmation, not a reuse of Sprint-12 evidence.

The owner subsequently confirmed that all three checks covered both local development and the
latest deployed site at `https://meneerhealth.co.za/`. This establishes the reviewed environment
through owner attestation. Exact device/OS/browser/AT versions, deployed Worker identifier and
individual private-flow observations were not supplied; do not invent them or infer an exhaustive
agent-observed private-flow review. Retain that evidence-granularity limitation for the 13.9 review.

## Closure Gate

The owner confirms CI passes on the latest committed branch. The checkout is clean on `itws-I`
at `2b8d199360e44c6ec2c9e68505958c4502c0896e`, containing this task's changes. This CI result
is owner-reported; the GitHub API was unavailable during this recording. The owner also identifies
the latest deployed canonical site as the hosted manual-review target; its exact Worker identifier
was not independently obtained here.

The automated packet is verified across the full run and focused storage-failure retest.
The owner's three accessibility checks on both local and latest hosted code, plus committed-branch
CI, are confirmed. Task 13.8 is completed on that explicitly owner-attested acceptance basis, with
the evidence-granularity limitation above retained. This packet neither verifies transferred domain debt nor makes
Sprint 13/Phase 02 complete; those decisions belong to 13.9/13.10. Generator activation remains
deferred until the approved manual-generation need, and the real pilot remains suspended.
