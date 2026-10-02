---
evidence_id: phase-02-sprint-08-6-transactional-instrument-set
title: Pilot Transactional Instrument Set and Consent Boundary
status: completed
task: 8.6
source_commit: 76be64a
observed: 2026-10-02
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-009, TD-010, TD-037, TD-038]
---

# Sprint 08.6 — Pilot Transactional Instrument Set and Consent Boundary

## Outcome

[DR-015](../../../07-decisions/DR-015-pilot-transactional-instruments.md) approves four portable,
versioned instrument contracts and fixes which client action applies at identity, payment and
external hand-off. This is exact implementation authority for the meaning and evidence of each
instrument; the rendered documents remain inactive until their verified party/channel schedules
and domain approvals exist.

Task 8.6 changes no public route, database, hosted service or active client journey.

## Approved Client-Facing Baseline

### `pilot-account-terms/1.0`

The rendered terms must communicate, without changing these meanings:

1. The agreement is between the client and OCTOTHORP ZA (`K2024185008`), trading under the working
   Meneer brand for the approved non-clinical pilot service.
2. The service is invite-only account access, non-clinical coordination, payment/order
   administration and minimum-data referral. Meneer/OCTOTHORP ZA is not the clinician, prescriber,
   protocol provider or pharmacy merely because it operates the platform.
3. Eligibility, invitation or payment does not guarantee review, approval, prescription, supply or
   delivery. Emergency care is outside the service.
4. External clinical/protocol services are governed by the verified provider's own terms, privacy
   notice and informed-consent process.
5. The client must provide accurate contact information, protect account access and use the service
   lawfully; corrections use the approved secure process.
6. The pilot uses one-time transactions only. No membership, subscription or automatic renewal is
   created.
7. Applicable statutory rights and liabilities are not waived. South African law governs the
   Meneer agreement, subject to mandatory consumer and privacy rights.
8. Material changes create a new version and fresh acceptance; an old acceptance cannot authorise
   a materially different service.

### `pilot-privacy-notice/1.0`

The rendered notice must communicate:

- OCTOTHORP ZA is responsible for Meneer identity, contact, profile, acknowledgement, payment-status,
  operational-status, support and audit information; independently authorised providers remain
  responsible for their own clinical/protocol records unless a verified agreement says otherwise.
- The minimum profile is exactly DR-014. Payment/order, delivery and hand-off records are collected
  only when their approved workflow requires them. Credentials and raw card data remain with the
  relevant provider; Meneer does not collect clinical questionnaire or protocol content.
- Purposes are invitation/account administration, verification, service/security communication,
  non-clinical support, payment/order administration, authorised fulfilment, rights handling,
  fraud/security, audit and a client-authorised minimum-data hand-off.
- Necessary processing relies on the applicable contract/steps requested by the client, legal
  obligations and narrowly assessed legitimate interests—not a blanket consent fiction. A separate
  hand-off or optional-marketing consent applies only where expressly requested.
- Approved processors/categories, cross-border safeguards, retention, rights, complaint routes,
  mandatory/optional fields, collection source and refusal consequences must be shown before
  collection. No solely automated clinical decision is made by Meneer.
- DR-005/DR-014 govern access, correction, restriction, objection, export, closure/deletion,
  retention, holds, processors and backup reconciliation.

Acknowledgement label baseline:

> I acknowledge that I have received and can access the Pilot Transactional Privacy Notice version
> 1.0. I understand that this acknowledgement records delivery of the notice and is not marketing
> or clinical consent.

### `pilot-order-terms/1.0`

Before the R999 review deposit, display the supplier, service description, exact amount, VAT
treatment, payment method, terms/price versions and these consequences:

- the deposit is credited in full to the first clinically approved order;
- it is refunded to the original method if no review occurs, the client is clinically unsuitable
  or rejected, the decision expires, the hand-off fails, or the provider cannot complete review;
- it is earned after a completed review approves an order and the client voluntarily declines;
- duplicate payment is refunded in full;
- payment does not establish clinical approval, prescription, availability or fulfilment; and
- product RRP, credit, delivery and final total require a later distinct order acceptance before
  product payment. Cancellation/refund consequences must match the order's actual state.

Acceptance label baseline:

> I accept Pilot Order and Payment Terms version 1.0 for this displayed transaction, including the
> R999 review-deposit credit and refund rules. I understand that payment does not guarantee clinical
> approval, product supply or delivery.

### `pilot-handoff-authorisation/1.0`

The interface substitutes only verified values into the bracketed schedule and must never display
the brackets to a client:

> I authorise OCTOTHORP ZA/Meneer to send [recipient legal name] my name, verified contact details,
> contact preference, opaque referral reference and referral date so that [recipient role/purpose]
> can invite me into its separately governed intake. I have been shown the recipient's privacy
> notice and understand that Meneer does not send my questionnaire answers, blood results,
> diagnosis, protocol, prescription or product selection. I may withdraw before the hand-off is
> delivered. This authorisation is not clinical informed consent or treatment approval.

The schedule also shows the secure delivery method, expiry, consequence of refusal and recipient
privacy/escalation channels. A changed recipient, field set, purpose or version requires new
authorisation.

## Interaction and Evidence Matrix

| Boundary          | Required action                  | Must remain separate                | Durable evidence                                                       |
| ----------------- | -------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Identity          | Account-terms acceptance         | Privacy acknowledgement             | Subject, tenant, version/hash, timestamp, assurance, idempotency       |
| Profile           | Privacy-notice acknowledgement   | Marketing and clinical consent      | Notice version/hash and delivery/acknowledgement fact                  |
| R999 deposit      | Order-specific terms acceptance  | Clinical approval and hand-off      | Order, price/terms versions, amount snapshot, actor and timestamp      |
| Provider hand-off | Recipient-specific authorisation | Provider terms and clinical consent | Recipient/purpose/field-set version, expiry, delivery/withdrawal state |
| Product order     | Fresh order acceptance           | Prior deposit acceptance            | Product/price/delivery snapshots and stage-specific consequences       |

## Retained Gates

- Task 8.7 must verify the privacy, complaint, cancellation and clinical escalation channels.
- Task 8.8 must verify the provider identity, privacy role, notice, agreement and hand-off method.
- Supplier addresses/telephone/office-bearer and any applicable accreditation/code disclosures must
  be privately verified and inserted before electronic supply.
- Product order instruments require the verified pharmacy/custody/courier and delivery schedules.
- Applicable legal/privacy, commercial, operations, security, accessibility and release reviewers
  must approve the rendered version before activation.

No client can accept an instrument while any applicable retained gate is unresolved.

## Reconciliation

- Existing `/terms` and `/privacy` remain correct website-only versions and are unchanged.
- DR-005 supplies lifecycle/rights treatment; DR-014 supplies the profile field catalogue.
- DR-013 supplies the R999, RRP, VAT-planning, delivery and refund policy.
- Existing payment storage already snapshots a `terms_version`; Sprint 11 must bind it to the
  approved publication and acceptance receipt rather than accepting an arbitrary string.
- Sprint 9 must add immutable acknowledgement/acceptance publication and receipt records.
- Clinical informed consent remains wholly outside Meneer's non-clinical instrument set.

## Validation

This documentation-only task was reconciled against the website notices, identity governance,
payment terms-version boundary, lifecycle/rights model, profile decision and current primary South
African privacy/electronic-transaction/consumer sources. No runtime or public wording changed.
