---
evidence_id: phase-01-sprint-05-task-01
title: Sprint 05.1 Data, Security, and Operations Baseline
status: verified-task-evidence
date: 2026-08-10
source_commit: f2a9feb
owner: "@Muhns13G"
related_debt: [TD-013, TD-014, TD-015, TD-016, TD-017, TD-018, TD-019, TD-020, TD-055]
---

# Sprint 05.1 Data, Security, and Operations Baseline

## Mission and Boundary

Freeze the post-Sprint 04 implementation boundary, identify what can begin without external service
selection, and prevent the broad Sprint 05 plan from silently treating unselected vendors or gated
transactions as operational. This task changes planning evidence only. It does not add an endpoint,
collect data, provision a service, activate a route, or modify public wording.

## Observed Repository Baseline

| Surface                    | Verified state                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Active journeys            | `/start`, `/peptides`, `/poster`, and `/poster-thanks` remain explicit non-transactional gates.                                     |
| Server mutations           | No active form, mutation endpoint, or `createServerFn` exists.                                                                      |
| Persistence                | No database client, schema, migration, durable store, queue, or object-storage binding exists.                                      |
| Identity                   | No authentication provider, session, recovery, role, permission, or service identity exists.                                        |
| Payments and messaging     | No Stripe, email, SMS, WhatsApp, payment webhook, or transactional outbox integration exists.                                       |
| Environment                | `.env.example` declares three public `VITE_*` values and correctly states that no server secret is consumed.                        |
| Cloudflare bindings        | `wrangler.jsonc` declares the Worker entry and persisted invocation logs, but no data or secret binding.                            |
| Browser security           | No repository-owned CSP, framing, MIME, referrer, permissions, transport, or sensitive-cache policy exists.                         |
| Observability and recovery | No application redaction/correlation layer, alert, incident exercise, backup, restore, or data-subject workflow exists.             |
| Migration evidence         | Approved DR-004 rules exist, but no machine-readable contract registry, portable fixture suite, or rehearsal implementation exists. |

The Sprint 04 quality baseline remains the implementation floor: frozen Bun installation, format,
lint, typecheck, 11 Vitest tests, zero-finding audits, production build, generated-route consistency,
Cloudflare dry-run, and 48 Playwright/axe checks are the required regression matrix.

## Reconciled Delivery Decision

Sprint 05 is divided into 17 owner-committed tasks. Provider-neutral contracts, environment safety,
and browser security can proceed first. Exact PostgreSQL, identity, storage, email, observability,
and payment selection is a hard checkpoint before provider-backed persistence or identity work.
Payment and partner fulfilment remain additionally gated by the unresolved commercial, accountable-
party, and peptide-authority evidence; implementation must remain inaccessible and synthetic until
those gates pass.

The initial code boundary will be a Cloudflare-compatible modular monolith with explicit channel,
application, domain, port, adapter, and migration ownership. Framework routes and provider SDK
objects must not become canonical domain contracts. This preserves the approved TanStack-to-Next.js
and possible Laravel/React evolution.

## Validation

- Read all 140 lines of the Sprint 05 plan and checked its final coverage.
- Reconciled TD-013–TD-020 and TD-055 acceptance criteria against the repository.
- Corrected TD-018's stale generated-header statement and moved TD-019/TD-020 to In progress for
  their existing partial environment and Cloudflare invocation-log foundations without overstating
  server validation, observability, incident, or recovery capability.
- Reconciled DR-003–DR-008 implementation, vendor, identity, lifecycle, approval, and migration gates.
- Inspected active routes, source inventory, `package.json`, `.env.example`, `vite.config.ts`, and
  `wrangler.jsonc` for current server, dependency, environment, binding, and observability state.
- Confirmed no Sprint 05 annexure or implementation surface existed before this task.
- Preserved every active transactional gate and all established customer-facing wording.

## Debt Disposition

No technical-debt item closes in Task 5.1. The task makes the implementation order and external
dependencies explicit so later evidence cannot overstate readiness. TD-013, TD-014, TD-015, TD-016,
TD-017, TD-018, TD-019, TD-020, and TD-055 retain their existing status until their specific
acceptance tests pass.

## Next Boundary

Task 5.2 may introduce the provider-neutral module and contract foundation with runtime validation
and tests. Any dependency reintroduction, including Zod, must be justified by first active use and
validated through the full package and CI policy. No external service may be provisioned by Task 5.2.
