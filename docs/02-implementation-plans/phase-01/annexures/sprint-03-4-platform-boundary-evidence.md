---
evidence_id: sprint-03-4-platform-boundary
sprint: 03
task: 3.4
status: verified-local
date: 2026-08-08
primary_debt: [TD-011]
---

# Sprint 03 Task 3.4 — Platform Boundary Evidence

## Mission

Approve the logical platform boundaries and identify which module owns every authoritative
workflow state before transactional implementation begins.

## Observed Starting State

Repository inspection confirmed that v1 currently provides public and gated presentation routes
only. There is no live application API, authentication service, datastore, durable workflow state,
clinical workspace, operations workspace, or transactional integration. Task 3.4 therefore makes
an architecture decision; it does not represent backend implementation.

## Approved Outcome

[`DR-003`](../../../07-decisions/DR-003-platform-boundaries-authoritative-state.md) approves:

- channel boundaries for public acquisition, patient, clinical, and operations/support surfaces;
- an authenticated and authorised application/API boundary;
- a framework-neutral modular core with explicit identity, consent, intake/triage, clinical,
  commerce, order/fulfilment, support, and audit ownership;
- persistence and external-provider access through ports and adapters;
- a state-authority matrix separating source evidence, Meneer's system of record, permitted
  transition authority, and consumer projections;
- fail-closed transition, callback, idempotency, exception, and reconciliation principles; and
- one v1 modular deployment with portable boundaries, rather than premature microservices.

## Debt Disposition

TD-011 is **Verified** against its decision-level acceptance criterion. The decision now covers all
required platform surfaces and workflow-state ownership. No implementation claim is made:
datastore, identity, security, lifecycle, contracts, observability, and transactional engineering
remain assigned to later records and sprints.

## Validation

- Decision index identifies DR-003 as Approved.
- Sprint 03 plan identifies Task 3.4 as Completed.
- Blueprint and RAG documents distinguish approved target architecture from observed current state.
- Technical-debt registry records TD-011 as decision-verified with implementation dependencies.
- Markdown/JSON formatting and repository diff checks pass.

## Files in Scope

No application source, route, public content, configuration, dependency, or generated route file
was changed by Task 3.4.
