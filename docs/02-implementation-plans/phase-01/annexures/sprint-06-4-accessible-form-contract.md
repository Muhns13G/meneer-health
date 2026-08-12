---
task: 6.4
status: completed
date: 2026-08-12
related_debt: [TD-037]
debt_status: open-manual-verification
---

# Sprint 06.4 — Accessible Form Contract

## Outcome

Task 6.4 corrects the form semantics in the preserved `/start` and `/peptides` prototypes without
making either prototype reachable. The current public gates still collect no patient, account,
consent, questionnaire, or clinical data, and approved customer-facing messaging is unchanged.

## Implemented Contract

- Every profile control has a stable ID/name and a programmatically associated label.
- Required state is native and visible; descriptions and field errors are connected through
  `aria-describedby`, while invalid controls expose `aria-invalid`.
- Name, email, telephone, and new-password autocomplete purposes are explicit. Email and telephone
  fields use matching input modes and retain bounded lengths.
- Shared validation rejects blank names, malformed email/telephone values, and passwords shorter
  than eight characters. It returns no error for a valid synthetic `.invalid` fixture.
- A visible `role="alert"` summary links each message to its invalid control. Correcting a value
  clears that field's recorded error.
- Consent checkboxes expose stable IDs, names, and required state. Condition-selection buttons are
  explicit non-submit buttons with pressed-state semantics.

## Evidence and Remaining Gate

Component tests prove label association, autocomplete/input-mode attributes, required state,
descriptions, invalid state, field errors, summary links, and valid/invalid outcomes. Existing gate
and full route axe tests continue to prove the active public surface remains non-transactional and
free of detected WCAG A/AA violations.

Task 6.5 completes the automated focus, progress, announcement, and Back-navigation contract. Task
6.11 must complete manual keyboard and representative screen-reader verification before TD-037 can
be marked Verified or either preserved form can be considered activation-ready.
