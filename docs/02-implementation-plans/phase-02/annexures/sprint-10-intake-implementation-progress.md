---
evidence_id: phase-02-sprint-10-intake-implementation
status: in-progress
last_updated: 2026-10-05
tasks: [2.10.I2, 2.10.I3, 2.10.I4, 2.10.I5, 2.10.I6, 2.10.I7, 2.10.I8]
---

# Intake Implementation Progress and Verification

The owner requested I2–I8 as one continuous implementation run, retaining owner-only Git staging,
commit, branch and release control. I2–I7 have accepted local implementation evidence; I8 remains open.
I1 is committed; the original questionnaire and separately attributed sex extension remain fixed.

## Current Checkpoints

- I2 local schema adds a separate deny-default `intake_private` boundary, encrypted draft records,
  immutable submitted snapshots, distinct publication notice receipts, private medical grants,
  safety/transfer/reconciliation/lifecycle evidence and payload-free central audit. Generated local
  migrations cover foundation, governance, rights/recovery, safety restriction, restricted safety
  grants and exact-record audit attribution. On 5 October, the owner-approved CLI push applied all
  six intake migrations plus `20261005074014_patient_case_status_projection.sql` to hosted Supabase.
  Migration history now matches all 35 committed versions; no seed or activation was applied.
- Portable `medical-intake.record@1`, strict answer/disposition/envelope schemas, source catalogue,
  dedicated AES-GCM scope binding and candidate-key HMAC replay handling are implemented.
- The three rollback-only intake packets pass **95 SQL assertions**. Published notice immutability,
  own scope, replay/stale-version denial, submitted amendment history, independent grants,
  provider-copy disposition, restriction/hold precedence and offline restore quarantine are covered.
- I3 patient RPC/service/HTTP commands implement resume, immediate restriction, separately authorised
  retained-data export and submitted-version history, with fresh authority checks.
  Collection remains explicitly disabled by default; source publication, existing account authority,
  exact notice acknowledgement and fresh session checks precede collection.
- I4 private `/portal/intake` and `/staff/intake` interfaces are implemented. Controlled Playwright
  desktop/mobile checks pass through all eight sections, branching, review, submission, accessibility
  scans and hidden-state clearing. These intercept transport and do not prove provider-backed Auth.
- I5 implements generic safety notifications, retry/uncertain-delivery handling and clinical response
  receipts. Restriction does not silently cancel an unresolved hold or its existing independently
  approved safety grant; ordinary review/transfer remain denied.
- I6 implements snapshot/field/purpose grants, independent security activation, manual-transfer
  receipts and independent reconciliation. The real deposit dependency remains closed.
- I7 implements held retention/disposition boundaries, independent provider-copy disposition evidence,
  own retained export and offline restore quarantine/current-ledger reconciliation. The actual local
  encrypted backup/restore exercise reconciles **54 records**, including private intake tables.
- Strict TypeScript, ESLint, formatting, generated Cloudflare types and local security/performance
  advisors pass. The final Vitest run passes **651 tests across 106 files**. All **35 migrations**
  replay and the full database suite passes **1,003 assertions across 25 packets**. Production build,
  client-bundle/MCP-absence scans and portability/discovery checks pass. SQL lint found an implicit
  JSON cast and unused variable in the unreleased audit migration; both were corrected and replayed.
  A pre-existing implicit `text`-to-`text[]` initialisation warning in
  `public.execute_patient_account_command` is separate from intake and is not silently waived as
  warning-free schema evidence. An earlier full browser matrix was **not accepted**: 42 checks passed before
  an existing account-activation case exceeded its 30-second test deadline while awaiting the
  intercepted retry response. The run was stopped (one later case interrupted, 136 not run).
  A separate account rerun could not start because local SSR requests timed out and the managed
  server exceeded its 120-second readiness deadline. No production defect or resource root cause
  is asserted, and no application safeguard or timeout was weakened. Intake-specific desktop/mobile
  proof remains passed; broader regression acceptance remains open pending a clean rerun.
  After stopping the completed local database services, a final isolated desktop rerun passed the
  original retry/durable-success case, but the denial case was still showing “Loading account
  documents…” at its five-second assertion deadline (the server logged the expected denial).
  Those attempts were not successful full regression runs. Local database volumes were retained on
  shutdown. The subsequent clean rerun on 5 October passes **180/180 desktop/mobile checks in 6.9
  minutes**; a separate focused account/intake rerun passes all six checks. No application safeguard,
  assertion or timeout was weakened. The current full local browser regression is accepted.
- I8 hosted Auth/browser/notification delivery and scoped cleanup are **not accepted or completed**.
  Post-migration read-only checks confirm one suspended tenant, zero subjects/external identities/Auth
  users and zero rows in all 18 intake tables. All 18 tables have forced RLS; none is readable by
  `anon` or `authenticated`. No live patient intake is activated.

## Hosted Advisor and Provider Access Findings

Hosted advisors report informational notices, not a warning-free result: 83 deny-default tables have
RLS without browser policies (including all 18 private intake tables), 51 foreign keys lack covering
indexes (eight intake findings), and 50 indexes are unused (28 intake findings). Missing browser
policies are intentional for the server-command boundary. Unused indexes are expected in this empty
baseline and are not candidates for blind removal. The eight intake foreign-key index candidates
remain a recorded performance-review item before volume grows; they are not evidence of disclosure.
See Supabase's [foreign-key index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

A fresh provider login on 5 October succeeds but redirects to `/subscribe`, displaying the
R1,500/month White-Label Starter subscription. The visible Dashboard link returns to that same gate.
No subscription was purchased, no payment submitted and no new protocol generated. Historical Task
8.8 generator evidence does not substitute for current I8 access/compatibility proof. The owner must
resolve the provider entitlement or supply an already entitled account before this walkthrough.

## Explicit Authorisations

The owner authorised, in this chat on 5 October 2026, application of the reviewed new intake migrations
after local checks; isolated synthetic tenant/Auth/instrument/questionnaire fixtures; session revocation
and removal of only those fixtures; and generation of a separate 32-byte medical key, ignored local
storage and transmission to the Worker secret for the rehearsal. Temporary intake configuration must
return to disabled; the real pilot stays suspended. Existing keys are not reused or rotated.
No key has yet been generated/provisioned, and no hosted intake write has yet run.
The owner chose to deploy the committed code personally. Approval for the seven pending migrations
was separately confirmed and completed; it is not approval for agent deployment or Git changes.

The owner explicitly selected **keep the production gate closed; synthetic proof only** for the
paid-review/manual-transfer dependency. Sprint 11 is not brought forward. Positive payment-dependent
rehearsal evidence must be explicitly synthetic/rollback-only or controlled local injection; no
production paid flag, runtime bypass or clinical/payment approval is inferred from submission.

## Next Verification

Local full-suite and migration-replay gates are accepted. Continue with the
[release/recovery runbook](../../../06-operations/medical-intake-release-recovery-runbook.md).
Hosted code release still requires the owner's deployment or explicit bounded deployment authority;
migration/key/fixture approval is not permission to push or promote code. Rehearse real synthetic
Auth, AAL2, session expiry/revocation, medical commands and generic alert receipt; remove only the
identified fixtures, restore disabled configuration and independently verify the baseline.
Manual protocol-generator access must follow the owner-controlled boundary. Final reports distinguish
local controlled tests, hosted real Auth/transport proof and unactivated clinical gates.
