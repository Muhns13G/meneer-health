---
task: 7.9
status: completed
date: 2026-08-13
related_debt: [TD-045]
debt_status: verified
source_baseline: 03fa27c
---

# Sprint 07.9 — Measurement Governance Evidence

## Outcome

Task 7.9 proves the approved first-party measurement boundary without activating collection. It
adds daily deidentified aggregates, governed raw and aggregate exports, access evidence, explicit
synthetic deletion, and scheduled retention. Raw events have a rolling 30-day limit; consent
evidence and aggregates have a 12-month maximum; withdrawal-linked raw events are removed no later
than seven days.

Product and operations reviewers can receive aggregate counts only. Raw inventory and deletion
require a privacy/security role, AAL2 and an approved purpose. Every human export/deletion action
records actor, role, assurance, purpose, action, environment, count and, when applicable, a one-way
target fingerprint. Browser and service roles retain no direct table access.

## Prohibited-Data and Deletion Proof

Strict contract and HTTP tests inject synthetic identity, contact, IP, user-agent, cookie, URL,
query, referrer, replay, treatment, payment, free-text and arbitrary-metadata canaries. They fail
before persistence, are not logged or echoed, and cannot enter the aggregate schema. Retention is
retry-safe and reconciles raw counts before deletion. A disposable consent flow is granted,
inventoried, withdrawn and fully removed; a second inventory fails closed.

## Hosted Evidence

Hosted Supabase `meneer-health` applies `pilot_measurement_boundary`,
`pilot_measurement_governance_evidence` and `measurement_export_role_purpose_matrix`. The final
migration prevents an approved reviewer class from presenting a purpose assigned to a different
class. The synthetic hosted exercise reports strict canary rejection, purpose-bound raw inventory,
browser denial, opt-out and complete deletion with zero prohibited payload fields.
`https://meneerhealth.co.za/` returns `200`; both measurement endpoints remain default-off `404`
responses with no persistent cookie, CORS or echoed canary.

Supabase security advice contains only the intentional informational no-policy notices for the
deny-all private tables. Performance advice reports the expected unused fresh retention index;
usage will be reassessed only after approved collection begins.

## Validation and Boundary

- 58 Vitest files and 323 tests pass.
- 11 pgTAP files and 336 database assertions pass after a fresh reset.
- Database lint, TypeScript, ESLint, Prettier, portability and the production build pass.
- Local and hosted synthetic measurement exercises pass and clean up their disposable state.

TD-045 is **Verified**. `MEASUREMENT_MODE` remains disabled and no public caller or consent UI was
added. Enabling collection still requires an approved consent interface, explicit privacy/security
release approval, environment configuration and a post-deployment verification.
