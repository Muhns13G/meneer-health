---
evidence_id: phase-02-sprint-08-7-support-channel-activation-contract
title: Pilot Support Channel Activation Contract
status: completed
task: 8.7
source_commit: d6df261
observed: 2026-10-02
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-009, TD-043]
---

# Sprint 08.7 — Pilot Support Channel Activation Contract

## Outcome

[DR-016](../../../07-decisions/DR-016-pilot-support-escalation-channels.md) approves these
purpose-specific aliases:

- `privacy@meneerhealth.co.za` for Meneer privacy and data-subject rights;
- `complaints@meneerhealth.co.za` for service and commercial complaints; and
- `clinical@meneerhealth.co.za` for provider-owned clinical/adverse-event routing.

The owner confirms that the aliases are created and active. On 2 October 2026, the configured Brevo
SMTP account accepted a payload-free synthetic message addressed to each alias, and the business
owner confirmed receipt of all three. The owner also approves no fixed mailbox hours and a target
to answer mail and queries within 24 hours where possible. Task 8.7 is complete at its Sprint 08
channel-contract and delivery-evidence boundary.

## Confirmed and Unconfirmed Evidence

| Requirement                   | Evidence available now                                            | Status                |
| ----------------------------- | ----------------------------------------------------------------- | --------------------- |
| Purpose-specific destinations | Owner confirms all three aliases are created and active           | Active                |
| Privacy ownership             | OCTOTHORP ZA legal/privacy role allocated by DR-012               | Role approved         |
| Complaint ownership           | OCTOTHORP ZA operations/complaints role allocated by DR-016       | Role approved         |
| Clinical ownership            | Must be the verified external clinical owner                      | Task 8.8 gated        |
| Availability and response     | No fixed hours; qualified 24-hour response target approved        | Approved              |
| SMTP acceptance               | Brevo accepted one payload-free synthetic message for every alias | Verified 2026-10-02   |
| Inbox receipt                 | Business owner confirms all three synthetic messages arrived      | Verified 2026-10-02   |
| Fallback                      | Safe policy approved; operational route not yet exercised         | Sprint 12.8 gated     |
| Public presentation           | Current unavailable wording remains accurate                      | Correctly fail closed |

## Activation Checklist

Before any unavailable label is removed from the public surface:

1. Record primary and alternate role holders privately; require MFA and individual access.
2. Verify the external clinical owner, escalation and after-hours handling.
3. Exercise an after-hours message and the approved fallback for each purpose.
4. Cause a controlled failure or suppression and prove an owned failure item is created.
5. Confirm ordinary email never contains identity evidence, health information, payment details or
   complaint content requiring a secure channel.
6. Implement the authenticated case/queue boundary and public purpose/availability/emergency
   wording without turning the qualified 24-hour target into a guarantee.
7. Repeat desktop/mobile, keyboard, screen-reader, failure-state and notification verification.

## Reconciliation

- No repository runtime or public content changed. The owner created the aliases outside the
  repository, and the payload-free Brevo messages verified transport and receipt.
- `support@meneerhealth.co.za` remains the only published Meneer email destination and remains
  general, non-sensitive and non-urgent.
- `112`, `10177` and the nearest emergency facility remain the only approved urgent routes.
- The Information Regulator complaint path remains an external privacy escalation option.
- Precise Wellness's public software-support addresses are not treated as patient-facing clinical
  or adverse-event channels.
- SMTP acceptance and owner-confirmed receipt are verified. Task 8.7 is complete at decision and
  delivery-evidence level, but TD-043 remains Open until Task 8.8 identifies the clinical owner and
  Sprint 12 proves routed handling, failure, acknowledgement, escalation and fallback operation.

## Deviation from the Original Task Order

The original Task 8.7 combined channel-contract and delivery evidence with routed operational
exercises that Sprint 12 owns. Task 8.7 closes the former; TD-043 remains Open for the latter. Task
8.8 and later build work may continue, but no affected journey may activate before the retained
activation checklist and Sprint 12 evidence pass.
