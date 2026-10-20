---
plan_id: phase-02-sprint-15-task-08
status: completed-local-controlled-browser-and-owner-manual-boundary
last_updated: 2026-10-20
---

# 15.8 — Order next actions, generic notifications and support

## Scope

Bounded product-order usability work, not the broader onboarding redesign or Laravel rebuild.
Product ordering and outbound notification release settings are unchanged. No real message,
payment, provider/courier action, hosted migration, catalogue import or generator activation is
authorised by this task. The owner alone stages, commits and deploys.

## Implementation

Pure presentation mappings cover every client delivery stage and staff next event, including
missing quotes, blocked progression, recorded exceptions and delivery completion. These are
guidance only; native exact-offer/payment/clinical/assignment/fresh-TOTP gates remain authoritative.
The screens distinguish actual events from administrative attestation and automatic execution.
Pending payments prohibit duplicate payment; failures/expiry direct the client to reload the exact
order instead of reusing an old Checkout link. Refund/dispute/reconciliation guidance takes
precedence over apparent payment success. Support buttons open existing purpose-scoped private
client/staff support screens, without identifiers, health details or prefilled complaint text in
URLs. No new generic workflow layer, dependency, secret or public route is added.

Fulfilment feedback uses two fixed non-sensitive Sonner notifications; errors/uncertainty and next
actions remain durable inline status text. Initial mount does not steal focus. Pending requests
clear stale projections; expiry, case change and page hide remove private next-action state and
dismiss notifications. Mutation results never trigger an automatic physical-action retry.

The CLI-created `20261020113457_product_fulfilment_notifications.sql` adds one private trigger
from immutable fulfilment events into the existing transactional outbox. The recipient derives
from the exact offer, not the workforce actor or browser input. Source event ID/version and the
existing `service-v1` template are the only event references; product names, clinical facts,
addresses, courier references and evidence payloads are not copied. Exact command replay creates
no second event/notification. No history is backfilled. Outbox capture is atomic with the event;
delivery remains asynchronous under existing recipient-authority, contact preference, suppression,
budget, lease and uncertain-send controls. Enqueue/acceptance is not proof of inbox delivery.
Failed/uncertain delivery remains in existing assigned staff follow-up; no new resend bypass exists.

The email reliability skill informed event-scoped idempotency and outbox reuse. Its generic retry
suggestions do not override this repository's stricter no-blind-retry rule for ambiguous transport.
React guidance informed derived next actions, explicit focus, late-result denial and state clearing.

## Acceptance

The full fresh local SQL regression passes **58 suites / 2,888 assertions**, including seven
exact fulfilment notifications, client/tenant/event bindings and trigger/table ACL denial. Independent
readback finds zero Auth users, fulfilment events and fulfilment notifications after rollback;
the local stack is stopped with its backup retained. Error-level application-schema SQL lint
returns no issues. Unrestricted lint also inspects pgTAP internals and reports extension-only
diagnostics for legacy/session-dependent functions; these are not hidden as a clean global lint.
The reset's optional pg-delta catalogue-cache export timed out after migrations/seed completed;
the migration chain, subsequent SQL tests and independent readback passed.

**84 focused tests in ten files** pass for guidance, fulfilment domain/HTTP/UI, payments, fixed
toasts, notification transport and client/staff support. A resource-contended broad unit run was
stopped without accepted full-suite evidence; Task 15.10 still owns full validation.
The Node-22 production build, client configuration canary, retired-MCP check, strict TypeScript,
ESLint, formatting, discovery, portability and diff checks pass. No dependency/generated-route or
Worker-binding changes are required.

The compiled local browser packet passes **ten desktop/Pixel checks**: six fulfilment and four
payment-status regressions, including keyboard, axe, client four-mode reflow/enlarged text/forced
colours, exact references, page-hide clearing and support-link destinations. Both narrow staff
screenshots were visually inspected. A contended dev-server attempt timed out and was stopped;
it is not accepted product evidence. The compiled packet uses unchanged browser profiles and
assertions, with a 90-second budget for the client four-mode accessibility test, not a production
session/request-timeout change. Temporary review configuration is not part of the deliverable.

On 20 October the owner confirmed **both staff and client manual checks pass**, responding to the
fresh review of VoiceOver next-step/evidence/attestation/support labels and client delivery/payment
guidance, plus usability at browser zoom. This is owner-reported observation on the local synthetic
screens, not an automated inference, a full assistive-technology/device matrix or hosted proof.
The paused review runner was stopped after confirmation; its unfinished automation is not counted
as another passing browser run. The separate ten-check automated packet above remains the evidence.
Task 15.8 is complete at its local/controlled-browser/owner-manual boundary.

Local manual review: run the controlled Playwright packet with
`CLIENT_FORM_MANUAL_REVIEW=voiceover-local-synthetic` and `--headed`. At its pause, review the
client delivery next step, secure support link and payment guidance. The staff case fixture uses
only synthetic workspace and opaque evidence references: check the labelled evidence field,
unchecked attestation, blocked/next-event guidance and pending/result announcements. Report actual
observations rather than assuming screen-reader success. The runner contacts only loopback mock
endpoints, never real clients or providers.

Hosted product/provider and populated shipping/fulfilment recovery acceptance remain Task 15.9.
Actual product terms, approvals, custody/courier arrangements and product-sales GO remain separate.

## File accounting

- Presentation: new `product-next-actions.ts` and tests; existing fulfilment/payment panels,
  fulfilment component tests and fixed toast hook/tests.
- Notifications: one new migration; existing rollback-only manual fulfilment SQL packet gains
  outbox event/recipient/privacy/ACL assertions. Existing transport/templates remain unchanged.
- Browser: existing synthetic product-fulfilment packet covers new guidance/support links and
  client four-mode axe/reflow/keyboard checks.
- Documentation: this packet, Sprint 15 plan, phase overview, debt context and RAG/index updates.
