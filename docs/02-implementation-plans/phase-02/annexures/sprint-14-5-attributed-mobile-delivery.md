---
plan_id: phase-02-sprint-14-5
title: Attributed Mobile Delivery and Private Recovery Status
status: completed-local-receipt-boundary
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Task 2.14.5 — Delivery Receipts and Reconciliation

## Scope and Release Boundary

Builds on committed 14.4 at `c7ac907`. Adds the attributed Telnyx callback, immutable receipt,
provider-message binding and conflict journals, minimal staff disposition, and guarded one-shot
dispatch wiring. No hosted migration, configuration change, credential provisioning, real SMS,
participant data, Git staging, commit, branch switch or deployment was performed.

This is local engineering completion, not channel activation. Defaults remain disabled. Participant
decline/redemption (14.6), verified email conversion and operational retention (14.7), the complete
security/manual quality packet (14.8), approved tariffs/credits/spend and controlled actual provider
receipt (14.9) remain required. Sprint 13 launch blockers are not waived or debts marked verified.

## Signed Callback and Attribution

`POST /api/invitations/telnyx/webhook` accepts only the canonical HTTPS origin, no query, JSON,
and at most 16 KiB. Ed25519 verification covers the timestamp and unchanged body before JSON parsing;
the timestamp must be within five minutes, rechecked after reading. The selected public key,
tenant, profile and from number are server-only configuration. Callback mode is separate from
outbound mode so late receipts can remain attributable when new sending is disabled.
The implementation uses native [Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
Ed25519 public-key import and verification rather than a new crypto dependency.

Telnyx documents its [receipt structure and signature contract](https://developers.telnyx.com/docs/messaging/messages/receiving-webhooks).
`message.sent` is carrier acceptance; `message.finalized` provides a final delivery disposition.
Neither is participant acceptance, verified contact, consent, registration or onboarding completion.

The allowlisted projection validates outbound SMS, owned profile/from, one ZA destination, GSM-7,
at most two parts, the exact approved neutral text and its fragment bearer. Only the bearer digest
is passed to SQL. SQL requires that digest, destination, profile and sender to match one committed
intent/version; phone matching alone cannot attribute an attempt. A signed receipt can therefore
reconcile a provider response lost after acceptance, even if staff authority has since expired.
It cannot create an intent, spend authority, token, claim or identity. No raw body, text, bearer,
recipient, provider error description or engagement analytics is retained in receipt/audit journals.

The private binding makes provider-message identity one-to-one with an intent. A late sender
completion cannot overwrite an established callback identity. Exact event replay is idempotent;
changed semantic replay is quarantined in an immutable conflict journal and audited once, without
replacing the original fact. Contradictory final dispositions are retained and projected as conflict.
An out-of-order `sent` fact cannot regress a delivered/final disposition. Invalid attribution,
signature, cost format, future event time or message rebinding is rejected. Retryable durable-storage
failure returns 503, never a false acknowledgement. Provider retries replay the receipt, not the SMS.

All journals force RLS and deny direct anon/authenticated/service-role table access. Only the public
receipt RPC is service-executable. Attribution, binding, receipt and central audit are atomic;
audit failure restores the original baseline. The callback never mutates invitation/token state,
even for a late receipt after revocation. Reserved spend remains held for every outcome. Reported
cost above its reservation requires scope-owner review; this is not a provider billing guarantee.

## Private Staff Dispatch and Recovery

The existing operations-role/purpose, tenant contact-assignment and genuine AAL2 boundary is retained.
The roster still masks phone numbers and never exposes provider IDs, raw errors, bearer or full
destination. Only delivery disposition and a budget-review flag are added. The opaque reservation
request key is returned only for an unattempted current draft reserved by that staff actor.

`/staff/mobile-invitations/dispatch` requires strict invitation/version/reservation input, protected
origin/body/rate handling, current workforce authority, matching sender/callback configuration, and
the existing positive database budget/readiness policy. The service commits its one-shot intent
before the single provider POST. The UI requires explicit participant-contact confirmation; it does
not send automatically after reserving. Expiry, denial and uncertain network results clear private
RAM state. No local/session storage or automatic retry is used. These safeguards reflect the React
review and complete-flow verification checklists; no framework or dependency was changed.

Recovery means refresh and investigate, then an explicit separately budgeted/versioned replacement
if authorised. It does not mean reconstructing the bearer, releasing a held cost, silently accepting
the participant, or retrying the same provider request. A prepared intent past its dispatch deadline
is shown as uncertain. Provider-delivered wording explicitly separates transport from acceptance.
Ordinary support roles gain no additional contact or roster authority.

## Configuration and Later Handoff

Two optional catalogue/example entries are added: `MOBILE_INVITATIONS_WEBHOOK_MODE=disabled` and
`TELNYX_PUBLIC_KEY_BASE64` (the provider's raw 32-byte Ed25519 public key encoded as Base64).
No `VITE_*` value or shared Telnyx profile mutation is added. API credentials are not needed for
receipt-only mode. The public key is not an API secret, but remains server-only to limit configuration
exposure. Key ownership, rotation, profile attribution, payload/URL logging and callback latency
must be verified during the separately authorised hosted rehearsal.

14.7 must extend the governed retention sweep to receipt/conflict/binding/intent dependencies before
real sending: unconverted contacts after 30 days from expiry/revocation, minimal audit after 90 days,
with safe FK order and immutable-trigger controls. There is deliberately no ad-hoc privileged purge
or broad trigger disabling here. Recovery exports already cover `identity_private`; no backup key or
schema omission is introduced. Provider payload minimisation beyond the application's own journals
and actual handset receipt remain 14.9 evidence, not claims from mocked/local tests.

## Validation

Verified locally on 8 October 2026:

- Full Vitest suite: 147 files, 1,063 tests passed.
- Full database suite: 40 files, 1,906 assertions passed, including the receipt attribution,
  immutable conflict, audit rollback, wrong-scope, replay and revocation packet.
- Full migration/seed replay passed; database lint returned an empty error list. The final
  fingerprint-format constraint was also synchronised locally before the final SQL packet.
- Six fixed recovery suites: 334 assertions; row/security/function fingerprints restored.
- Staff mobile-invitation browser packet: 12 desktop/mobile Chromium checks passed, including
  masking, explicit dispatch/uncertainty, no automatic retry, axe, keyboard review, 320px reflow,
  storage absence and anonymous endpoint denials. The final rerun passed with unchanged timeouts.
- Strict typecheck, ESLint, Prettier, portability, discovery and generated-route checks passed.
- Production bundle and client configuration/MCP-absence checks passed.
- Post-test local receipt/conflict/binding/intent/policy counts were zero, with no disabled
  non-internal triggers. The test database was stopped afterward.

Local tooling was Bun 1.3.14 with Node 24.21.0; the repository's declared Node 22 CI build baseline
is unchanged and must pass after the owner's commit. Hosted CI/deployment is not claimed here.
Browser private responses and provider calls were mocked, signature verification used synthetic
Ed25519 keys, and SQL fixtures were rollback-only. These do not prove actual SMS delivery or a
hosted Auth journey. No new technical debt was silently waived; remaining gates above retain
their original task scope.

During validation, a new SQL aggregate syntax error and required audit-actor attribution were fixed
before the green migration/test packet. Two inherited tests assumed the read-only readiness flag
could never be true; those now accept its deliberate 14.5 boolean shape while still rejecting raw
contacts/tokens and malformed readiness. Runtime tests require both channel configurations and
current scoped authority independently of that UI flag. One concurrently cold browser startup hit
the existing 10-second read wait; no application security control or global test timeout was relaxed.

## File Accounting

Created:

- This annexure.
- `src/server/identity/mobile-invitation-receipts.ts` and its colocated test.
- `supabase/migrations/20261008173000_mobile_invitation_delivery_receipts.sql`.
- `supabase/tests/database/mobile_invitation_delivery_receipts.test.sql`.

Modified:

- `.env.example`, `config/environment-catalogue.ts`, `src/config/environment.test.ts`.
- `src/application/identity/mobile-invitation.ts`.
- Its contract test and `src/adapters/identity/supabase/supabase-mobile-invitation-repository.test.ts`.
- `src/server/identity/mobile-invitation-http.ts` and its colocated test.
- `src/components/StaffMobileInvitationsPage.tsx` and its colocated test.
- `src/server.ts`, `src/server/security/request-security.ts`, `src/lib/public-route-policy.ts`.
- `e2e/mobile-invitations.spec.ts`.
- Sprint 14 implementation plan, RAG current-state summary and RAG index.

No deleted, generated, dependency, lockfile or branch-only files.
