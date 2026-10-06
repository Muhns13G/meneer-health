---
plan_id: phase-02-sprint-12-6
title: Stepped and Asynchronous Journey Accessibility
status: completed-local-acceptance
last_updated: 2026-10-06
owner: "@Muhns13G"
depends_on: [phase-02-sprint-12-5]
---

# Task 2.12.6 — Journey Announcements

Baseline: Task 12.5 committed at `4ce0cdf`. This task verifies transitions, progress,
pending work, successful outcomes, failures and retry across actual routed journeys.
It does not activate hosted services or replace representative spoken-output acceptance.

## Required coverage

| Journey                          | Required states                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Invitation, sign-in and recovery | Email/code transition, pending, rejected code, retry, expiry                                        |
| Account activation               | Document/profile transition, validation, pending, failure, completion                               |
| Medical questionnaire            | Notice/eight sections/review, progress, invalid-field focus, save/submit uncertainty and retry      |
| Private account and rights       | Loading, failure, correction/request acknowledgement, retry, authority loss                         |
| Order and payments/refunds       | Loading, acknowledgement, pending, uncertainty, retry; no false payment/refund completion           |
| Support                          | Availability, pending, receipt, unavailable purpose, failure/retry, emergency alert, authority loss |

Staff-specific queue acceptance remains Task 12.7. TD-038 remains Open until the full
inventory and released acceptance evidence are reconciled; this packet closes local Task 12.6,
not the wider debt or Sprint 12.

## Implementation and acceptance

Support's persistent polite status region now exposes its existing “Checking…” wording
while work is pending, rather than leaving that region empty and relying only on a changed
disabled-button label. Completion/failure still focuses the result; pending work does not
steal focus. Approved messaging, request authority, retry keys and emergency routing are unchanged.

Unit checks cover pending announcement, disabled controls, restored controls, receipt/failure
focus and preserved idempotent retries.

Sign-in/recovery now focuses the newly displayed email/code input on step changes and the
status result after an unsuccessful or completed request. Its persistent status region uses
the existing “Checking…” wording while pending. Distinct input keys prevent React from
reusing the uncontrolled email input's value for the code field. This is a transition defect
correction, not new messaging or an Auth-policy change.

Invitation verification, sign-out, rights requests, order review, payment evidence and refund
requests now expose persistent pending/result regions and focus settled results. Verification
and sign-out buttons stay disabled until hydration attaches their handlers. Activation focuses
its durable completion; questionnaire transitions focus the current section/review/receipt
heading and expose named section progress. No focus is moved merely because work is pending.

Held, intercepted responses cover pending/failure/retry results without arbitrary sleeps or
provider contact. Order reload intentionally starts a fresh acknowledgement attempt; unchanged
support/rights retries preserve their key. Payment/refund checking and request receipts never
claim capture, refund settlement, provider receipt or clinical approval.

On 6 October 2026 the owner explicitly confirmed that VoiceOver pending and success/failure
result announcements are clear during local sign-in or support requests. This representative
spoken-output acceptance is distinct from Task 12.5's label/zoom acceptance and from release
acceptance. Staff-specific review remains Task 12.7; hosted/released reconciliation remains
Tasks 12.8–12.9. TD-038 remains Open for that wider scope.

Validation completed:

- Full deterministic suite: **129 files / 828 tests passed** (`bun run test -- --reporter=verbose`).
- Targeted component packet: **20 tests passed**; the updated medical transition suite separately
  passed **5 tests**, including section focus and no premature review.
- Clean, build-isolated desktop/mobile journey-announcement and shared-navigation run:
  **26 checks passed**. Expanded activation (**4**), questionnaire (**2**) and purpose-support
  (**4**) checks also passed. Earlier failures exposed input/button reuse and hydration issues,
  plus incorrect test fixtures/locators. One payment check interrupted by a build-time dev reload
  was rerun in the clean 26-check packet; it passes on both profiles.
- Strict TypeScript, ESLint, repository formatting, production build/client-bundle/MCP-absence,
  generated-route, portability and public-discovery checks passed. `git diff --check` is clean.
- Owner-confirmed representative local VoiceOver pending/results: accepted.

This is local routed implementation/acceptance evidence, not a new hosted-provider rehearsal or
the entire Sprint 12 final CI matrix. Tasks 12.7–12.10 remain. No new technical debt ID accrued;
the in-scope transition defects are resolved, while existing TD-038 retains its release boundary.

No Git staging, branch switch, hosted configuration, provider email, payment or database mutation
occurred.

## File inventory

| Change   | Files                                                                                                                                                               | Purpose                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Modified | `AccountCodePage.tsx`, `MedicalIntakePage.tsx`, `OrderReviewPage.tsx`                                                                                               | Step, progress and settled-result focus; pending feedback and input isolation.  |
| Modified | `PatientRightsPanel.tsx`, `PaymentStatusPanel.tsx`, `RefundPanel.tsx`, `SupportPanel.tsx`                                                                           | Persistent pending/result announcements without changing authority or outcomes. |
| Modified | `account/activate.tsx`, `account/verify.tsx`, `account/sign-out.tsx`                                                                                                | Completion focus and hydration-safe async controls.                             |
| Modified | `SupportPanel.test.tsx`, `MedicalIntakePage.test.tsx`, `identity-activation.spec.ts`, `medical-intake.spec.ts`, `patient-rights.spec.ts`, `purpose-support.spec.ts` | Focus, progress, pending and receipt regression checks.                         |
| Created  | `src/components/AccountCodePage.test.tsx`, `e2e/journey-announcements.spec.ts`                                                                                      | Component transitions and held-response desktop/mobile journeys.                |
| Created  | This annexure                                                                                                                                                       | Implementation, test, human acceptance and release boundaries.                  |
| Modified | Sprint 12 plan, Phase 02 README, debt registry, RAG current state/limitations/index                                                                                 | Consistent checkpoint routing; broader debt stays open.                         |

No dependency, schema, Worker binding or clinical/commercial policy change. The discovered
uncontrolled-input reuse and actionable pre-hydration controls were corrected within the planned
transition scope. The final-section advancing click previously reused a button that became a
submit control; separate keyed controls and prevention of that click's default action preserve
section focus without prematurely validating the unfilled declaration. The cold-dev activation
check waits for its actual denial response rather than
assuming SSR alone has completed the client request. New test fixtures must satisfy the existing
three-purpose support contract; failing malformed fixtures are not reasons to weaken validation.
