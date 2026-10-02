---
evidence_id: phase-02-sprint-08-5-minimum-client-profile
title: Minimum Client Profile, Data Rights and Staff Visibility
status: completed
task: 8.5
source_commit: c8404bb
observed: 2026-10-02
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-009, TD-016, TD-037, TD-038]
---

# Sprint 08.5 — Minimum Client Profile, Data Rights and Staff Visibility

## Outcome

[DR-014](../../../07-decisions/DR-014-minimum-client-profile-data-rights.md) approves the exact
minimum non-clinical profile that Sprint 9 may implement. It assigns a purpose and classification to
each field, fixes role-specific visibility, adopts DR-005 retention and rights treatment, and
explicitly excludes health, product, credential, address and free-text data from the profile.

Task 8.5 is complete as a decision/evidence task. It changes no runtime, database or hosted state.

## Approved Field Catalogue

The only client-entered profile values are:

- given name;
- family name;
- mobile/WhatsApp number, normalised to E.164; and
- operational contact preference: email or WhatsApp.

Verified email comes from managed identity confirmation rather than an independently editable
profile field. Internal subject/tenant IDs, verification status, lifecycle status, version and
timestamps are server-owned facts. Email is the required verified identity/recovery channel for the
pilot; operational WhatsApp preference is not marketing consent.

## Exclusion Boundary

The profile contains no password, identity number, birth date, age, sex/gender, address, condition,
symptom, medication, blood result, questionnaire answer, diagnosis, prescription, protocol,
product selection, card detail or free-text note. Delivery address belongs to a later approved
order/fulfilment record. Clinical intake remains with the verified external provider.

## Rights and Lifecycle Summary

| Control                   | Approved treatment                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Correction                | Authenticated, version-checked edits; contact change requires step-up and new-channel confirmation.                 |
| Export                    | Verified own-data export over a secure expiring channel; no other-subject or privileged security material.          |
| Restriction/objection     | Restrict disputed purpose during review and propagate the restriction to optional processing/projections.           |
| Closure/deletion          | Delete/de-identify profile/contact within 90 days unless a narrow obligation, open case or approved hold applies.   |
| Active retention          | While the pilot account is active; linked commerce/fulfilment records follow their own schedules.                   |
| Downstream reconciliation | Propagate correction/deletion to processors, caches, queues, notifications and restorable copies before completion. |

## Visibility Summary

- Clients receive their own complete minimum profile and rights actions.
- Assigned operations/support receive only the masked minimum projection needed for the case.
- Finance receives name only where required plus opaque payment/customer references.
- Privacy/audit and security roles receive purpose-bound reviewed projections.
- Administrators and release owners receive no routine profile visibility.
- Clinical/pharmacy/courier parties receive no direct profile access; later approved hand-off or
  delivery projections are separate records.

## Reconciliation with Existing Repository

- DR-005 already supplies the lifecycle and rights baseline.
- DR-007 already supplies the deny-default role/action model.
- DR-009's broad name/email/telephone data map is now narrowed by DR-014.
- The current Supabase foundation stores opaque subjects and verified contacts but has no approved
  client-profile table. Sprint 9.2 must add one through a portable migration.
- The preserved prototype's first-name/email/WhatsApp/password form is inaccessible and is not the
  approved implementation contract. Password storage is expressly prohibited.

## Retained Gates

DR-015 and Task 8.6 subsequently approve the instrument/version contract. Task 8.8 verified portal
workflow and the manual hand-off shape, but not the external provider's legal/professional identity
or agreement. Sprint 9 must implement and prove RLS, contextual access, versioned updates, rights
workflows, accessibility and false-success prevention. TD-009 remains In progress; TD-037 and
TD-038 remain Open despite Task 8.5 completion.

## Validation

This documentation-only decision was checked against the current profile prototype, Supabase
identity/contact schema, DR-005 lifecycle model, DR-007 role matrix, DR-009 data map, DR-012 party
allocation and the Sprint 9 plan. No source, migration, generated file, hosted service or public
message changed.
