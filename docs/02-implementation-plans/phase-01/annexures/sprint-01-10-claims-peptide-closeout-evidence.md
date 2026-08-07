---
artifact_id: phase-01-sprint-01-10-claims-peptide-closeout-evidence
title: Sprint 01.10 Claims and Peptide Close-out Evidence
status: external-evidence-pending
prepared: 2026-08-07
related_debt: [TD-006, TD-007]
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Sprint 01.10 — Claims and Peptide Close-out Evidence

## Approved Direction

On 7 August 2026, the repository owner approved proceeding with TD-006 and TD-007 and reaffirmed
the established public wording and peptide-first pilot direction. This is product-owner approval;
it is not evidence of a professional registration, pharmacy licence, medicine authorisation,
clinical protocol, security implementation, or measured service level.

No customer-facing wording is changed by this evidence pass. `/start` and `/peptides` remain
non-transactional gates, and development fixtures remain prohibited from rendering publicly.

## TD-006 Claim Close-out Pack

| Claim family                                              | Evidence required to verify                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HPCSA-registered doctors                                  | Clinician identity, HPCSA number, current register result, independent-practice scope, contractual role, and clinical approval                                |
| POPIA compliance                                          | Named responsible party and Information Officer, approved data map and policies, operator agreements, risk assessment, incident process, and privacy approval |
| Encryption and limited sharing                            | Production architecture, encryption at rest/in transit, key/access controls, vendor terms, test evidence, and security approval                               |
| Licensed local pharmacy                                   | Exact pharmacy legal/trading name, Y-number, SAPC register result, responsible pharmacist and partner approval                                                |
| Free unsuitable-treatment consultation                    | Approved pricing trigger, clinical-rejection outcome, exclusions, payment/refund handling, and commercial approval                                            |
| Cancellation without a call                               | Approved cancellation channel, effective event, subscription/order boundary, refund exceptions, and operational proof                                         |
| Five-minute, 48-hour, evening/weekend and delivery timing | Defined start/end events, staffed operating model, exception handling, measured pilot results, and operations approval                                        |
| Discreet packaging and nationwide delivery                | Approved packaging, pharmacy-to-hub custody, courier coverage, proof of delivery, exception/reconciliation process, and operations approval                   |

## TD-007 Peptide Close-out Pack

The repository owner identified the initial candidate offering on 7 August 2026 as the pairing
commonly described as the “Wolverine stack”: BPC-157 plus TB-500. This records product intent only;
it is not approval to advertise, prescribe, dispense, supply, or administer either product.

For every intended peptide, record the active ingredient, product and manufacturer, formulation,
route, intended indication, scheduling, and either its SAHPRA registration number or the exact lawful
alternative authority. If unregistered-medicine access is proposed, retain the applicable named-
patient or other Section 21 authorisation and conditions; a general partner assertion is not enough.

The partner pack must also provide Precise Wellness's exact legal and pharmacy identity, Y-number,
responsible pharmacist, contracting role, sourcing authority, and accountable dispensing decision.
The clinical pack must include the approved questionnaire version, inclusion/exclusion rules,
contraindications, urgent red flags, consent, prescriber involvement, follow-up, adverse-event and
escalation process. The technical/operational pack must define the secure data hand-off, durable
decision record, access/audit/retention controls, supply-to-hub custody, dispatch, delivery,
exceptions, reconciliation, and support ownership.

The public “recovery, performance, and longevity” positioning requires product-specific clinical
and legal approval against the authorised products and indications.

### Regulatory finding for the proposed pairing

SAHPRA's public peptide-products notice explicitly lists BPC-157 and TB-500 among illegally marketed
peptides and states that a product intended to treat, prevent, or alter bodily functions must be
registered before sale in South Africa. The official-source search produced no evidence in this
audit that either proposed product is registered for Meneer's intended use. Absence from this audit
is not a definitive regulatory determination, but it blocks approval.

If the intended products are unregistered, the treating medical practitioner—not Meneer or the
patient—must establish and obtain the applicable Section 21 authority and accept the associated
clinical, monitoring, consent, safety-reporting, product, manufacturer, and supply obligations. If
product-specific registration or valid authority cannot be evidenced, BPC-157 and TB-500 must be
removed from the transactional pilot scope.

## Authoritative Verification Basis

- The [HPCSA practitioner search](https://www.hpcsa.co.za/Public/FindPractitioner) is the official
  verification route; HPCSA states that registration is a prerequisite for practising a registrable
  profession and scope must match training and conditions of practice.
- The [SAPC](https://www.sapc.za.org/) regulates pharmacists and pharmacy premises and provides the
  official pharmacist/pharmacy search.
- SAHPRA states that medicines available in South Africa must be registered or have the applicable
  authority; its [Section 21 guidance](https://www.sahpra.org.za/document/guideline-for-section-21-access-to-unregistered-medicines/)
  governs access to unregistered medicines.
- SAHPRA's [peptide-products public information](https://www.sahpra.org.za/peptide-products-public-information/)
  specifically names BPC-157 and TB-500 in its warning about illegally marketed peptides.
- [POPIA](https://www.gov.za/documents/protection-personal-information-act) requires accountable,
  risk-based technical and organisational safeguards; a marketing assertion is not implementation
  evidence.

## Closure Position

TD-006 and TD-007 are `In progress`, not `Verified`. They may close only when the evidence above is
attached or referenced, checked against the official registers/authorities, approved by the named
clinical, pharmacy, privacy/legal, security, commercial, and operations owners, and reconciled
against every public and MCP channel. Until then, the current gates remain mandatory.
