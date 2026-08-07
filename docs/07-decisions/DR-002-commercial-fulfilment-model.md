---
decision_id: DR-002
title: Commercial, Payment, and Fulfilment Model
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA commercial and operations owners
required_approvers: [business_owner, commercial_owner, legal_owner, operations_owner, release_owner]
effective_date: 2026-08-08
supersedes: null
related_debt: [TD-010]
last_updated: 2026-08-08
---

# DR-002 — Commercial, Payment, and Fulfilment Model

## Context and Scope

Meneer needs a commercial model that never treats payment as clinical approval or promises supply
before an authorised decision. The current site retains “Cancel whenever” and a promise that a
patient does not pay for the consultation when the clinician determines treatment is unsuitable.
No prices, transactional terms, payments, orders, subscriptions, or fulfilment workflows are live.

This record defines approved v1 pilot rules for consultation-only, medication-plus-delivery, and
bundled charges. It does not activate Stripe, approve prices or tax treatment, establish a merchant
of record, or replace transactional terms.

### Confirmed Facts

- The v1 pilot is invite-only, peptide-only, and limited to approved real transactions after every
  activation gate passes.
- Meneer will use a standalone Stripe account inside the parent company's Stripe Organization, not
  Stripe Connect. Activation and business-model review remain pending.
- Precise Wellness is intended to supply approved orders to the Meneer hub; Meneer coordinates hub
  dispatch to the patient.
- Three possible charge scenarios are consultation-only, medication plus delivery, and a bundle
  with explicit line items.
- The provisional fulfilment target is 3–5 business days, subject to an approved clock and evidence.
- The website currently cannot accept payment and expressly limits its terms to informational use.

### Explicit Unknowns and Activation Gates

- `[TBC — owner: COMMERCIAL OWNER — gate: price publication]`: approved ZAR consultation,
  medication, delivery, bundle, re-delivery, and other permitted amounts.
- `[TBC — owner: LEGAL/TAX OWNER — gate: live payment]`: contracting party, merchant of record,
  invoicing entity, VAT/tax treatment, invoice requirements, and consumer-law terms.
- `[TBC — owner: STRIPE ACCOUNT OWNER — gate: Stripe activation]`: verified account holder,
  restricted-business acceptance, settlement account, statement descriptor, access roster, and
  dispute contact.
- `[TBC — owner: COMMERCIAL AND LEGAL OWNERS — gate: transactional terms publication]`: no-show,
  late-cancellation, post-pharmacy-release cancellation, re-delivery, return, recall, chargeback,
  and exceptional-refund rules.
- `[TBC — owner: OPERATIONS OWNER — gate: fulfilment activation]`: stock source, hub acceptance,
  courier, custody, tracking, failed-delivery, proof-of-delivery, return, and reconciliation evidence.
- `[TBC — owner: CONTENT OWNER — gate: commercial claim publication]`: approved presentation and
  evidence for price, cancellation, no-charge consultation, and delivery-timing claims.

## Options Considered

| Option                                                    | Benefits                                                 | Costs and risks                                                   | Disposition                |
| --------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------- |
| Charge one undifferentiated amount before clinical review | Simple checkout                                          | Obscures service lines and makes clinical rejection/refund unsafe | Rejected                   |
| Defer all payment until after clinical approval           | Minimises treatment refunds                              | Does not support a separately chargeable completed consultation   | Rejected as universal rule |
| Use explicit line items and stage-aware charging/refunds  | Preserves clinical independence and auditable exceptions | Requires separate states, terms, and reconciliation               | Approved                   |

## Decision

### Pilot scope

- Use one-time ZAR payments only. Subscriptions, automatic renewals, EFT, cash, buy-now-pay-later,
  insurance claims, stored-value credit, and marketplace/Connect payments are outside v1.
- Keep consultation, medication, delivery, discount, refund, and adjustment amounts as separate
  versioned line items even when displayed as a bundle.
- Snapshot the accepted description, amount, currency, tax treatment, terms version, and price
  version on the durable order. Historical transactions must not change when a catalogue changes.
- Display the complete amount, line items, material conditions, and refund/cancellation treatment
  before payment. Never display or charge an unapproved placeholder price.

### Charge scenarios

| Scenario                 | Charge timing                                                                                                                        | Clinical rejection                                                                                                             | Cancellation/refund boundary                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Consultation only        | After cohort/access checks, required disclosures and consent, when booking a real consultation                                       | No consultation charge, or full automatic reversal if already collected, when the clinician determines treatment is unsuitable | Full refund before service starts; completed-service and no-show rules remain TBC and must be disclosed before payment |
| Medication plus delivery | Only after the authorised decision/prescription, price acceptance, address confirmation, stock confirmation and pharmacy eligibility | No medication or delivery charge                                                                                               | Full refund before pharmacy release; later exceptions follow approved pharmacy/consumer terms                          |
| Bundle                   | Explicit consultation, medication and delivery lines may be collected together only under approved terms                             | Reverse every medication/delivery line and also the consultation line to preserve the retained no-charge-on-rejection promise  | Refund each unperformed or unreleased line independently; never use a single opaque non-refundable amount              |

If a consultation occurs but the patient voluntarily declines an otherwise approved treatment, the
consultation-only rule applies. Clinical rejection, patient cancellation, non-attendance, stock
failure, pharmacy rejection, operational failure, and payment failure are distinct reasons.

### Payment rules

1. Eligibility or questionnaire completion never guarantees approval, supply, or delivery.
2. The server creates the payable line items from approved versioned prices; the browser cannot set
   an amount or authoritative commercial state.
3. A browser success return is not payment evidence. Verified provider events and a durable internal
   record control payment state.
4. Failed, expired, abandoned, or unverifiable payment leaves no paid order and triggers no supply.
5. Duplicate payment is refunded in full to the original method and recorded as a reconciliation
   exception.
6. Refunds return to the original payment method unless an approved exceptional process requires
   otherwise. Refund state never deletes the underlying clinical, order, payment, or audit record.
7. Disputes and chargebacks are owned by the commercial owner and cannot alter a clinical decision.
8. Payment metadata contains opaque internal references only—never symptoms, questionnaire answers,
   diagnosis, prescription details, medicine names where avoidable, or other unnecessary health data.

### Cancellation interpretation

“Cancel whenever” means the patient can request cancellation through an accessible digital route
without a compulsory telephone call. It does not promise that every completed service, released
medicine, dispatched parcel, or failed delivery is refundable. The exact stage-based consequence
must be shown before payment and again at cancellation. Cancellation cannot reverse an already
completed clinical or pharmacy record.

### Fulfilment and exception rules

- An order becomes `eligible_for_fulfilment` only after all required clinical, payment, stock,
  pharmacy, address, consent, and operational conditions independently pass.
- The 3–5-business-day measurement clock begins at `eligible_for_fulfilment_at` and ends at verified
  delivery. The timestamp is the latest of cleared payment, authorised clinical decision,
  prescription where required, stock allocation, pharmacy release, and verified delivery details.
- The target remains an estimate until measured. Weekends, public holidays, remote-area limits, and
  known exceptions must be disclosed; the service must not silently restart the clock.
- No partial fulfilment is permitted in v1. If the complete approved order cannot proceed, pause it,
  notify the patient through an approved channel, and offer the approved cancellation/refund or
  replacement path.
- Pharmacy rejection, unavailable stock, damaged/wrong goods, failed hand-off, address failure,
  courier delay, failed delivery, return, recall, loss, and reconciliation mismatch each require an
  owned exception state. Medicine returned by a patient is never placed back into saleable stock.
- Dispatch requires an authorised pharmacy release, reconciled payment, accepted hub custody,
  approved packaging, verified address, and a traceable courier hand-off.

## State and Ownership Model

Clinical, payment, order, pharmacy, custody, delivery, cancellation, refund, dispute, and support
states remain independent. A paid payment is not an approved treatment; an approved treatment is
not a released medicine; dispatch is not delivery.

| Responsibility                        | Accountable role           | Required evidence                                                     |
| ------------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| Price catalogue and discounts         | Commercial owner           | Approved version, effective dates and channel scope                   |
| Clinical rejection reason             | Clinical/Precise authority | Authorised decision record without unnecessary payment disclosure     |
| Stripe account and access             | Stripe account owner       | Approved business model, MFA, least privilege and access review       |
| Payment/refund/dispute reconciliation | Commercial owner           | Provider event, internal ledger, exception queue and audit evidence   |
| Pharmacy release/supply               | Pharmacy lead              | Verified prescription/authority, release and custody hand-off         |
| Hub inventory and dispatch            | Operations owner           | Receipt, stock, packaging, courier hand-off and exception evidence    |
| Delivery and failed delivery          | Operations owner           | Tracking, proof, patient notification and recovery record             |
| Transactional terms and tax           | Legal/tax owner            | Approved version, contracting entity, tax treatment and invoice rules |
| Commercial claims                     | Content owner              | Commercial/legal/operations approval and current evidence             |
| Live-payment release                  | Release owner              | End-to-end test, monitoring, reconciliation, rollback and go decision |

## Rationale

Explicit line items and independent states prevent payment from overriding clinical judgement and
make rejection, partial failure, cancellation, refund, and fulfilment exceptions explainable. The
rules preserve established wording without treating the decision as approval of missing prices,
tax, contracts, or operational performance.

The business owner approved these as conservative v1 pilot policies, not as universal global
industry rules. Current comparable-provider terms vary in charge timing, subscriptions,
cancellation cut-offs, and refundability. Stripe's official guidance supports webhook-confirmed
fulfilment, idempotency, line-item reconciliation, and excluding sensitive metadata; applicable
South African consumer requirements and final legal/tax review remain controlling.

## Consequences and Risks

- The retained no-charge-on-clinical-rejection promise requires an automatic, monitored reversal
  path if any consultation money was collected.
- The cancellation claim requires an accessible digital request path and precise stage-based terms.
- Bundles increase refund and reconciliation complexity even when marketed as one package.
- The 3–5-day target cannot be guaranteed until its timestamps and exceptions are measured.
- Missing merchant, tax, price, terms, Stripe, pharmacy, or fulfilment evidence blocks live payment.

## Domain Implications

| Domain                             | Required treatment or approval                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| Clinical and safety                | Payment cannot influence approval; clinical rejection is a distinct reason and state  |
| Legal and privacy                  | Contracting, tax, terms, refunds, metadata and information roles require approval     |
| Security and access                | Server-created amounts, verified events, MFA, least privilege and audit are mandatory |
| Commercial and tax                 | Versioned ZAR line items and final tax treatment precede publication or charge        |
| Operations and support             | Every fulfilment exception has an owner, notification and reconciliation path         |
| Data and migration                 | Durable price/order snapshots and independent states remain portable                  |
| Content and patient representation | Retained claims require approved operational meaning and evidence                     |

## Implementation and Verification

- Implementation owner: Octothorp ZA commercial and operations owners.
- Affected systems and contracts: price catalogue, terms, checkout, payment events, internal ledger,
  orders, pharmacy hand-off, hub/courier, notifications, support and audit.
- Acceptance evidence: owner approval of this record; reconciled public copy; Stripe test-mode
  scenario evidence, fulfilment rehearsal, and end-to-end reconciliation.
- Migration/rollback effect: preserve immutable transaction snapshots and state histories across
  frameworks; disable checkout if reconciliation or a required downstream service fails.
- Dependencies and blockers: DR-001 gates, DR-003/DR-004 states and contracts, DR-005 data rules,
  DR-007 permissions, TD-006/TD-007 pathway evidence, and Sprint 05 implementation.

## Affected Documents

- `src/components/Benefits.tsx`
- `src/components/Doctor.tsx`
- `src/routes/terms.tsx`
- `docs/00-blueprints/master-blueprint-v1.md`
- `docs/02-implementation-plans/phase-01/sprint-03-operating-model-architecture.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`

## Approval

| Approver role    | Evidence/reference                                                                                                                    | Decision                              | Date       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------- |
| Business owner   | Approved the recommendations as a conservative v1 policy after distinguishing standard control patterns from project-specific choices | Approved within recorded scope        | 2026-08-08 |
| Commercial owner | Review required                                                                                                                       | Pending                               |            |
| Legal/tax owner  | Review required before live payment                                                                                                   | Pending                               |            |
| Operations owner | Review required before fulfilment activation                                                                                          | Pending                               |            |
| Release owner    | Business owner approved the decision boundary; separate go/no-go still requires implementation evidence                               | Decision approved; activation pending | 2026-08-08 |

Commercial, legal/tax, and operations approval of the gated particulars remains mandatory before
publication, payment, fulfilment, or pilot activation. Those reviews do not reopen the approved
one-time-payment, explicit-line-item, state-separation, or conservative exception principles unless
they identify a conflict requiring a superseding decision.

## Industry Comparison References

- [Stripe Checkout fulfilment](https://docs.stripe.com/checkout/fulfillment)
- [Stripe payment line items](https://docs.stripe.com/payments/payment-line-items)
- [Stripe metadata guidance](https://docs.stripe.com/metadata)
- [Hims cancellation process](https://support.hims.com/hc/en-us/articles/360000962263-How-do-I-cancel-my-subscription)
- [Ro terms of use](https://ro.co/terms-of-use/)
- [South African Consumer Protection Act](https://www.gov.za/sites/default/files/32186_467.pdf)

## Review Trigger

Review before any price or transactional term is published,
before Stripe activation, when a charge scenario or partner changes, after material payment/refund/
fulfilment exceptions, and before public launch or framework migration.
