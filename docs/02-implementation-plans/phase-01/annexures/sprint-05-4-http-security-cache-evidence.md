---
evidence_id: phase-01-sprint-05-task-04
title: Sprint 05.4 HTTP Security and Cache Policy
status: verified-task-evidence
date: 2026-08-10
source_commit: a4c8e52
hosted_commit: 8809ca2
hosted_deployment: 56271c10-0057-4dcf-9052-4450d010276a
hosted_version: 30b11eb9-d5d4-4cbc-a920-81b5f6a217a0
hosted_origin: https://meneerhealth.co.za
owner: "@Muhns13G"
related_debt: [TD-018]
---

# Sprint 05.4 HTTP Security and Cache Policy

## Mission and Boundary

Add one explicit, testable security-header and cache contract for public documents, sensitive
journeys, redirects, errors, Worker responses, and Cloudflare static assets. No route content,
journey availability, form, provider, credential, patient data, or Cloudflare account setting is
changed.

## Implemented Controls

| Surface           | Outcome                                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker policy     | Central response classification applies cache, CSP, framing, MIME, referrer, permissions, and HTTPS transport controls while preserving status, existing headers, and streamed bodies. |
| SSR nonce         | Every rendered response receives a fresh nonce used by TanStack/React scripts; CSP does not permit inline script globally.                                                             |
| Sensitive routes  | `/start` and `/peptides` use `private, no-store, max-age=0`; nested paths inherit the classification.                                                                                  |
| Failure safety    | Redirects, errors, non-read methods, and cookie-bearing responses cannot enter a public cache.                                                                                         |
| Static assets     | Cloudflare `public/_headers` covers assets that bypass the Worker. Fingerprinted `/assets/*` files are immutable for one year; mutable `/campaigns/*` files revalidate after one hour. |
| CSP compatibility | Current Google Fonts, HTTPS media/images, data images, same-origin hydration/connections/forms, and intentional inline styles remain supported.                                        |
| Operations        | The enforcement split, response matrix, change triggers, hosted test procedure, and rollback rule are recorded in the HTTP policy and Cloudflare release runbook.                      |

## Local Evidence

- `bun run test -- --reporter=verbose` passes 10 files and 49 tests. Policy tests cover public,
  sensitive, redirect, error, fingerprinted/mutable asset,
  cookie-bearing, non-read, HTTPS, HTTP, nonce, header-preservation, and body-preservation cases.
- Cloudflare production preview parsed all three `_headers` rules. Direct response inspection passed
  for `/`, `/start`, `/peptides`, `/go/dads`, an unknown path, a built stylesheet, and the dads QR.
  The nonce in the homepage CSP exactly matched the rendered script nonce.
- `bun run test:e2e` passes all 50 desktop/mobile Playwright checks. It verifies Worker response
  classes, preserved routes, redirects, hydration, console/network health, and automated
  accessibility; production preview separately proves the built static-asset classes.
- Frozen install, format, lint, typecheck, build/client-canary, generated-route consistency, both
  zero-finding audits, Cloudflare dry-run, JSON parsing, and `git diff --check` pass. The existing
  upstream `punycode` deprecation remains bounded; the local verification did not deploy.
- The customer-facing route and component files are untouched.

## Hosted Close-out

The repository owner committed and deployed the Task 5.4 implementation. Permanent branch commit
`a4c8e52` and preview implementation commit `19d3661` are equivalent for the security/cache files;
preview head `8809ca2` adds only the approved preview video fallback. Cloudflare deployment
`56271c10-0057-4dcf-9052-4450d010276a` serves Worker version
`30b11eb9-d5d4-4cbc-a920-81b5f6a217a0` at 100% from `https://meneerhealth.co.za`.

| Hosted class            | Verified outcome                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| Public document `/`     | HTTP 200; `public, max-age=0, must-revalidate`; complete security baseline and one-year HSTS.    |
| Sensitive journeys      | `/start` and `/peptides` return HTTP 200 with `private, no-store, max-age=0`.                    |
| Redirect                | `/go/dads` returns HTTP 307 with the approved attributed `/start` location and private no-store. |
| Error                   | An unknown path returns HTTP 404 with private no-store.                                          |
| Fingerprinted asset     | The deployed stylesheet returns one-year immutable caching and the static security baseline.     |
| Mutable campaign asset  | `/campaigns/qr/dads.svg` returns one-hour revalidation and the static security baseline.         |
| CSP and browser runtime | The header nonce matches the rendered script nonce; hydration completes with no warnings/errors. |
| Preview media           | `/peptides` resolves the approved draft MP4; the browser reports media ready state 4.            |

The owner requested the closure-document update after reviewing the audit. Task 5.4 is Completed
and TD-018 is Verified. Future routes, origins, inline requirements, or sensitive journeys must
extend the policy and repeat the relevant regression matrix.
