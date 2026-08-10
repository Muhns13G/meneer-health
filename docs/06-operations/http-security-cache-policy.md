---
runbook_id: meneer-http-security-cache
title: HTTP Security Headers and Cache Policy
status: active-verified
last_updated: 2026-08-10
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# HTTP Security Headers and Cache Policy

## Purpose

This is the canonical v1 response policy for the Cloudflare-hosted TanStack application. It covers
the current informational site without activating data collection or changing customer-facing
content. Any future route that authenticates a user, accepts data, creates a session, or returns a
personalised projection must be classified here before release.

## Enforcement Layers

| Layer              | Owner                                                            | Coverage                                                                             |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Worker responses   | `src/server/security/response-policy.ts` through `src/server.ts` | SSR documents, redirects, errors, and future Worker-generated responses              |
| Static assets      | `public/_headers`, copied into the Cloudflare asset output       | Fingerprinted build assets and mutable public campaign assets that bypass the Worker |
| Cloudflare account | Repository owner                                                 | TLS, domain, deployment, and any separately approved edge controls                   |

Do not move the complete policy into `_headers`: Cloudflare does not apply that file to
Worker-generated responses. Do not rely only on the Worker entry because static assets are served
before it.

## Response Classes

| Class                      | Current examples                                  | Cache policy                            |
| -------------------------- | ------------------------------------------------- | --------------------------------------- |
| Public document            | `/`, `/contact`, `/privacy`, `/terms`, `/poster*` | `public, max-age=0, must-revalidate`    |
| Sensitive journey          | `/start`, `/peptides`, including nested paths     | `private, no-store, max-age=0`          |
| Redirect or error          | `/go/*`, ordinary 404/5xx                         | `private, no-store, max-age=0`          |
| Non-read or cookie-bearing | non-GET/HEAD, any `Set-Cookie` response           | `private, no-store, max-age=0`          |
| Fingerprinted asset        | `/assets/*`                                       | `public, max-age=31536000, immutable`   |
| Mutable public asset       | `/campaigns/*`                                    | `public, max-age=3600, must-revalidate` |

Errors, redirects, cookies, and request method take precedence over a route's ordinary class.
Only the listed public routes are allowlisted; an unknown future 200 response fails closed to the
sensitive no-store class until it is deliberately classified.

## Browser Security Baseline

All classes receive CSP, deny framing, MIME-sniff prevention, strict-origin referrer handling, and a
permissions policy disabling unused device/payment capabilities. HTTPS responses receive one-year
HSTS without `includeSubDomains` or preload. SSR documents use a fresh request-scoped nonce for
TanStack/React scripts; `unsafe-inline` is not allowed for scripts. Inline styles remain allowed
because current campaign pages and progress UI use style elements/attributes.

The CSP permits only the current application needs: same-origin scripts and connections, Google
Fonts styles/fonts, HTTPS images/media, data images, same-origin forms, and no plugins or framing.
Adding analytics, payments, storage, new media origins, embedded content, or external form actions
requires a reviewed minimal directive change plus browser and network verification.

## Verification and Release

Run unit tests, production build, both Playwright projects, and the local response matrix before the
owner commits. After the owner pushes and Cloudflare builds the exact commit, verify `/`, `/start`,
`/peptides`, `/go/dads` without following redirects, an unknown path, one built `/assets/*` URL, and
`/campaigns/qr/dads.svg`. Confirm all baseline headers, the class-specific cache value, an HTTPS
HSTS header, nonce-bearing document CSP, normal hydration, and no CSP console/network violations.

Record the deployed commit and Cloudflare evidence before marking TD-018 Verified. If a policy
breaks a required journey, roll back under the release runbook; do not weaken it globally without a
documented resource need and regression evidence.

## Verified Hosted Baseline

On 10 August 2026, permanent implementation commit `a4c8e52` was reconciled with preview deployment
head `8809ca2`. Cloudflare deployment `56271c10-0057-4dcf-9052-4450d010276a`, Worker version
`30b11eb9-d5d4-4cbc-a920-81b5f6a217a0`, passed the complete HTTPS response matrix at
`https://meneerhealth.co.za`. Public, sensitive, redirect, error, fingerprinted-asset, and mutable
asset classes returned the intended headers and cache policy. The rendered nonce matched the CSP,
hydration completed, the preview video reached ready state, and the browser console contained no
warnings or errors. This baseline verifies TD-018; changes described above require renewed evidence.
