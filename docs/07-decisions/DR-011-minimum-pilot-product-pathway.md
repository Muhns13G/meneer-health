---
decision_id: DR-011
title: Minimum Pilot Product and Pathway Scope
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA technology and operations owner
required_approvers: [business_owner, repository_owner]
effective_date: 2026-10-02
supersedes: null
related_debt: [TD-006, TD-007]
---

# DR-011 — Minimum Pilot Product and Pathway Scope

## Context

The intended first product remains the BPC-157 plus TB-500 pairing commonly described as the
“Wolverine stack”. No product registration, patient-specific Section 21 authority, approved supply
chain or complete product-specific clinical and pharmacy pathway has been supplied for either
product. SAHPRA's current public peptide warning names both among illegally marketed peptides. Its
current Section 21 guidance also prohibits advertising and marketing medicines accessed through
that authority.

Phase 02 must still support a minimum invite-only pilot: client onboarding, a non-clinical profile,
versioned acknowledgement, an approved one-time payment, an operations queue and an auditable
manual hand-off to the separate protocol system. That operational pilot does not require Meneer to
sell, advertise or determine a medicine.

## Decision

1. The minimum v1 pilot contains **no product-specific medicine transaction**. BPC-157, TB-500 and
   every other peptide product are outside Meneer's transactional, payment and fulfilment scope.
2. The intended BPC-157 plus TB-500 pairing remains an internal future product hypothesis only. It
   must not become a public product selection, Stripe line item, payment metadata value, operational
   queue field, protocol hand-off field or fulfilment instruction.
3. The pilot may onboard an invited client and manually hand off an opaque case reference to the
   separate protocol system. That system's accountable professional parties retain every clinical,
   prescribing, product and protocol decision.
4. Task 8.4 may approve a one-time **non-medicine** pilot line item. If no lawful, accurately
   described line item is approved, hosted checkout remains disabled.
5. `/peptides` remains an informational, `noindex` route with no profile, questionnaire, checkout,
   prescription, dispensing or fulfilment action. `/start` remains gated until later sprints replace
   it with the approved product-neutral onboarding route.
6. Existing public peptide wording is not approved by this decision. Its registered claim variants
   remain `pending-evidence` under TD-006 and must be evidenced, qualified or withdrawn before a
   broader release.
7. A future product transaction requires a new decision after product-specific authority, parties,
   clinical/pharmacy pathway, data handling, terms, pricing, support, fulfilment and release evidence
   independently pass their recorded gates.

For the minimum pilot, this supersedes the earlier peptide-only transaction direction recorded in
DIR-012, DIR-026, DIR-027 and DIR-028. Those entries remain decision history and future product
context; their invite-only, measured, fail-closed and non-automatic-launch controls remain in force.

## Rationale

This is the documented scope-removal route for TD-007. It permits the minimum operational pilot to
advance without representing owner intent, a partner assertion or a protocol-system outcome as
authority for Meneer to market or sell a medicine. It also preserves the original website wording
for separate TD-006 review instead of rewriting it ad hoc during a product-scope decision.

## Security, Privacy and Clinical Implications

- Meneer receives no questionnaire answers, diagnosis, prescription, product selection or protocol
  content through the manual hand-off.
- URLs, logs, analytics, identity records, payment metadata and ordinary email must not reveal an
  intended peptide or clinical condition.
- Operations staff may coordinate state and ownership but may not infer, recommend or approve a
  product.
- A payment success cannot mean clinical approval, product approval, dispensing or fulfilment.

## Verification and Rollback

Repository evidence confirms that active `/start` and `/peptides` routes are non-transactional,
preserved prototypes are unrouted, hosted payment/provider capabilities fail closed and peptide
claim variants remain pending rather than approved. This decision changes no runtime or hosted
state.

Rollback requires a new approved decision—not silent removal of this record—and the complete
product-authority route defined in the TD-007 close-out pack. Until then, every product-specific
transaction remains denied.

## Review Triggers

Review before adding a product selector, naming a peptide in customer or staff workflow data,
creating a medicine-related Stripe item, accepting protocol data, enabling fulfilment, or changing
the protocol hand-off from its approved opaque manual boundary.

## Affected Documents

- `docs/02-implementation-plans/phase-02/sprint-08-pilot-activation-contract.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/05-future-considerations/td-006-td-007-claims-peptide-closure.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`
