---
plan_id: phase-01-sprint-06
title: Journey, UX, Accessibility, and Discovery
status: active
primary_debt: [TD-035, TD-036, TD-037, TD-038, TD-039, TD-042, TD-043, TD-044]
depends_on: [phase-01-sprint-01, phase-01-sprint-03, phase-01-sprint-04, phase-01-sprint-05]
last_updated: 2026-08-12
owner: "@Muhns13G"
---

# Sprint 06 — Journey, UX, Accessibility, and Discovery

## Mission

Turn the retained v1 pilot surface into a coherent, accessible, navigable, and discoverable experience without leaking sensitive intent or reintroducing unapproved claims. Ensure users can understand where links lead, what stage they are in, how errors are resolved, and where real support is available.

## Intended Outcome

All retained desktop and mobile navigation reaches the intended destination; condition intent is preserved safely; forms and step transitions are accessible; the mobile menu behaves as a proper disclosure; approved support channels are usable; and indexing, canonical, social, favicon, and font behaviour are intentional and tested.

## Scope

Primary debt: TD-035–TD-039 and TD-042–TD-044.

## Reconciled Starting Point

- Sprint 05 is closed. Its provider, security, recovery, observability, test, and fail-closed
  foundations remain unchanged; Sprint 06 must not activate patient, payment, partner, or
  fulfilment workflows.
- The retained routes are `/`, `/contact`, `/privacy`, `/terms`, `/start`, `/peptides`, `/poster`,
  `/poster-thanks`, two `/go/...` redirects, and inactive payment endpoints. Desktop/mobile
  Playwright and axe checks already cover the public surface.
- Shared navigation still uses page-local `#treatments` and `#how` targets from every route.
  Treatment cards still send four distinct journeys to generic `/start` without preserving intent.
- `/start`, `/peptides`, and campaign pages are deliberately restricted or non-indexable. The
  canonical origin is `https://meneerhealth.co.za`; only `/`, `/contact`, `/privacy`, and `/terms`
  are approved for indexing at this baseline.
- General support uses the monitored `support@meneerhealth.co.za` mailbox. It is not an urgent
  clinical service. Mobile emergency `112` and ambulance `10177` remain the only verified urgent
  contacts; separate clinical, complaint, and privacy ownership remains an activation input.
- Google Fonts remain externally loaded under the existing CSP. Cloudflare Fonts and automatic Web
  Analytics remain disabled. No approved favicon or social-card image exists in the repository.
- Health or treatment intent must not be placed in URLs, analytics, referrers, logs, payment
  metadata, or third-party systems. Existing allowlisted campaign UTM attribution is non-clinical
  and remains separate from treatment intent.

## Commit-Sized Task Plan

| Task | Commit-sized outcome                                                                                                                     | Primary debt / gate       | Status    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------- |
| 6.1  | Rebaseline the retained journey, freeze route/indexability and safe-intent contracts, and record the implementation sequence.            | All Sprint 06 debt        | Completed |
| 6.2  | Replace page-local shared hashes with route-aware links and prove every shared destination across retained routes and viewports.         | TD-035                    | Completed |
| 6.3  | Implement typed, server-validated treatment intent without URL, analytics, referrer, log, or third-party leakage; fail closed otherwise. | TD-036; activation gates  | Completed |
| 6.4  | Correct form labels, descriptions, autocomplete/input modes, required state, validation, and accessible error summaries.                 | TD-037                    | Completed |
| 6.5  | Add stepped-flow focus management, progress semantics, live status/error announcements, and navigation-state preservation.               | TD-038                    | Planned   |
| 6.6  | Implement mobile disclosure semantics, focus behavior, Escape/outside handling, resize behavior, and route-change closure.               | TD-039                    | Planned   |
| 6.7  | Reconcile verified support and emergency surfaces; keep unverified clinical/privacy/complaint channels explicitly unavailable.           | TD-043; external input    | Planned   |
| 6.8  | Implement the route policy through absolute canonicals, robots and sitemap outputs, exclusion rules, and generated-output tests.         | TD-042                    | Planned   |
| 6.9  | Add approved favicon and social-card assets and verify metadata rendering; retain an explicit gate if assets remain unavailable.         | TD-042; approved assets   | Planned   |
| 6.10 | Decide and implement self-hosted or explicitly approved external fonts with CSP, fallback, privacy, resilience, and performance proof.   | TD-044; owner decision    | Planned   |
| 6.11 | Run keyboard, zoom/reflow, reduced-motion, contrast, representative screen-reader, failure, and complete browser verification.           | TD-037–TD-039, TD-043–044 | Planned   |
| 6.12 | Reconcile debt/RAG, record deviations and lessons, and issue the Sprint 06 completion report and exact-commit CI evidence.               | All Sprint 06 debt        | Planned   |

Tasks remain independently committable. Asset- or ownership-dependent work may retain an explicit
activation gate, but it must not be represented as verified until its acceptance evidence exists.

### Workstream 1 — Route-aware navigation and intent

1. Replace page-local hash assumptions with route-aware links or dedicated destinations.
2. Verify header, footer, CTA, logo, treatment, legal, support, and error-page links on every route.
3. Preserve selected treatment/campaign intent through typed and server-validated parameters or dedicated routes.
4. Prevent health intent from entering unsafe URL parameters, analytics, referrers, logs, or third-party systems.
5. Define safe behaviour for missing, invalid, stale, or unsupported treatment values.

### Workstream 2 — Form and stepped-flow accessibility

1. Associate labels, inputs, descriptions, validation errors, and required state programmatically.
2. Define intentional autocomplete, input mode, keyboard, masking, and error-summary behaviour.
3. Move focus to meaningful headings or errors after step transitions and announce progress/status changes.
4. Ensure validation is understandable without colour and is preserved across supported navigation.
5. Test zoom, reflow, reduced motion, high contrast, keyboard-only, and representative screen-reader behaviour.

### Workstream 3 — Mobile navigation

1. Implement explicit open state, `aria-expanded`, `aria-controls`, labelled trigger, Escape handling, focus return, and outside interaction.
2. Keep focus order logical and prevent hidden links from remaining interactable.
3. Verify resize/orientation changes and route navigation close the menu predictably.

### Workstream 4 — Support and escalation surface

1. Publish only verified monitored contact channels with owners and service expectations.
2. Add accessible email/telephone/form interactions as approved.
3. Separate general support, privacy/data requests, complaints, clinical questions, and urgent/emergency guidance.
4. Test delivery/failure of any contact form without placing sensitive payloads in email, analytics, logs, or URLs.

### Workstream 5 — Discovery metadata and fonts

1. Define public, restricted, campaign-only, and non-indexable route classes.
2. Add approved favicon, absolute canonicals, social image, robots policy, and sitemap generation.
3. Verify titles/descriptions/social cards across normal, legal, campaign, error, and not-found routes.
4. Decide whether fonts are self-hosted or an approved external dependency; document privacy, CSP, resilience, performance, and fallback behaviour.

## Required Decisions and Inputs

- **Available:** retained pilot route disposition, canonical domain, current indexability baseline,
  general-support mailbox, emergency numbers, campaign attribution, and prohibited intent-leakage
  rule.
- **Required before Task 6.3 activation:** approved treatment-intent identifiers and server-owned
  persistence/expiry behavior. Human-readable health intent remains prohibited in URLs.
- **Required before TD-043 closure:** accountable clinical, privacy, and complaint owners/channels
  if they are to be published separately. Placeholder professional details remain prohibited.
- **Required before Tasks 6.9–6.10 closure:** approved favicon/social assets and owner decision to
  self-host fonts or formally retain Google Fonts.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| TD-035 | Automated browser matrix proves every shared link works from every retained route and viewport.                       |
| TD-036 | Valid treatment intent survives safely; invalid intent fails safely; no prohibited analytics/referrer leakage occurs. |
| TD-037 | Automated and manual checks prove labels, autocomplete, instructions, and errors are accessible.                      |
| TD-038 | Keyboard/screen-reader evidence proves focus, progress, and asynchronous errors are announced appropriately.          |
| TD-039 | Mobile disclosure semantics, focus, Escape, resize, and route-change behaviour pass tests.                            |
| TD-042 | Favicon, robots, sitemap, canonical, social metadata, and exclusion rules pass generated-output and preview checks.   |
| TD-043 | Verified monitored channels and escalation paths are accessible and operationally tested.                             |
| TD-044 | Approved font decision passes privacy, CSP, fallback, resilience, and performance checks.                             |

## Validation

- Run the complete CI suite from Sprint 04.
- Run automated accessibility checks on every retained route and major state.
- Perform keyboard-only and representative screen-reader walkthroughs on desktop and mobile.
- Test navigation from each route at supported breakpoints, including direct/deep links and invalid parameters.
- Validate generated sitemap/robots output, absolute canonicals, favicons, and social previews.
- Inspect analytics, logs, URLs, and referrers for prohibited condition or support-form data.
- Simulate unavailable fonts and support endpoints and confirm usable fallbacks.

## Non-Goals

- Broad visual redesign unrelated to verified usability or accessibility defects.
- Publishing unapproved condition education or marketing claims.
- Adding analytics events owned by Sprint 07 without its privacy review.
- Treating automated accessibility tools as a replacement for manual verification.

## Risks and Rollback

Route changes may break campaign links, while attribution can expose sensitive intent. Maintain redirects only where safe, version campaign destinations, and provide explicit invalid-state handling. Metadata/indexing errors can expose restricted pages; default uncertain routes to no-index until approved. Keep font and navigation changes independently reversible.

## Documentation and RAG Updates

- Add route/indexability, accessibility, support-channel, and metadata decisions.
- Update TD-035–TD-039 and TD-042–TD-044 only after evidence review.
- Refresh `docs/RAG/01-project-context.md`, `02-current-state.md`, `04-domain-glossary.md`, `05-decision-register.md`, `06-known-limitations.md`, and `07-index.json`.
- Produce `docs/03-completion-reports/phase-01/sprint-06-journey-ux-accessibility.md`.
