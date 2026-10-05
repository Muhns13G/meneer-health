---
evidence_id: phase-02-sprint-11-1-commercial-payment-contract
title: Pilot Payment Scenarios, Prices, Instruments and Exceptions
status: completed-at-contract-level
task: 11.1
observed: 2026-10-05
completed: 2026-10-05
source_commit: 109413b
owner: "@Muhns13G"
related_debt: [TD-010]
---

# Sprint 11.1 — Commercial Payment Contract

## Scope and Authority

This packet defines implementation semantics for Tasks 11.2–11.9, not new marketing copy,
transactional publication, hosted configuration or live payment approval. DR-002's independent
states remain; [DR-013](../../../07-decisions/DR-013-pilot-product-commercial-fulfilment-amendment.md)
supersedes product exclusion and supplies the commercial model. DR-015 supplies instruments and
DR-018/I1 supplies free first-party intake and separate paid-review/manual-transfer readiness.

The owner approved on 5 October 2026: credit below-R999 orders only up to the product subtotal,
refund the unused deposit to its original method, and keep delivery separately payable. This
clarifies DR-013 without creating a wallet, future credit balance or membership. The owner also
approved staff review for unresolved no-show/late and post-release cancellation cases, without
automatic forfeiture or invented fees. Existing explicit full-refund reasons remain automatic;
staff review does not itself approve a new monetary policy or override statutory rights.

Engineering uses one-time ZAR test-mode hosted Checkout on the existing standalone Stripe account.
No Connect, automatic renewal, saved-card/off-session collection, public sign-up, automatic
prescribing or implicit pharmacy release is introduced. Meneer is the merchant brand; OCTOTHORP
ZA remains the legal seller/invoice issuer. Actual account acceptance, supplier particulars,
tax/invoice review and product/custody authority remain pre-launch gates.

## Scenarios and Exact Timing

| Scenario                          | Amount and timing                                                                                                         | Required independent evidence                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free entry/intake                 | No charge for eligibility, profile, questionnaire draft, submission or urgent safety handling.                            | Current own-client session, intake instruments and applicable safety controls; no paid flag required.                                                                                                     |
| `review_deposit`                  | R999 (`99900` minor units), once per review case, after submitted intake and before paid provider review/manual transfer. | Active invite-only authority, current submitted version, appropriate review readiness, exact order acceptance and approved deposit price; no unresolved hold authorises progression.                      |
| `approved_product_order`          | Later distinct order: approved product RRP less available deposit credit, plus separately accepted delivery.              | Independently attributed clinical approval, confirmed availability, product/pharmacy authority, reviewed custody/delivery path, current shipping details where required and fresh transaction acceptance. |
| Manual subsequent purchase/refill | Approved RRP plus delivery; no automatic repeat charge or second use of the first-order credit.                           | Fresh applicable clinical/supply approval, availability, price/delivery snapshot and acceptance.                                                                                                          |
| Zero additional amount            | Only when the accepted product subtotal is fully covered and the approved delivery amount is zero.                        | Same product gates and exact acceptance; completed no-cost Checkout evidence, not a fabricated charge or PaymentIntent.                                                                                   |

Draft/submission does not initiate paid provider review. Safety screening/hold handling remains
independent of collection of money; paid-review readiness never suppresses urgent guidance or
allows payment to clear a hold. Revalidate case, submission/version, authority and applicable
readiness at Checkout creation and before manual transfer. A paid deposit alone is insufficient.

Legacy `consultation_only`, `medication_delivery` and `bundle` fixtures remain compatibility
evidence, not permission to expose old scenarios. No combined pre-approval product bundle is
selected. Task 11.2 must deliberately evolve contracts/storage and preserve old snapshots; do not
reinterpret a historical consultation as a deposit or auto-enable a legacy catalogue entry.

## Pricing, Versions and Calculation

All calculations use integer ZAR minor units and checked bounds. The server derives quantity,
approved items, totals and eligibility from a versioned offer; browser amounts, discounts, delivery
rates, provider Price IDs, paid status and credit balances are rejected.

The private real catalogue must reproduce customer-facing RRP from the confidential schedule with
fingerprint `6fb2afe26b479f3affa2ca3ca98a66d20d6c18406621e7e4e52d810826a41736`.
Do not commit that schedule or practitioner costs. All candidate products may enter the governed
catalogue; a listing is not clinical approval or supply authority. Later tests may use an explicitly
synthetic catalogue with no real medical products, never present it as the approved RRP schedule.

Every catalogue version records opaque item/version IDs, immutable customer description and RRP,
currency, quantity bounds, tax-treatment reference, effective interval, approval reference,
environment and provider Price mapping. Delivery uses an approved effective-dated rate or a
case-specific server-owned quote with scope/expiry. No invented standard tariff or delivery promise.
Withdrawal/version changes do not edit accepted history; new acceptance is required for a changed
offer, total, rate, availability or material term. Checkout must revalidate the offer before creation.

Implementation version identifiers are `pilot-review-deposit-v1` for the approved R999 price,
`pilot-commerce-policy-v1` for this calculation/exception contract and
`pilot-commerce-synthetic-v1` for the isolated test catalogue. These are server-owned internal
references, not real Stripe Price IDs or published legal terms. A changed amount/policy creates a
new immutable version and approval; a real RRP catalogue also requires its own version and schedule
fingerprint. Provider mappings are environment/account-specific and independently verified.

For product subtotal `P`, approved delivery `D` and available first-order deposit `A`:

- `A = 99900` only for an independently reconciled, unused and undisputed review deposit;
  otherwise `A = 0`. Pending payment/refund or conflicting evidence requires reconciliation.
- First-order credit `C = min(P, A)`; additional payable total `T = P - C + D`.
- Unused first-order deposit `U = A - C` is refunded to the original method after the first order
  completes commercially; it is not silently retained or carried to a future purchase.
- Delivery is not reduced by the deposit. No negative payable amount, extra charge, forfeiture or
  customer-entered promotion is permitted.

A missing or refunded first-case deposit is not permission to charge the full product RRP instead;
it leaves first-order readiness closed for reconciliation. `A = 0` is the ordinary subsequent-order
case after the first-order credit was properly applied, not a bypass for an unresolved deposit.

Examples below are synthetic calculation fixtures, not product prices or delivery rates:

| Product subtotal | Delivery | Credit | Additional payment | Unused deposit refund |
| ---------------- | -------- | ------ | ------------------ | --------------------- |
| R1,500           | R100     | R999   | R601               | R0                    |
| R800             | R100     | R800   | R100               | R199                  |
| R999             | R0       | R999   | R0                 | R0                    |
| R800             | R0       | R800   | R0                 | R199                  |

Reserve credit atomically for one order; retries return the same reservation and simultaneous
orders cannot spend it twice. Consume only on reconciled commercial completion; release a
failed/expired reservation only after ruling out a late payment. Creation is not consumption.
An uncertain provider response must not create a second Checkout or release credit prematurely.
Commercial completion here means verified Checkout settlement of the accepted additional total,
or verified completed no-cost Session against the accepted zero total—not prescribing, dispensing
or delivery. The deposit's credited and refunded portions remain individually attributable.
The unused-deposit refund gets its own stable request/ledger reference and retry path. Its pending
or failed state remains visible; no refund-success notification precedes provider confirmation.

Cancellation/refund allocation must retain which original transaction funded each component.
Where an approved full product/delivery refund applies, include credit-funded product value from
the original deposit and newly captured balance/delivery from their original transaction, subtract
already refunded amounts, and never refund more than captured. Existing DR-013 full-deposit refund
reasons control their own case; unresolved overlaps go to an owned exception, not double refund.
An applied deposit is not billed again as both earned review revenue and product payment.

VAT-inclusive planning is retained, not evidence of tax registration or a selected tax rate.
No `automatic_tax`, tax collection or new surcharge is enabled by this packet. Final tax/invoice
classification and treatment of deposit/credit/refund require domain review before real charges.

## Instrument and Receipt Binding

Retain `pilot-order-terms/1.0` as the DR-015 approved baseline, not a claim that a rendered version
is published. The below-R999 clarification must be incorporated into a traceable reviewed
publication; material changes require a new instrument version and fresh acceptance. Do not
silently alter an already accepted version.

Before every deposit or product payment, present the verified supplier, exact services/items,
RRP subtotal, deposit credit, separately charged delivery, total/currency, VAT treatment, price/quote
versions, stage-specific cancellation/refund consequences and reproducible full instrument.
Preserve the approved meaning and unchecked acceptance label from the
[instrument contract](sprint-08-6-transactional-instrument-set.md); any necessary changed label
belongs to the reviewed new publication, not an ad-hoc component edit.

The server binds one receipt to subject, tenant, order/offer reference, publication ID/version,
locale, content hash, price/quote snapshot fingerprint, action, current assurance, server time,
idempotency and correlation references. Store publication text once, not copied into every receipt.
Wrong tenant/order, missing/unpublished/withdrawn/stale instrument, hash/price mismatch, expired
offer, unchecked/refused acceptance and replay with changed payload fail closed. A prior account
receipt or previous deposit acceptance cannot accept the later product order.

Changes after acceptance require a new offer and acceptance, not mutation of paid history.
No final supplier placeholders or hidden schedules may be client-acceptable. Synthetic documents
are identified as test fixtures and cannot activate the real suspended pilot.

## Client, Provider and Staff Data Boundary

The authenticated client sees the accurate transaction and accepted order lines. Client disclosures
must never disguise a product charge as a consultation. The authorised private catalogue links
product references; ordinary operations projections use minimum administrative/payment facts.
Clinical users have no payment-administration privilege merely through medical assignment.

Stripe receives only the necessary truthful commercial description, currency, amount, quantity,
approved Price/credit representation and opaque reconciliation references. Use deposit wording
for the deposit and accurate product-order wording for product transactions; account/business-model
acceptance must cover the actual activity. Generic descriptions are not a workaround for provider
restrictions. Product-specific descriptions, if required by provider/invoice review, require a
separately recorded minimum-data disclosure review before activation.

Metadata is allowlisted opaque order/tenant references only. Never transmit intake answers,
birth/sex/measurements, bloods, diagnosis, protocol, prescription, clinical rejection reasons or
product selection in metadata, URLs, ordinary notifications, public logs or analytics. No client
supplied metadata or raw card fields. Provider operations may carry only the minimum billing
data needed; an account profile is not automatically forwarded wholesale.

Keep the current hosted Checkout surface and server-only restricted test credentials. Do not
broaden CSP for an embedded payment form that is not being implemented. Redirects use approved
first-party return destinations with no sensitive query state; returning is never payment proof.
Patient commands use the existing sealed, current first-party session and tenant/purpose checks,
not a browser role or the legacy localhost bearer-token surface alone. Finance mutations require
an explicitly authorised workforce purpose, AAL2, scoped assignment and audit; no broad operations
membership grants refund authority.

## Independent Evidence and State Contract

| Aggregate                | Evidence-driven progression and guard                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offer/acceptance         | Prepared → accepted → superseded/expired; exact immutable snapshot and receipt before Checkout.                                                                           |
| Checkout/payment         | Prepared → open → pending → paid/failed/expired or reconciliation; verify provider account, test mode, order, currency and amount before credit or paid-review readiness. |
| Deposit allocation       | Available → reserved → applied/released; unused refund and reversed allocation are separately recorded, never inferred from redirect.                                     |
| Refund                   | Requested → provider submitted → pending → confirmed/failed; original method, captured ceiling and idempotent retry. Provider acceptance alone is not completion.         |
| Dispute                  | Open → owned response → won/lost/other reconciled outcome; quarantine affected progression while unresolved and reconcile credit/refunds before release.                  |
| Clinical/manual transfer | Independent appointment, safety, clinical and purpose-grant evidence; only reconciled eligible payment supplies the commercial gate.                                      |
| Supply/custody/delivery  | Independent approval/availability, pharmacy release, hub custody and verified delivery facts. Paid is neither dispatched nor delivered.                                   |

Raw webhook signatures are verified before parsing business data. Durable event identity plus
fingerprint detects exact replay/conflicting reuse; order/PaymentIntent/Session correlations and
provider amount/currency/account checks prevent an unrelated valid event authorising a case.
Missing/out-of-order events enter reconciliation; do not assume arrival order or fabricate state.
Persist verified receipt/processing disposition before acknowledging a handled event. Unsupported
events never change state. An outage preserves uncertainty for safe retry rather than false success.

Zero additional amount is a separate reconciled commercial completion, not a new paid deposit.
Stripe supports no-cost Checkout without an associated PaymentIntent; Task 11.5 must handle its
completed Session evidence and verify the zero snapshot. It cannot manufacture paid-review
authority without the original settled deposit and every independent gate.

## Exception Matrix

| Event/fact                                                                                        | Required commercial disposition                                                                                                                    | Progression consequence                                                                               |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Failed/abandoned/expired Checkout                                                                 | No paid state; reconcile uncertain/late events before retry or credit release.                                                                     | No paid review or supply inferred.                                                                    |
| No review, rejection/unsuitability, expired decision, failed hand-off or provider cannot complete | Full original-method deposit refund under DR-013; durable attributed reason without clinical detail in finance.                                    | Pause affected paid progression; preserve clinical/safety history.                                    |
| Completed review approves order, then client voluntarily declines                                 | Earn/retain deposit only with independently attributed completion, approval and voluntary-decline evidence.                                        | No product charge or automatic supply.                                                                |
| Duplicate successful capture                                                                      | Retain at most the intended payment; refund duplicate in full with stable reconciliation reference.                                                | No duplicate case, credit or transfer.                                                                |
| Missing/expired delivery quote, stock/approval or changed offer                                   | Refuse new product Checkout; re-offer and reaccept after resolution.                                                                               | No guessed charge or guarantee.                                                                       |
| Stock failure after completed review                                                              | Separate from voluntary decline; pause and route owned exception for deposit treatment; refund eligible unperformed product/delivery under DR-002. | No automatic deposit forfeiture or replacement.                                                       |
| Product cancellation before pharmacy release                                                      | Approved full product/delivery refund, allocated across original funding sources without double refund.                                            | Cancel/reconcile supply independently.                                                                |
| No-show, late cancellation or post-pharmacy-release cancellation                                  | Owner-approved staff-reviewed exception path; exact monetary treatment requires reviewed terms and attributed authority.                           | No invented fee, automatic forfeiture or unsupported refund promise; applicable rights remain intact. |
| Refund provider rejection, timeout or pending                                                     | Keep requested/submitted/pending/failed facts, alert assigned commercial owner and reconcile before retry.                                         | Never announce refunded or erase captured payment.                                                    |
| Dispute, provider/order mismatch or conflicting event                                             | Owned reconciliation with required provider facts and attributed resolution.                                                                       | No payment-driven supply/transfer while unresolved.                                                   |
| Session expiry, revoked assignment, restriction or changed accepted version                       | Reject new command and clear private UI; provider events still reconcile through their dedicated service authority.                                | Revocation does not discard money/event evidence.                                                     |
| Unused first-order deposit                                                                        | Original-method refund of `U` after reconciled first-order completion.                                                                             | No wallet, retained remainder or reused credit.                                                       |

Reason/exception records are coded and purpose-bound, attributed and audited; clinical narrative
stays medical-private. Support must distinguish a cancellation request from accepted cancellation,
refund requested from completed, and payment pending from settled. Do not invent a response SLA.

## Implementation and Negative-Test Packet

11.2 owns catalogue/quote/deposit allocation persistence and bounded arithmetic; 11.3 exact offer
disclosure/receipt and accessible refusal; 11.4 current patient runtime/Checkout; 11.5 verified
events; 11.6 minimum projections; 11.7 refund commands; 11.8 reconciliation; 11.9 actual provider
and routed synthetic proof. Replace the two false payment-readiness adapters only through that
authoritative ledger, never through a test flag or client `paid` value.

Required fixtures/tests include: R999 exact deposit; all four arithmetic examples; first-order
credit only once; concurrent reservations; paid-and-refunded/partial/duplicate/disputed deposits;
zero additional total without PaymentIntent; stale/expired catalogue and quote; changed/wrong-order
receipt; tampered amount/metadata; wrong tenant/role/purpose/assurance; withdrawn approval/hold;
provider timeout; raw signature/tamper/live-event denial; replay/conflict/out-of-order/late success;
over-refund prevention and split original funding; unperformed/refused/unsuitable/expired/failed
review; voluntary-decline evidence; failed/pending refund; cancellation and notification failure.

No real client, clinical protocol or card data is used. Hosted migrations, Stripe resources,
synthetic recipients/identities and temporary activation require explicit bounded approval and
baseline-restoring cleanup. The generator subscription does not prevent these engineering tests;
its reactivation checklist still controls actual manual transfer.

## Acceptance, Evidence and Remaining Inputs

Task 11.1 is complete at contract level: scenario, version/receipt, paid-review, credit and exception
semantics are frozen, including the owner's two explicit dispositions above. Final prices/rates, supplier/party
schedules, rendered terms, professional/pharmacy/custody authority, provider business acceptance,
staff roster and Sprint 13 go/no-go are release inputs, not evidence delivered by this document.
TD-010 remains In progress. No new debt ID is needed for these already registered particulars.

This packet changes no TypeScript, schema, generated output, public wording, environment, secret,
Stripe resource or hosted service. Local formatting/link/index checks verify document consistency,
not runtime payment functionality. Scope reviewed against the current payments contract, checkout
service, provider adapter and localhost-only runtime, plus DR-013/015/018 and I1.

Final local document validation passed on 5 October: Prettier checks for all nine changed/new
files, seven YAML front-matter parses, 239 local links, all 172 indexed paths with unique document
identifiers, four minor-unit arithmetic examples and `git diff --check`. No runtime/SQL/browser or
provider exercise was rerun for this documentation-only task. Eight existing files were updated
and this packet was created; the branch remains `itws-I` and all changes are unstaged for the owner.

Primary provider references checked on 5 October 2026:

- [Stripe no-cost Checkout](https://docs.stripe.com/payments/checkout/no-cost-orders): zero-total
  completion requires Session handling, not an assumed PaymentIntent.
- [Stripe webhook handling](https://docs.stripe.com/webhooks): raw signature verification,
  duplicate handling and non-guaranteed event ordering underpin the independent ledger.

The Stripe best-practices skill retains hosted Checkout, server-only keys and signed provider
evidence. The docs skill's CLI could not read pages because its local configuration permission was
denied; official web documentation was used instead, without changing account configuration.
