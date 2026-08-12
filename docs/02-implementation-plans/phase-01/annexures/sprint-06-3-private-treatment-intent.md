---
task: 6.3
status: completed
date: 2026-08-12
related_debt: [TD-036]
debt_status: open-activation-gated
---

# Sprint 06.3 — Private Treatment Intent

## Outcome

Task 6.3 implements a typed, server-owned treatment-selection boundary without changing approved
public wording or activating the gated `/start` flow. Hair, ED, weight, and TRT cards submit stable
opaque identifiers through a same-origin POST. Peptides retains its dedicated `/peptides` route and
the generic “Find your match” link remains `/start` without inferred intent.

## Security and Privacy Contract

- No health, condition, symptom, diagnosis, medication, or treatment value enters a URL, query,
  fragment, referrer, analytics call, third-party request, or telemetry field.
- The endpoint accepts only bounded `application/x-www-form-urlencoded` same-origin POST requests
  and uses the existing Cloudflare rate limiter.
- Only four opaque IDs are allowlisted. Human-readable values and unsupported IDs store nothing.
- Accepted intent is AES-256-GCM encrypted in a 30-minute `HttpOnly`, `Secure`, `SameSite=Strict`
  cookie. Stale, malformed, future-issued, and tampered state resolves to no intent.
- Missing or invalid encryption configuration redirects safely to the unchanged `/start` gate
  without setting state. The endpoint never creates patient, account, clinical, or partner data.

## Activation Gate

TD-036 remains Open until the owner approves the opaque identifiers and 30-minute expiry, provisions
`JOURNEY_INTENT_ENCRYPTION_KEY_BASE64` as a server-only hosted secret, and a hosted exercise proves
selection, expiry, tamper rejection, and absence from URLs, referrers, logs, analytics, and
third-party traffic. The code and local evidence are complete; production persistence is not
represented as active.

## Evidence

- Domain tests prove allowlisting, encrypted round trips, expiry, malformed-state rejection, and
  tamper rejection.
- HTTP tests prove same-origin/content-type/body/rate controls, secure cookie attributes, safe
  redirects, invalid selection behavior, and configuration fallback.
- Component tests prove all four cards POST opaque values to a query-free internal URL while the
  Peptides and generic Start destinations remain unchanged.
- The route policy classifies `/api/journey/intent` as internal and non-indexable.
