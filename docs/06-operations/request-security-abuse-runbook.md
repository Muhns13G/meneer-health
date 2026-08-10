---
document_id: meneer-request-security-abuse-runbook
title: Request Security and Abuse-Control Runbook
status: active-foundation
last_updated: 2026-08-10
owner: "@Muhns13G"
audience: contributors, security, operations, release
sensitivity: internal
---

# Request Security and Abuse-Control Runbook

## Current Boundary

Task 5.11 protects the current read-only Worker without enabling a form, API, callback, account or
transaction. `src/server/security/request-security.ts` is the application boundary;
`wrangler.jsonc` supplies one Cloudflare rate-limit binding. Current routes accept body-free `GET`
and `HEAD` only. Every unregistered mutation is rate-checked and denied; `/api` and `/.mcp` probes
receive the ordinary non-enumerating `404` contract.

Cloudflare may answer an `OPTIONS` preflight with `204` before application code. It remains denied
because no `Access-Control-Allow-Origin` header is returned. Do not interpret the `204` as endpoint
availability.

## Threat Model and Controls

| Threat                    | Enforced control                                                                                               | Residual or activation gate                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Oversized URL/header/body | 4 KiB URL and 32 KiB header caps before routing; protected JSON defaults to 32 KiB and streams to the cap      | File upload policy is separate and remains unavailable                                  |
| Slow or stuck work        | 15-second application deadline aborts the request and returns a safe `503`                                     | Dependencies must honour the propagated abort signal                                    |
| Cross-site command/CSRF   | Exact target `Origin`, same-origin fetch context, JSON-only body, and no CORS grant                            | Provider callbacks need signature/time/environment rules instead, in Tasks 5.14–5.15    |
| Flooding                  | Cloudflare binding permits 60 non-read attempts per minute per coarse hashed source key and location           | It is eventually consistent and not accounting; tune from observed pilot traffic        |
| Bot submission            | Protected public commands fail closed without a server-verified proof and trusted proof-derived rate key       | Provision separate Turnstile widgets/secrets per environment only with an approved form |
| Duplicate/replay          | Protected commands require a 16–128 character idempotency key; Task 5.9 remains the durable authority          | Browser redirects never prove a committed outcome                                       |
| Malformed body            | Approved commands accept `POST application/json`, one bounded UTF-8 JSON object, then domain-schema validation | Multipart, XML and provider payloads remain unregistered                                |
| Direct endpoint probing   | No mutation endpoint is registered; reserved endpoint probes are hidden                                        | Registration requires a named policy, handler tests and release review                  |
| Diagnostic leakage        | Stable error contract and safe correlation ID; no raw body, token, IP or provider detail in responses          | Task 5.12 owns redacted structured monitoring and alerts                                |

## Activation Checklist

Before registering any route, record its owner, caller, data classification, exact method, body cap,
timeout, origin/signature model, authentication, authorisation, rate key and limit, duplicate rule,
anti-automation rule, safe errors, audit facts and rollback. Then:

1. Add a route-specific policy and negative tests for oversized, malformed, cross-origin, direct,
   duplicate, replay, rate-excess, challenge failure, dependency failure and timeout cases.
2. For a public browser form, provision Cloudflare Turnstile Free separately per environment. Keep
   the secret server-only; validate every token through Siteverify, including expected hostname and
   action. Tokens are single-use and expire after five minutes.
3. For an authenticated command, derive the rate key from the verified internal subject/service
   context—not a client-supplied identifier. Do not require Turnstile by default for trusted
   workforce service traffic; use assurance, scope and anomaly controls instead.
4. For provider callbacks, do not use browser-origin or Turnstile rules. Verify signature/key,
   timestamp, environment, schema and replay identity before the Task 5.10 inbox.
5. Configure and review the available Cloudflare Free WAF rate rule as an outer coarse control.
   Application limits remain mandatory because edge limits are location-scoped and eventually
   consistent.
6. Verify locally, in preview and on the final hostname. Confirm approved traffic succeeds and all
   denial responses remain `private, no-store` without CORS or sensitive diagnostics.

## Limit Changes and Incidents

Treat limits as governed policy, not magic constants. Lower them during attack only with security
and operations approval; record legitimate-user impact and rollback. Raise them only with measured
traffic, abuse review and cost review. A rate-limiter or anti-automation dependency failure must
fail closed for mutations. Preserve only safe reason/correlation evidence and follow the Task 5.12
incident path; never log request bodies, challenge tokens, credentials, questionnaire answers or raw
source addresses.

## Verification

Run `bun run check:cloudflare-types`, `bun run test`, `bun run build`,
`bun run deploy:dry-run`, and `bun run test:e2e`. Regenerate `worker-configuration.d.ts` only with
`bunx wrangler types` after changing bindings. The owner alone may deploy or configure hosted WAF,
Turnstile or release settings.
