---
title: Pilot onboarding usability correction
status: locally-verified-owner-release-required
last_updated: 2026-10-09
---

# Pilot onboarding usability correction

The owner completed the hosted synthetic questionnaire and R999 sandbox payment, but reported
that it was difficult to see what to do next. Successful persistence/settlement does not prove
that the presentation is suitable for invited participants.

## Bounded implementation

- Put questionnaire and deposit/payment actions before administrative documents on the dashboard.
- Show the three onboarding stages without inferring completion from navigation or a return URL.
- After durable questionnaire submission, offer deposit review; retain safety-hold review instead
  of offering payment as a bypass. Keep user control rather than silently redirecting.
- Make questionnaire next/review/submit controls prominent and usable on small screens.
- Automatically read existing, session-authorised payment projections on dashboard and order
  pages. A confirmation must match the displayed offer, not an unrelated transaction.
- Replace Checkout with confirmation/next steps for confirmed payment; block repeat payment
  while evidence is unavailable, pending, disputed, refunded, incomplete or needs review.
- Preserve unchecked terms acceptance, server authority, expiry/hidden-state clearing, existing
  payment/refund rules and no-browser-storage boundaries. Do not claim clinical approval.

## Release and verification boundaries

Local verification passed on 9 October:

- Component/payment/preparation packet: 32 files, 161 tests passed.
- Questionnaire, dashboard, order and payment-status browser packet: 36 desktop/mobile tests passed.
- Final order-layout refresh: all 12 desktop/mobile tests passed.
- Strict TypeScript, focused ESLint, Prettier and production build passed; the build's client
  configuration canary and retired-MCP absence checks passed.
- Synthetic Pixel 7 visual inspection showed the confirmed-payment account/progress action within
  the initial viewport, with no horizontal overflow. Confirmed-payment details are collapsed;
  payment/refund controls remain available. No repeat Checkout is offered.

Implementation covers five components (including the shared onboarding steps), two component test
files and three browser test files. A narrow type correction in the existing sandbox-preparation
test preserves its intentionally stripped child environment. This annexure, the sandbox acceptance
packet and the two current-state/limitations RAG entries record the remaining release boundary.
No dependencies, migrations or provider configuration changed in this usability correction.

## Approved transient-feedback follow-up

The owner subsequently approved reintroducing Sonner for brief action feedback. Sonner 2.0.8 is
now pinned in `package.json` and `bun.lock`, with one themed root toaster. Draft saves, code
requests and explicit payment/support refreshes use fixed, non-sensitive messages; background
payment reads do not create notifications. The code-request wording still avoids account
enumeration, and the code-entry instructions stay on the page after the toast disappears.

Action notifications are dismissible, expire after six seconds, replace the same action source's
previous notification, and clear on hidden/pagehide/unmount. Late notifications from unmounted
sources are ignored. Successful refresh/save feedback no longer duplicates a focused inline
announcement. Failures, field errors, session expiry, safety guidance, durable questionnaire
submission and server-confirmed payment/next-step cards remain visible. No medical answers,
contact details, identifiers or provider error text can be passed to the toast helper.

This follow-up changes presentation only; no provider request, release switch, database migration
or payment authority is added. Owner deployment and hosted phone acceptance are still required.

Follow-up verification passed on 9 October: 22 component/hook files with 91 tests; 30 controlled
desktop/mobile browser checks across announcements, questionnaire and order review; TypeScript,
focused ESLint, formatting and production build. The production dependency audit reported no
vulnerabilities. Toast-specific axe checks passed on both browser profiles, and their captured
toast styling was visually inspected. Real VoiceOver speech and the hosted phone experience are
not inferred from these automated results. Early concurrent runs hit timing limits; the final
isolated component and browser runs above passed with the focus-restoration correction.

Follow-up file accounting:

- Dependency: `package.json`, `bun.lock`.
- Notification host/lifecycle: `src/components/ActionToaster.tsx`,
  `src/hooks/use-action-toast.ts`, `src/routes/__root.tsx`.
- Action integration: `src/components/AccountCodePage.tsx`,
  `src/components/MedicalIntakePage.tsx`, `src/components/PaymentStatusPanel.tsx`,
  `src/components/SupportPanel.tsx`.
- Verification: `src/hooks/use-action-toast.test.ts`, `src/components/SupportPanel.test.tsx`,
  `src/test/render-with-router.tsx`, `e2e/journey-announcements.spec.ts`,
  `e2e/medical-intake.spec.ts`.
- Evidence: this annexure. Generated routes and Worker types are unchanged.

Component and desktop/mobile browser checks use controlled synthetic responses only. They must
cover successful submission, safety hold, unpaid acceptance/Checkout, confirmed settlement,
uncertain payment, expiry, denied sessions, keyboard access, accessibility and reflow. A production
build/type/lint check is separate from hosted acceptance.

The repository owner stages, commits and deploys. After release, repeat the phone walkthrough
against the existing disposable account without creating another capture. The original exact
sandbox refund, manifested cleanup and configuration restoration are still required. This UI
work sends no SMS/email, changes no hosted database/configuration, and activates no pilot modes.

## Follow-up: discoverable actions

The approved frontend control audit is implemented with shared `action-primary`,
`action-secondary` and `action-caution` styles in `src/styles.css`. Account verification,
activation and completed sign-in now expose their next step as gold button-style links.
Staff session destinations, questionnaire amendments/authorisation/download/restriction,
retry controls, document downloads and order-review navigation have explicit outlined controls.
The medical queue uses an "Open intake" button with its existing record context underneath;
the homepage's "Find your match" link is outlined. Questionnaire review actions wrap with
consistent spacing on narrow screens.

Navigation remains native links with unchanged destinations; mutations remain native buttons
with unchanged handlers, disabled conditions and confirmation. Ordinary navigation, inline
help/legal links and error-summary field jumps remain text. Shared styles provide a minimum
44-pixel control height, visible keyboard focus and disabled feedback. The React review kept
native semantics without introducing a component dependency or changing access/payment rules.

This follow-up changes `src/styles.css`, the account `verify`/`activate` routes and
`AccountCodePage`, `WorkforceSignInPage`, `MedicalIntakePage`, `PatientPortalPage`,
`PatientRightsPanel`, `OrderReviewPage`, `MedicalWorkPage` and `Treatments` components.
Verification updates are in `MedicalWorkPage.test.tsx` and the questionnaire, portal and
workforce browser suites. This annexure records the scope; existing staged changes are preserved.
These changes are not deployed and do not close the pending sandbox refund/cleanup/restoration.

Verification on 9 October: all 18 focused component tests passed, together with TypeScript,
focused ESLint, formatting, diff checks and the final production build (including client-bundle
and retired-MCP checks). The seven-suite desktop/mobile browser run passed 51 of 52 checks;
the remaining mobile draft-save assertion incorrectly assumed touch activation established
keyboard focus. With explicit keyboard-focus setup, the questionnaire rerun passed on both
profiles. Thus all 52 selected scenarios have passing evidence across those runs. Questionnaire
screenshots were inspected on desktop and mobile; native link destinations, action heights,
focus, privacy denials and narrow-screen wrapping are covered by the controlled checks.
No new hosted or VoiceOver acceptance is claimed. The initial sandbox browser launch could
not bind its local inspector port; the authorised local rerun used the existing controlled
configuration. A sandbox log-write warning was avoided in the final build with a temporary
log path and ignored Cloudflare dotenv loading disabled. Generated files are unchanged.
