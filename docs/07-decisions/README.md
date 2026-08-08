---
document_id: decision-record-index
title: Decision Record Index
status: active
owner: "@Muhns13G"
last_updated: 2026-08-08
---

# Decision Record Index

## Purpose

This directory is the authoritative home for approved product, operating, architecture, data,
security, privacy, and delivery decisions. `docs/RAG/05-decision-register.md` routes readers to
decisions; it does not replace the records stored here.

## Record Lifecycle

Use `DR-NNN-short-title.md` and allocate identifiers sequentially from this index. Copy
[`decision-record-template.md`](templates/decision-record-template.md) for material decisions and
[`responsibility-matrix-template.md`](templates/responsibility-matrix-template.md) where ownership
or hand-offs are involved.

Allowed statuses are `draft`, `under-review`, `approved`, `superseded`, and `retired`. Only an
`approved` record is authoritative. Do not rewrite approved history: create a superseding record,
link both records, and assess implementation and migration effects.

Unknown information must be written as `[TBC — owner: ROLE — gate: EVENT]`. Do not invent people,
legal entities, registration numbers, prices, approvals, or operating evidence. Keep personal,
patient, credential, and other restricted information out of these records.

## Ownership and Approval

The repository owner owns this index, allocates IDs, records approvals, and controls Git history.
Each record must name one accountable role and the required approver roles. Clinical, legal/privacy,
security, commercial, operations, content, data, and release decisions require the applicable
domain approval; repository or implementation approval cannot substitute for it.

Approval evidence may be a repository-owner confirmation recorded in the document or a reference
to an approved external source. Record only the minimum necessary evidence and never commit private
source documents without explicit authorisation.

## Sprint 03 Register

| ID     | Planned record                                                                                          | Accountable role                | Task | Status   |
| ------ | ------------------------------------------------------------------------------------------------------- | ------------------------------- | ---- | -------- |
| DR-001 | [Operating model and responsibility matrix](DR-001-operating-model-responsibility.md)                   | Business owner                  | 3.2  | Approved |
| DR-002 | [Commercial and fulfilment model](DR-002-commercial-fulfilment-model.md)                                | Commercial owner                | 3.3  | Approved |
| DR-003 | [Platform boundaries and authoritative state](DR-003-platform-boundaries-authoritative-state.md)        | Architecture owner              | 3.4  | Approved |
| DR-004 | [Framework-neutral contracts and migration boundaries](DR-004-framework-neutral-contracts-migration.md) | Architecture owner              | 3.5  | Approved |
| DR-005 | [Data, tenancy, lifecycle, and migration model](DR-005-data-tenancy-lifecycle-migration.md)             | Data and privacy owners         | 3.6  | Approved |
| DR-006 | [Vendor evaluation and exit criteria](DR-006-vendor-evaluation-criteria.md)                             | Architecture and privacy owners | 3.6  | Approved |
| DR-007 | Identity and authorisation architecture                                                                 | Security owner                  | 3.7  | Planned  |
| DR-008 | [Governance ownership and approval workflow](DR-008-governance-ownership-approval.md)                   | Business owner                  | 3.2  | Approved |

## Required Maintenance

When a record changes status or is superseded, update this index, affected implementation plans,
the technical-debt registry where acceptance evidence exists, `docs/RAG/05-decision-register.md`,
and `docs/RAG/07-index.json` in the same task.
