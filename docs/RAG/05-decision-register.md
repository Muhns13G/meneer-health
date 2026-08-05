---
rag_id: meneer-decision-register
title: Meneer Decision Register
status: active
authority: mixed
last_updated: 2026-08-06
audience: internal
sensitivity: internal
---

# Meneer Decision Register

## Usage

This register separates confirmed direction from unresolved choices. “Confirmed” records owner direction, not implementation completion. Formal architecture, clinical, legal, privacy, or operational decisions must later move into owned decision records with rationale, consequences, effective dates, and approvers.

## Confirmed Direction

| ID      | Decision                                                                 | Evidence state                                       | Consequence                                                                                               |
| ------- | ------------------------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| DIR-001 | The current TanStack Start codebase is v1.                               | Owner confirmed                                      | Treat it as the pilot generation, not a disposable prototype.                                             |
| DIR-002 | v1 will be hosted on Vercel.                                             | Owner confirmed                                      | Remove Lovable and Cloudflare deployment coupling and verify Vercel runtime behaviour.                    |
| DIR-003 | v1 is intended for a controlled one-month test-group pilot.              | Owner confirmed                                      | Define a narrow pilot scope and gate distinct from public launch.                                         |
| DIR-004 | The intended public product generation is Next.js v2.                    | Owner confirmed                                      | Preserve accepted v1 behaviour, data contracts, and tests for absorption into v2.                         |
| DIR-005 | Laravel API and React may become v3 when scale justifies it.             | Owner confirmed                                      | Keep the core domain and data model framework-neutral; require measured migration triggers.               |
| DIR-006 | Lovable ecosystem coupling must be replaced.                             | Owner confirmed                                      | Remove Lovable configuration, assets, telemetry, manifest, and generated SDK dependencies.                |
| DIR-007 | `LOVABLE_API_KEY` will not be a Vercel requirement.                      | Confirmed from owner direction and package behaviour | Do not provision it; remove or explicitly disable the associated telemetry path.                          |
| DIR-008 | Each framework generation must absorb and improve the preceding version. | Owner confirmed                                      | Maintain migration contracts, fixtures, acceptance tests, cutover, reconciliation, and rollback evidence. |
| DIR-009 | Bun is the current package manager.                                      | Repository-observed                                  | Keep `bun.lock` authoritative unless a later explicit decision changes package management.                |

## Open Product and Operating Decisions

| ID      | Decision needed                                                                                | Related debt          |
| ------- | ---------------------------------------------------------------------------------------------- | --------------------- |
| OPN-001 | Is Meneer the provider, intermediary, or technology/marketing layer?                           | TD-009                |
| OPN-002 | Which entity contracts with patients and holds each information-responsibility role?           | TD-009, TD-016        |
| OPN-003 | Which clinicians, pharmacies, laboratories, couriers, and support partners are approved?       | TD-006, TD-009        |
| OPN-004 | Which conditions and journeys are enabled in the pilot, waitlisted, demonstrative, or removed? | TD-001–TD-008, TD-056 |
| OPN-005 | Is the peptide offering rejected, deferred, informational, or operationally approved?          | TD-007                |
| OPN-006 | What pricing, consultation, subscription, cancellation, refund, and fulfilment model applies?  | TD-010                |
| OPN-007 | What measurements end the pilot and justify public launch or a later framework migration?      | TD-055, TD-056        |

## Open Architecture and Vendor Decisions

| ID      | Decision needed                                                                                                                      | Related debt                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| ARC-001 | What are the portable domain, API, event, and workflow-state contracts?                                                              | TD-011, TD-014, TD-054, TD-055         |
| ARC-002 | Which identity, PostgreSQL, storage, messaging, scheduling, payment, video, analytics, and observability services meet requirements? | TD-012, TD-013, TD-019, TD-020, TD-045 |
| ARC-003 | What are the retention, access, deletion, export, backup, residency, and recovery rules by data class?                               | TD-012, TD-015, TD-016                 |
| ARC-004 | Is MCP removed for the pilot or reimplemented later with a vendor-neutral SDK?                                                       | TD-048, TD-049, TD-053                 |
| ARC-005 | Which security headers, rate limits, abuse controls, and logging/redaction rules apply on Vercel?                                    | TD-017–TD-020                          |
| ARC-006 | Which objective thresholds would justify v3 Laravel/React rather than continued Next.js evolution?                                   | TD-054–TD-056                          |

## Decision Closure Rule

An open item closes only when its decision record identifies the accountable owner, context, options considered, decision, rationale, security/privacy/clinical implications, effective date, affected documents, implementation owner, and review trigger. Update this register and `07-index.json` in the same change.
