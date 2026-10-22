---
plan_id: phase-02-sprint-16
title: Bounded Pilot Onboarding Stabilisation
status: hosted-onboarding-verified-followups-open
authority: owner-approved-implementation
last_updated: 2026-10-21
owner: "@Muhns13G"
depends_on: [phase-02-sprint-15]
---

# Sprint 16 — Bounded Pilot Onboarding Stabilisation

## Current Implementation Checkpoint

The owner authorised implementing all ten tasks together. The bounded application changes and
regressions are locally verified; the [report](../../03-completion-reports/phase-02/sprint-16-onboarding-stabilisation.md)
records 1,653 unit tests, all 368 final desktop/mobile checks, backend packets and passed build/static
checks. The owner confirmed all four fresh VoiceOver/zoom checkpoints passed on 21 October.
Owner release is confirmed; preview commit `295637b` has independently verified green CI and
matching runtime hashes. Active Worker `0e3572c3-c3d0-4c84-9ddc-47fd73a6dda7` and anonymous
signup/sign-in checks are independently verified. On 22 October the authorised hosted synthetic
walkthrough passed signup, activation, draft/reload/idle recovery and persisted submission.
The report retains confusing signup messages and unavailable deposit-offer follow-ups; unrestricted
production-stabilisation closure is not claimed. This supersedes the original planning-only readiness below.

## Outcome and Scope

Make the existing pilot understandable and reliable on a phone: start, verify email, set up an
account, complete the questionnaire and understand the next action. The owner requested this
planning after Sprint 15 closure. This document does not implement any task or authorise a
production release. Sprint 15 remains closed with its separate product-sales gates.

Prioritise Mikhail's reported friction: repeated verification, difficulty returning to onboarding,
free-text entry/reset behaviour and treatment selection appearing too late. These reports are
acceptance scenarios, not proof that each suspected defect remains in the current version.
Reproduce before fixing; retain working behaviour and add regression evidence where already fixed.

Keep this a small v1 intervention, not a redesign or framework migration. Laravel/React remains a
separate rebuild discussion. No new provider, component library, prescribing pathway, public shop,
upload feature, generator activation or commercial-policy change belongs to this sprint.

## Inspected Source Baseline — 21 October

Planning starts from clean documentation commit `68f932e`, after the Sprint 15 application and
release evidence recorded in the [completion report](../../03-completion-reports/phase-02/sprint-15-product-orders-manual-fulfilment.md).
This is a source inspection, not a fresh hosted journey or current participant-count audit.

- `MedicalIntakePage.tsx` already has a 2.5-second draft autosave after acknowledgement, explicit
  Save draft, write locking, version checks, stable retry keys, saved-result readback and distinct
  unconfirmed-save feedback. Extend/test these mechanisms rather than introducing another saver.
- Visibility return masks answers and rechecks session authority; pagehide/expiry clears private
  state. Transient revalidation failures retain masked edits in the current tab. Preserve these
  distinctions while making recovery understandable; do not label a transient outage as sign-out.
- The questionnaire has eight sections. Treatment selection currently appears in section seven.
  Supported categories are ED, hair, weight, TRT and peptides. Moving selection first must not
  invent a new "steroids" treatment or confuse prior substance use with treatment interest.
- The form already prevents native submission, uses explicit navigation controls and presents
  field errors/review. Test free text, mobile keyboards and input during autosave before attributing
  resets to TanStack or adding another event workaround.
- `OnboardingSteps.tsx` already displays account, questionnaire and review-deposit stages.
  Existing [usability work](annexures/pilot-onboarding-usability-2026-10-09.md) includes prominent
  actions and generic toasts. Current public signup and compact notice/re-acknowledgement work
  must be preserved; do not rebuild them or replace authentic receipts with one blanket checkbox.

## Task Breakdown

The table below retains the planned acceptance contract. Current implementation/evidence states
are recorded in the report; distinguish locally verified, hosted verified and owner-released work.

| Task    | Deliverable                                                              | Required acceptance                                                                                                                                                                                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.16.1  | Freeze current journey/state map and regression contract.                | Trace public, invitation and returning-client paths; reproduce reported friction with synthetic data; map route, proof, saved state and next action. Record fixed versus reproducible cases and the focused test packet. No real sends.                                                                                                                           |
| 2.16.2  | Remove redundant verification and clarify return paths where reproduced. | One successful email verification continues while its proof is valid; expiry still requires fresh verification. Existing clients reach sign-in/resume, not duplicate registration. Invitation and document-only proofs cannot become unrestricted sessions.                                                                                                       |
| 2.16.3  | Move treatment-interest selection to the first questionnaire step.       | Reuse existing category IDs, allow multiple choices, preserve conditional answers and review/error navigation. Keep required history and safety questions. Existing drafts/submissions remain readable; UI order is separate from stored source question/version identity.                                                                                        |
| 2.16.4  | Stabilise free-text, navigation and validation.                          | Desktop and mobile typing, Enter, multiline text, IME/composition and Next/Back do not reload, submit prematurely or discard edits. Autosave does not steal focus. Invalid answers identify the field without signing out or hiding the questionnaire.                                                                                                            |
| 2.16.5  | Make draft save and resume dependable and visible.                       | Reuse the existing saver; cover edits during in-flight save, response loss, exact retry, concurrent tabs and amendment drafts. Show saved only after durable confirmation. Re-entry restores the latest authorised saved draft; step restoration must be derived safely, not confused with completion.                                                            |
| 2.16.6  | Clarify session interruption and recovery.                               | Distinguish network failure, masked-tab revalidation, expiry and revocation. Explain what was saved and provide the correct retry/sign-in/resume action. After fresh authority, recover only durable authorised data; do not extend security deadlines or silently retain revoked private state.                                                                  |
| 2.16.7  | Simplify dashboard and questionnaire-complete next actions.              | One obvious primary action per verified state. Separate account, submitted questionnaire, clinical review and deposit/payment facts. Clearly explain the R999 deposit and existing credit/refund terms without forcing payment to understand questionnaire completion or implying treatment approval.                                                             |
| 2.16.8  | Focused phone, accessibility and clarity pass.                           | Short headings, compact exact-version notice dialogs, clear checkbox labels, keyboard/focus, pending/error announcements, zoom/reflow and Android/iOS-relevant interactions. Keep essential inline feedback; use existing toasts only for appropriate generic confirmations. Fresh manual acceptance covers changed flows.                                        |
| 2.16.9  | Integrated synthetic acceptance and supervised pilot feedback.           | Complete fresh and returning journeys, saved-draft interruption/resume and existing-client compatibility. Hosted testing, if required, uses a separately approved restricted environment/fixtures and cleanup; never replace the active pilot with rehearsal settings. Obtain concrete phone walkthrough feedback without collecting medical answers in evidence. |
| 2.16.10 | Regression, debt reconciliation and owner release handoff.               | Completion report, exact file accounting, relevant full regression and retained gate review. Owner commits/deploys; exact-commit CI and deployed journey checks precede release closure. Record any unmet acceptance honestly instead of closing it through approval alone.                                                                                       |

## Non-negotiable Boundaries

- No medical answers in browser persistent storage, URLs, analytics, ordinary logs, screenshots
  or toasts. Durable drafts use the existing authenticated encrypted server path. Document any
  non-sensitive navigation metadata separately before adding persistence.
- Preserve source questions, required disclosures, unchecked affirmative choices, versioned
  acknowledgement receipts, original snapshots/ciphertext and historical notice compatibility.
  A presentation reorder is not permission to rewrite a published clinical instrument. Obtain
  domain review and an explicit version/compatibility plan if meaning or collection changes.
- Do not infer save, submission, payment or clinical completion from a route, progress indicator,
  button click or client timestamp. Retain current ownership, restriction/deletion, grant and
  session checks; never solve friction by weakening RLS or using elevated browser credentials.
- Keep invitation lifetime, OTP expiry and authenticated session policy distinct. Do not change
  any deadline merely to make an interrupted flow pass. Test against actual policy in source.
- Participants' reluctance to pay while confused is product feedback, not permission to disable
  live payments, waive deposits, alter prices, move client records or bypass paid-review gates.
  Any payment-policy/configuration change needs its own explicit owner decision and release.
- Preserve real staff/client data and the existing cohort's invitation/account paths. No new SMS,
  email, charge, refund, hosted migration or runtime configuration change is authorised here.
- Existing product-sales, professional/provider, upload and generator conditions remain in force.
  This plan does not close or reclassify any technical-debt entry.

## Verification and Stop Rules

Use synthetic `.invalid` fixtures locally. Add focused contract/component and controlled
desktop/Pixel 7 browser regressions for each changed state; reuse current tests and encrypted
storage/identity contracts. Inspect actual phone/browser behaviour for reported input problems,
not just a successful backend response. No medical answers are needed from Mikhail to reproduce.

At final closure run typecheck, lint/format, unit tests, production build, generated/discovery/
portability checks, dependency audits and the full controlled browser matrix. Run the relevant
serialised database/recovery packets if persistence, identity, receipts or authority changes;
record exact commands/results and inherited-environment guards. Do not run simultaneous builds
or database fixture suites. Automated accessibility does not replace fresh human review.

Escalate rather than expanding this sprint if diagnosis needs a new clinical policy, data rewrite,
provider change or framework rebuild. For any hosted acceptance, agree fixture/send/cleanup limits
first. Owner-controlled release must preserve active pilot settings and existing keys, and include
a same-source configuration check and safe rollback plan. A successful local run is not hosted GO.

## Readiness and Exit

**Ready to begin 2.16.1 locally.** Sprint 15 engineering closure is recorded; no provider credential,
generator subscription, real payment or additional owner answer is needed to map/reproduce the
existing flow. No Sprint 16 implementation or production acceptance is claimed by this plan.

Exit when an owner-reviewed phone walkthrough can complete and resume onboarding with clear
next actions, every reproducible in-scope defect has regression evidence, existing records and
security/commercial boundaries remain intact, and the owner-released version passes its acceptance.
Do not require unrelated future rebuild work or real product-sales activation to close this sprint.

Keep rebuild ideas in a separate backlog: consolidate the domain/UI boundaries learned here,
retain portable contracts and migration/receipt history, and avoid broad legacy refactoring.
