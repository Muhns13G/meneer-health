---
task: 6.7
status: completed
date: 2026-08-12
related_debt: [TD-043]
debt_status: open-external-inputs
---

# Sprint 06.7 — Support and Emergency Routing

## Outcome

Task 6.7 publishes only support routes supported by current evidence. It does not create a contact
form, clinical service, complaint process, privacy office, service-level promise, or new external
integration.

## Implemented Contract

- A shared channel catalogue owns the exact `mailto:` and `tel:` destinations used across the
  public surface.
- General support is identified as an OCTOTHORP ZA channel monitored daily. Its scope is website
  access, ordinary enquiries, partnerships, and press; no urgent or clinical response time is
  promised.
- The contact page explicitly separates general support, privacy/data requests, complaints,
  clinical questions, and emergencies. It marks dedicated privacy, complaint, and clinical routes
  unavailable instead of publishing placeholders.
- A user may ask general support for secure privacy follow-up or route a non-sensitive website
  complaint, but ordinary email must not include identifiers, documents, health information,
  credentials, prescriptions, payment details, or request content.
- Mobile `112`, ambulance `10177`, and the nearest emergency facility remain the verified urgent
  routes. The current Privacy Notice and Website Terms repeat the same safe boundary.

## Evidence and Remaining Gate

Component tests prove the exact general/email and emergency/telephone links, unavailable-channel
labels, sensitive-data warning boundary, and absence of any form. Playwright verifies the contact,
privacy, and terms routing on both desktop and mobile alongside the complete route/axe matrix.

TD-043 remains Open. Closure still requires approved accountable privacy and complaint contacts plus
a monitored clinical/adverse-event channel with owner, hours, response expectations, fallback, and
operational delivery evidence. These are external activation inputs and were not fabricated for
this task.
