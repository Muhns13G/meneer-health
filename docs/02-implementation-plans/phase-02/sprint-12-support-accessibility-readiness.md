---
plan_id: phase-02-sprint-12
title: Notifications, Support, and Live Accessibility Readiness
status: in-progress
primary_debt: [TD-037, TD-038, TD-043]
depends_on: [phase-02-sprint-09, phase-02-sprint-10, phase-02-sprint-11]
last_updated: 2026-10-06
owner: "@Muhns13G"
---

# Sprint 12 — Notifications, Support, and Live Accessibility Readiness

## Mission

DR-018 and the Sprint 10 intake amendment add first-party medical collection. Reconcile I5's
approved safety routing, accountable recipient, acknowledgement and failure/fallback evidence with
this sprint's support work. Generic support email or a qualified 24-hour response target must not
be represented as immediate emergency response. Notifications remain payload-free; verify the new
questionnaire's accessibility and protect medical answers from ordinary message channels.

Make the enabled pilot journeys understandable and supportable across client and staff roles.
Notifications must be generic and reliable, each support purpose must reach an accountable owner,
and the actual routed forms and stepped/asynchronous flows must receive live accessibility review.

## Commit-Sized Task Plan

Task 12.1's [notification contract](annexures/sprint-12-1-notification-contract.md) reconciles the
completed Sprint 9–11 baseline and freezes the conservative implementation packet. It is complete
at contract level. Task 12.2's [durable notifications](annexures/sprint-12-2-durable-notifications.md)
are implemented and verified locally; support coverage, staff follow-up, hosted delivery and live
accessibility evidence remain Tasks 12.5–12.9. Task 12.3's
[purpose support routing](annexures/sprint-12-3-purpose-support-routing.md) is implemented locally:
private coverage, purpose-specific current owners, secure receipts and human acknowledgement.
Missing/unverified coverage stays unavailable. No real pilot or hosted configuration is activated.
Task 12.4's [staff follow-up](annexures/sprint-12-4-staff-support-followup.md) is implemented locally:
purpose queues, minimal delivery review, immutable human responses and guarded requeue with
suppression, shared-budget and late-evidence containment. Hosted acceptance remains Task 12.8.
Task 12.5's [client-form accessibility packet](annexures/sprint-12-5-client-form-accessibility.md)
adds the controlled routed-form matrix and local VoiceOver review harness. Assisted review has
owner-confirmed email/code and profile/contact labels plus privacy-checkbox state. The owner's
subsequent VoiceOver and browser-zoom acceptance closes local Task 12.5. Released-flow and wider
TD-037 acceptance remain; neither is claimed complete from automated evidence alone.

Task 12.6's [journey announcements](annexures/sprint-12-6-journey-announcements.md) is locally
complete: controlled desktop/mobile pending, failure, retry, focus and progress checks pass,
with owner-confirmed representative VoiceOver pending/result acceptance. In-scope input/button
reuse and hydration defects are resolved. TD-038 stays Open for released-flow reconciliation.

Task 12.7's [staff accessibility packet](annexures/sprint-12-7-staff-accessibility.md) implements
local staff focus, contained table scrolling, expiry and private recovery. Automated evidence and
owner-confirmed representative staff VoiceOver/browser zoom close local Task 12.7 acceptance.
No client-only confirmation is reused. Tasks 12.8–12.10 remain; hosted/debt closure
is not inferred from intercepted presentation checks.

| Task  | Commit-sized outcome                                                                                                            | Gate           | Status               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------- |
| 12.1  | Freeze notification events, templates, recipients, privacy rules, resend/rate behaviour and delivery evidence.                  | Communications | Completed (contract) |
| 12.2  | Implement generic invitation, account, payment, hand-off, exception and support notifications with durable delivery status.     | Notifications  | Completed (local)    |
| 12.3  | Implement verified privacy, complaint and clinical/adverse-event routes with owner, hours, fallback and acknowledgement.        | TD-043         | Completed (local)    |
| 12.4  | Add staff follow-up and failed-delivery queues without exposing sensitive content to email providers.                           | Operations     | Completed (local)    |
| 12.5  | Verify every live client form by keyboard, zoom/reflow, reduced motion, forced colours and representative assistive technology. | TD-037         | Completed (local)    |
| 12.6  | Verify focus, progress, pending, success, failure and retry announcements across every live stepped/asynchronous journey.       | TD-038         | Completed (local)    |
| 12.7  | Verify staff queue accessibility, masking, session timeout and error recovery on desktop and supported mobile widths.           | Staff UX       | Completed (local)    |
| 12.8  | Exercise support delivery, failure, acknowledgement, escalation and emergency boundaries using synthetic content.               | TD-043         | In progress          |
| 12.9  | Reconcile TD-037, TD-038 and TD-043 only where live evidence satisfies their original acceptance criteria.                      | Debt           | Planned              |
| 12.10 | Issue the Sprint 12 completion report and update RAG/registry evidence.                                                         | All            | Planned              |

## Acceptance Gate

- No notification contains health information, provider tokens, protocol content or unnecessary
  personal data.
- Delivery failure creates an owned retry/escalation item rather than false success.
- Support purpose, expected response and emergency limitations are clear at every entry point.
- Automated accessibility results are supplemented by recorded live keyboard and representative
  assistive-technology review of the routed implementation.

## Validation

Run email/sender exercises, delivery failure and suppression tests, notification idempotency tests,
desktop/mobile Playwright and axe, manual accessibility review, support-route verification and the
full CI suite.
