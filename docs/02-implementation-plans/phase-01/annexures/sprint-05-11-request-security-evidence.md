---
evidence_id: phase-01-sprint-05-task-11
title: Sprint 05.11 Request Security and Abuse-Control Evidence
status: verified-task-evidence
date: 2026-08-10
source_parent: a222a67
owner: "@Muhns13G"
related_debt: [TD-013, TD-017]
---

# Sprint 05.11 Request Security and Abuse-Control Evidence

## Mission and Boundary

Threat-model and implement reusable request-size, timeout, origin/CORS, rate, anti-automation,
duplicate, malformed-body and direct-endpoint controls without exposing a mutation endpoint or
changing customer-facing content.

## Implemented Outcome

- The portable `security.request-decision` contract records only safe outcome, reason, route class
  and correlation evidence.
- The Worker admits only body-free `GET` and `HEAD` traffic today. URL/header limits run before
  routing; all other methods consume a Cloudflare rate-limit token and fail closed. `/api` and
  `/.mcp` remain hidden.
- The generated Cloudflare runtime types make the `REQUEST_RATE_LIMITER` binding compile-time
  checked; CI rejects binding/type drift.
- A reusable protected-JSON inspection boundary requires exact same-origin context,
  `application/json`, a bounded object body, a durable idempotency identity, a trusted actor or
  verified anti-automation-derived rate key, and rate allowance before handler execution.
- The 15-second outer deadline propagates an abort signal and emits a safe correlation-bearing
  response. Rejections inherit Task 5.4's no-store and security headers.
- Current Cloudflare preflight behaviour is verified: the platform may emit `204`, but without an
  allow-origin header; a direct cross-origin `POST` reaches the Worker and receives hidden `404`.

## Validation Evidence

| Check                                                      | Result                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| Frozen install, format, TypeScript, ESLint                 | Pass                                                           |
| Cloudflare generated binding types                         | Pass; committed types match bindings                           |
| Vitest contract, guard, service and adapter suite          | Pass; 23 files and 164 tests                                   |
| pgTAP and four local Supabase integrations                 | Pass; 184 assertions, clean lint and four integrations         |
| Bun dependency audits                                      | Pass; zero full or production findings                         |
| Production build, client canary, generated routes, dry-run | Pass; upload sees `REQUEST_RATE_LIMITER` at 60 requests/minute |
| Playwright desktop/mobile matrix                           | Pass; 52 tests                                                 |

## Decisions and Deviations

- No public form exists, so Task 5.11 does not provision or render Turnstile. The boundary instead
  makes verified anti-automation evidence mandatory for any future anonymous protected command.
- Cloudflare rate limiting is a fast, coarse, location-scoped abuse layer, not durable accounting.
  Task 5.9 idempotency and authorisation remain authoritative.
- Provider callbacks are deliberately excluded from the browser command helper. Tasks 5.14–5.15
  must add signature, timestamp, environment, schema and replay verification before registration.
- No hosted WAF rule, Turnstile widget, route, secret, migration or deployment changed.

## Debt Disposition

- Task 5.11 is **Completed** for the shared inactive request-security foundation.
- TD-017 becomes **In progress**, not Verified. Every future form, identity operation, payment or
  partner callback still needs route-specific limits, preview/hosted bypass evidence and monitored
  tuning before activation.
- TD-013 remains **In progress** because Task 5.12 still owns monitored break-glass, abuse alerts
  and complete denial evidence.

## References

- [Sprint 05 plan](../sprint-05-data-security-operations.md)
- [Request security and abuse-control runbook](../../../06-operations/request-security-abuse-runbook.md)
- [DR-007 identity and authorisation architecture](../../../07-decisions/DR-007-identity-authorisation-architecture.md)
- [Task 5.10 audit evidence](sprint-05-10-audit-integration-evidence.md)
