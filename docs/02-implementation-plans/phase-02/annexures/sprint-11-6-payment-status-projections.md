---
task_id: phase-02-sprint-11-6
title: Private Payment Status Projections
status: completed-local-projection-boundary
last_updated: 2026-10-05
source_commit: 719e723
primary_debt: [TD-010]
---

# Task 2.11.6 — Private Payment Status Projections

## Mission and Baseline

Expose truthful own-client and permitted staff payment facts from Task 11.5's signed settlement
ledger, without inferring payment from Checkout/acceptance/redirect or conflating payment with
clinical approval, protocol completion, dispensing or delivery. Task 11.5 is committed at
`719e723`; the starting tree was clean on `itws-I`. This task neither enables hosted commerce
nor executes a refund, changes funding/credit, or grants clinical/payment readiness.

## Implementation and Decisions

- `/portal/payments/read` and `/staff/payments/read` are protected POST reads, behind the existing
  explicit review-mode/tenant gate. Current sealed patient or workforce proof, managed-provider
  identity, application session, rate limit, exact JSON schema, same origin and bounded body apply.
  Case/cursor information stays in the body, not URLs. Responses are private/no-store/no-referrer.
- Service-only SQL RPCs independently authorize own-client or assigned operations/AAL2 scope,
  append content-free audit, and recheck authority after audit. Browser roles cannot execute them;
  the service role cannot browse the private commerce schema. The staff RPC requires an explicit
  case and never exposes a tenant-wide financial listing. Its existing queue authorization also
  checks current role/purpose/tenant/provider/application authority. Read expiry is capped to the
  current provider/application/membership/assignment deadline and server identity deadline.
- Stable ascending `(createdAt, id)` pagination returns at most 25 records and an exact next cursor.
  Scope/page indexes support both own-history and assigned-case reads. Nine per-record fields:
  reference, scenario, currency, total minor units, refunded minor units, status, dispute flag,
  reconciliation flag and creation time. No provider IDs/URLs, contact, clinical content, product
  details, card details or internal reason strings leave the projection.
- `confirmed` is the persisted positive-money fact only. `not_required` is verified zero-total
  completion, not a new deposit. Open/preparing/unpaid Checkout remains pending; absence of an
  intent is not started. Failure/expiry do not overwrite confirmed capture. Cumulative refund
  and dispute/reconciliation evidence stays independently visible, including a full refund.
  Strict response validation rejects unknown/provider fields and contradictory amount/status facts.
- One shared panel is mounted only inside the authenticated portal/assigned queue detail. Reads
  are explicitly refreshed; no financial data is persisted in browser storage. A newer request
  aborts the old one and clears its data. Denial, malformed/expired response, expiry, page hiding,
  unmount or parent invalidation clears facts. Case changes remount the panel rather than retaining
  another case's private state. Status announcements, keyboard controls and mobile layout are tested.

## Scope, Deviations and Lessons

No deviation from 11.6's financial-projection mission. The existing operations authority is used
rather than inventing an unapproved broad finance role. Independent read endpoints/panels avoid
making existing clinical/hand-off projections pretend to evaluate payment readiness. Unmatched
receipts cannot be guessed into a client's history; their owned reconciliation remains 11.8.
Historical money facts remain viewable without pretending current Checkout/clinical release is
ready. Earlier acceptance/creation is deliberately not a paid fact.

Two first-run SQL fixtures were invalid before exercising the intended denial: revocation needed
its required timestamp/reason, and an in-place role change conflicted with assignments. Corrected
rollback-only fixtures preserve those constraints; failed runs are not acceptance evidence.
The browser's initial sandbox listener failed; the controlled local run uses local permission,
not a production code workaround. Supabase and React guidance informed explicit privileges,
database scope enforcement, indexed pagination and ephemeral component/request ownership.

## Validation and Activation Boundary

Final local verification:

- Full Vitest: **713 tests / 115 files passed**, including strict financial-schema, HTTP and
  ephemeral panel cases. TypeScript and ESLint pass.
- Local clean migration replay, database lint (no errors) and **1,162 SQL assertions / 26 packets
  pass**. Normalized signed-event fixtures prove pending-before-paid, confirmed capture,
  refund/dispute/reconciliation retention and no provider-field leakage. Own and assigned AAL2
  reads, direct browser denial, forged subject/purpose, partial cursor, revocation, tenant/role/
  assignment/provider denial, bounded history and audit-failure denial are covered.
- Controlled Playwright/axe: **36 desktop/mobile checks passed** across payment status, portal and
  staff queue. New views prove scoped requests, independent evidence, keyboard interaction,
  denial/parent invalidation clearing, no browser storage/URL state and responsive layout.
  Mobile screenshot was visually inspected. The agent-browser executable was unavailable;
  existing managed Playwright provides browser proof. Responses are synthetic interceptions.
- Production build, client-bundle canary, MCP absence, portability, discovery, generated route
  check and Worker type check pass. Production dependency audit reports no vulnerabilities.
- Encrypted synthetic recovery reconciles **57 source/restored records**, including private
  commerce; no payload enters its heartbeat. Local Supabase is stopped afterward.
- Document links/index paths and working-tree/staged whitespace checks pass; no staged changes.

SQL uses rollback-only synthetic fixtures; browser routes intercept
synthetic account/payment responses. These are separate boundary proofs, not one claimed hosted
card journey. No Stripe/network/card/charge or hosted Supabase/Cloudflare setting was touched.

Five Sprint 11 migrations are not claimed applied hosted. Review/Checkout/callback mode defaults
remain disabled. Both downstream paid-review/manual-transfer adapters stay closed for the later
funding/command integration. TD-010 remains In progress; no new debt ID (58 total, 51 Verified,
seven non-Verified). Next is 11.7 cancellation/refund commands and owned exceptions, followed by
11.8 reconciliation and 11.9 hosted sandbox evidence.

## File Inventory

| Category                | Files                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New implementation      | `src/domain/payments/payment-status.ts`, `src/server/payments/payment-status-http.ts`, `src/components/PaymentStatusPanel.tsx`, `supabase/migrations/20261005202217_payment_status_projections.sql` |
| New tests/fixtures      | Colocated domain/HTTP/panel tests, `src/test/payment-status-fixture.ts`, `e2e/payment-status.spec.ts`                                                                                               |
| Modified implementation | `src/components/PatientPortalPage.tsx`, `src/components/StaffQueuePage.tsx`, `src/server.ts`, `src/server/security/request-security.ts`                                                             |
| Modified SQL tests      | `medical_intake_foundation.test.sql`, `staff_queue_projection.test.sql`                                                                                                                             |
| New documentation       | This evidence packet                                                                                                                                                                                |
| Modified documentation  | Sprint 11 plan, Phase 02 README, debt registry, RAG current state/limitations/index                                                                                                                 |

No package/dependency, generated file, secret, public marketing copy, or Git index/branch change.
The owner stages/commits/deploys. This is a task packet; Sprint 11.10 owns final sprint closure.
