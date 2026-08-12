---
task: 6.9
status: completed
date: 2026-08-12
related_debt: [TD-042]
debt_status: verified
---

# Sprint 06.9 — Favicon and Social Metadata

## Outcome

Task 6.9 closes the remaining functional TD-042 asset gap by reusing the existing
company-approved placeholder mark unchanged. It introduces no new brand design, website wording,
claim, route, or external media dependency.

## Implemented Contract

- A typed metadata catalogue owns the favicon and social-image source, MIME type, truthful
  550 × 370 dimensions, and descriptive alternative text.
- The root head publishes one PNG favicon plus complete Open Graph image URL, secure URL, type,
  width, height, and alt metadata.
- Twitter retains the proportional `summary` card and now publishes the same absolute image and alt
  metadata.
- The favicon uses the current deployment's relative Vite asset URL. Social crawlers receive an
  absolute `https://meneerhealth.co.za` URL; production builds rewrite the tracked source to its
  hashed asset path.
- Public, restricted, campaign, error, and not-found surfaces inherit the shared asset metadata;
  Task 6.8 indexing exclusions remain unchanged.

## Evidence and Future Brand Work

Unit tests verify the approved source, canonical URL, MIME type, dimensions, and alt text. The
desktop and Pixel 7 browser matrix verifies all eight active routes plus the not-found boundary,
including successful PNG retrieval (18 checks). A production build and local production preview
confirm `/assets/meneer-mark-C6Yk0xuZ.png` and the corresponding absolute canonical social URL.

TD-042 is Verified for v1 functionality. FC-002 retains creation of purpose-designed final favicon,
application-icon, and 1200 × 630 social-card variants when the final identity is approved; that
quality evolution does not reopen the missing-metadata defect.
