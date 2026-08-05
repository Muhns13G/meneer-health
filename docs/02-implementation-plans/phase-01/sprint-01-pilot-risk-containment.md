---
plan_id: phase-01-sprint-01
title: Pilot Risk Containment
status: planned
primary_debt:
  [TD-001, TD-002, TD-003, TD-004, TD-005, TD-006, TD-007, TD-008, TD-032, TD-033, TD-034, TD-056]
depends_on: []
last_updated: 2026-08-06
owner: unassigned
---

# Sprint 01 — Pilot Risk Containment

## Mission

Make every public and pilot-facing surface truthful and safe before deeper platform work. Define exactly what the controlled v1 pilot will enable, who may use it, what happens operationally, and which incomplete journeys must be removed, gated, or labelled as demonstrations or waitlists.

## Intended Outcome

No visitor can create a false account, accept placeholder consent, submit an empty clinical questionnaire, or receive confirmation for an action that was not durably completed. Broken acquisition assets and the unresolved peptide journey cannot mislead pilot participants. The pilot has an approved scope and stop/go gate distinct from public launch.

## Scope

Primary debt: TD-001–TD-008, TD-032–TD-034, and TD-056.

### Workstream 1 — Pilot scope and route disposition

1. Inventory every CTA, form, route, and implied operational hand-off.
2. Classify each as `functional`, `manually operated`, `waitlist`, `demonstration`, or `removed` for the pilot.
3. Record participant eligibility, invitation/control mechanism, operators, support channel, monitoring, incident escalation, success measures, stop criteria, and pilot exit criteria.
4. Prevent accidental public access to restricted pilot capabilities.

### Workstream 2 — Intake truthfulness and safety

1. Remove or gate password fields until approved identity exists.
2. Prevent placeholder consent and empty clinical-questionnaire submission.
3. Replace local-only success behaviour with an honest demonstration/waitlist state, or implement an approved durable server transaction with failure handling and a traceable identifier.
4. Add the approved minimum-age, location, urgent-symptom, exclusion, and emergency-redirection boundary for any enabled condition flow.
5. Verify refresh, back navigation, duplicate submission, network failure, and invalid input cannot result in false completion.

### Workstream 3 — Claims, legal surface, and peptides

1. Produce a channel-by-channel inventory of provider, POPIA, encryption, pharmacy, pricing, cancellation, consultation, delivery, and timing claims.
2. Remove or qualify unsupported claims until a claim register and approvers exist.
3. Disable consent/data collection while privacy, terms, and contact routes remain placeholders.
4. Obtain an explicit peptide disposition: remove, gate, waitlist, or proceed under approved clinical/legal conditions.
5. Remove placeholder destinations and contradictory peptide acknowledgements from any enabled journey.

### Workstream 4 — Broken acquisition assets

1. Recover and commit an owned optimised logo; remove dependence on the Lovable virtual asset path.
2. Remove empty video players or supply approved media, posters, captions, transcripts, and loading behaviour.
3. Replace poster QR placeholders with tested campaign QR assets, or remove the poster routes from pilot scope.
4. Verify assets in local and production-equivalent builds and print-test any retained poster.

## Required Decisions and Inputs

- Named product, clinical, legal/privacy, support, and release owners.
- Pilot participant definition and access method.
- Approved support and urgent-care wording.
- Decision on whether the pilot captures any health information.
- Peptide disposition and claims reviewers.
- Final owned logo and any approved campaign destinations.

If these inputs are unavailable, the safe resolution is to disable or clearly label the affected capability; the sprint must not invent clinical or legal content.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| TD-001 | Browser/network evidence that confirmation requires a durable success, or the route is clearly non-transactional.   |
| TD-002 | Placeholder consent is unavailable; any enabled consent has approved versioned capture and withdrawal evidence.     |
| TD-003 | Empty or incomplete questionnaires cannot submit; otherwise the questionnaire is removed/gated.                     |
| TD-004 | Password simulation is removed, or approved identity, recovery, verification, sessions, and rate limits are proven. |
| TD-005 | Approved policies/channels are published, or data collection is disabled.                                           |
| TD-006 | Claim inventory links every retained claim to evidence and an approver.                                             |
| TD-007 | Approved peptide disposition is reflected consistently across routes, navigation, metadata, and destinations.       |
| TD-008 | Safety entry rules and urgent/excluded-user paths are reviewed and tested for every enabled condition.              |
| TD-032 | Logo loads from an owned deployable asset in local, preview, and production-equivalent checks.                      |
| TD-033 | No empty player remains; retained media passes caption/transcript and browser checks.                               |
| TD-034 | Retained QR codes scan to approved attributed URLs under representative print conditions.                           |
| TD-056 | Signed pilot scope, release matrix, operating procedure, measures, incident path, and exit criteria exist.          |

## Validation

- Run `bunx tsc --noEmit` and `bun run build`.
- Run `bun run lint`; record known baseline failures until Sprint 04, but introduce no new violations.
- Exercise every CTA and affected route on desktop and mobile.
- Inspect browser network activity for every enabled submission and confirmation.
- Test invalid input, offline/network failure, duplicate actions, refresh, back navigation, and direct URL access.
- Scan retained printed QR codes using representative devices and print sizes.
- Confirm no patient or test-participant data appears in logs, screenshots, fixtures, analytics, or committed files.

## Non-Goals

- Building the complete patient, clinician, pharmacy, payment, or fulfilment platform.
- Inventing clinical questionnaires, eligibility rules, or legal text without accountable approval.
- Public launch or unrestricted acquisition.
- Implementing the final Next.js architecture.

## Risks and Rollback

The main risk is preserving conversion-oriented UI while leaving an implied workflow operationally false. Default to removal or gating when evidence is incomplete. Keep route/content changes reversible, record the previous behaviour, and retain a rapid disable switch for every newly enabled pilot path. If a privacy, safety, or support threshold is crossed, stop the affected journey and follow the approved incident process.

## Documentation and RAG Updates

- Add the approved pilot scope and route-disposition matrix.
- Update the blueprint if pilot scope changes the delivery programme.
- Update TD-001–TD-008, TD-032–TD-034, and TD-056 only after verification.
- Refresh `docs/RAG/01-project-context.md`, `02-current-state.md`, `05-decision-register.md`, `06-known-limitations.md`, and `07-index.json`.
- Produce `docs/03-completion-reports/phase-01/sprint-01-pilot-risk-containment.md`.
