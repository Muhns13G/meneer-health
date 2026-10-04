---
document_id: meneer-audit-integration-evidence-runbook
title: Audit and Integration Evidence Runbook
status: active-local-foundation
last_updated: 2026-10-04
owner: "@Muhns13G"
audience: engineering, security, privacy, operations
sensitivity: internal
---

# Audit and Integration Evidence Runbook

## Sprint 10 Operations Extension

Task 10.7 adds central chained facts around operations and private hand-off journals, assigned
queue reads and coded identified denials. The owner-approved hosted migration also creates append-only owned
alerts; neither browsers nor the service role can access the table directly. Use the live AAL2
administrator `read_operations_alerts` RPC for a bounded reference-free review; it audits the read
but records no human acknowledgement or resolution.

The service-only `sweep_operations_alerts(tenant, overdueHours)` requires an explicit 1–168-hour
interval and processes at most 100 not-yet-alerted attempts per call. It deduplicates uncertain
delivery and overdue unacknowledged delivery by attempt/code, without changing clinical or case
state. Task 10.7's approved operating contract uses a five-minute Cron and a 24-hour overdue review
target. It sends generic internal Brevo email to `support@meneerhealth.co.za`; Mansoer Gallie is the
initial responder. This target is not a clinical SLA. A generated alert is not a delivered notification.
Apply DR-005 retention to these private operational/security records; no automatic purge is claimed.
All seven Sprint 10 migrations were applied hosted with explicit approval on 4 October 2026,
without seeds or roles; the suspended empty baseline remains. Do not run hosted sweeps or fixture
writes until specifically authorised for a synthetic exercise. The separately approved rehearsal
verified real hosted TOTP/AAL2, generic Brevo acceptance, owner-confirmed support mailbox receipt,
scripted synthetic administrator response/replay/revocation and a valid audit chain. Scoped cleanup
restored the suspended empty baseline and original triggers. It used direct hosted RPCs and the
transport adapter, not a deployed Worker Cron or routed browser session. Owner-controlled Worker
configuration was subsequently rehearsed with explicit bounded approval. Deployed Cron invocation
and routed MFA/administrator response passed, but the send remained uncertain because Workers rejects
`redirect: "error"`. The adapter's local `manual` fix needs owner deployment and successful scheduled
email/mailbox receipt retesting. Mode was restored to disabled, temporary tenant binding removed and
the original empty suspended baseline verified. Never treat an `ok` Cron outcome as provider acceptance.

### Alert Delivery and Response

1. After separate hosted migration/rehearsal approval, configure server-only `BREVO_API_KEY`,
   `OPERATIONS_ALERTS_TENANT_ID` and `OPERATIONS_ALERTS_MODE=brevo`. The HTTPS API key is **not**
   the SMTP key; existing Auth SMTP settings are unchanged. Owner deploys/promotes the configuration.
2. Cron claims at most three notifications per invocation, with a global 50-attempt UTC-day budget.
   This conservative internal budget is not a guarantee of remaining shared provider quota. Only
   known 429 rejection retries, at most three attempts with 60/300-second backoff. Provider 201 means
   accepted, not delivered. Timeouts, 5xx, redirects and expired leases remain uncertain for review;
   permanent rejection remains failed. Neither is blindly resent. Idempotency uses the alert UUID.
3. Sign in with administrator MFA and open `/staff/alerts`. Review transport state and owner code;
   explicitly acknowledge, investigate, then confirm resolution. Reads and provider acceptance do
   not respond on a human's behalf. Resolution requires prior acknowledgement. Do not enter patient
   details into email, alerts or the generic support channel. Security alerts escalate to the security
   owner; operational alerts to technology/operations, initially the repository owner until separately
   designated. No independent responder is invented by this implementation.
4. During a separately approved synthetic rehearsal prove receipt, failed/uncertain delivery review,
   acknowledgement and resolution, and retain redacted timestamps. Inspect private immutable attempt,
   receipt and response evidence only through approved diagnostic access; tables deny direct service
   writes. Review the alert console at least daily; a broken email channel cannot notify itself.
5. Disable delivery with `OPERATIONS_ALERTS_MODE=disabled` for an incident. Do not delete durable
   alert or audit evidence. Any resend/reopening requires a separately approved reconciliation design;
   no automatic reset of uncertain or failed cursor states is exposed.

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
