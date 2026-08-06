---
plan_id: phase-01-sprint-01
title: Pilot Risk Containment
status: planned
primary_debt:
  [TD-001, TD-002, TD-003, TD-004, TD-005, TD-006, TD-007, TD-008, TD-032, TD-033, TD-034, TD-056]
depends_on: []
last_updated: 2026-08-06
owner: "@Muhns13G"
---

# Sprint 01 — Pilot Risk Containment

## Mission

Make every public and pilot-facing surface truthful and safe before deeper platform work. Define exactly what the controlled v1 pilot will enable, who may use it, what happens operationally, and which incomplete journeys must be disabled, gated, or converted to approved waitlists while their implementation is preserved pending replacement.

## Intended Outcome

No visitor can create a false account, accept placeholder consent, submit an empty clinical questionnaire, or receive confirmation for an action that was not durably completed. Broken acquisition assets and the unresolved peptide journey cannot mislead pilot participants. The pilot has an approved scope and stop/go gate distinct from public launch.

## Scope

Primary debt: TD-001–TD-008, TD-032–TD-034, and TD-056.

## Evidence Baseline

Use the
[pre-Phase 1 runtime investigation](../../01-audits/runtime-investigation-2026-08-06.md) as the
formal before-change browser, network, route, responsive, log, and MCP baseline. It records dated
evidence rather than acceptance: repeat its affected-route and submission matrix after containment
changes, and link the resulting evidence from the sprint completion report.

The [pilot route disposition](./annexures/sprint-01-pilot-route-disposition.md) is the
product/release-owner-approved task-level inventory and implementation boundary. Its approval
authorises containment implementation, not activation of capabilities still awaiting clinical,
legal/privacy, partner, or support/operations approval.

Task-level verification is recorded in the
[Sprint 01.2 incomplete-journey gate evidence](./annexures/sprint-01-2-incomplete-journey-gate-evidence.md).
It proves the gates at the working-tree boundary based on `f1e45c7`; the resulting repository-owner
commit becomes the accepted implementation boundary.

The focused
[Sprint 01.3 account and consent containment evidence](./annexures/sprint-01-3-account-consent-containment-evidence.md)
records the verified disabled outcomes for TD-002 and TD-004 at committed boundary `3c1ff01`.

The focused
[Sprint 01.4 false submission success containment evidence](./annexures/sprint-01-4-false-success-containment-evidence.md)
records the verified disabled outcomes for TD-001 and TD-003 at committed boundary `3c1ff01`.

The focused
[Sprint 01.5 claims and support evidence](./annexures/sprint-01-5-claims-support-evidence.md)
records the retained-copy boundary, claim register, support correction, and peptide catalogue
alignment. Sprint 01.5 is closed as a verified engineering boundary; TD-005, TD-006, and TD-007
remain open for the operational and domain work that was not completed in this task.

The focused
[Sprint 01.6 acquisition assets evidence](./annexures/sprint-01-6-acquisition-assets-evidence.md)
records the verified local placeholder logo replacement, safe media-review boundary, continued
poster gate, and desktop/mobile browser evidence. Sprint 01.6 is closed as a verified local
engineering boundary; hosted-platform, final-media, and QR acceptance work remains open under
TD-032–TD-034.

## Confirmed Owner Direction

- The marketing site is public; transactional pilot access is restricted to the enrolled cohort.
- Pilot users are real customers. Enabled registration, intake, payment, order, and fulfilment
  journeys must be durable and operational; demonstrations and false-success states are not allowed.
- Peptides are the first intended v1 rollout product. Their intended pathway is Precise Wellness's
  questionnaire and dispensing mechanism rather than Meneer's ordinary clinician-approval flow.
  This is owner-supplied operating direction, not verified legal or regulatory evidence. The
  transaction remains gated until the exact products, partner authority, questionnaire controls,
  data hand-off, dispensing basis, and escalation route are documented and approved. Transactional
  gating must not be represented as the product being "coming soon."
- General support uses `support@meneerhealth.co.za`, subject to monitored-channel and escalation
  verification.
- Payments are intended through a separate standalone Meneer Stripe account inside the parent
  company's Stripe Organization, not Stripe Connect. Live use remains subject to account activation
  and accurate business-model review.
- Supported commercial scenarios are consultation-only, medication plus delivery, and an approved
  bundle. Exact prices, payment timing, cancellation, refund, and decline rules remain to be approved.
- Precise Wellness supplies approved orders to Meneer; Meneer dispatches from its distribution hub
  to the customer. The provisional fulfilment target is 3–5 business days, with its start event and
  public wording still requiring operational approval.
- An owned logo exists and will be supplied separately; remaining campaign assets require work.

### Workstream 1 — Pilot scope and route disposition

1. Inventory every CTA, form, route, and implied operational hand-off.
2. Classify each as `functional`, `manually operated`, `waitlist`, `restricted`, or `disabled` for the
   pilot; no customer-facing transaction may remain a demonstration.
3. Record participant eligibility, invitation/control mechanism, operators, support channel, monitoring, incident escalation, success measures, stop criteria, and pilot exit criteria.
4. Prevent accidental public access to restricted pilot capabilities.

### Workstream 2 — Intake truthfulness and safety

1. Disable or gate password fields until approved identity exists; preserve the existing implementation until its replacement is verified.
2. Prevent placeholder consent and empty clinical-questionnaire submission.
3. Replace local-only success behaviour with an honest demonstration/waitlist state, or implement an approved durable server transaction with failure handling and a traceable identifier.
4. Add the approved minimum-age, location, urgent-symptom, exclusion, and emergency-redirection boundary for any enabled condition flow.
5. Verify refresh, back navigation, duplicate submission, network failure, and invalid input cannot result in false completion.

### Workstream 3 — Claims, legal surface, and peptides

1. Produce a channel-by-channel inventory of provider, POPIA, encryption, pharmacy, pricing, cancellation, consultation, delivery, and timing claims.
2. Preserve established customer-facing messaging and record evidence gaps in a claim register.
   Change public wording only when a statement is demonstrably false, unsafe, or inconsistent with
   the approved operating model; missing repository evidence alone does not authorise a rewrite.
3. Disable consent/data collection while privacy, terms, and contact routes remain placeholders.
4. Document the proposed Precise Wellness questionnaire pathway separately from clinician-approved
   testosterone and other prescription pathways.
5. Verify each intended peptide by active ingredient, formulation, route, registration/scheduling
   status, supplier/dispenser authority, questionnaire owner, exclusions, escalation, adverse-event
   handling, and auditable outcome before enabling it.
6. Disable placeholder destinations and contradictory peptide acknowledgements in every enabled journey while preserving their implementation for traceable replacement.

### Workstream 4 — Broken acquisition assets

1. Recover and commit an owned optimised logo; retire dependence on the Lovable virtual asset path only after replacement verification.
2. Hide empty video players until approved media, posters, captions, transcripts, and loading behaviour are supplied and verified.
3. Keep poster routes undistributed and disabled until their QR placeholders are replaced with tested campaign assets.
4. Verify assets in local and production-equivalent builds and print-test any retained poster.

## Required Decisions and Inputs

- Named product, clinical, legal/privacy, support, and release owners.
- Cohort enrolment and transactional access method.
- Approved support and urgent-care wording.
- Decision on whether the pilot captures any health information.
- Exact proposed peptide products and Precise Wellness evidence covering registration/scheduling or
  other dispensing basis, licences/authority, questionnaire governance, accountable decision-maker,
  data transfer, escalation, and claims review.
- Final owned logo and any approved campaign destinations.
- Exact treatment scope, prices, consultation rules, refunds/cancellations, payment timing, Stripe
  account activation evidence, and the event that starts the 3–5-business-day fulfilment target.
- Confirmed Precise Wellness, distribution-hub, courier, stock/custody, exception, and reconciliation
  responsibilities.

If these inputs are unavailable, the safe resolution is to disable or clearly label the affected capability; the sprint must not invent clinical or legal content.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------ |
| TD-001 | Browser/network evidence that confirmation requires a durable success, or the route is clearly non-transactional.        |
| TD-002 | Placeholder consent is unavailable; any enabled consent has approved versioned capture and withdrawal evidence.          |
| TD-003 | Empty or incomplete questionnaires cannot submit; otherwise the questionnaire is disabled/gated.                         |
| TD-004 | Password simulation is inaccessible, or approved identity, recovery, verification, sessions, and rate limits are proven. |
| TD-005 | Approved policies/channels are published, or data collection is disabled.                                                |
| TD-006 | Claim inventory links every retained claim to evidence and an approver.                                                  |
| TD-007 | Approved peptide disposition is reflected consistently across routes, navigation, metadata, and destinations.            |
| TD-008 | Safety entry rules and urgent/excluded-user paths are reviewed and tested for every enabled condition.                   |
| TD-032 | Logo loads from an owned deployable asset in local, preview, and production-equivalent checks.                           |
| TD-033 | No empty player remains; retained media passes caption/transcript and browser checks.                                    |
| TD-034 | Retained QR codes scan to approved attributed URLs under representative print conditions.                                |
| TD-056 | Signed pilot scope, release matrix, operating procedure, measures, incident path, and exit criteria exist.               |

## Planned Commit Boundaries

Use these as review boundaries, combining or splitting only when required to keep an honest,
buildable intermediate state:

1. [x] `Document pilot route disposition` — committed in `2ca211d`.
2. [x] `Gate incomplete pilot journeys` — committed in `3c1ff01`.
3. [x] `Disable simulated account and consent flows` — satisfied by `3c1ff01`; focused registry
       evidence recorded in the current boundary.
4. [x] `Prevent false submission success states` — satisfied by `3c1ff01`; focused registry evidence
       recorded in the current boundary.
5. [x] `Correct pilot claims and support surfaces` — Sprint 01.5 closed with verified evidence;
       unfinished policy, claim-approval, support-operation, and peptide-activation work remains
       open under TD-005, TD-006, and TD-007.
6. [x] `Repair acquisition assets` — permanent implementation boundary recorded in Sprint 01.6
       evidence; final logo visual verification, approved video accessibility assets, and tested
       campaign QR codes remain open under TD-032–TD-034.
7. [ ] `Complete Sprint 1 verification and reporting`

Each commit should contain its directly related validation and documentation. Do not mix unrelated
formatting, dependency, or generated-file changes into these boundaries. The repository owner stages,
commits, and pushes after reviewing each completed outcome.

## Validation

- Run `bunx tsc --noEmit` and `bun run build`.
- Run `bun run lint`; record known baseline failures until Sprint 04, but introduce no new violations.
- Exercise every CTA and affected route on desktop and mobile.
- Inspect browser network activity for every enabled submission and confirmation.
- Compare post-change route, network, log, responsive, and MCP results with the dated runtime
  baseline; explain intentional differences and investigate unexpected ones.
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
