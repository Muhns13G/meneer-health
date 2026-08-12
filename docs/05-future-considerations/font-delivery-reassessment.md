---
consideration_id: FC-004
title: Font Delivery Reassessment
status: deferred
decision_due: before-public-launch-or-nextjs-migration
last_reviewed: 2026-08-13
owner: "@Muhns13G"
sensitivity: internal
---

# Font Delivery Reassessment

## Current Decision

Retain the existing Google Fonts CSS API delivery for the v1 pilot. The approved boundary is limited
to DM Sans and Playfair Display, uses `display=swap`, declares system fallbacks, permits only the
required Google stylesheet and font-file origins in CSP, and is disclosed in the website privacy
notice. Cloudflare Fonts and automatic Web Analytics remain disabled.

This decision preserves the established design without treating local sandbox-only Worker logging
warnings as evidence of a production font failure.

## Reassessment Trigger

Reassess self-hosting before public launch or during the Next.js migration, or sooner if monitoring
shows material latency, availability, privacy, CSP, or regional-delivery problems. Any change must
preserve the approved family/weight contract, verify licensing and asset provenance, remove obsolete
external origins, and pass desktop/mobile visual, fallback, accessibility, and performance checks.
