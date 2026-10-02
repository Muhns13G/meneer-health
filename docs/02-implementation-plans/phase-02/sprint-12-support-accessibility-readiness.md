---
plan_id: phase-02-sprint-12
title: Notifications, Support, and Live Accessibility Readiness
status: planned
primary_debt: [TD-037, TD-038, TD-043]
depends_on: [phase-02-sprint-09, phase-02-sprint-10, phase-02-sprint-11]
last_updated: 2026-10-02
owner: "@Muhns13G"
---

# Sprint 12 — Notifications, Support, and Live Accessibility Readiness

## Mission

Make the enabled pilot journeys understandable and supportable across client and staff roles.
Notifications must be generic and reliable, each support purpose must reach an accountable owner,
and the actual routed forms and stepped/asynchronous flows must receive live accessibility review.

## Commit-Sized Task Plan

| Task  | Commit-sized outcome                                                                                                            | Gate           | Status  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------- |
| 12.1  | Freeze notification events, templates, recipients, privacy rules, resend/rate behaviour and delivery evidence.                  | Communications | Planned |
| 12.2  | Implement generic invitation, account, payment, hand-off, exception and support notifications with durable delivery status.     | Notifications  | Planned |
| 12.3  | Implement verified privacy, complaint and clinical/adverse-event routes with owner, hours, fallback and acknowledgement.        | TD-043         | Planned |
| 12.4  | Add staff follow-up and failed-delivery queues without exposing sensitive content to email providers.                           | Operations     | Planned |
| 12.5  | Verify every live client form by keyboard, zoom/reflow, reduced motion, forced colours and representative assistive technology. | TD-037         | Planned |
| 12.6  | Verify focus, progress, pending, success, failure and retry announcements across every live stepped/asynchronous journey.       | TD-038         | Planned |
| 12.7  | Verify staff queue accessibility, masking, session timeout and error recovery on desktop and supported mobile widths.           | Staff UX       | Planned |
| 12.8  | Exercise support delivery, failure, acknowledgement, escalation and emergency boundaries using synthetic content.               | TD-043         | Planned |
| 12.9  | Reconcile TD-037, TD-038 and TD-043 only where live evidence satisfies their original acceptance criteria.                      | Debt           | Planned |
| 12.10 | Issue the Sprint 12 completion report and update RAG/registry evidence.                                                         | All            | Planned |

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
