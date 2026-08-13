---
report_id: phase-01-sprint-06-completion
title: Sprint 06 Journey, UX, Accessibility, and Discovery
status: completed
date: 2026-08-13
owner: "@Muhns13G"
---

# Sprint 06 Completion Report — Journey, UX, Accessibility, and Discovery

## Mission and Outcome

Sprint 06 made the retained v1 surface coherent, accessible, navigable, and intentionally
discoverable without changing approved marketing wording, activating transactional prototypes, or
leaking treatment intent. Tasks 6.1–6.12 are complete. TD-035, TD-036, TD-039, TD-042, and TD-044
are Verified; TD-037, TD-038, and TD-043 remain explicit activation/external-input gates.

## Work and Decisions

- Replaced route-local shared hashes with route-aware links and verified the shared navigation on
  every retained public route and viewport.
- Added four owner-approved opaque treatment identifiers, same-origin POST handling, strict
  allowlisting, AES-256-GCM persistence, and a 30-minute host-only `HttpOnly`, `Secure`,
  `SameSite=Strict` cookie. Invalid, stale, tampered, or unconfigured state fails closed.
- Added reusable accessible profile fields, deterministic validation/error summaries, progress
  semantics, live announcements, focus movement, Back-state preservation, and reduced-motion-safe
  transitions to the preserved prototypes without routing them.
- Rebuilt mobile navigation as a labelled disclosure with focus entry/return, Escape, outside-click,
  resize, route-change, and hidden-content protections.
- Centralised general support and verified emergency contacts while keeping unapproved dedicated
  privacy, complaints, and clinical channels explicitly unavailable.
- Defined public/restricted/campaign route classes; added absolute canonicals, committed robots and
  sitemap outputs, response exclusions, favicon metadata, and complete Open Graph/Twitter images.
- Reused the approved placeholder mark for v1 metadata and retained final brand work under FC-002.
- Formally retained Google Fonts for the pilot through a typed provider/fallback/CSP/privacy policy;
  Cloudflare Fonts and automatic Web Analytics remain disabled.
- Completed desktop/mobile axe, keyboard, focus, 320-pixel reflow, forced-colour, reduced-motion,
  metadata, navigation, support, discovery, font-failure, and route-health verification.

## Deviations from the Plan

- The intent work was initially closed only at repository level. A final hosted follow-through was
  added after the canonical Worker first exposed an older deployment and then correctly failed
  closed without its runtime secret. Branch reconciliation, secret deployment, and the bounded
  canonical-domain exercise subsequently Verified TD-036.
- The plan permitted self-hosted or approved external fonts. The owner approved Google Fonts for
  the v1 pilot, so the Sprint governed the dependency rather than changing the visual typography.
- Task 6.11 could not exercise the preserved form and stepped prototypes as live routes because
  activating them would contradict the approved non-transactional boundary. TD-037 and TD-038
  therefore remain activation gates rather than being falsely marked Verified.
- VoiceOver automation was not reliable in the agent runtime. Chromium accessibility-tree,
  keyboard, focus, axe, display-preference, and manual visible-state evidence was recorded, while a
  live assistive-technology walkthrough remains required when the forms are routed.
- The final local default Vitest pool was repeatedly terminated by the desktop execution wrapper
  without a test failure or report. Focused tests passed locally, and exact-commit GitHub CI
  independently passed all 50 files/277 tests.

## Lessons Learned

- A secure feature is not hosted merely because its route exists; runtime-secret scope and the
  deployed Worker version require explicit proof.
- Fail-closed responses intentionally make missing and invalid configuration look alike. A bounded
  synthetic verifier is necessary to distinguish secure non-activation from successful activation.
- Accessibility work on preserved code can improve the future activation baseline, but it cannot
  replace testing the eventual routed asynchronous experience.
- Public discovery should derive from one route policy; page metadata, response headers, robots,
  sitemap, canonicals, and tests otherwise drift independently.
- External dependencies can be retained responsibly when the owner decision, exact origin, CSP,
  disclosure, fallback, failure behavior, and reassessment trigger are all explicit.

## Technical Debt and Residual Risk

No new technical-debt ID accrued.

- **Verified:** TD-035 route-aware navigation; TD-036 private treatment intent; TD-039 mobile
  disclosure; TD-042 discovery/favicon/social metadata; TD-044 font policy.
- **Open activation gate:** TD-037 until an approved routed form receives live keyboard and
  assistive-technology verification.
- **Open activation gate:** TD-038 until a routed stepped/asynchronous flow receives live focus and
  pending/success/failure announcement verification.
- **Open external-input gate:** TD-043 until accountable dedicated privacy, complaint, and
  clinical/adverse-event owners, channels, hours, and fallback routing are approved and tested.
- TD-040 and TD-045 remain Sprint 07 scope; Sprint 06 did not change public journey claims or add
  analytics.

## Existing Files Modified

| File or group                                                                                                | Sprint change                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.example`, `config/environment-catalogue.ts`, `package.json`, `.github/workflows/ci.yml`, `AGENTS.md`   | Added the server-only intent key, hosted verifier command, discovery check, and testing guidance.                                        |
| Sprint plan, debt registry, FC-002 and RAG documents                                                         | Reconciled task evidence, decisions, residual gates, and closure state.                                                                  |
| `e2e/fixtures.ts`, `e2e/navigation.spec.ts`                                                                  | Extended the retained route and route-aware navigation matrix.                                                                           |
| `src/components/Nav.tsx`, `Nav.test.tsx`, `SafetyEntryGate.tsx`, `Treatments.tsx`                            | Implemented disclosure semantics, accessible gate behavior, and opaque intent submission.                                                |
| `src/routes/__root.tsx`, `index.tsx`, `start.tsx`, `peptides.tsx`, `contact.tsx`, `privacy.tsx`, `terms.tsx` | Added governed metadata, accessibility, support, font disclosure, and preserved-flow behavior without rewriting approved marketing copy. |
| `src/lib/campaigns.ts`, `src/server/security/*`, `src/styles.css`, `src/routeTree.gen.ts`                    | Integrated canonical policy, protected intent POSTs, CSP alignment, reduced motion, and generated routing.                               |

## Existing Files Deleted

No existing file was deleted during Sprint 06.

## Files Created

| File or group                                                                                                        | Purpose                                                                                         |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `docs/02-implementation-plans/phase-01/annexures/sprint-06-*.md`                                                     | Task 6.1–6.11 implementation and verification evidence.                                         |
| `docs/03-completion-reports/phase-01/sprint-06-journey-ux-accessibility.md`                                          | Sprint 06 mission, decisions, deviations, lessons, file ledger, debt, and closure evidence.     |
| `docs/05-future-considerations/font-delivery-reassessment.md`                                                        | Pilot-to-public-launch font reassessment trigger.                                               |
| `e2e/discovery.spec.ts`, `display-preferences.spec.ts`, `font-policy.spec.ts`, `metadata.spec.ts`, `support.spec.ts` | Desktop/mobile discovery, display preference, external failure, metadata, and support coverage. |
| `public/robots.txt`, `public/sitemap.xml`, `scripts/check-public-discovery.ts`                                       | Generated-output contract and drift check for public indexing.                                  |
| `scripts/test-hosted-treatment-intent.ts`                                                                            | Bounded canonical-domain proof for encrypted intent without secret/cookie output.               |
| `src/components/ProfileFields*`, `SteppedFlow.tsx`, `Treatments.test.tsx`                                            | Accessible preserved-form primitives and intent-form coverage.                                  |
| `src/domain/journey/*`, `src/hooks/use-stepped-flow-focus.ts`                                                        | Typed validation, opaque intent cryptography, and step-focus behavior.                          |
| `src/lib/public-*`, `src/lib/support-channels.ts`                                                                    | Canonical route, metadata, font, and support policy sources.                                    |
| `src/routes/-stepped-flows.test.tsx`, `-support-surfaces.test.tsx`, `api/journey/intent.ts`                          | Route-safe prototype tests and the protected intent endpoint.                                   |
| `src/server/journey/*`                                                                                               | Server-owned intent HTTP boundary and tests.                                                    |

Git records 42 added and 29 modified files from the Sprint 05 correction baseline
`af2201a` through implementation checkpoint `fd6863f`; no file was deleted.

## Validation and Closure Boundary

GitHub Actions run `31700802588` passed at exact implementation commit
`fd6863f5bc87e7d234ce4e06f8efe01c2ac3df97`. It verified formatting, lint, strict TypeScript,
current Worker types, 50 Vitest files/277 tests, 14 capabilities, 14 contract majors, 20 portable
fixtures, public-discovery outputs, 12 migrations, 9 pgTAP files/296 assertions, every synthetic
integration, incident/recovery exercises, two zero-finding audits, production build, generated
route tree, Cloudflare dry-run, and 110 Playwright/axe checks.

Task 6.12 locally repeated formatting, lint, TypeScript, Worker types, portability, discovery, both
audits, production build, generated output, dry-run, all 110 browser checks, the 296-assertion
database suite, every synthetic integration, incident exercise, and encrypted 125/125 recovery in
14 seconds. The owner separately ran `test:intent:hosted` successfully against
`https://meneerhealth.co.za`, proving secure persistence, invalid-input fallback, expiry/tamper
rejection, and zero URL/response intent fields.

Sprint 06 is fully implemented and closed as a non-transactional journey/accessibility/discovery
Sprint. Closure does not activate preserved forms, health-data collection, patient accounts,
payments, clinical decisions, partner fulfilment, analytics, or public launch. The next commit must
pass required hosted CI before it becomes the new exact closure-document checkpoint.
