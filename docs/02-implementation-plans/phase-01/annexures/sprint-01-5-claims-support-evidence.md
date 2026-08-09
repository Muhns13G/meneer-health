---
artifact_id: phase-01-sprint-01-5-claims-support-evidence
title: Sprint 01.5 Claims and Support Evidence
status: verified-task-evidence
authority: repository-observed-and-owner-confirmed
last_updated: 2026-08-06
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Sprint 01.5 — Claims and Support Evidence

## Decision Boundary

Existing customer-facing messaging is intentional product copy and remains unchanged unless a
specific statement is demonstrably false, unsafe, or inconsistent with the approved operating
model. Missing repository evidence creates a verification task; it does not, by itself, authorise a
rewrite. Product/release approval to retain copy is not a substitute for clinical, legal/privacy, or
operational approval of the underlying claim.

Peptides are the first intended v1 rollout product. The current `/peptides` transaction remains
gated while its real questionnaire and operational hand-off are implemented and approved. Gating the
transaction does not make the product "coming soon" and does not justify removing it from public
marketing.

## Retained Claim Register

| Claim family                                                                 | Current public channels                                               | Disposition                     | Evidence still required                                                                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| HPCSA-registered and real doctors                                            | Homepage metadata, `TrustStrip`, `Doctor`, `HowItWorks`, posters, MCP | Retain at owner direction       | Practitioner roster, registration checks, contracting role, clinical approval and review cadence                    |
| POPIA compliance                                                             | `Discretion`, `TrustStrip`, privacy notice, posters, MCP              | Retain at owner direction       | Responsible party/operator roles, approved policy, information-officer controls and compliance review               |
| Encryption and limited sharing                                               | `Discretion`                                                          | Retain at owner direction       | Data-flow inventory, encryption controls, access/sharing matrix, vendor contracts and security approval             |
| Licensed local pharmacy                                                      | `HowItWorks`                                                          | Retain at owner direction       | Named pharmacy, licence verification, dispensing responsibility and partner approval                                |
| Free consultation if treatment is unsuitable                                 | `Doctor`                                                              | Retain at owner direction       | Approved pricing and clinical-rejection rules                                                                       |
| Cancellation without a call                                                  | `Benefits`                                                            | Retain at owner direction       | Approved cancellation, refund and subscription rules                                                                |
| Five-minute intake, weekend treatment, evenings/weekends and 48-hour service | `CtaSection`, `HowItWorks`, `TrustStrip`, MCP                         | Retain at owner direction       | Defined start/end events, staffing model, service-level owner and measured performance                              |
| Discreet packaging and delivery                                              | Homepage metadata and components, posters, MCP                        | Retain at owner direction       | Pharmacy, hub, courier, packaging, custody and exception procedures                                                 |
| Peptide treatment positioning                                                | Homepage treatment card, peptide metadata, navigation, MCP            | Retain as first-rollout product | Exact products, regulatory/dispensing basis, partner authority, questionnaire governance, exclusions and escalation |

The regulatory basis for verification includes the HPCSA's telehealth guidance, POPIA section 19
security safeguards, and the Pharmacy Act and medicines requirements administered by SAPC/SAHPRA.
Final claim approval must come from Meneer's accountable domain owners rather than this engineering
artefact.

## Support Correction

`/contact` now publishes the owner-confirmed `support@meneerhealth.co.za` address as a working
`mailto:` link. The unsupported `hello@meneer.co.za` address, promised future form, and instruction
to use a non-existent doctor WhatsApp thread were removed. The page identifies the inbox as
non-emergency; mailbox monitoring, privacy handling, response expectations and escalation remain
operational release gates.

## Channel Consistency

The MCP treatment catalogue now includes peptides using the existing homepage and route wording.
No homepage component, homepage metadata, privacy notice, terms notice, poster claim, or existing MCP
claim was rewritten in this task.

## Completed Implementation

- Corrected `/contact` to publish `support@meneerhealth.co.za` as a working `mailto:` destination.
- Removed the unsupported `hello@meneer.co.za` address, future-form promise, and doctor-WhatsApp
  support instruction.
- Added peptides to the public MCP treatment catalogue using existing approved site wording.
- Recorded the retained-copy rule and first-rollout peptide position in the sprint plan, route
  disposition, decision register, limitations, technical-debt registry, and RAG index.
- Made no changes to homepage components, homepage metadata, privacy/terms wording, posters, or
  existing trust claims.

## Verification

- `bunx tsc --noEmit`: passed.
- `bun run build`: passed with the known Cloudflare/Nitro warnings assigned to Sprint 02.
- Focused ESLint for the two changed runtime files: passed.
- Full `bun run lint`: existing baseline remains 32 errors and 7 warnings; neither changed runtime
  file appears in the failures.
- Runtime `/contact`: rendered the support `mailto:` link and non-emergency boundary.
- Runtime MCP `list_treatments`: returned peptides first with the established product wording.
- Homepage working-tree diff: none.

## Technical Debt Position at Sprint 01.5 Closure

- TD-005 was open at this boundary for approved, versioned policies and monitored support
  procedures. It was later Verified through Sprint 01.9 website-only containment; transactional
  policy and support requirements remain activation prerequisites.
- TD-006 was open until each retained claim received its domain evidence and accountable approver;
  Sprint 01.10 moved it to `In progress` with an exact close-out pack.
- TD-007 was open at the transactional boundary until the exact peptide pathway was evidenced and
  approved; Sprint 01.10 moved it to `In progress` while retaining its owner-confirmed first-rollout
  product position.

Sprint 01.5 is closed as a verified containment, consistency, and documentation task. Closure does
not resolve or waive the open activation work above.
