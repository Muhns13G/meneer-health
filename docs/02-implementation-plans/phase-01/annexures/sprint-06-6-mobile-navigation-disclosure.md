---
task: 6.6
status: completed
date: 2026-08-12
related_debt: [TD-039]
debt_status: open-manual-verification
---

# Sprint 06.6 — Mobile Navigation Disclosure

## Outcome

Task 6.6 replaces the mobile menu's ambiguous toggle behavior with an accessible disclosure
contract. Destinations, approved labels, desktop navigation, and public page messaging are
unchanged.

## Implemented Contract

- The trigger is an explicit button labelled `Open menu` or `Close menu` and exposes
  `aria-expanded` plus `aria-controls` for the conditionally rendered mobile navigation.
- Opening moves focus to the first mobile destination. Escape closes the menu and returns focus to
  its trigger.
- Pointer interaction outside the header closes the menu without overriding the clicked target's
  focus. Crossing into the desktop breakpoint also clears mobile state.
- A location change closes the disclosure even when navigation is initiated outside its links;
  selecting one of its own destinations closes it immediately.
- Closed mobile links are removed from the DOM, so they cannot remain focusable or appear in the
  accessibility tree.

## Evidence and Remaining Gate

Component tests verify disclosure attributes, the labelled navigation region, focus entry, Escape
and focus return, outside dismissal, desktop resize cleanup, and route-change closure. The mobile
Playwright profile verifies the real breakpoint's open/focus/Escape/reopen/navigation journey, while
the desktop profile confirms the trigger remains hidden. The full repository validation matrix
passes.

TD-039 remains Open until Task 6.11 completes the planned manual keyboard, resize/orientation,
zoom/reflow, and representative assistive-technology walkthrough. This task introduces no new
activation, data collection, or external dependency.
