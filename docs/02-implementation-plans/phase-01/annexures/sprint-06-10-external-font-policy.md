---
task: 6.10
status: completed
date: 2026-08-13
related_debt: [TD-044]
debt_status: verified
---

# Sprint 06.10 — External Font Policy

## Outcome

The owner formally approved retaining Google Fonts for the v1 pilot. The implementation preserves
the existing DM Sans and Playfair Display typography and records one typed delivery contract rather
than changing public design in response to unrelated local sandbox warnings.

## Implemented Contract

- The Google stylesheet URL, stylesheet origin, font-file origin, families, weights, `display=swap`
  strategy, fallback stacks, and reassessment trigger are centrally declared.
- Root preconnect and stylesheet metadata consume that contract. Dynamic and static CSPs permit only
  the required Google stylesheet and font-file origins.
- The privacy notice now discloses the external font request and its limited technical-data boundary;
  no questionnaire or form payload is sent with the font request.
- Cloudflare Fonts and automatic Web Analytics remain disabled. FC-004 schedules a self-hosting
  reassessment before public launch or the Next.js migration.

## Resilience and Performance Evidence

Unit tests pin the provider, families, requested weights, `display=swap`, CSS fallback stacks, and
static CSP consistency. Browser tests verify the exact provider links and response CSP on desktop
and Pixel 7. They block both Google font origins, then prove the homepage heading remains visible,
the declared system fallback stacks remain active, and no horizontal overflow is introduced.

The preconnects and `display=swap` strategy remain explicit performance safeguards; the existing
site-health matrix also isolates external fonts on every active route. TD-044 is therefore Verified
for the v1 pilot, with longer-term delivery optimisation retained under FC-004.
