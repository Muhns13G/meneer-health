---
title: Pilot onboarding usability correction
status: local-verification-in-progress-owner-release-required
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

Component and desktop/mobile browser checks use controlled synthetic responses only. They must
cover successful submission, safety hold, unpaid acceptance/Checkout, confirmed settlement,
uncertain payment, expiry, denied sessions, keyboard access, accessibility and reflow. A production
build/type/lint check is separate from hosted acceptance.

The repository owner stages, commits and deploys. After release, repeat the phone walkthrough
against the existing disposable account without creating another capture. The original exact
sandbox refund, manifested cleanup and configuration restoration are still required. This UI
work sends no SMS/email, changes no hosted database/configuration, and activates no pilot modes.
