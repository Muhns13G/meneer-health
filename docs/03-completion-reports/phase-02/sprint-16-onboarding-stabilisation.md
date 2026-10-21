---
report_id: phase-02-sprint-16-completion
title: Sprint 16 — Bounded Onboarding Stabilisation
status: locally-and-manually-verified-owner-release-pending
last_updated: 2026-10-21
owner: "@Muhns13G"
---

# Sprint 16 — Implementation and Acceptance Handoff

## Disposition

The owner authorised implementing 16.1–16.10 together. The bounded application changes and
regressions are implemented and locally verified. On 21 October, the owner confirmed that all
four fresh VoiceOver/zoom checkpoints passed. Release acceptance remains explicit below.
This is not a claim of deployment or completed production
stabilisation. No real pilot record, provider setting, message or payment was changed.

The [plan](../../02-implementation-plans/phase-02/sprint-16-onboarding-stabilisation.md) remains the
scope contract. Existing product-sales gates and the separate Laravel/React discussion remain.
No migration, new dependency, environment variable, encryption key or provider account is needed.
The overview deliberately does not fetch medical answers merely to decorate a progress indicator,
or infer questionnaire completion from a non-clinical case. Its primary questionnaire action
opens the independently authorised state; the received screen supplies the next action only
after confirmed submission.

## 16.1 — Baseline and Journey Contract

Starting application evidence is Sprint 15 closure; the clean committed baseline before the
planning changes was `68f932e`. Mikhail's earlier reports are historical symptoms, not attribution
of a particular current production failure. No medical answers or live account contents were read.

| Entry/state             | Existing server authority and durable state                                                | Required continuation                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Public `/start`         | Availability guard; request/verify through public-registration HTTP/service                | Server-selected activation, current documents or existing account after one valid email verification |
| SMS/email invitation    | Original unique invitation plus addressed-email verification; separate preactivation proof | Exact profile/document activation, never an invitation-only patient session                          |
| `/account/activate`     | Server-served exact documents; atomic profile and genuine unchecked document choices       | Session-ready continuation to questionnaire, otherwise truthful sign-in-required fallback            |
| Existing client sign-in | Email verification and current membership/session authority                                | Current-document review if required, otherwise private account; no fabricated new acceptance         |
| `/portal/intake`        | Authenticated read, publication, encrypted versioned draft/snapshot and expiry             | Start, resume saved answers, review and confirmed submit; holds remain separate                      |
| Questionnaire received  | Server-confirmed submitted version and current safety state                                | Deposit review or private safety review; never infer payment or clinical approval                    |
| Interruption            | Same-account revalidation, explicit deadline/revocation and durable saved version          | Retry transient failure; fresh sign-in for expiry; recover saved answers only                        |

Source inspection identified treatment selection in section seven, disabled Next/Back during quiet
saves, implicit form submission invoking review, silent replacement on concurrent-tab readback,
and no `pageshow` recovery after pagehide aborted the read controller. These are directly addressed
and tested. Existing autosave, idempotency, one-OTP activation and compact account-document dialogs
were retained rather than reimplemented. No evidence establishes that these were the sole causes
of Mikhail's earlier production symptoms; the updated phone walkthrough still matters.

## Delivered Work by Task

| Task  | Implementation/evidence boundary                                                                                                                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16.1  | Journey/state map above; focused regression cases distinguish already-correct server continuation from UI friction.                                                                                                                                                                                                                  |
| 16.2  | Existing one-code/session/document continuation preserved and tested; visible verified-session resume link, retained email on request return and accurate code guidance. Activation-unavailable screen now distinguishes public signup from invitations.                                                                             |
| 16.3  | Pure presentation mapping `[7,1,2,3,4,5,6,8]`, treatment interests first, existing category IDs/prompts, section selector and mapped error links. No catalogue bytes, source versions, clinical questions or stored answer keys changed.                                                                                             |
| 16.4  | Native form submit only prevents navigation; Review is an explicit button. Multiline/Enter stays in the form; IME composition defers saves. Quiet saves no longer disable navigation or steal focus.                                                                                                                                 |
| 16.5  | Existing saver retains write locking, durable readback and exact retry. New readback-version check and conflict quarantine prevent silent replacement/retry against stale drafts. Explicit confirmed reload discards unsaved tab edits only after warning. Resume derives the first unanswered section, not visited-page completion. |
| 16.6  | Expiry/pagehide clear private fields; pageshow rereads saved data with a fresh controller. Same-record transient return retains masked edits; changed account/publication requires a fresh load. A successful late read cannot unmask a hidden tab. No session policy change.                                                        |
| 16.7  | Dashboard and received screen distinguish questionnaire completion from the separate R999 review deposit, original credit/refund terms, separate delivery and safety review. No price, fee, release gate or payment adapter changes.                                                                                                 |
| 16.8  | Existing styling, live regions, heading/field focus, generic toasts and exact-version notice dialog retained. New section/resume/conflict controls use native accessible elements. Automated checks pass; the owner confirmed all four fresh local VoiceOver/zoom checkpoints passed on 21 October.                                  |
| 16.9  | New integrated controlled-browser journey covers signup, one OTP, exact account choices, written treatment response, durable draft reload/resume and schema-validated submission. Local Auth conversion, SQL authority and encrypted recovery provide independent backend checks; this is not hosted production acceptance.          |
| 16.10 | This report, synchronised plan/RAG/debt/index and release checklist. Final result counts and owner CI/deployment remain explicitly distinguished.                                                                                                                                                                                    |

## Validation Evidence

Passed local database packets, run serially against the fixed disposable local stack:

- Full SQL matrix: **58 suites / 2,888 assertions**, all pass.
- Identity security: **five suites / 168 assertions**, rollback-only, no row contents logged.
- Encrypted questionnaire recovery: two synthetic intakes/four snapshots; decryption, newer
  deletion/restriction/holds, historical erasure, revoked old grants and quarantine checks pass.
  Exact baseline retained; disposable restore databases removed. This is not hosted recovery.
- Local invitation conversion: eight competing reservations yield one provider invitation;
  actual local OTP/session, resumed conversion, atomic profile/two receipts, replay and exact
  baseline cleanup pass. **Zero emails and zero hosted provider contacts.**

Full unit run passes **201 files / 1,653 tests**; focused final-source checks are tracked separately
after the last focus/revalidation correction: **three files / 35 tests**, all pass. Production build, upload dry-run, typecheck, lint,
formatting, portability (15 capabilities / 20 contract majors / 26 fixtures), discovery,
generated-route and Cloudflare-type checks pass. Full and production dependency audits report
no vulnerabilities. The final stable whole-site browser matrix passes **368 checks** across
desktop Chromium and Pixel 7, **zero retries**, in 11.4 minutes. No source/build edits ran during
this final matrix. The final exact-source production build passes, including client-bundle and
retired-MCP checks. The owner subsequently confirmed fresh local VoiceOver/zoom acceptance;
owner release remains pending.

The final focused questionnaire/rights pass covers both desktop and Pixel 7 after isolating the
server from source/build edits. The new integrated journey subsequently passes **both profiles**
with one request/verify pair, genuine unchecked account choices, persisted synthetic written
answers, draft reload/resume, schema-validated submission and strictly validated router-only
storage. Those scenarios also pass inside the final whole-site 368-check matrix, rather than
Sprint 15's 366. Desktop treatment-first and mobile resume/completion screenshots were inspected;
they contain synthetic data only and remain outside Git.

Early runs included a
sandbox inspector bind denial, a Node JSON-import attribute mismatch, a test-only TypeScript
matcher error and a mixed-revision helper import during ongoing edits. Corrections are in the
workspace; those early runs are not claimed as final passes. The helper now accepts the caller's
catalogue, avoiding inconsistent JSON module attributes across browser and production tooling.

The first broad browser run had **364 passes / two failures**. Questionnaire presentation was
interrupted during source/build activity; a stable targeted desktop run then passed. The other
finding was an overly strict empty-storage assertion encountering the router's existing scroll
cache. The updated test validates only that exact key and strictly numeric window/generated-element
coordinates (including empty maps for newly visited routes), with local storage empty and all
other session entries rejected. It does not exempt arbitrary
cache contents or permit medical storage. An integrated test also exposed missing heading focus
after the initial privacy acknowledgement; focus now reacts to the acknowledgement/editing state.
Intermediate runs during source edits are superseded, not accepted as complete final evidence.

The local development browser matrix deliberately runs without ignored hosted secrets. Its
missing-secret warnings are expected default-off coverage, not evidence of missing production keys.
The production build writes ignored local output only; it is not a deployment.

## Remaining Acceptance and Release

1. Final automated acceptance passes as recorded above; retain exact-source build/static readback.
2. **Fresh local manual acceptance passed:** on 21 October the owner explicitly confirmed
   “VoiceOver/zoom checkpoints passed.” This records the four requested checkpoints:
   treatment interests/written input/section navigation/save feedback, resumed draft,
   questionnaire received/separate deposit guidance, and hidden-session recovery.
   This is owner-reported human acceptance, not an inference from the automated runner;
   its retained log remains at the first pause and is not claimed as a completed manual run.
   The controlled integrated test supports four local-only paused
   checkpoints (treatment, resumed draft, completion, hidden-session recovery):

   ```sh
   CLIENT_FORM_MANUAL_REVIEW=voiceover-local-synthetic bun --no-env-file run test:e2e -- \
     e2e/onboarding-stabilisation.spec.ts --project=desktop-chromium --headed
   ```

   It sends nothing, writes no real records and is blocked in CI/non-loopback review. Use Resume
   in Playwright Inspector after each check. Manual fixtures allow one hour for review; this is
   synthetic presentation timing, not a changed authenticated session policy.

3. Owner stages/commits/pushes and deploys the application through the existing release process.
   Preserve the active pilot's settings/keys; **do not promote an old rehearsal Worker version**.
4. Record exact-commit green CI and the deployed version. Verify the released path, then obtain
   Mikhail's concrete phone walkthrough feedback. No new SMS, real charge or production fixture
   is required just to release this UI change; any such test needs its own bounded approval.

No staff/patient account deletion, database migration or bulk re-acknowledgement is needed.
Original receipt/snapshot history stays intact. Actual patient sessions retain **30-minute idle /
12-hour absolute** deadlines; email OTPs retain 15-minute validity and invitations their own
48-hour deadline. This sprint does not extend any of them.

## File Accounting and Debt

Runtime files: `MedicalIntakePage.tsx`, `AccountCodePage.tsx`, `PatientPortalPage.tsx`,
`src/routes/account/activate.tsx`, and new `src/lib/intake-flow.ts`.
Regression files: the matching intake/account component tests, new `intake-flow.test.ts`, updated
`e2e/medical-intake.spec.ts`, `e2e/patient-rights.spec.ts`, the strictly validated router-storage
assertion in `e2e/helpers.ts`, and new `e2e/onboarding-stabilisation.spec.ts`.
Documentation: Sprint 16 plan/report, Phase 02 plan index, debt reconciliation, RAG current state,
known limitations, retrieval index and Cloudflare release runbook. Generated route/Worker types, manifests and lockfile are
not manually edited. The agent does not stage, commit, push or deploy.

Registry remains **67 items / 60 Verified / seven non-Verified**. This UI work does not close
TD-006/007/009/010/037/038/043. In particular, automated accessibility success is not fresh human
or released acceptance, and questionnaire completion is not professional approval or sales GO.
