---
task: 6.8
status: completed
date: 2026-08-12
related_debt: [TD-042]
debt_status: open-assets
---

# Sprint 06.8 — Discovery Route Policy

## Outcome

Task 6.8 makes the approved route/indexability contract executable without changing website copy.
Only `/`, `/contact`, `/privacy`, and `/terms` publish absolute canonicals on
`https://meneerhealth.co.za` and permit indexing.

## Implemented Contract

- The canonical route catalogue generates the committed `public/robots.txt` and
  `public/sitemap.xml` outputs.
- Robots rules exclude `/api/`, `/go/`, `/peptides`, `/poster`, and `/start`; prefix matching also
  covers the known nested API, redirect, and campaign paths.
- The sitemap contains only the four approved public-information routes and uses absolute HTTPS
  URLs on the canonical domain.
- Restricted and campaign documents retain `noindex, nofollow` metadata and no canonical link.
  Non-indexable, redirect, internal, unknown, and error responses also receive an
  `X-Robots-Tag: noindex, nofollow` header. Fingerprinted and public assets are not assigned page
  indexing metadata.
- `check:discovery` fails CI when committed discovery files diverge from the route policy.

## Evidence and Remaining Gate

Focused policy/type checks pass. The desktop and Pixel 7 Playwright matrix verifies all four
absolute public canonicals, all four retained document exclusions, and the served robots/sitemap
outputs (18 checks).

TD-042 remains Open because approved favicon and social-card assets—and their rendered preview
verification—belong to Task 6.9 and are not yet available. This task introduced no public wording
changes and did not activate any restricted workflow.
