---
evidence_id: phase-01-sprint-05-task-04
title: Sprint 05.4 HTTP Security and Cache Policy
status: implemented-local-hosted-verification-pending
date: 2026-08-10
source_commit: 64fc65d
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
  upstream `punycode` deprecation remains bounded and no deployment occurred.
- The customer-facing route and component files are untouched.

## Debt Disposition

TD-018 moves from Open to In progress. Implementation and local evidence are complete, but the
registry requires the exact committed build to pass the same matrix on Cloudflare HTTPS before the
debt and Task 5.4 may be marked Verified. The repository owner must commit/push/deploy; this task
does not authorise the agent to do so.

## Hosted Close-out

After deployment, record the source commit, deployment/version, response matrix, HSTS and nonce-CSP
evidence, hydration/console result, and owner acceptance here. Then change this evidence and Task
5.4 to verified/completed and update TD-018 to Verified.
