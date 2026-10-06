---
plan_id: phase-02-sprint-12-5
title: Client Form Accessibility Evidence and Screen-reader Acceptance
status: completed-local-acceptance
last_updated: 2026-10-06
owner: "@Muhns13G"
depends_on: [phase-02-sprint-12-4]
---

# Task 2.12.5 — Client Form Accessibility

## Scope and acceptance boundary

Task 12.4 is committed at `bc7b956` on `itws-I`. This task adds controlled presentation tests
against the actual routed client components, not the unrouted legacy prototypes. Private positive
responses are synthetic intercepted fixtures; they do not enable public registration, patient
collection, clinical hand-off, hosted Auth or payment. No real credentials or client information
are used. Public messaging, application policy and production gates remain unchanged.

The complete task requires both local checks and a recorded real assistive-technology review.
Playwright keyboard/axe/accessibility-name evidence is not screen-reader speech evidence. Until
the manual review below is accepted, Task 12.5 stays in progress. The owner has now confirmed
VoiceOver works and browser zoom checks pass, closing local Task 12.5 acceptance. TD-037 stays
Open for the wider Sprint 12 acceptance scope, not because automated checks replace human review.

## Surface inventory

| Routed surface                         | Controls checked                                                                                                                                     | Boundary                                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                    | Treatment-selection buttons/forms                                                                                                                    | Hidden opaque fields, no health collection; no selection mutation in this packet                                                        |
| `/start`, `/peptides`                  | Available links/actions and gate presentation                                                                                                        | Preserved profile/questionnaire prototypes are intentionally unreachable and not claimed as live forms                                  |
| `/account/verify`                      | Invitation email and six-digit code                                                                                                                  | Synthetic presentation only; no code verification/email sent                                                                            |
| `/account/sign-in`, `/account/recover` | Email-request and code-verification stages                                                                                                           | Generic request response intercepted; no real identity or provider email                                                                |
| `/account/activate`                    | Exact synthetic documents, minimum profile, contact preference and independent checkboxes                                                            | No real publication or account activation                                                                                               |
| `/portal/rights`                       | Profile corrections and purpose-coded request controls                                                                                               | Existing authority semantics retained; no actual export/deletion or contact mutation                                                    |
| `/portal/intake`                       | Notice, all eight source sections, date/measurements/sex, native choices, conditional narrative details, category choice, declarations and signature | Existing synthetic end-to-end packet; no blood upload or new medical question introduced                                                |
| `/portal/order`                        | Exact order acknowledgement                                                                                                                          | Synthetic order; Stripe Checkout/provider-owned forms require separately scoped provider/browser review, not fabricated acceptance here |
| `/portal`                              | Client cancellation/refund request acknowledgement                                                                                                   | Synthetic status; request is not a money movement                                                                                       |
| `/portal/support`                      | Purpose selection and urgency checkbox                                                                                                               | Synthetic availability; no support owner appointed or request sent                                                                      |

Read-only `/portal/profile` and patient account/status projections have no editable forms beyond
the controls above. Staff forms belong to Task 12.7. Step transitions and asynchronous success,
failure, retry and focus announcements across the complete journeys belong to Task 12.6; existing
regression checks remain in force and this packet does not replace them.

## Automated checks and interpretation

`e2e/client-form-checks.ts` visits all enabled main controls by Tab and tests meaningful accessible
names, native visibility/focus, normal layout, 320 CSS-pixel reflow, 200% root-text sizing,
reduced-motion and forced-colour emulation. It waits for layout to settle before inspecting actual
overflow; it does not hide overflow. The expanded medical packet visits every source section and
the conditional narrative textarea, then continues through existing review/submission assertions.

W3C describes [320 CSS-pixel reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
and [text resizing to 200%](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).
Root-text sizing is a controlled regression proxy, not actual browser-menu zoom acceptance.
Actual browser zoom and spoken assistive output are therefore also in the manual checklist.

All normal, narrow and enlarged-text axe checks retain contrast rules. In forced-colour emulation,
the browser paints the user's system palette, while axe can compare authored gold/light text
against the forced white canvas and report the wrong painted contrast. Only that mode excludes
the `color-contrast` rule; other rules remain active. Inspect actual forced-colour screenshots and
focus/controls rather than interpreting this as a blanket contrast waiver. No brand palette was
changed based on this mismatch. Failure-only artifacts remain ignored and synthetic.

`agent-browser` is not installed. The existing managed Playwright desktop Chromium and Pixel 7
profiles provide runtime/console/keyboard/axe and screenshot evidence. No browser or package was
installed, and no hosted services, secrets, database, Git branch/staging or deployment changed.

## Assisted VoiceOver review — recorded evidence and remaining acceptance

Closure update: the owner subsequently confirmed “it works tho” for VoiceOver and “browser
zoomchecks pass too” in response to the remaining 200%/400% review. Record these as owner-reported
local acceptance, not a Codex-observed exhaustive spoken transcript or hosted verification.
No further VoiceOver session is required for Task 12.5. The detailed assisted observations below
describe the earlier partial checkpoint; this later owner acceptance supersedes its pending status.

On 2026-10-06 the owner listened while Codex drove managed Chromium against local synthetic
fixtures. The owner confirmed audible email/six-digit-code labels, clear profile field/contact
preference labels, and the privacy checkbox's checked state. The owner subsequently reported
that VoiceOver works and requested ending this session. These confirmations are accepted for
those observed controls, not extrapolated to every questionnaire field or every routed form.
Questionnaire controls were navigated, but the complete field-by-field listening checklist,
whole-form actual 200%/400% browser-zoom review and remaining private forms were not confirmed.

The manual harness was intentionally stopped after this request. Its interrupted Playwright
result is not a regression failure or a completed automated run; the separate 24-case matrix
above remains the automated evidence. VoiceOver was already enabled when the review started
and was not toggled off. No production data, email, payment or submission was performed.

Use a reviewer familiar with VoiceOver; do not invent a pass from an accessibility tree. The new
pause mode opens only local synthetic test forms and rejects CI/non-local targets:
The owner has agreed to perform this review; that agreement is not a recorded pass. Unexpected
local POSTs are intercepted as unavailable so manual clicks cannot reach configured services.
Medical writes use only their explicit in-memory synthetic handler. Manual mode
removes the test timeout and extends only intercepted synthetic fixture lifetimes to one hour,
so the reviewer can work without silently weakening any production session policy.

```sh
CLIENT_FORM_MANUAL_REVIEW=voiceover-local-synthetic PWDEBUG=1 \
  bun run test:e2e -- e2e/client-form-accessibility.spec.ts e2e/medical-intake.spec.ts \
  --project desktop-chromium
```

1. Wait for the managed Chromium window and Playwright Inspector. Resume initial setup if paused
   before navigation. The helper pauses again once each populated form/section is ready.
2. Enable VoiceOver on the Mac (Command-F5; hardware may require Fn). Use its interaction/navigation
   controls and Tab/Shift-Tab. Review headings, labels, required state, control type, chosen values,
   checkbox state, descriptions and conditional detail fields. Verify date/number controls work.
3. Confirm no keyboard trap and a visible, unobscured focus indicator. Enter synthetic values only;
   do not send a real email, use real credentials or navigate the fixture browser to hosted pages.
4. At each pause, use browser-menu zoom at 200%, then 400% with a starting content width around
   1280 CSS pixels. Verify no lost label/control/function or unwanted two-directional page scrolling.
   Reset actual browser zoom before resuming the automated next step.
5. Listen to transitions, validation/required-state feedback and notice/declaration associations.
   Record any defect, exact surface/state and browser/VoiceOver versions. Task 12.6 will separately
   cover the full pending/success/failure/retry announcement matrix.
6. Resume in Inspector to advance to the next form/medical section. After review, close the managed
   test browser and turn off VoiceOver if it was not previously enabled.
7. Record reviewer role, date, OS/browser/AT version, exact committed baseline, each surface/section,
   observed outcome and any issue/retest. Retain no real patient information or secrets in evidence.
   Add mobile screen-reader review where required by the supported-device acceptance scope.

| Acceptance                                                 | Evidence                                 | Status                                            |
| ---------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| Local keyboard, semantic names, reflow/preferences and axe | 24 desktop/mobile checks passed          | Local evidence complete                           |
| Actual browser zoom and spoken VoiceOver output            | Owner confirmation after assisted review | Accepted locally — owner-reported                 |
| Released exact-code/accessibility acceptance               | Owner deployment and scoped review       | Pending — not implied by synthetic local fixtures |
| TD-037 reconciliation                                      | Task 12.9 against original acceptance    | Open                                              |

## Files

| Kind           | Files                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------- |
| New tests      | `e2e/client-form-checks.ts`; `e2e/client-form-accessibility.spec.ts`                               |
| Modified tests | `e2e/medical-intake.spec.ts`                                                                       |
| Documentation  | This packet; Sprint 12 plan; Phase 02 overview; RAG current state/limitations/index; debt evidence |

No runtime, public copy, dependency, generated route, environment or migration change is required
unless the checks identify a confirmed application defect. Tests-only changes are intentional for
this verification task, not omitted feature implementation.

## Recorded validation

- Full 24-case desktop/mobile matrix passed, covering eleven routed surfaces plus every medical
  questionnaire section, conditional narrative details, separate declarations and existing final
  submission/hidden-state assertions. Invitation/code and questionnaire forced-colour screenshots
  were inspected. No confirmed application defect requiring a runtime/wording change was found.
- After adding the manual-review mutation interception safeguard, the six affected sign-in,
  recovery and questionnaire cases passed again. No test emails, hosted data or charges were used.
- Test-harness corrections addressed the accessible-name matcher, asynchronous layout settling,
  pre-hydration keyboard inventory and a selector shared by a narrative select/textarea. These
  were not reasons to modify approved site messaging or weaken accessibility acceptance.
- Strict typecheck, lint, portability and discovery checks passed. All 185 indexed paths and 276
  relative links across the six affected Markdown files resolve; frontmatter parses. No generated
  route changed. Application build/database suites were not rerun because only tests/docs changed;
  their committed 12.4 baseline evidence is not presented as a fresh 12.5 run.
- The owner confirmed VoiceOver and actual browser zoom checks pass, accepting local Task 12.5.
  Tasks 12.6–12.10, released-flow acceptance and original activation gates remain.
- A subsequent rights-form automated check passed. A headed review attempt stalled at private
  account hydration before controls appeared; this was not an observed accessibility defect.
  The local-only manual harness now allows a bounded 30-second control-render wait instead of
  five seconds; ordinary automated acceptance retains five seconds. It does not change runtime
  policy, synthetic interception or the scope of owner-reported acceptance.
