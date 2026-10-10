---
plan_id: phase-02-sprint-15
title: Private Product Orders and Manual Fulfilment
status: in-progress
authority: owner-approved-direction
last_updated: 2026-10-10
owner: "@Muhns13G"
depends_on: [phase-02-sprint-10, phase-02-sprint-11, phase-02-sprint-12, phase-02-sprint-14]
---

# Sprint 15 — Private Product Orders and Manual Fulfilment

## Mission and Boundary

Complete the operational gap between the review deposit and an approved product purchase.
The owner approved this bounded addition after the 9 October source/hosted inventory audit.
Reuse existing payment, credit, acceptance, reconciliation and identity machinery. Do not build
a public shop, automatic prescribing, subscriptions, wallet, new payment provider or framework
migration. Laravel/React is the intended rebuild direction discussed with the owner; this sprint
does not select its infrastructure or execute that rebuild.

Clients browse customer-facing products after onboarding, optionally express interest, and pay
only an independently approved staff-prepared quote. Interest is not prescribing, an order,
clinical consent or stock reservation. Images are optional. Prices come from the previously
approved Precise Wellness RRP schedule, not Noventra or invented placeholders for real sales.
Practitioner costs and the source PDF remain outside Git and client/provider payloads.

The [15.1 contract](annexures/sprint-15-1-product-order-contract.md) retains the
[11.1 commercial rules](annexures/sprint-11-1-commercial-payment-contract.md): R999 once per
review case, capped first-order product credit, separate delivery, original-method refunds,
fresh acceptance and independent clinical/payment/supply/delivery states. The subsequent
seller/collection arrangement in the existing live-payment packet remains authoritative.
Blood uploads remain deferred; no blanket blood requirement is added for peptides.
The responsible clinician decides what evidence is necessary. The generator remains inactive
until needed and separately reactivated; do not fabricate its approval or output.

## Observed Starting Point — 9 October

- Source contains product-order arithmetic, exact offer review/acceptance and Checkout/settlement.
- The routed automatic preparation path calls `patient_prepare_deposit_offer`, not a staff quote
  command. Product rehearsal offers were prepared through internal SQL.
- Hosted inventory: one synthetic-classified deposit price, no product prices, no delivery quotes,
  no product-release gates, one deposit offer and no product offers. Two published instruments
  are for deposits, not product orders.
- The existing fulfilment repository/event service has no operational client/staff manual
  supply-and-courier UI. These foundations are not complete product-order functionality.
- Real product provenance needs deliberate schema/domain evolution: the existing price contract
  allows only `local-synthetic`. Never relabel real products as synthetic to bypass this boundary.

## Task Breakdown

| Task    | Deliverable                                                                                         | Completion evidence                                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.15.1  | Freeze flow, responsibilities, portable interest/quote input boundaries and retained release gates. | Contract, strict input tests and existing credit regression. No runtime activation.                                                                 |
| 2.15.2  | Versioned private product/RRP provenance, safe import/withdrawal and delivery/address references.   | Forward migration, scoped importer, synthetic SQL/contract tests; real schedule hash and owner price review before real import.                     |
| 2.15.3  | Private client catalogue and optional interest requests after onboarding.                           | Own-client authority, accessible mobile cards without images, no public index, no clinical claims or exposed wholesale costs.                       |
| 2.15.4  | Assigned staff quote preparation with quantities, delivery and immutable snapshot.                  | Fresh AAL2/operations scope, masked navigation, explicit tenant names, audited/idempotent draft commands, stale/concurrent denial.                  |
| 2.15.5  | Independently attributed clinical and provider/stock/address/custody evidence.                      | Correct-role success, wrong-role/assignment/purpose/version/expiry/hold denial; no operations impersonation of clinician.                           |
| 2.15.6  | Issue quote, exact product terms, client accept/decline and credited balance Checkout.              | Existing ledger integration, matching-offer payment state, no second deposit, credit race/replay/zero-total and original-funding refund regression. |
| 2.15.7  | Manual provider order, receipt at Meneer, courier dispatch and delivery/exception controls.         | Scoped audited transitions, no automatic supply from payment, reference-only custody/recall evidence, client coarse progress.                       |
| 2.15.8  | Clear client/staff next actions and generic notifications/support.                                  | No product/clinical data in ordinary messages; exact order status, retry/uncertainty, keyboard/axe/reflow and owner manual review.                  |
| 2.15.9  | Isolated hosted product-order rehearsal and recovery coverage.                                      | Separately approved migrations/fixtures/test captures/refunds, exact cleanup and restored configuration; no generator activation.                   |
| 2.15.10 | Reconcile evidence, debt, release runbook and sprint closure.                                       | Full validation, completion report, file accounting and owner deployment/CI. Engineering closure is not product-sales GO.                           |

15.1 is completed at contract level (strict inputs and 28 domain tests).
[15.2](annexures/sprint-15-2-private-product-catalogue.md) is completed locally: private catalogue
provenance/import, encrypted shipping and delivery bindings; 169 files / 1,356 unit tests and
47 SQL suites / 2,234 assertions pass. Hosted import/application is not performed.
[15.3](annexures/sprint-15-3-client-catalogue.md) is completed at its local/controlled-browser
boundary: private browsing and audited interest, disabled by default; 44 focused unit/security
tests, 48 SQL suites / 2,261 assertions and 22 desktop/mobile checks pass.
[15.4](annexures/sprint-15-4-staff-quote-drafts.md) is completed at its local/controlled-browser
boundary: assigned fresh-TOTP operations drafts, immutable server totals and authorised workspace
names; 73 focused tests, 49 SQL suites / 2,309 assertions and 22 desktop/mobile checks pass.
[15.5](annexures/sprint-15-5-product-evidence.md) is completed at its local/controlled-browser
boundary: native granted clinician and independent provider evidence, immutable revocation and
current exact-reference guards; 53 focused tests, 50 SQL suites / 2,378 assertions, six new dev
browser checks and 22 distinct compiled staff regression checks pass. No hosted release occurred.
[15.6](annexures/sprint-15-6-issued-product-quotes.md) implements exact quote issue, published-term
acceptance/decline and the existing capped-credit Checkout bridge. Its packet records 109 focused
tests, the 51-suite database regression plus final 114 quote assertions, and 26 compiled browser
checks; no hosted product release or terms publication is inferred.
Tasks 15.7–15.10 remain planned. Do not claim the whole sprint complete from inherited tests.

## Engineering Constraints

- Server derives identity, tenant, role, authority, catalogue totals, credit and price versions.
  Strict inputs accept opaque references and bounded quantities, not paid/approved flags or totals.
- Clinical evidence must bind the exact patient/case and approved products/quantities, with an
  expiry/version and revocation. A generic case-level boolean is not sufficient product authority.
- Orders require a reproducible immutable shipping-address snapshot in private storage, not an
  email address or a browser `addressConfirmed` flag. No address in URLs, analytics or public logs.
- Revalidate before quote issue, acceptance/Checkout and release. Withdrawal or a new safety hold
  blocks progression; changing an accepted offer creates a new version and acceptance.
- Finance, clinical approval and dispensing stay separate. Operations staff record administrative
  evidence; they do not acquire clinician/pharmacy roles. Real staff grant changes need approval.
- Offer preparation must not repeatedly mint a deposit, double-reserve credit, lose an unresolved
  Checkout or hide a later product quote behind historical deposit confirmation.
- Keep existing SQL history and pure domain contracts portable to Laravel. Prefer small explicit
  commands and useful staff screens over another generic workflow framework.

## Verification and Release

Use synthetic `.invalid` contacts and non-medical example products locally. Serialize database
suites and builds. Test denied identity/tenant/role/assignment, immutable price/address/terms,
stale quotes, duplicate commands, double credit, pending/failed/disputed/refunded payment, no-cost
orders, stock/custody/dispatch failures, changed approval and cancellation/refund allocation.
Never infer signed settlement from a redirect or dispensing/delivery from a paid flag.

Hosted migrations, imports, messages and provider records require separately bounded approval;
the owner alone stages, commits, pushes and promotes. Retain the existing sandbox's exact refund,
cleanup and configuration-restoration obligations. No new real charge is authorised by this plan.

Before product-sales GO: approve current customer RRPs, actual delivery quote policy, applicable
product terms/provider business acceptance, real clinical/pharmacy authority and custody/courier
arrangements. If generator output is required for an order, that order remains blocked while its
subscription is inactive. Listing/interest can ship separately without implying sales readiness.
Existing TD-007/009/010 obligations remain; this plan does not mark them Verified or add invented
debt counts. Reconcile newly discovered limitations at each task and at 15.10.
