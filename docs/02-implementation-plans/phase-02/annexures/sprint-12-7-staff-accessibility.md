---
plan_id: phase-02-sprint-12-7
title: Staff Queue Accessibility and Private Recovery
status: completed-local-acceptance
last_updated: 2026-10-06
owner: "@Muhns13G"
depends_on: [phase-02-sprint-12-6]
---

# Task 2.12.7 — Staff Accessibility

Baseline: Task 12.6 committed at `3b90db9`; working tree clean before this task.
Verify accessible staff work and safe recovery without activating a hosted workflow.
This packet covers local presentation and intercepted synthetic responses, not a new hosted
Auth, medical, financial or provider rehearsal.

## Coverage and decisions

| Surface                    | Verification boundary                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/staff/queue`             | Named/captioned case table, keyboard-contained horizontal scrolling, masked detail, version conflict, denied refresh, expiry and strict contact-projection rejection. |
| Assigned hand-off controls | Claim-bound controls, opaque references, independent evidence verification and uncertainty-preserving recovery; no payment/clinical override.                         |
| `/staff/support`           | Purpose-specific follow-up, separate transport/human outcomes, keyboard actions, settled-result focus and exact authority expiry.                                     |
| `/staff/alerts`            | Administrator-only presentation, explicit acknowledgement/resolution, stalled-read expiry, late-response rejection and retry availability.                            |
| `/staff/intake`            | Current medical-purpose display only, labelled evidence controls, expired-grant rejection, purpose-change/page-exit clearing and expiry-focused recovery.             |
| `/staff/sign-in`           | Labelled email/code controls, persistent pending/failure feedback and keyboard/display checks, including the synthetic session/destination panel.                     |

The browser packet checks desktop Chromium and Pixel 7, 320px reflow, doubled root text,
reduced motion, forced colours, axe and keyboard reachability. Doubled root text does not
substitute for actual browser-zoom or spoken-output acceptance. Queue contact remains masked;
the medical-purpose screen deliberately displays only its separately authorised synthetic fields.
No real patient, password, provider protocol or hosted identity is used.

## Implementation and deviations

Queue, support, alerts and private medical work now focus a settled result or the loaded detail
heading. Pending requests announce progress without stealing focus. The case table has a named,
keyboard-focusable scroll region; long case references wrap within the narrow detail card.
Alert navigation wraps rather than forcing horizontal page overflow.

Alert expiry previously started only after a completed read. It now starts as soon as the current
authority deadline is validated, clears work even during a stalled read, restores the load control
and rejects a late response. Evidence verification announces pending work, focuses validation and
completion, and aborts its browser request on unmount so a retired panel cannot restore its result
or trigger a stale parent refresh. Browser abort is not represented as cancellation of a server
mutation. Medical list responses with an already expired grant fail closed, as detail responses do.

These are in-scope accessibility/recovery corrections, not policy changes. No dependency, schema,
Worker binding, hosted setting, clinical wording or commercial authority changed. No new debt ID
is introduced. TD-037/TD-038 retain their wider released-flow acceptance boundaries; Task 12.8
still owns hosted support proof, 12.9 debt reconciliation and 12.10 final sprint closure.

## Acceptance evidence

- Targeted component packet: **6 files / 21 tests passed**. It includes stalled-read expiry,
  late response rejection, denial clearing, masked projection, evidence validation and medical
  purpose/page-exit clearing.
- Strict TypeScript, ESLint, repository formatting, production build/client-bundle/MCP-absence,
  portability, public-discovery and generated-route checks passed. `git diff --check` is clean.
- Initial desktop/mobile packet: **33/36 passed**. The new cold-dev queue assertion needed to
  wait for hydration rather than treating SSR as loaded work; the new expiry assertion needed
  the queue's own result region rather than matching nested evidence/payment statuses. These
  harness errors are corrected; expiry uses the existing sign-in-required wording, not invented
  copy. The final packet also covers active hand-off and session/destination controls.
- Expanded desktop/mobile packet: **42/44 passed**; its remaining two assertions incorrectly
  expected the internal `escalated` enum rather than the public “Alternate-owner follow-up
  required” wording. After correcting the locator, the final support/intake expiry packet passed
  **4/4**, also proving rejection of a newly returned but already expired medical list.
  **All 44 distinct staff scenarios are verified across the broad and targeted runs**; this is
  not represented as a single uninterrupted 44/44 run. No application code changed between those
  two runs. Controlled-clock expiry avoids arbitrary sleeps; the stalled alert response remains
  deliberately held to prove transport/authority independence.
- Full deterministic suite: **129 files / 829 tests passed**.
- Representative staff VoiceOver and actual browser zoom: **owner-confirmed on 6 October 2026**.
  The earlier client-form acceptance is not reused as staff acceptance. This is representative
  local acceptance, not hosted/released acceptance or an exhaustive screen-reader certification.

Task 12.7 is **completed with local acceptance**. Docs/RAG and the task table reflect the
confirmed representative staff review and automated proof. Hosted/released reconciliation remains
Tasks 12.8–12.9, and final Sprint 12 closure remains Task 12.10. Exact-commit GitHub CI is for the
owner's subsequent commit/push; no current hosted deployment is claimed from these local checks.

## Repeatable representative staff review

The owner confirmed the staff checks. To repeat the controlled local review without real staff
credentials:

```sh
CLIENT_FORM_MANUAL_REVIEW=voiceover-local-synthetic bun run test:e2e:headed -- e2e/staff-accessibility.spec.ts --project=desktop-chromium --grep "staff alerts has"
```

The test pauses on a synthetic loaded alert screen. With VoiceOver, confirm the review heading,
status message and named load/acknowledgement controls are understandable. Check actual browser
zoom at 200%; text and controls must remain readable and reachable. Unmatched staff mutations
are intercepted with 503, so this review cannot send hosted notifications or acknowledge a real
incident. Resume the inspector to finish; stop VoiceOver yourself when finished. Record the actual
result, not inferred speech from accessibility-tree or axe output.

## File inventory

| Change   | Files                                                                             | Purpose                                                                      |
| -------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Modified | `StaffQueuePage.tsx`, `StaffSupportPage.tsx`, `StaffAlertsPage.tsx`               | Settled focus, scroll/reflow and stalled-read expiry.                        |
| Modified | `MedicalWorkPage.tsx`, `StaffHandoffEvidencePanel.tsx`, `WorkforceSignInPage.tsx` | Grant expiry rejection, pending/result feedback and retired-panel cleanup.   |
| Modified | `StaffAlertsPage.test.tsx`                                                        | Focus and stalled/late response regression.                                  |
| Created  | `e2e/staff-accessibility.spec.ts`                                                 | Controlled desktop/mobile presentation, masking, expiry and recovery packet. |
| Created  | This annexure                                                                     | Coverage, evidence, human acceptance and release boundaries.                 |
| Modified | Sprint plan, Phase 02 README, debt registry, RAG current state/limitations/index  | Consistent task checkpoint; no premature debt or sprint closure.             |

Lesson: install privacy deadlines before awaited work, and test authority expiry independently
from transport completion. Keep build jobs separate from dev-browser runs because route generation
can reload a live test page. A table may scroll internally for its two-dimensional information, but
the whole page must reflow and the scroll region must be reachable by keyboard.

No Git staging, branch change, commit, push, deployment, provider email or database mutation occurred.
