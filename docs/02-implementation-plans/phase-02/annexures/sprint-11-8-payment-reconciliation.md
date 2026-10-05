---
task_id: phase-02-sprint-11-8
title: Payment Reconciliation Implementation Checkpoint
status: in-progress-local-reconciliation
last_updated: 2026-10-06
source_commit: 31bd489
primary_debt: [TD-010]
---

# Task 2.11.8 — Payment Reconciliation

## Mission and Baseline

Reconcile expired, failed, duplicate, disputed and refunded sandbox transactions without inventing
money, clearing uncertainty prematurely or advancing clinical/supply state. Task 11.7 was committed
at `31bd489`; the starting tree was clean on `itws-I`. This packet is an implementation checkpoint,
**not full acceptance of Task 11.8**. No public marketing wording or commercial policy was changed.

## Implemented Work and Decisions

- Signature-verified `refund.created`, `refund.updated` and `refund.failed` events retain only exact
  refund identity, opaque job reference, original PaymentIntent, amount, currency, status and time.
  Raw customer/medical data are not journalled. Old normalized event shapes remain compatible.
- Forced-RLS private refund facts, exception resolutions, retry links and terminal provider checks
  deny direct browser/service-role access. Retired RPC versions are not executable by the service
  role; current wrappers require attributed, current authority.
- Exact account/tenant/source/amount/currency matching plus immutable event identity confirm only the
  intended dispatched refund job. Provider responses remain non-terminal. Replays do not add money
  twice; cumulative charge refunds and job-specific successes are not summed twice. Old pending
  evidence cannot undo success; contradictory terminal evidence creates a hold.
- A signed failed/canceled refund becomes `failed_verified`. An assigned AAL2 operator with an
  independent current case-specific financial grant can reserve one replacement job. Pending,
  uncertain, contradictory or confirmed jobs cannot be blindly retried. Original funding and capture
  ceilings remain enforced; eligibility must still be current where required.
- Expired/failed unpaid credit is not released merely because an event arrived. The server first
  reads the approved test account, exact terminal unpaid Checkout Session and associated uncaptured
  PaymentIntent. Open, processing, captured, mismatched and foreign-account results fail closed.
  It records the bounded observation and rechecks current authority before releasing unconsumed
  product credit. Provider I/O occurs outside database locks. Late money after release is held.
- Native signed clean R999 deposits now supply review/manual-transfer monetary readiness and first
  order funding without depending on a legacy payment order. This replaces the two false-readiness
  adapters, not independent identity, safety, consent, clinical, pharmacy or custody gates. Refunded,
  disputed, conflicted, expired-release or cancelled deposits cannot authorize progression.
- Staff controls expose truthful confirmed/failed state, coded bounded exceptions, reconciliation
  and verified-failure retry. Patient commands remain read/request only. New provider exceptions
  create durable content-free alerts owned by technology/operations through the existing dispatcher;
  no email delivery is claimed. Financial review and clinical/supply cancellation remain separate.

## Outstanding Acceptance Work — Remains in 11.8

| Gap                                | Required completion proof                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Genuine separate duplicate capture | Distinguish a second actual captured PaymentIntent from an event replay or unrelated binding; retain at most the intended payment and reserve/dispatch/confirm its full original-method refund under stable reconciliation identity. Prove replay, overlap, wrong binding and refund failure paths. Current code holds binding conflicts but does not implement this full refund path. |
| Final dispute outcome              | Track open/owned response/terminal won or lost with current provider evidence and attributed staff resolution; reconcile refunds and credit before any hold release. Prove out-of-order/repeated/contradictory outcomes and prevent premature progression. Current dispute evidence remains conservatively held, including a terminal closed event.                                    |
| Replacement deposit Checkout       | After independently proving the original failed/expired Session has no captured or processing money, create a governed replacement offer/intent without rewriting original evidence or enabling two paid deposits. Prove late capture, uncertainty, acceptance/version expiry, concurrent retries and idempotency. Current one-deposit-offer guard prevents this replacement path.     |

These are existing TD-010 obligations, not new debt IDs or deferred future considerations. Do not
move to Task 11.9 acceptance or mark 11.8 complete merely because the implemented subset passes.
No further business decision has been invented: the approved contract remains the authority.

## Scope, Deviations and Lessons

The extra provider inspection is necessary to implement the approved “reconcile before credit
release” rule: an expiry receipt cannot prove an associated PaymentIntent is no longer processing.
Exact refund evidence must be separate from cumulative charge totals and dispatch responses.
Immutable financial evidence and short account/case/job lock ordering prevent stale provider
responses or concurrent commands from rewriting settled facts.

Stripe guidance informed original-method refund status and non-guaranteed event ordering;
Supabase guidance informed private RLS boundaries and short transactions; React guidance informed
private ephemeral state and bounded action controls. No dependency was added or removed.
The optional agent-browser executable was unavailable; controlled managed Playwright supplied
desktop/mobile browser checks, and the mobile staff screenshot was visually inspected.

## Validation at This Checkpoint

- Full deterministic Vitest: **734 tests / 120 files passed** on supported Node 22, including exact
  signed refund status normalization, SDK terminal inspection, HTTP/internal-observation denial,
  UI scope/expiry and verified-failure retry controls.
- Clean local migration replay; **1,256 SQL assertions / 28 packets passed**, including the new
  refund confirmation/replay, verified-failure retry, wrong scope, no force-confirm, native readiness,
  provider-observation-required credit release, late-money hold, recovered funding and owned alerts.
- Controlled **eight desktop/mobile browser checks passed** for payment/refund controls. These use
  intercepted synthetic responses; they do not prove a hosted card journey or provider delivery.
- Strict TypeScript, ESLint, production build/client-bundle canary/MCP absence, Worker type check
  and production dependency audit pass. No production vulnerabilities were reported.
- Isolated encrypted recovery reconciles **57 source/restored records**, with zero heartbeat payload
  fields. Portability, discovery, generated-output checks, Prettier, RAG index paths and whitespace
  validation pass. Local Supabase is stopped after verification.

No hosted migration, Stripe network call, card/charge/refund, real identity, email, secret change,
pilot activation or deployment occurred. The seventh Sprint 11 migration is local evidence only.
Task 11.9 owns separately approved actual provider/hosted proof after 11.8 is fully accepted.

## File Inventory

| Category                    | Files                                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New database implementation | `supabase/migrations/20261005215113_pilot_payment_reconciliation.sql`                                                                                                                  |
| New SQL tests               | `supabase/tests/database/pilot_payment_reconciliation.test.sql`                                                                                                                        |
| Modified implementation     | `src/domain/payments/refund.ts`, `src/server/payments/pilot-refund.ts`, `src/server/payments/pilot-webhook.ts`, `src/server/payments/refund-http.ts`, `src/components/RefundPanel.tsx` |
| Modified tests              | Colocated provider/webhook/HTTP/panel tests; `e2e/refund-request.spec.ts`                                                                                                              |
| New documentation           | This checkpoint packet                                                                                                                                                                 |
| Modified documentation      | Sprint 11 plan, Phase 02 README, technical-debt registry, Stripe runbook, RAG current state/limitations/index                                                                          |

The agent did not stage, unstage, commit, switch branches, push or deploy. Files were staged externally
while work was underway; newer corrections/documentation must be reviewed and staged by the owner.
No generated files, package/lockfile, environment catalogue, secret file or public copy was edited.
