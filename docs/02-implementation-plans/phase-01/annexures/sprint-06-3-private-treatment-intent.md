---
task: 6.3
status: completed
date: 2026-08-12
related_debt: [TD-036]
debt_status: verified
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

## Activation Closure

The owner approved the four existing opaque identifiers and 30-minute expiry on 13 August 2026.
The deployment branches were reconciled, the owner provisioned a server-only hosted
`JOURNEY_INTENT_ENCRYPTION_KEY_BASE64` secret, and the canonical hosted exercise passed on the same
date. TD-036 is therefore Verified.

Run the bounded exercise only after the same 32-byte base64 key is stored in the Worker and ignored
`.env.production.local` file:

```sh
HOSTED_TREATMENT_INTENT_BASE_URL=https://meneerhealth.co.za \
HOSTED_TREATMENT_INTENT_EXERCISE_CONFIRM=synthetic-opaque-only \
bun --env-file=.env.production.local run test:intent:hosted
```

The exercise submits one allowlisted opaque identifier and one rejected human-readable value. It
does not create an account, patient, clinical, partner, or payment record and does not print the
identifier, cookie, encryption key, or resolved treatment intent.

## Hosted Verification — 13 August 2026

The owner ran the bounded exercise against `https://meneerhealth.co.za` using the locally retained
copy of the hosted key. It reported:

```json
{
  "exercise": "hosted-treatment-intent",
  "validOpaqueSelection": true,
  "secureCookieAttributes": true,
  "invalidSelectionFailedClosed": true,
  "tamperRejected": true,
  "expiryRejected": true,
  "urlIntentFields": 0,
  "responsePayloadFields": 0
}
```

This proves the allowlisted selection produced an encrypted host-only cookie with the approved
30-minute lifetime and required `HttpOnly`, `Secure`, and `SameSite=Strict` attributes. The script
opened it only with the server key, rejected tampering and simulated expiry, and proved a
human-readable selection produced no state. Both responses had empty bodies and clean `/start`
redirects.

The server telemetry contract is strict and permits only operational metadata such as route class,
outcome, status class, duration bucket, reason, and correlation identifier. Request bodies,
selections, cookies, and resolved intent cannot enter that sink. No analytics or advertising
tracker is configured. The same-origin cookie is not available to Google Fonts or another
third-party origin, and the clean redirect/referrer contains no intent. These controls close the
remaining log, analytics, referrer, and third-party leakage checks without recording the secret or
cookie as evidence.

## Evidence

- Domain tests prove allowlisting, encrypted round trips, expiry, malformed-state rejection, and
  tamper rejection.
- HTTP tests prove same-origin/content-type/body/rate controls, secure cookie attributes, safe
  redirects, invalid selection behavior, and configuration fallback.
- Component tests prove all four cards POST opaque values to a query-free internal URL while the
  Peptides and generic Start destinations remain unchanged.
- The route policy classifies `/api/journey/intent` as internal and non-indexable.
