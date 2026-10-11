---
plan_id: phase-02-sprint-15-task-07
status: completed-local-controlled-browser-boundary
last_updated: 2026-10-10
---

# 15.7 — Manual product fulfilment

Assigned operations staff record actual events against the exact issued product offer:
provider order → pharmacy release → receipt at Meneer → courier dispatch → delivery.
Each event requires a private source-evidence UUID and explicit human attestation. These are
administrative facts, not new clinical decisions, automated dispensing, courier calls or proof
that a provider inspected the evidence. The relevant stock, pharmacy, custody and clinical
15.5 records must still represent independently checked current source evidence.

## Authority, sequencing and financial integrity

The protected staff command verifies the sealed workforce session, operations purpose, configured
tenant and AAL2. Native SQL independently checks current provider/application identity, approved
role, exact assignment and TOTP within five minutes. Case-first locks serialize supply with
existing cancellation/refund commands; an offer lock and expected journal version prevent stale
physical transitions. Exact request-key replay produces no second event or audit; changed reuse
conflicts. Events and minimal central audit facts commit atomically.

Advancement through dispatch requires the exact accepted offer's signed ledger settlement (or
governed zero-balance confirmation), conserved original deposit credit, current issued-link
evidence/catalogue/terms/address/delivery and product release. Refunds, dispute/reconciliation,
cancellation, safety holds and restriction/deletion block new supply. New draft creation is
blocked while a paid/custody order is unfinished (or has an unresolved exception), preserving
its exact evidence; read and exact original-draft replay remain available. The existing issue
command cannot replace an order with a provider attempt. The
legacy payment-order funding path remains only for explicitly local-synthetic provenance; it
cannot supply real RRP offers. Payment alone never advances a physical stage.

An exception pauses further physical advancement; resolution records a separate event and does
not silently advance supply. A return, recall, damaged/missing parcel or stock failure uses an
exception plus a reference to privately held evidence. Do not put addresses, tracking URLs,
medical answers or product narratives in commands or ordinary messages. This is a reference-only
custody/recall journal, not inventory software or an automatic returns policy.

This workspace follows the latest issued offer for the case. The existing issue guard still
prevents replacing an offer with a provider attempt, including a completed order; a repeat-order
cycle and historical-order management are not silently enabled by this task. Unresolved physical
exceptions remain staff-reviewed, not automatic recalls, replacements or refunds.

Delivery after an already recorded dispatch and exception facts remain recordable if clinical or
commercial release later expires: withdrawal must not erase real-world custody history. Native
staff/assignment/session/fresh-TOTP authority remains required. New provider/pharmacy/receipt/
dispatch transitions remain blocked. The existing automatic `product_before_release` refund path
now rejects orders with an actual pharmacy-release event; use the existing staff-reviewed
post-release exception path, not an invented fee or automatic forfeiture. The retired inner
refund function's restricted ACL is preserved.

## Screens and privacy

The assigned queue contains **Manual product fulfilment**; the client order page contains a
separate progress check. Staff see only exact offer/case references, workspace, journal version,
stage and eligible next event. Clients receive only `not_started`, `preparing`, `received`,
`dispatched`, `delivered` or `needs_review`, with a capped expiry—no custody/source/contact IDs.
Caller-selected client identifiers are rejected.

Explicit buttons, labelled inputs, unchecked attestation, live pending/result feedback, keyboard
activation and responsive controls reuse existing UI patterns. Failed or uncertain requests never
retry a physical action automatically; reload reconciles journal state. Projections/evidence clear
on expiry, selected-case change, page hide and visibility loss; aborted/late results are ignored.
No private values enter URLs or browser storage. Request bodies stay bounded and same-origin;
responses and route policy are private/no-store/no-referrer/noindex.

## Release boundary

Uses the existing `PRODUCT_ORDERING_MODE` / `PRODUCT_ORDERING_TENANT_ID` gate; there is no new
environment variable, dependency, provider transport, public page or secret. Disabled remains the
default. This task does not apply hosted migrations, import RRPs, activate products, send messages,
charge money or reactivate the generator. The owner retains Git and deployment control.
15.8 owns next-action/notification polish and fresh manual accessibility review; 15.9 owns bounded
hosted/provider/concurrent and populated shipping/fulfilment recovery acceptance. Actual source
agreements, professional authority, product terms, shipping-key custody and sales GO remain gates.

## Verification

The final fresh local reset and full rollback-only database regression pass **53 suites / 2,701
assertions**. Error-level SQL lint returns no issues; independent readback finds zero Auth users
and zero fulfilment events. The local stack is stopped with its database backup retained.
Warning-level lint still reports existing type-cast, unused-variable and volatility warnings in
older functions; this is not a claim that every warning in the database has been eliminated.

Verification corrected an audit action containing underscores, an exception-resolution readiness
check and a draft guard alias colliding with an existing PL/pgSQL variable. The final native
packet also proves that a new draft cannot invalidate an unfinished paid order's evidence.
These initial failed checks are not counted as accepted evidence.

Focused Node-22 acceptance passes eight files / 70 domain, HTTP, component, queue,
request-security, order and refund tests. The broad sandboxed Vitest attempts stalled and were
explicitly stopped; they are not accepted full-suite evidence. No test timeout was widened.

The production client/Worker build, client-bundle configuration canary and retired-MCP checks
pass with Cloudflare hosted dotenv loading disabled. The controlled preview contains no
copied dotenv secret bindings; its missing local journey-key warning is expected and is not
evidence about production keys. No source deployment or provider transport occurs.

The initial dev browser attempt exceeded the unchanged server-start limit. A compiled-preview
packet uses the repository's same assertions, browser profiles and timeouts. An interrupted
resource-contended attempt is not accepted evidence. The first complete preview run passed 40
checks but exposed an overly broad storage assertion: TanStack persists only window scroll
coordinates after scrolling. The final assertion checks that exact coordinate-only shape,
rejects private fulfilment IDs/data and verifies all other browser storage remains unchanged.
The final compiled-preview packet passes **42 desktop/Pixel-7 checks** in one run: six new
fulfilment checks and 36 order-review, payment-status, assigned-queue and quote-issue regressions.
Unchecked attestation, exact event/version/key, keyboard activation, axe, 320-pixel reflow,
page-hide clearing and absence of private browser-storage/URL values pass. Both narrow-screen
staff screenshots were visually inspected. The temporary preview configuration was removed;
the repository Playwright configuration and deadlines are unchanged. No manual VoiceOver
observation or hosted captured-payment/supply proof is claimed by this packet.

React guidance informed labelled explicit actions, late-response cancellation and private state
clearing. Full-story verification traced the UI command, protected HTTP/native authority and
rollback-only journal/audit results as separate tested boundaries—not a provider-backed hosted
journey. Owner exact-commit CI and later 15.8/15.9 acceptance remain required.

Strict TypeScript, repository ESLint, discovery, portability (15 capabilities / 20 contract majors /
26 fixtures), unchanged generated routes and current Worker binding types pass. No dependency,
environment, seed or generated-file change is needed. The task's temporary preview configuration
has been removed. Files remain unstaged; no commit, push, migration on hosted Supabase or
Cloudflare promotion was performed.

## File accounting

New domain/DTO and tests: `src/domain/payments/product-fulfilment.ts` and its test.
New handlers/tests: `src/server/payments/product-fulfilment-http.ts`,
`client-fulfilment-http.ts` and colocated tests. UI/test: `ProductFulfilmentPanel.tsx` and
its test; fixtures: `src/test/product-fulfilment-fixture.ts`; browser packet:
`e2e/product-fulfilment.spec.ts`. New migration:
`20261010160000_manual_product_fulfilment.sql`; rollback packet:
`supabase/tests/database/manual_product_fulfilment.test.sql`.

Existing source updates: staff queue, client order page, server dispatch, request-security and
public-route registrations. Documentation: this packet, Sprint-15 plan, Phase-02 README, debt
registry, current state, limitations and RAG index. Existing US invitation/release documentation
changes are preserved for the owner's combined commit. No seed or generated file is hand-edited.
