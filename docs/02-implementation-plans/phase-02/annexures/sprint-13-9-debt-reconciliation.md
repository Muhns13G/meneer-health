---
plan_id: phase-02-sprint-13-9
title: Sprint 13 Debt and Activation Gate Reconciliation
status: completed-reconciliation
last_updated: 2026-10-08
owner: "@Muhns13G"
primary_debt: [TD-006, TD-007, TD-009, TD-010, TD-037, TD-038, TD-043, TD-064, TD-065]
---

# Task 2.13.9 — Debt Reconciliation

## Boundary

Review the [13.1 contract](sprint-13-1-rehearsal-contract.md), Sprint 12's
[debt reconciliation](sprint-12-9-debt-reconciliation.md), the
[registry](../../../04-technical-debt/technical-debt-registry-v1.md), and recorded 13.2–13.8
evidence against original acceptance criteria. The checkout remains `itws-I` at
`2b8d199360e44c6ec2c9e68505958c4502c0896e`; the earlier closure-document edits are preserved.
This task completes reconciliation, not resolution of every debt or pilot activation.
No hosted mutation, new fixture, email, charge, subscription or Git operation is performed.

## Transferred Debt Matrix

| Debt   | Accepted evidence                                                                                                                                                   | Remaining outcome and disposition                                                                                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-006 | Versioned canonical claims, exact variants, evidence/approval requirements and fail-closed publication mechanics.                                                   | **In progress / still gated.** Named domain evidence and clinical, privacy/legal, commercial, operational and release approvals remain required per published claim. Product-owner wording approval is not all-domain approval.                                                                                                         |
| TD-007 | Candidate catalogue and guarded synthetic commercial/transfer implementation.                                                                                       | **In progress / still gated.** Product-specific authority, professional/pharmacy authority and prescribing/dispensing/custody/courier/safety approvals remain mandatory before products transact. Nothing is scope-removed merely because generator activation is deferred.                                                             |
| TD-009 | 13.3 hosted onboarding, 13.4 assignment/funding, 13.5 protected preparation/manual-transfer/reconciliation and exact cleanup.                                       | **In progress / still gated.** Actual contracts, accountable professionals, privacy allocation, reviewed publications/recipients and operational rights handling remain. Current generator entitlement and mapping/output compatibility are required only before manual generation/transfer, not replaced by synthetic acknowledgement. |
| TD-010 | Real sandbox capture/signed settlement, credit/refunds and hosted exception/recovery evidence.                                                                      | **In progress / still gated.** Real approved private RRP/rates, tax/invoice/supplier treatment, provider acceptance of the truthful business model, immutable terms, financial authority and owner release approval are not established by sandbox fixtures.                                                                            |
| TD-037 | 13.8 automated inventory plus fresh owner-confirmed desktop VoiceOver, actual 200%/400% zoom and phone screen reader on both local and latest canonical deployment. | **Open / evidence granularity remains.** Individual released private-form observations and exact device/browser/AT/version references are unrecorded. Keep the original exhaustive released-inventory criterion; task-level representative acceptance is not blanket debt verification.                                                 |
| TD-038 | Stepped focus/pending/result/retry/expiry automation, hosted journey evidence and the same fresh manual acceptance.                                                 | **Open / evidence granularity remains.** Record flow-specific spoken transitions, validation, retry/uncertainty and authority-loss outcomes across the original inventory. Generic “works” does not independently establish every transition.                                                                                           |
| TD-043 | Real inbox receipt, scoped support/notification journals, genuine AAL2 response, failure/suppression/alternate handling and exact cleanup.                          | **Open / operationally gated.** Actual purpose-specific and clinical primary/alternate appointments, approved deadlines/coverage/absence/fallback, unattended authenticated provider push, quota/headroom and released support acceptance remain. Recovery responders do not automatically constitute clinical/support appointments.    |

Sources: [13.3](sprint-13-3-onboarding-rehearsal.md),
[13.4](sprint-13-4-assignment-payment-rehearsal.md),
[13.5](sprint-13-5-protocol-bridge-rehearsal.md),
[13.6](sprint-13-6-recovery-rehearsal.md),
[13.7](sprint-13-7-evidence-reconciliation.md),
[13.8](sprint-13-8-quality-accessibility.md). Historical stopped attempts and synthetic versus
provider observations remain labelled; none is retroactively described as successful.

## All Registry Items and New Findings

All 63 pre-review IDs are accounted for. Verified historical scope is retained for TD-001–005,
TD-008, TD-011–036, TD-039–042 and TD-044–063: **56 Verified**. The seven transferred items above
remain non-Verified. This is a registry-wide evidence review, not a fresh replay of every historical
test. No existing ID is repurposed and no capability is declared scope-removed.

Two previously explicit limitations now receive immutable actionable IDs:

- **TD-064 — remaining intentional business conflicts use serialization SQLSTATE.** Static source
  inspection confirms `patient_intake_restrict` has two `40001` conflict raises and
  `respond_medical_safety` has four. The latest defining migrations are
  `20261005115607` and `20261005134411`; the 13.3–13.5 patches target different named functions.
  The intake adapter/HTTP mapper recognises `40001`, but cannot prevent upstream database/API
  retry handling before a response reaches it. This is not proof of a newly induced hosted 503.
  Inventory the latest executable definitions, including refund/commerce/alert and retained legacy
  paths; separate superseded or disabled code from reachable commands. Correct only intentional
  permanent conflicts, preserving genuine serialization handling, security metadata, guards and
  atomicity. Require local stale/replay/unchanged-state tests, separately approved hosted changes,
  owner deployment and fresh routed conflict proof/cleanup before verification. System Architect
  owns this **Open P1** item, before enabling affected commands.
- **TD-065 — Auth/private Storage recovery coverage.** `governedRecoverySchemas` covers nine
  application schemas, not `auth` or `storage`; object bytes are not a PostgreSQL logical export.
  13.7's successful encrypted application restore and hourly dispatcher do not establish complete
  client identity/upload recovery. System Architect and alternate Product Owner own this
  **Open P1 pre-intake gate**. Decide and prove a secure identity recovery/relink and MFA/session
  revocation procedure, plus private-object/metadata recovery where uploads are enabled (or
  explicitly remove uploads from the launch scope). Record isolation, custody, dependencies,
  restore/reconciliation and a bounded recovery objective. Existing recovery acceptance remains
  Verified within its original scope; do not silently broaden TD-020 or export additional sensitive
  schemas without an approved design and hosted authority.

Totals after registration: **65 items — 56 Verified, nine non-Verified**. TD-060–063 remain Verified
only for their exact corrected functions/workflow. The ENOSPC browser artifact failure has a
successful exact retest and is retained as workstation history, not newly unresolved product debt.
Dispatcher fixes have observed scheduled acceptance; ongoing cadence/token/incident response are
operational obligations, not an implied guaranteed hourly RPO.

## Release Handoff

13.9 is completed as reconciliation. **13.10 must issue an explicit scoped go/no-go**, not assume
that completing engineering tasks authorises intake. The real pilot remains suspended. For an
onboarding-only launch, identify which claims, publications, support, identity/recovery and medical
collection capabilities are allowed and resolve their applicable gates first. Product transactions
and generator-dependent transfer remain unavailable until their separate requirements pass.
No paid subscription, live payment or real client admission is authorised here.

Validation is documentation/source reconciliation, formatting, link/index resolution and whitespace
checks. Prior 13.8 regression counts and owner-reported CI are dated evidence, not fresh tests in
this task. No schema, runtime, clinical wording, dependency or hosted configuration is changed.
