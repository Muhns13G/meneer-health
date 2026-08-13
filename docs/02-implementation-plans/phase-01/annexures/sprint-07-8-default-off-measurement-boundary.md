---
task: 7.8
status: completed
date: 2026-08-13
related_debt: [TD-045]
debt_status: in-progress
source_baseline: a9e129e
---

# Sprint 07.8 — Default-Off Measurement Boundary

## Outcome

Task 7.8 implements the approved first-party measurement boundary without enabling collection. Two
server-only POST routes accept explicit consent decisions and strict allowlisted events only when
`MEASUREMENT_MODE=pilot` and the private Supabase runtime are configured. The ordinary default is
`disabled`; unavailable measurement routes return a generic `404` and no public page calls them.

The application layer remains provider-neutral. A repository interface owns consent and event
persistence, while the current adapter uses narrow Supabase RPCs into `measurement_private`.
Browser roles have no schema, table, or function access.

## Implemented Controls

- Versioned `measurement.consent@1` and `measurement.event@1` contracts accept only the nine
  approved events, two campaign identifiers, generic step numbers, coarse duration bands and
  bounded outcomes. Strict schemas reject extra fields.
- Consent is separate from service access. Grant creates an independent opaque flow and receipt;
  withdrawal expires the host-only cookie, blocks later events, records consent evidence and sets
  a deletion deadline no later than seven days.
- The flow cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, host-only and limited to 30 minutes.
  It is not linked to Auth, treatment intent, payment, fulfilment, clinical or identity records.
- Same-origin JSON, bounded bodies, idempotency keys, hashed rate keys and safe error responses
  protect both mutation routes. Successful responses contain no measurement payload.
- PostgreSQL constraints repeat the event allowlist, consent state, environment isolation, expiry,
  campaign, step, outcome, duration and idempotency rules. Forced RLS and revoked grants keep
  storage private.

## Verification and Remaining Boundary

Focused contract, service, adapter, HTTP, environment and request-security tests pass. A fresh
local Supabase reset applies the migration and the full pgTAP suite passes 309 assertions across
ten database test files, including direct-access denial, replay safety, changed-replay rejection,
environment isolation, expiry, withdrawal and deletion scheduling.

The complete repository matrix also passes: 58 Vitest files/322 tests and the existing 110
Playwright/axe desktop/mobile checks. A focused 22-check boundary rerun additionally proves both
measurement endpoints stay hidden on desktop and mobile while disabled. TypeScript, ESLint,
Prettier, production build/client canary, discovery, portability, Cloudflare generated types,
database lint, and full/production dependency audits pass.

TD-045 remains **In progress**. Task 7.9 must prove prohibited-data canaries, URL/referrer/log and
replay exclusions, purge/retention, export/deletion, minimum access and hosted network behaviour.
Final privacy/security approval is still required before setting `MEASUREMENT_MODE=pilot`. This
task does not add a consent interface, enable analytics, collect pilot data, or approve richer
longitudinal measurement.
