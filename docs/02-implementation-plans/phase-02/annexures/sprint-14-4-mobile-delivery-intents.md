---
plan_id: phase-02-sprint-14-4
title: Server-only Mobile Invitation Delivery Intents
status: completed-local-delivery-boundary
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Task 2.14.4 — Server-only Sender and Durable Delivery Intents

## Scope

Builds on committed 14.3 at `fe58322`. Implements the sender port, Telnyx adapter, scoped
Supabase repository and one-shot dispatch service. It deliberately does not expose a dispatch
endpoint or staff send button while callbacks and the participant decline/redemption route are
unfinished. The existing staff UI continues to describe reservations, not sent SMS. Endpoint/UI
wiring belongs with 14.5's attributed delivery and recovery views; operational readiness also
requires 14.6/14.7 and the explicitly authorised 14.9 provider rehearsal.

No hosted migration, Telnyx account mutation, credential provisioning, real SMS or participant
data was used. The real pilot remains suspended. Shared Telnyx profile/webhook settings are untouched.

## Durable One-shot Boundary

The dispatch service generates a 32-byte random token and passes only its SHA-256 digest to
`prepare_mobile_invitation_delivery`. The RPC checks current operations role/purpose, tenant
contact assignment, workforce AAL2 and provider/application-session validity after taking the
same tenant lock as staff reservations. It requires the exact staff actor, reservation request
and current draft/version; no client-supplied destination or spend is accepted.

One transaction issues the 48-hour digest-backed token, records a private delivery intent,
reserves spend and appends invitation/central audit evidence. Audit failure aborts all of it.
The raw token exists transiently only for the one provider request, never in the database,
repository arguments, returned result, SMS scheduling queue or a retry payload. The provider
necessarily receives the bearer link and destination to deliver the invitation.

The claim permits dispatch for two minutes; the native provider request is bounded to ten
seconds or the remaining claim duration, whichever is shorter. Prepared intents are never
reclaimed. A crash before sending, timeout after possible acceptance, malformed response or
lost completion receipt leaves an unresolved attempt with its cost reservation held. A later
staff decision can explicitly supersede the version, invalidating old tokens/claims and using
a separately budgeted attempt. No automatic retry or bearer reconstruction exists.

`finish_mobile_invitation_delivery` records accepted/failed/uncertain once, rechecking current
authority. Exact facts replay safely; conflicting facts cannot overwrite one another. A lost
or rejected finish leaves the original intent unresolved. API acceptance is not handset delivery,
invitation acceptance, consent, contact verification or account activation. Provider-message
identity is unique across attempts and stored only in the private journal.

## Segment, Spend and Configuration Controls

The fixed approved message contains only the brand, canonical fragment-token link, 48-hour
validity, decline direction and support address. It contains no recipient name, email or health
information. GSM-7 extension characters count as two septets; Unicode uses the shorter encoding
limits and is rejected by this sender. The exact message is two GSM-7 segments; arbitrary copy,
non-ZA recipients and more than two segments fail before any provider call.

Policies default to sending disabled, readiness false and zero spend. They seed no permissions
or positive budgets. Explicit enablement requires a matching profile/from number and approved
positive per-segment, per-message and rolling 24-hour USD-micro ceilings. Two segments are reserved
before the POST. The same tenant lock serializes reservations and spend across invitations;
dispatch also rechecks tenant attempt limits and the three-attempt/invitation/24-hour limit.
All outcomes retain their reservations; failed/unknown responses do not create free retries.

The cost ceiling is a conservative local authorization/reservation control, not a guarantee
against an unexpected provider tariff. Actual country/carrier fees, credits and an approved
upper-bound price must be verified at 14.9 before enabling sending. Reported over-ceiling or
unrecognised cost yields an uncertain outcome, not a false success. Missing final cost never
releases the reserved amount.

Server-only optional configuration is documented in `.env.example` and the environment catalogue:
`MOBILE_INVITATIONS_MODE=disabled`, `MOBILE_INVITATIONS_DELIVERY_READY=false`, tenant ID,
`TELNYX_API_KEY`, messaging-profile ID and from number. No `VITE_*` configuration is added.
Neither config readiness nor a database policy alone is sufficient to dispatch.

The adapter makes one native-fetch POST to the fixed Telnyx messages endpoint, rejects redirects,
bounds the response to 16 KiB, discards error bodies and validates provider attribution. Explicit
per-message callback selection avoids silently inheriting shared-profile webhook destinations.
The implementation follows Telnyx's [sending guide](https://developers.telnyx.com/docs/messaging/messages/send-message)
and [message API contract](https://developers.telnyx.com/api-reference/messages/send-a-message).
The callback will itself need payload-minimising signature/replay handling in 14.5, because
provider receipts can include the destination and original message body. Before operational sends,
14.9 must also verify that the selected profile does not rewrite/track invitation bearer links
or route their payloads to unrelated destinations; this task makes no shared-profile changes.

## Evidence

Verified locally on 8 October 2026:

- Full migration/seed replay passed; database lint returned an empty error list.
- Full SQL matrix: 39 suites / 1,850 assertions, including 46 delivery-intent assertions.
- Fixed recovery packet: six suites / 334 assertions; rollback row/security/function restoration.
- Sender/service/repository plus environment-catalogue packet: four files / 72 tests passed
  (44 delivery tests and 28 existing environment checks).
- Full Vitest regression: 146 files / 1,047 tests passed.
- Typecheck, ESLint, portability, public discovery, repository-wide Prettier and diff checks passed.
- Production build, client-bundle configuration canary and MCP-absence checks passed;
  generated route-tree check passed with no generated output changes.
- Post-test local inventory: zero delivery intents, tokens and policy rows; immutable delivery
  trigger enabled. The local Supabase stack was stopped after testing.

Initial validation corrected the catalogue test's explicit list for the six new server-only names
and the SQL assertion's expected workforce-denial message; the final full packets above pass.
The initial build's sandbox-only Wrangler log-write warning was avoided on the successful repeat
by directing the log to `/tmp`; no application fix or release setting change was needed.

Mock transports never contact Telnyx. SQL packets use disposable synthetic fixtures inside
rollback-only transactions. There is no new browser surface in this task and no handset or hosted
journey claim; complete browser/manual channel acceptance remains the 14.8/14.9 boundary.

## File Accounting and Remaining Boundaries

Modified existing files (eight):

- `.env.example`
- `config/environment-catalogue.ts`
- `src/config/environment.test.ts`
- `src/adapters/identity/supabase/supabase-mobile-invitation-repository.ts` (protected shared
  authority/RPC helpers only)
- `docs/02-implementation-plans/phase-02/sprint-14-mobile-pilot-invitations.md`
- `docs/02-implementation-plans/phase-02/README.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/07-index.json`

Created files (eleven):

- `src/application/identity/mobile-invitation-delivery.ts`
- `src/adapters/identity/telnyx/telnyx-mobile-invitation-sender.ts`
- `src/adapters/identity/telnyx/telnyx-mobile-invitation-sender.test.ts`
- `src/adapters/identity/supabase/supabase-mobile-delivery-repository.ts`
- `src/adapters/identity/supabase/supabase-mobile-delivery-repository.test.ts`
- `src/server/identity/mobile-invitation-delivery-config.ts`
- `src/server/identity/mobile-invitation-delivery-service.ts`
- `src/server/identity/mobile-invitation-delivery-service.test.ts`
- `supabase/migrations/20261008160000_mobile_invitation_delivery_intents.sql`
- `supabase/tests/database/mobile_invitation_delivery_intents.test.sql`
- `docs/02-implementation-plans/phase-02/annexures/sprint-14-4-mobile-delivery-intents.md`

No files deleted. No dependencies, generated route tree, Worker bindings, staff components or
existing migration files changed. These are ordinary branch-independent source files, not a
preview-only production fallback.

14.5 owns attributed callbacks/reconciliation, safe dispatch wiring and staff status/recovery.
14.6/14.7 own redemption/email conversion and operational retention sweeping, including opaque
delivery-journal dependency handling. 14.8 owns the full concurrency/browser/manual acceptance
packet. 14.9 owns hosted migration/configuration and actual receipt under separately approved spend.
These are planned boundaries, not a claim that the whole SMS channel is ready. Existing Sprint 13
privacy, operating, recovery and release blockers are unchanged. No new known defect or dependency
debt is being accepted by this task. Git staging/commit/push and deployment remain owner-only.
