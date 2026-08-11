---
task: 5.15
title: Fulfilment Partner and Reconciliation Evidence
status: completed
completed_on: 2026-08-11
related_debt: [TD-007, TD-009, TD-010, TD-014, TD-015, TD-020]
---

# Sprint 05.15 — Fulfilment Partner and Reconciliation Evidence

## Outcome

Task 5.15 implements the inactive minimum-data boundary for Precise Wellness hand-off,
dispensing-pharmacy release, Meneer-hub custody, courier dispatch/delivery, cancellation, refund,
and fulfilment reconciliation. The canonical contract, application service, Supabase adapter,
forced-RLS ledger, inbox/outbox, append-only audit facts, and automatic workflow reconciliation are
locally verified. No customer route or real partner endpoint is enabled.

## Controls and Decisions

- `fulfilment.partner` accepts only opaque workflow/event identifiers, a provider-reference digest,
  a payload fingerprint, event type, environment, and timestamp.
- Raw provider bodies, questionnaire responses, symptoms, diagnoses, prescriptions, contact data,
  addresses, and tracking values have no persistence columns or contract fields.
- Provider/event ownership is strict. Active unexpired service identities require both exact
  `fulfilment:update` scope and explicit provider/environment binding.
- Local gates are `synthetic`; preview and production are database-constrained to `disabled`.
- Pathway hand-off, pharmacy release, hub custody, dispatch, and delivery remain independent.
  Out-of-order evidence is retained as pending reconciliation and never reports false success.
- Eligibility starts only after independent pathway, clinical, payment, stock, pharmacy, hub,
  cancellation, and refund prerequisites agree.
- Paid cancellation automatically requires refund reconciliation. A completed refund resolves the
  mismatch without restoring fulfilment eligibility or erasing event history.

## Validation Evidence

| Check                   | Result                                                                      |
| ----------------------- | --------------------------------------------------------------------------- |
| Focused Vitest          | 3 files / 33 tests passed                                                   |
| Full Vitest             | 39 files / 231 tests passed                                                 |
| Playwright              | 54 desktop/mobile browser checks passed                                     |
| Database reset          | All nine migrations and synthetic seed applied cleanly                      |
| pgTAP                   | 9 files / 293 assertions passed; 36 fulfilment-specific assertions          |
| Supabase integration    | Complete pathway → pharmacy → hub → courier flow passed                     |
| Replay and ordering     | Exact replay passed; changed replay and out-of-order delivery failed closed |
| Access and minimisation | Browser read/RPC denial and prohibited-field absence passed                 |
| Hosted boundary         | Preview and production provider gates remain disabled                       |
| Repository validation   | Lint, formatting, typecheck, build, dry-run, and dependency audits passed   |

## Debt Reconciliation

TD-014 and TD-015 are Verified for the repository-level inactive command and audit boundary now
that Tasks 5.14–5.15 cover payment and partner/fulfilment evidence. This does not activate a
transaction. TD-007, TD-009, and TD-010 still block real peptide, party, commercial, pharmacy, hub,
and courier operation. TD-020 remains In progress until hosted monitoring, alerts, provider
callbacks, reconciliation failure, and recovery controls are provisioned and exercised.

## Residual Owner Actions

Follow [`fulfilment-partner-reconciliation-runbook.md`](../../../06-operations/fulfilment-partner-reconciliation-runbook.md).
Supply the named partner/legal/clinical/pharmacy/operations particulars, approve the data hand-offs,
provision separate least-privilege service identities, implement authenticated real-provider
adapters, and record hosted failure/recovery evidence before enabling any non-local gate.
