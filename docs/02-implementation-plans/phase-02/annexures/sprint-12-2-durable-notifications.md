---
plan_id: phase-02-sprint-12-2
title: Durable Generic Notifications and Delivery Evidence
status: completed-local
last_updated: 2026-10-06
owner: "@Muhns13G"
depends_on: [phase-02-sprint-12-1]
---

# Task 2.12.2 — Durable Notifications

## Outcome and boundary

Completed locally against the committed Task 12.1 baseline `219ffdf` on `itws-I`.
Generic account, payment, service and support messages now have private transactional intents,
bounded dispatch and independently attributed delivery facts. Managed invitation/sign-in/recovery
remain owned by Supabase Auth; existing operations-exception and clinical-safety templates remain
unchanged. Public website messaging is unchanged. No dependency was added.

This is implementation/local proof, not hosted delivery or pilot activation. No hosted migration,
provider setting, key transmission, actual email, Git staging, push or deployment occurred.
Task 12.3 owns purpose routing/coverage; 12.4 owns staff follow-up and governed resend; 12.8 owns
actual inbox, failure, acknowledgement and fallback proof. TD-043 remains Open.

## Implementation

| Boundary            | Implemented behaviour                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source capture      | Database triggers atomically journal committed profile events, support/rights requests, client-visible workflow changes and meaningful settlement changes. Source/version/template uniqueness deduplicates replay; transaction rollback removes both source and intent. Internal assignment/claim events, checkout clicks and timestamp-only settlement updates do not create client success messages.                                  |
| Recipient authority | Resolve current verified own-client contact, active subject/profile and current patient membership at claim time; nullable membership expiry remains supported. Changed/revoked contact, inactive membership, unsupported channel or suppression cannot silently send. No browser-supplied recipient is accepted.                                                                                                                       |
| Persistence         | Seven forced-RLS private tables under `audit_private` hold intents, dispatch cursors, immutable attempts, transport outcomes, suppressions, hashed message bindings and attributed provider events. Direct anonymous/authenticated/service access and retired inner claim execution are denied. Existing recovery schema coverage includes these tables.                                                                                |
| Delivery            | Four fixed versioned plain-text templates contain only generic wording and the fixed first-party sign-in destination. No name, case/order identifier, health answer, amount, protocol, attachment or diagnostic is sent. Provider message identifiers are normalized and hashed before persistence.                                                                                                                                     |
| Retries             | Maximum three attempts, two-minute leases and 60/300-second backoff. Explicit 429 non-acceptance may retry. Redirect, timeout, 5xx, expired lease or reference/receipt-write uncertainty does not trigger blind resend. Failed, uncertain, suppressed and budget-deferred work remains privately owned.                                                                                                                                 |
| Shared budget       | One database advisory lock coordinates new transactional, existing operations and safety claims under 50 total attempts per UTC day. Expired leases are reconciled even when the budget is exhausted. Managed Auth remains independent; actual provider allocation/reserved capacity must be checked before activation.                                                                                                                 |
| Receipt boundary    | Default-off POST `/api/notifications/brevo/webhook` uses a dedicated custom-header secret, existing coarse request controls, strict JSON and an 8 KiB body limit. Only an existing tenant/lease message binding accepts delivery evidence. Unknown/early attribution or persistence failure returns empty 503 for provider retry; duplicate events are idempotent. No address, subject, mirror link or provider diagnostic is retained. |
| Evidence separation | Transport acceptance is not delivery, reading, human acknowledgement or resolution. Delivered/bounce/suppression facts are append-only and do not rewrite acceptance into clinical or money authority. Open/click analytics are rejected by this private delivery endpoint; no blanket marketing-tracking setting was changed.                                                                                                          |

Provider `invalid_email` is explicitly projected to the internal `invalid` delivery category.
Provider payloads were cross-checked against the official
[transactional webhook reference](https://developers.brevo.com/docs/transactional-webhooks),
[send endpoint](https://developers.brevo.com/reference/send-transac-email) and
[secured webhook guidance](https://developers.brevo.com/docs/secured-webhooks).
Provider idempotency alone is not a durable guarantee; the local journal owns replay prevention.

Support receipts currently follow existing persisted support requests. New purpose-owner routing,
coverage and updates are deliberately the next task, not an invented clinical-support service.
WhatsApp preference is recorded as channel unavailable until an approved adapter exists; it does
not silently become email. Missing recipients and quota exhaustion remain durable failure/defer
reasons for the staff follow-up slice.

## Files

| Kind                 | Files                                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New implementation   | `src/application/notifications/transactional-notifications.ts`; `src/server/notifications/notification-dispatch.ts`; `src/server/notifications/notification-receipts.ts`; `supabase/migrations/20261006133000_transactional_notifications.sql` |
| New tests            | Notification dispatch/receipt tests; `supabase/tests/database/transactional_notifications.test.sql`; `scripts/test-notifications-concurrency.ts`                                                                                               |
| Modified integration | `src/server.ts`; request-security registration/tests; environment catalogue/tests; `.env.example`; `wrangler.jsonc`; generated `worker-configuration.d.ts`; `package.json`; CI; `AGENTS.md`; `e2e/boundaries.spec.ts`                          |
| Documentation        | This packet, Sprint 12 plan, Phase 02 overview, RAG current state/limitations/index, debt evidence and Cloudflare release runbook                                                                                                              |

## Local verification

- Fresh migration replay and SQL lint passed.
- All 31 database suites passed: 1,430 assertions, including 72 notification assertions covering
  atomicity, rollback, replay, permissions, tenant/lease/contact authority, receipt attribution,
  retries, uncertainty, suppression, suspended tenants and shared-budget denial.
- Eight simultaneous claims competed for the last daily slot: exactly one succeeded, total
  attempts stayed at 50, both legacy senders were denied and scoped cleanup restored the baseline.
- Existing operations rehearsal passed nine suites/513 assertions; identity-security packet
  passed five suites/168 assertions, rollback-only with no provider/email contact.
- Local Auth, workforce AAL2/concurrent queue, authorisation, workflow commands, audit/inbox/outbox,
  security evidence, measurement, lifecycle, signed-payment and fulfilment integration commands
  all passed with the new migration installed. The local database was stopped afterward.
- Final application suite passed 124 files/804 tests, including the provider-name compatibility
  correction and 45 targeted notification tests. Scheduled dispatch tests prove message-reference
  binding precedes acceptance and failed binding is recorded as uncertain.
- Local desktop/mobile request-boundary matrix passed 30 tests, including default-off callback
  rejection with empty private/no-store response. This verifies the local runtime boundary, not
  provider delivery or manual assistive-technology acceptance.
- Node 22 production build, generated Worker types/route check, portability, discovery,
  formatting, lint and type checks passed. All 182 indexed document paths and 264 relative links
  across the seven changed Markdown documents resolve; frontmatter parses successfully.

## Owner-controlled activation packet

Keep `TRANSACTIONAL_NOTIFICATIONS_MODE=disabled`. After a separate bounded approval, apply the
committed migration, configure the exact isolated rehearsal tenant and generate a dedicated random
base64url webhook credential (at least 43 characters). Store it only in ignored/hosted secret stores
and configure the same `x-meneer-notification-secret` header at Brevo. Never reuse the Brevo API
key, an encryption key or an Auth token. The callback uses no secret query string.

Before enabling a real tenant, Task 12.8 must prove actual delivery, bounce/suppression, callback
authentication, early-receipt retry, shared quota, owned acknowledgement/fallback, disabled
restoration and scoped cleanup. Confirm sender/domain authentication, private owner/alternate
rosters, mailbox access/security and actual free-tier allowance. No automatic spend or new clinical
response promise is authorized. No new debt ID or existing debt verification is claimed here.
