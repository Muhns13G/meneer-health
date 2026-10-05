---
task_id: phase-02-sprint-11-8
title: Payment Reconciliation Completion Evidence
status: completed-local-reconciliation-boundary
last_updated: 2026-10-06
source_commit: 4129a04
primary_debt: [TD-010]
---

# Task 2.11.8 — Payment Reconciliation

## Mission and Baseline

Reconcile expired, failed, duplicate, disputed and refunded sandbox transactions without inventing
money, clearing uncertainty prematurely or advancing clinical/supply state. The first checkpoint
was committed at `4129a04` after Task 11.7 at `31bd489`. This follow-up completes the three
previously recorded implementation gaps on the same `itws-I` branch. It is local engineering
acceptance, not hosted activation or completion of Sprint 11/TD-010.

## Work and Decisions

- Exact signed refund facts confirm only the dispatched original-source job. Provider acceptance
  is not settlement; cumulative charge totals and job successes are not added twice. Replays,
  stale responses, conflicting events and uncertainty cannot manufacture refunded money.
- Assigned AAL2 financial staff with an independent current case grant can reconcile evidence,
  claim dispute ownership and reserve bounded retries after independently verified failure.
  Retired RPC versions, browser/internal observation commands and wrong-tenant requests are denied.
- Unpaid product-credit release and deposit replacement first inspect the exact current test-account
  Session and uncaptured PaymentIntent. Expiry alone cannot prove terminal unpaid money.
- A genuinely separate duplicate Session/PaymentIntent is derived from signed receipts, then checked
  independently against the current candidate and retained captures. Its entire captured amount
  receives a stable original-method refund job. Duplicate refunds never consume the retained
  deposit's refund ceiling or credit. Pending/uncertain jobs remain held; verified failure permits
  one replacement per job. Contradictory refund amount/binding remains unresolved.
- Dispute created/updated/closed events retain only coarse financial identifiers/status. Current
  provider inspection must match the exact latest signed terminal event before attributed resolution.
  Ownership alone does not clear a hold. A clean won/warning-closed outcome can restore otherwise
  eligible funding; lost funds remain unavailable. Older open events cannot undo a reconciled win,
  and contradictory final outcomes remain held.
- Replacement deposit approvals and attempt links are immutable. Approval and provider observation
  are bounded to 15 minutes; an unused expired approval requires fresh inspection/authorisation.
  Preparation creates a distinct current offer, requires fresh client acceptance and retains the
  original intent. Replays recheck intake, catalogue and money readiness; simultaneous replacements
  cannot allocate another offer. Late payment of the old attempt blocks the new offer, or enters
  duplicate reconciliation if the replacement was already paid.
- The native R999 deposit readiness bridge remains the single commercial authority for paid review
  and manual transfer. Financial reconciliation cannot approve treatment, clear safety holds, alter
  clinical state or dispatch a product.
- Private ephemeral UI displays coarse dispute/refund state and staff-only ownership/replacement
  controls. No public marketing wording, commercial policy, package, generated file or secret changed.

## Acceptance and Remaining Boundary

All three checkpoint gaps are implemented and locally proved. Task 11.8 is complete at its local
boundary. Task 11.9 must separately verify the actual sandbox provider and hosted routed journey,
under explicit migration/configuration/fixture approval. No hosted migration, Stripe API call,
charge/refund, real identity, email, activation or deployment occurred in this task.

Eight Sprint 11 migrations now exist locally; this task did not apply them hosted. Default-off
dispatch and independent release/instrument/clinical gates remain. TD-010 stays In progress;
the registry remains 58 items, 51 Verified and seven non-Verified. No new debt ID was accrued.
Dispute evidence submission/response is owned in Stripe's Dashboard; taking ownership in this UI
does not claim that a provider response has been submitted.

## Deviations and Lessons

No business-policy deviation. A follow-up additive migration preserves the committed checkpoint.
Separate-capture refunds need their own ledger identity rather than a larger refund of the retained
payment. Terminal dispute receipts need current provider corroboration. Replacement offers must
revalidate the original attempt even when replaying an already-created replacement.

Initial browser runs overlapped file edits: traces showed an unexpected document reload, clearing
the private panel and persisting TanStack's scroll-position cache. The unchanged assertions passed
when rerun without dev-server reloads. Do not edit files during controlled browser verification.
Local schema tests must wait for reset completion; a partially recreated Auth schema is not a defect
in the migration under test.

Stripe best-practices guidance retained signed evidence, server-only restricted keys and
original-method refunds. React guidance retained ephemeral, bounded private state and explicit
accessible actions; earlier Supabase guidance informed forced RLS and short account/case locks.

## Validation

- Final complete Vitest suite: **740 tests / 120 files passed**; focused latest payment tests:
  **25 passed**.
- Clean migration replay; **1,325 SQL assertions / 29 packets passed**, including **69** new
  completion assertions for duplicate captures/refund retry, wrong amount, dispute ownership,
  won/lost/older/conflicting evidence, stale observation, expired approval, fresh acceptance,
  idempotent replacement and late original/replacement captures.
- **Eight controlled desktop/mobile browser checks passed**, including keyboard/axe,
  no persisted private facts, scope denial, truthful refund state and new staff controls.
  Intercepted synthetic responses are not a real provider journey.
- Strict TypeScript, ESLint and production build/client-bundle/MCP absence passed.
- Database lint, portability, discovery, generated outputs and Cloudflare binding types passed.
  Production dependency audit reported no vulnerabilities.
- The isolated encrypted recovery exercise restored and reconciled **57 of 57 synthetic records**
  without contacting hosted services. Local Supabase was stopped after validation.

## File Inventory

This table covers the follow-up from `4129a04`; the checkpoint commit retains its own earlier changes.

| Category                | Files                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New migration           | `supabase/migrations/20261005222620_pilot_reconciliation_completion.sql`                                                                                                                                |
| New SQL tests           | `supabase/tests/database/pilot_reconciliation_completion.test.sql`                                                                                                                                      |
| Modified implementation | `src/components/RefundPanel.tsx`, `src/domain/payments/refund.ts`, `src/server/payments/pilot-refund.ts`, `src/server/payments/pilot-webhook.ts`, `src/server/payments/refund-http.ts`                  |
| Modified tests          | `src/components/RefundPanel.test.tsx`, `src/server/payments/pilot-refund.test.ts`, `src/server/payments/pilot-webhook.test.ts`, `src/server/payments/refund-http.test.ts`, `e2e/refund-request.spec.ts` |
| Modified documentation  | This packet, Sprint 11 plan, Phase 02 README, technical-debt registry, Stripe runbook, RAG current state/limitations/index                                                                              |

The agent did not stage, unstage, commit, switch branches, push or deploy. All follow-up files
remain for owner review and manual staging/commit.
