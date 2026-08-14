---
consideration_id: FC-005
title: TD-006 and TD-007 Claims and Peptide Closure
status: external-evidence-and-approval-required
decision_due: before-peptide-pathway-or-affected-claim-activation
last_reviewed: 2026-08-14
owner: Octothorp ZA product and release owner
sensitivity: internal
---

# TD-006 and TD-007 Claims and Peptide Closure

## Purpose and Current Position

Sprint 07 completed the technical foundations for governed content, exact claim registration,
cross-channel consistency, withdrawal, rollback, and fail-closed publication. It did not manufacture
the external evidence or professional approvals needed to close TD-006 or TD-007.

- **TD-006 remains In progress:** 28 retained claim variants across nine families are still marked
  `pending-evidence`.
- **TD-007 remains In progress:** BPC-157 plus TB-500 is owner-confirmed product intent, not
  regulatory, pharmacy, clinical, legal, security, operational, or release approval.
- The current non-transactional gates remain mandatory until the relevant closure evidence passes.

## TD-006 Claim Evidence Pack

Each retained variant must be substantiated and approved, or withdrawn from every channel.

| Claim family                               | Minimum closure evidence                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| HPCSA-registered doctors                   | Named clinician, HPCSA number and current register result, applicable scope, contractual role, and approval of the exact wording                    |
| POPIA compliance                           | Responsible party and Information Officer, approved data map/policies, operator agreements, risk assessment, incident process, and privacy approval |
| Encryption and limited sharing             | Production encryption in transit/at rest, key and access controls, vendor terms, verification evidence, exceptions, and security approval           |
| Licensed pharmacy                          | Exact legal/trading identity, SAPC Y-number, responsible pharmacist and P-number, current register result, contracting role, and partner approval   |
| Free unsuitable-treatment consultation     | Exact eligibility/rejection trigger, exclusions, price and payment/refund consequence, and clinical/commercial approval                             |
| Cancellation without a call                | Approved channel, effective event, order/subscription boundary, refund exceptions, support path, and operational proof                              |
| Service timing                             | Defined start/end events, staffing model, qualifications/exceptions, measured pilot results, and operations approval                                |
| Discreet packaging and nationwide delivery | Packaging standard, pharmacy-to-hub custody, courier coverage, proof of delivery, exceptions/reconciliation, and operations approval                |
| Peptide positioning                        | Product-specific clinical and legal approval for each exact recovery, performance, longevity, treatment, and benefit representation                 |

Collectively, closure requires named clinical, legal/privacy, security, commercial, operations, and
release approvers. Product-owner wording approval alone is insufficient.

## TD-007 Regulatory and Pathway Decision

Choose and evidence one closure route for every intended peptide:

1. **Approved-product/access route:** record the product, manufacturer, formulation, route,
   indication, scheduling and SAHPRA registration number, or retain the applicable patient-specific
   Section 21 authority and every condition; or
2. **Scope-removal route:** remove BPC-157 and TB-500 from the transactional pilot and withdraw any
   product-specific claim or journey that implies availability.

SAHPRA's public peptide notice currently names BPC-157 and TB-500 among illegally marketed peptides.
A partner assertion, research-laboratory status, general prescription, or owner approval does not
replace product-specific registration or valid alternative authority.

If the approved-access route is chosen, assemble:

- verified Precise Wellness/pharmacy legal identity, Y-number, responsible pharmacist, contracting
  role, sourcing authority, dispensing responsibility, and accountable clinical decision-maker;
- named prescriber and current professional registration/scope;
- approved questionnaire version, inclusion/exclusion rules, contraindications, urgent red flags,
  consent, follow-up, adverse-event reporting and escalation;
- secure minimum-data hand-off, durable decision record, role/tenant/purpose access, audit,
  retention/deletion, and incident controls;
- product sourcing, pharmacy-to-hub custody, dispatch, delivery, exceptions, reconciliation,
  cancellation/refund consequences, and monitored support ownership; and
- product-specific clinical, pharmacy, legal/privacy, security, commercial/operations, and release
  approvals.

## Privacy-Safe Evidence Handling

Confidential originals do not need to be committed or shared in chat. Store them in an approved
restricted evidence repository. Version control should retain only safe metadata: evidence ID,
document type, issuing authority, subject/product, verifier, verification date, expiry/review date,
restricted location reference, and a digest where approved. Do not record secret values, identity
documents, patient information, Section 21 patient details, or confidential contracts in Git.

A named authorised reviewer must be able to inspect the originals. An inaccessible owner assertion
cannot be treated as independently verified evidence.

## Implementation and Verification Sequence

1. Decide TD-007's product-authority or scope-removal route before approving peptide claims.
2. Assign the six accountable approval roles and create the restricted evidence index.
3. Review all 28 variants family by family; approve, qualify, replace, or withdraw each exact text.
4. Update `contracts/retained-public-claims.ts` with evidence references, approvals, lifecycle dates,
   and final dispositions. Do not weaken the fail-closed validator.
5. If proceeding with peptides, reconcile the approved clinical, consent, data, dispensing,
   fulfilment, support, cancellation, and safety pathway with existing provider-neutral contracts.
6. Run claim/public-content/cross-channel tests, full CI/browser checks, security and privacy tests,
   and a synthetic hosted end-to-end pathway exercise without completing a real prescription,
   payment, dispensing event, or delivery.
7. Obtain final release review, update the technical-debt registry and RAG documents, and retain an
   auditable closure record. Activation remains a separate explicit release decision.

## Closure Criteria

- **TD-006 is Verified** only when every retained variant has current evidence and all required
  approvals, or has been withdrawn from every governed channel, with automated publication and
  cross-channel evidence passing.
- **TD-007 is Verified** only when the product-specific lawful authority and complete pathway are
  independently verified and tested, or the proposed products and affected claims are removed from
  transactional scope.

## Authoritative References

- [TD-006/TD-007 close-out pack](../02-implementation-plans/phase-01/annexures/sprint-01-10-claims-peptide-closeout-evidence.md)
- [Claim register and publication validation](../02-implementation-plans/phase-01/annexures/sprint-07-4-claim-register-publication-validation.md)
- [Cross-channel content verification](../02-implementation-plans/phase-01/annexures/sprint-07-6-cross-channel-content-verification.md)
- [Technical-debt registry](../04-technical-debt/technical-debt-registry-v1.md)
- [SAHPRA peptide-products notice](https://www.sahpra.org.za/peptide-products-public-information/)
- [SAHPRA Section 21 access guideline](https://www.sahpra.org.za/document/guideline-for-section-21-access-to-unregistered-medicines/)
- [HPCSA practitioner verification](https://www.hpcsa.co.za/Public/FindPractitioner)
- [South African Pharmacy Council](https://www.sapc.za.org/)
