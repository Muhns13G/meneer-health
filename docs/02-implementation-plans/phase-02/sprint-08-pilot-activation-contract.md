---
plan_id: phase-02-sprint-08
title: Pilot Activation Contract and Hosted Baseline
status: planned
primary_debt: [TD-006, TD-007, TD-009, TD-010, TD-043]
depends_on: [DR-010, phase-01-technical-debt-stabilisation]
last_updated: 2026-10-02
owner: "@Muhns13G"
---

# Sprint 08 — Pilot Activation Contract and Hosted Baseline

## Mission

Resolve the decisions and external inputs that determine what the pilot is legally, commercially
and operationally allowed to do, then establish a documented clean hosted baseline. This sprint
prevents implementation from embedding guessed profile fields, prices, parties, support routes or
peptide authority.

## Commit-Sized Task Plan

| Task | Commit-sized outcome                                                                                                                                                    | Gate              | Status  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------- |
| 8.1  | Rebaseline Phase 02 against DR-010, current hosted state and transferred debt; freeze the sequence and non-goals.                                                       | All               | Planned |
| 8.2  | Decide the pilot product/pathway: evidence the authorised peptide route or remove affected products and transactional claims from scope.                                | TD-006, TD-007    | Planned |
| 8.3  | Approve the named contracting, operator, privacy, clinical, pharmacy, protocol, hub, courier and escalation responsibilities.                                           | TD-009            | Planned |
| 8.4  | Approve pilot prices, line items, merchant/tax/invoice treatment, cancellation, refund, dispute and fulfilment rules.                                                   | TD-010            | Planned |
| 8.5  | Approve the minimum client-profile fields, purposes, classifications, retention, correction/export/deletion treatment and staff visibility.                             | TD-009            | Planned |
| 8.6  | Approve versioned terms, privacy acknowledgement and any consent required before identity, payment or hand-off.                                                         | TD-009, TD-010    | Planned |
| 8.7  | Verify dedicated privacy, complaint and clinical/adverse-event channels, owners, hours, delivery and fallback behaviour.                                                | TD-043            | Planned |
| 8.8  | Inspect the protocol portal with its owner and record whether patient links, export, status, API or webhook capabilities exist; retain manual hand-off unless verified. | TD-007, TD-009    | Planned |
| 8.9  | Perform an authorised hosted synthetic reset/reseed, run database/security advisors, reconcile migrations and record the pilot tenant baseline.                         | Hosted activation | Planned |
| 8.10 | Reconcile decisions, registry/RAG and issue the Sprint 08 completion report.                                                                                            | All               | Planned |

## Acceptance Gate

- No placeholder person, registration, price, tax, responsibility or channel is treated as real.
- Every enabled Phase 02 field and workflow has a named purpose, owner and minimum-data rule.
- The product/pathway decision is explicit. An unresolved TD-007 keeps peptide transactions gated.
- Hosted state contains only the approved pilot baseline and no accidental test identities or data.
- A protocol capability is treated as available only after authenticated owner-assisted verification.

## Non-Goals

- Implementing accounts, profiles, payment pages or staff tooling.
- Uploading confidential source documents to Git.
- Enabling live payment, health intake, prescribing, fulfilment or public claims.
- Selecting Laravel/React, Next.js or another successor architecture.

## Validation

Run the existing database/security suites and hosted-safe negative checks after baseline preparation.
Retain redacted evidence for hosted advisor results, migration parity, zero unintended Auth users,
anonymous denial and disabled preview/provider gates.
