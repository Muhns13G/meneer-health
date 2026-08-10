---
document_id: meneer-audit-integration-evidence-runbook
title: Audit and Integration Evidence Runbook
status: active-local-foundation
last_updated: 2026-08-10
owner: "@Muhns13G"
audience: engineering, security, privacy, operations
sensitivity: internal
---

# Audit and Integration Evidence Runbook

## Current Boundary

Task 5.10 implements an inactive local/CI foundation. A successful workflow command atomically
commits its workflow state, idempotency receipt, one `audit_events` fact, and one
`integration_outbox` event. The integration inbox stores a provider/event identity, SHA-256 payload
fingerprint, service identity, correlation and allow-listed metadata—not the raw provider payload.
No customer route, delivery worker, provider callback or hosted migration is active.

## Access and Review

Audit tables have forced RLS, no browser policies and no direct `service_role` access. Evidence is
available only through the server-side `AuditEvidenceService` and `review_audit_evidence` RPC after
the ordinary policy confirms an assigned `auditor`, `privacy_review` purpose and AAL2 privileged
session. Every successful review creates an append-only review record and audit fact. Results are
capped at 100 facts and exclude raw content.

Before transactional pilot activation:

- verify the hash chain daily and alert immediately on failure;
- review privileged and failed/security-sensitive access by the next business day;
- perform a weekly privacy/security sample and monthly access-assignment review; and
- record reviewer, window, count, correlation and chain head for each review.

Task 5.12 owns scheduled checks, alerts and incident rehearsal. Until then, review is an explicit
manual/release gate using `bun run test:audit` with synthetic data only.

## Integrity, Retention, and Export

Audit facts and access-review records reject ordinary update/delete operations. Each tenant has a
serialized SHA-256 chain; verification recomputes every fact and compares the stored head. This is
tamper-evident, not immutable storage against a database superuser who can rewrite the full chain.
External anchoring/WORM evidence remains an activation consideration.

Apply DR-005 retention: routine authentication/access/security evidence is retained for 12 months;
confirmed incident and privileged/break-glass evidence for six years after closure. Raw integration
payloads are not retained by this boundary. Outbox/inbox disposition, legal holds, scoped export,
backup handling and deletion propagation remain Task 5.13 work; do not delete records manually.

## Failure Rules

- Audit or outbox failure rolls back the owning command; never return success.
- Exact command/inbox replay returns the original result without duplicate facts.
- A changed payload under the same idempotency identity is a conflict.
- Store safe reason codes and correlations only—never credentials, message bodies, questionnaire
  responses, diagnoses, prescriptions, payment data or provider payloads.
- A chain failure is a security incident: stop evidence export and affected activation, preserve
  the database, notify security/privacy owners, and reconcile from the last trusted proof.
