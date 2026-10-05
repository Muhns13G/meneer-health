---
task_id: phase-02-sprint-11-7
title: Cancellation and Original-Method Refund Commands
status: completed-local-refund-boundary
last_updated: 2026-10-05
source_commit: 46fa1bf
primary_debt: [TD-010]
---

# Task 2.11.7 — Cancellation and Refund Commands

## Mission and Baseline

Implement the approved cancellation/refund matrix without inventing fees, allowing browser-owned
money or conflating a request with clinical cancellation or confirmed refund settlement. Task 11.6
was committed at `46fa1bf`; the starting tree was clean on `itws-I`. Public marketing wording,
dependencies, secrets and hosted configuration are unchanged. The owner retains Git control.

## Work and Decisions

- Own-client `/portal/payments/refund` requests are current-session, same-origin, rate/body bounded,
  explicitly acknowledged and audited. A request is not cancellation approval or a completed refund.
  Patients cannot supply eligibility, amount, destination, provider ID or staff commands.
- `/staff/payments/refund` requires assigned operations/AAL2 authority. Money mutations additionally
  require an independently approved, expiring case-specific financial grant and a verified eligibility
  record. A broad operations role alone cannot refund. These release records are private governed
  database-owner inputs; no production grants or evidence were seeded or fabricated.
- Review-not-performed, unsuitable, expired-decision, failed-handoff and provider-unavailable reasons
  reserve the eligible original deposit. Verified pre-release product cancellation allocates product/
  delivery capture and credited deposit to their respective original PaymentIntents. Zero-additional
  orders refund only their real deposit source, never an invented zero-value PaymentIntent.
- No-show, late-cancellation and post-release exceptions enter staff review. No automatic forfeiture,
  invented cancellation fee or eligibility promise is introduced.
- Verified deposit settlement creates native funding. Verified order completion consumes reserved
  credit and automatically queues the approved unused-deposit remainder. An unpaid offer/acceptance
  cannot consume it. Native funding is explicitly distinguished from historical legacy order funding;
  old rows are not reinterpreted. Neither downstream clinical/payment-readiness adapter is opened.
- Exact original-source money is locked/reserved before a provider call. Immutable decision/request
  keys and jobs prevent overlapping or over-capture refunds. Provider I/O is outside database
  transactions. Claim-before-call leaves uncertain failures reserved; a fresh retry identity cannot
  double-submit. Automatic dispatch is bounded to five queued jobs per scheduled invocation.
- Stripe uses the existing SDK, restricted test-only key, approved standalone account and original
  succeeded ZAR PaymentIntent. The stable provider idempotency key derives from the immutable job.
  No alternative destination, patient/contact/medical metadata or browser amount is accepted.
  Even a provider `succeeded` response is recorded as submitted pending independent reconciliation.
- `COMMERCE_REFUND_MODE=disabled` is the default. Dispatch additionally requires sandbox Checkout/
  callback modes, current database release/account authority and appropriate financial/service scope.
  Patient reads/requests do not construct the provider client or need refund-capable credentials.
- Forced-RLS private tables deny direct browser/service-role access; service-only RPCs check current
  scope before/after commands and audit. Uncertain/pending/failed jobs produce content-free existing
  operations-alert records. This is not claimed email delivery evidence.
- Shared private portal/queue controls expose only bounded request/job state and amounts. Explicit
  refresh, request cancellation, expiry, visibility/unmount clearing and case remounting avoid stale
  financial state. No browser storage or URL financial fields are introduced. Responsive controls,
  keyboard operation and truthful status announcements are covered.

## Scope, Deviations and Lessons

No change to the approved commercial matrix or public positioning. The new independent refund flag
is an implementation safeguard, not permission to activate hosted refunds. Stripe guidance informed
original-method partial refunds, stable idempotency and pending/failed distinction; Supabase/React
guidance informed database scope, short transactions and ephemeral private UI ownership.

Early SQL fixtures needed valid independent administrator membership and an unambiguous PL/pgSQL
variable name. The final regression also caught the new environment entry missing from its exact
catalogue expectation. These were corrected and rerun; failed runs are not acceptance evidence.
The optional agent-browser executable was unavailable; managed controlled Playwright supplied the
desktop/mobile checks and mobile screenshots were visually reviewed.

## Validation

- Full deterministic Vitest: **729 tests / 120 files**. Strict commands, original-method SDK,
  dispatch failure/claim ordering, disabled scheduled dispatch, HTTP denial and panel clearing cases.
- Clean local migration replay and **1,207 SQL assertions / 27 packets passed**; database lint
  reports no errors. Tests cover own-client request/denial, assigned AAL2 plus financial grants,
  original-source allocation, immutable replay, over-capture/overlap prevention, uncertainty,
  content-free alert/audit, exact automatic unused refund, service scope, split refund and zero balance.
- Controlled browser checks: the initial **38 desktop/mobile checks passed**, then **four refund
  checks passed** after adding staff coverage (two client checks overlap; 40 unique checks overall).
  They cover the existing portal/queue/payment surfaces and new client/staff refund controls using
  synthetic intercepted responses. Mobile client/staff screenshots were visually inspected.
- TypeScript, ESLint, production build, client-bundle canary, MCP absence, portability, discovery,
  generated route/Worker checks and production dependency audit pass. No production vulnerabilities.
- Isolated encrypted recovery reconciles **57 source/restored records**, with zero heartbeat payload
  fields. Local Supabase is stopped after verification. Document index/links and whitespace checked.

These are separate local boundary proofs, not one hosted card journey. No hosted migration,
Stripe call/card/charge/refund, real identity, email or pilot activation occurred. Six Sprint 11
migrations are not claimed applied hosted. Task 11.9 owns actual hosted/no-charge provider evidence.

## Remaining Work and Debt

Task 11.8 owns independent terminal refund confirmation, pending/failed/uncertain resolution,
reservation release, late/duplicate/disputed events and the authoritative downstream payment bridge.
Until then all jobs remain reserved, even after provider response; conservative denial is preferable
to duplicating money. Coarse payment facts remain signed settlement facts; the separate refund panel
shows request/dispatch state. No clinical, pharmacy-release or delivery cancellation is inferred.

TD-010 remains In progress. No new debt ID accrued: 58 total, 51 Verified, seven non-Verified.
Actual financial grants, eligibility publication, transactional/operational approval, provider
permissions, migrations and sandbox release still require their recorded gates. Sprint 11.10 owns
the sprint-wide completion report; this packet closes only Task 11.7 locally.

## File Inventory

| Category                              | Files                                                                                                                                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New implementation                    | `src/domain/payments/refund.ts`, `src/server/payments/pilot-refund.ts`, `src/server/payments/refund-http.ts`, `src/server/payments/refund-dispatch.ts`, `src/components/RefundPanel.tsx`, `supabase/migrations/20261005210256_pilot_refund_requests.sql` |
| New tests                             | Colocated domain/provider/HTTP/dispatcher/panel tests; `e2e/refund-request.spec.ts`; `supabase/tests/database/pilot_refund_requests.test.sql`                                                                                                            |
| Modified implementation/configuration | `.env.example`, `config/environment-catalogue.ts`, `src/components/PaymentStatusPanel.tsx`, `src/server.ts`, `src/server/security/request-security.ts`                                                                                                   |
| Modified existing tests               | `src/config/environment.test.ts`, `supabase/tests/database/medical_intake_foundation.test.sql`                                                                                                                                                           |
| New documentation                     | This task packet                                                                                                                                                                                                                                         |
| Modified documentation                | Sprint 11 plan, Phase 02 README, technical-debt registry, RAG current state/limitations/index                                                                                                                                                            |

No package/lockfile, generated-file, secret, public copy, branch or Git index changes. The owner
stages, commits, pushes and deploys. Next: Task 2.11.8.
