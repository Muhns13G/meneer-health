---
evidence_id: phase-02-sprint-11-2-private-commerce-preparation
title: Private Synthetic Catalogue, Pricing and Credit Preparation
status: completed-local-preparation-boundary
task: 11.2
observed: 2026-10-05
completed: 2026-10-05
source_commit: 4affa32
owner: "@Muhns13G"
related_debt: [TD-010]
---

# Sprint 11.2 — Private Commerce Preparation

## Delivered Boundary

The [11.1 contract](sprint-11-1-commercial-payment-contract.md) now has a local implementation
foundation: six private deny-default tables for versioned prices, case delivery quotes, deposit
funding, immutable offers, credit reservations and independent product release gates. RLS is
enabled and forced; schema/table/function access is revoked from anonymous, authenticated and
service roles. The internal `security invoker` preparation primitive is not a routed API or a
session-authorising function. Later receipt/runtime tasks must add current first-party authority,
audit and governed entry points before it can become callable by the application.

The local seed includes only the exact R999 deposit and two plainly synthetic product examples.
It contains no real medical product, confidential RRP schedule, practitioner cost, real Stripe
Price ID, delivery tariff or clinical release. Catalogue provenance is explicitly `local-synthetic`;
production import/approval and provider mappings are not asserted. No existing Stripe catalogue,
scenario, order snapshot, endpoint, public wording or readiness adapter was replaced or enabled.

## Calculation and Reservation Controls

- Strict selections accept case/scenario, approved price IDs/quantities, quote reference and request
  key, not browser amounts, paid flags, metadata, provider prices or legacy bundle scenarios.
- Integer minor-unit calculation caps first-order product credit at `min(RRP, R999)`, leaves delivery
  separately payable and snapshots the unused original-method refund. Zero additional totals are
  supported without inventing a new charge; actual Session proof remains Task 11.5.
- Exact effective/expiry windows, withdrawn catalogue/quotes, missing submissions, safety holds,
  wrong tenant/subject and absent clinical/stock/pharmacy/address/custody facts deny preparation.
- Price/quote content is immutable except one-way withdrawal. Offers are append-only. Payload-bound
  request replay returns the original offer and rechecks current prerequisites.
- Case/funding locks and the active-reservation unique index prevent two offers spending the same
  credit. Preparation reserves only; it never consumes, releases or refunds funds merely because an
  offer was created or expired. An uncertain reservation stays closed for later reconciliation.
- Applied funding requires an applied allocation for a subsequent order. Pending refund, dispute
  or inconsistent source-payment facts deny readiness; an absent deposit cannot become a full-RRP
  first-order bypass.

Funding and product release rows have no application writer in this task. Positive SQL tests use
explicit rolled-back synthetic evidence, including a legacy local payment row as a funding fixture;
that is not permission to reinterpret a real consultation as a deposit. Tasks 11.4–11.5 must bind
new scenario/provider facts correctly and Tasks 11.7–11.8 supply monetary transitions. Both existing
production paid-review/manual-transfer adapters remain false.

Private commerce was added to the logical recovery schema list and synthetic fingerprint inventory.
This prevents the new private state being omitted from future exports without claiming any hosted
backup ran or hosted migration was applied.

## Validation

No hosted service, real client, email, Stripe resource or charge was used. Accepted local evidence:

| Check                             | Result                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Clean local migration/seed replay | All 37 migrations apply; the three clearly synthetic price records seed successfully.                                     |
| Full Vitest                       | 688 tests / 108 files pass, including 14 commerce cases and the recovery-schema regression.                               |
| Full SQL                          | 1,066 assertions / 26 packets pass; new commerce packet contributes 49 assertions.                                        |
| Local advisors                    | No warning/error issues reported.                                                                                         |
| Production build                  | Client/server output, client canary and MCP-absence checks pass.                                                          |
| Recovery                          | 57 synthetic source/restored records reconcile; encrypted, no hosted service contacted.                                   |
| Static gates                      | TypeScript, lint, portability (15 capabilities/20 majors/26 fixtures), discovery and unchanged generated route tree pass. |

Reservation exclusion is proved by database locking/unique constraints, replay and second-offer
denials, not a claim that real concurrent Stripe payments were exercised. Provider/session/receipt
integration and monetary reconciliation remain later-task proof. No new browser flow exists in
this task; a browser matrix was not rerun. Final database function lint returns no errors; local
Supabase was stopped with its synthetic backup retained. Repository-wide Prettier and whitespace
checks pass; five front-matter blocks, 229 local document links and 173 indexed paths with unique
identifiers validate. No staged files or branch change were introduced.

## Task Inventory

| New files                                                         | Purpose                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/domain/payments/pilot-commerce.ts`                           | Strict selections, trusted readiness and bounded catalogue/credit arithmetic. |
| `src/domain/payments/pilot-commerce.test.ts`                      | Calculation, provenance, selection and independent readiness regressions.     |
| `supabase/migrations/20261005173536_pilot_commerce_catalogue.sql` | Private tables, immutable records and locked internal preparation.            |
| `supabase/tests/database/pilot_commerce_catalogue.test.sql`       | Rolled-back access, effective price, readiness, replay and allocation proof.  |
| This packet                                                       | Task evidence and remaining runtime/provider boundaries.                      |

Existing implementation files changed: `supabase/seed.sql`,
`src/adapters/recovery/hosted-recovery-support.ts`, its colocated test and
`scripts/run-synthetic-recovery-exercise.ts`. Sprint plan, phase overview, registry and affected RAG
summaries/index are reconciled in the same task. No dependency, generated route or hosted setting
changes. The owner stages/commits all files; branch stays `itws-I`.

## Remaining Gates and Next Task

TD-010 remains In progress. There is no new debt ID: real private schedule/rates, final tax/invoice
treatment, truthful provider business acceptance, rendered instruments, operational authority,
signed event/refund proof and release already belong to its acceptance criteria. The restricted
preparation boundary deliberately does not substitute for those later tasks.

11.3 adds authenticated exact-offer disclosure and order-specific acceptance. 11.4 connects
Checkout; 11.5 supplies signed provider evidence; 11.7–11.8 complete credit/refund reconciliation.
The Stripe skill preserved hosted Checkout and opaque metadata; Supabase guidance shaped private
RLS/revocation, invoker functions, indexed foreign keys and consistent lock ordering. CLI SQL query
rejected a multi-statement script, so local Docker `psql` was used; no hosted fallback was attempted.
