---
evidence_id: sprint-03-5-contract-migration
sprint: 03
task: 3.5
status: verified-local
date: 2026-08-08
primary_debt: [TD-054]
---

# Sprint 03 Task 3.5 — Contract and Migration Evidence

## Mission

Approve portable domain, API, event, compatibility, and migration contracts that survive the
planned TanStack-to-Next.js-to-Laravel/React evolution.

## Observed Starting State

The repository has no transactional API, canonical contract catalogue, runtime schemas, domain
events, provider adapters, datastore migration, or contract-test suite. DR-003 had approved logical
ownership, but the rules for communicating across those boundaries were unresolved.

## Approved Outcome

[`DR-004`](../../../07-decisions/DR-004-framework-neutral-contracts-migration.md) approves:

- a canonical, runtime-validatable contract catalogue independent of frameworks and vendors;
- command, query, result, domain-event, integration-message, error, and audit-fact semantics;
- contract families for identity, consent, intake, triage, clinical decisions, prescriptions,
  payments/refunds, orders, fulfilment, support, and audit;
- runtime validation, server authority, optimistic concurrency, idempotency, safe errors, event
  replay, and reconciliation requirements;
- integer-major compatibility rules with explicit compatible and breaking changes;
- expand–migrate–shadow/reconcile–cutover–observe–contract migration stages; and
- cross-generation fixtures and contract tests as the evidence of retained behaviour.

## Debt Disposition

TD-054 is **Verified** against its architecture-decision acceptance criterion. Portable ownership
and communication boundaries are approved. TD-014 remains open until state-changing contracts are
implemented and concurrency/retry behaviour is tested. TD-055 remains open until retained journeys,
fixtures, migrations, reconciliation, cutover, rollback, and behavioural equivalence are exercised.

## Validation

- Decision index identifies DR-004 as Approved.
- Sprint 03 plan identifies Task 3.5 as Completed.
- The technical-debt registry records TD-054 as decision-verified without closing TD-014/TD-055.
- Blueprint and RAG sources identify DR-004 as the canonical portability decision.
- Markdown/JSON formatting, relative links, status assertions, and repository diff checks pass.

## Files in Scope

No application source, public content, dependency, Cloudflare configuration, generated route, or
runtime behaviour was changed by Task 3.5.
