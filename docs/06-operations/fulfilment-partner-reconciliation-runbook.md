---
document_id: meneer-fulfilment-partner-reconciliation-runbook
title: Fulfilment Partner and Reconciliation Runbook
status: active-inactive-boundary
last_updated: 2026-08-11
owner: "@Muhns13G"
sensitivity: internal
---

# Fulfilment Partner and Reconciliation Runbook

## Current Boundary

Task 5.15 provides a server-only, provider-neutral contract for Precise Wellness hand-off,
dispensing-pharmacy release, Meneer-hub custody, and courier dispatch/delivery evidence. Only local
synthetic gates are enabled. Preview and production gates are disabled, and no partner API, public
route, questionnaire, order, address, tracking payload, or patient data is connected.

## Data Rules

Accept only a tenant-derived workflow ID, provider/event identifier, event type, SHA-256 provider
reference digest, SHA-256 payload fingerprint, and provider timestamp. Never persist raw partner
payloads, questionnaire answers, symptoms, diagnoses, prescriptions, contact details, addresses, or
tracking numbers in the integration or audit ledgers.

Each service identity must be active, unexpired, scoped to `fulfilment:update`, and explicitly bound
to one provider and environment. Browser roles have no direct table or RPC access.

## Activation Checklist

Before changing any preview/production gate from `disabled`:

1. Close the applicable TD-007, TD-009, and TD-010 particulars and record named approvals.
2. Verify the partner identity, contract, authority, data role, endpoint, signing/authentication,
   retry rules, timeouts, exception owner, retention, and exit path.
3. Provision one least-privilege service identity per provider/environment and rotate its secret.
4. Add the real adapter and provider-specific authentication tests without weakening the canonical
   `fulfilment.partner` contract.
5. Exercise duplicates, changed replay, out-of-order delivery, cancellation, full refund, refund
   failure, lost/damaged delivery, and reconciliation alert paths in non-production.
6. Confirm critical records, inbox/outbox facts, audit events, alerts, and recovery evidence
   correlate without copying health or operational payloads into logs.
7. Obtain the release-owner go decision and preserve a tested kill switch.

## Reconciliation and Recovery

`pending_reconciliation` is not success. Investigate the internal workflow, payment/refund state,
partner event fingerprint, custody state, and audit correlation ID. Do not overwrite accepted event
history. Correct the authoritative source or append an approved compensating event, then rerun
reconciliation. Disable the provider gate when identity, authentication, ordering, or custody
evidence cannot be trusted.

Run locally from a clean synthetic reset:

```bash
bun run db:start:test
bun run db:reset
bun run db:test
bun run test:fulfilment
bun run db:stop
```
