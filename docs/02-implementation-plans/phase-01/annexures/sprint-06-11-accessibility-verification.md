---
task: 6.11
status: completed
date: 2026-08-13
related_debt: [TD-037, TD-038, TD-039, TD-043, TD-044]
---

# Sprint 06.11 — Accessibility and Browser Verification

## Outcome

Task 6.11 completes the planned browser, display-preference, keyboard, accessibility-tree, failure,
and reflow review of the currently active website. It found one narrow defect: global smooth
scrolling did not respect reduced-motion preferences. The stylesheet now disables smooth scrolling,
animation repetition, and meaningful transition duration when reduced motion is requested.

No public marketing, treatment, eligibility, or journey wording changed.

## Visible and Representative Review

- A visible managed-Chromium walkthrough covered the homepage, `/start`, `/peptides`, `/contact`,
  the mobile disclosure, and the ordinary 404 boundary.
- At 320 CSS pixels, the active content remained readable with no document-level horizontal
  overflow. A 390 × 844 mobile pass confirmed both gated routes and support routing.
- Mobile disclosure inspection confirmed focus enters the first link, Escape closes the menu,
  focus returns to the trigger, and the closed navigation leaves the accessibility tree.
- Chromium's full accessibility tree exposed the expected banner, main, contentinfo, headings,
  links, buttons, names, focusability, and disclosure state. Gated routes expose status and urgent
  support semantics without form controls.
- Forced-colour and reduced-motion emulation retained readable content, landmarks, actions, and
  reflow. Existing axe checks supply automated WCAG A/AA contrast and semantic coverage.

## Automated Evidence

The new desktop/Pixel 7 checks exercise all active routes at 320 CSS pixels, reduced-motion CSS,
and forced-colour rendering. Existing component tests cover labels, descriptions, autocomplete,
validation summaries, progress announcements, step focus, and Back-state preservation in both
preserved prototypes. Existing browser tests cover active-route axe, navigation, support, failure,
metadata, CSP, and unavailable-font behavior.

## Debt Disposition

- TD-039 is Verified for the active mobile disclosure.
- TD-044 remains Verified; the unavailable-font and display-preference evidence is additive.
- TD-043 remains Open only for the unapproved dedicated privacy, complaints, and clinical channels;
  the published general and emergency routes passed review.
- TD-037 and TD-038 remain Open activation gates. Their preserved form/stepped prototypes are not
  routed, so automated component evidence is complete but an honest live assistive-technology
  walkthrough cannot occur until an approved flow is reachable. The current public gates expose no
  form or asynchronous submission surface.

This disposition completes Task 6.11 without representing inaccessible prototype code as a live
patient journey or weakening the required pre-activation review.
