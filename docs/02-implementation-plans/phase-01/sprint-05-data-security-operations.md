---
plan_id: phase-01-sprint-05
title: Data, Security, and Operational Foundations
status: planned
primary_debt: [TD-014, TD-015, TD-017, TD-018, TD-019, TD-020, TD-055]
depends_on: [phase-01-sprint-03, phase-01-sprint-04]
last_updated: 2026-08-06
owner: unassigned
---

# Sprint 05 — Data, Security, and Operational Foundations

## Mission

Implement the approved minimum safe server, audit, security, environment, observability, and migration controls for every workflow enabled in the v1 pilot. Create portable contracts and evidence that later Next.js and Laravel implementations can reproduce.

## Intended Outcome

Enabled state changes are server-validated, authorised, idempotent, auditable, rate-limited, monitored, and recoverable. Environment configuration is explicit and secret-safe. Security headers and privacy-safe observability are verified on Vercel. Framework-independent fixtures and acceptance tests preserve v1 behaviour for migration.

Capabilities outside the approved pilot scope remain inaccessible and are documented as deferred; they must not be simulated as operational.

## Scope

Primary debt: TD-014, TD-015, TD-017–TD-020, and TD-055.

### Workstream 1 — Validated commands and workflow state

1. Implement approved server-side schemas and commands for each enabled submission or state transition.
2. Enforce actor/resource authorisation and reject client-supplied authoritative status.
3. Add idempotency keys, duplicate/replay handling, concurrency rules, transaction boundaries, and explicit state machines where applicable.
4. Define stable error codes and safe user recovery paths.
5. Prove that failed durable writes cannot produce success confirmations.

For registration, consent, booking, payment, prescription, or order workflows outside v1 scope, retain no misleading route and record the approved deferral plus future contract.

### Workstream 2 — Audit evidence

1. Implement append-only audit events for enabled consent, access, state changes, administrative actions, exports, and security events.
2. Capture actor, action, subject, timestamp, correlation ID, outcome, and approved safe metadata.
3. Prevent credentials, message bodies, questionnaire responses, or unnecessary health data from entering logs/audit metadata.
4. Define privileged audit access, review cadence, retention, export, and tamper-detection approach.

### Workstream 3 — Application and edge security

1. Threat-model enabled public forms, endpoints, file/body sizes, authentication boundaries, and retained MCP surface.
2. Add proportionate rate limits, abuse detection, request-size limits, timeouts, origin/CORS rules, and failure behaviour.
3. Configure and test CSP, framing, MIME-sniffing, referrer, permissions, transport, and sensitive-page caching policies.
4. Document which controls live in Vercel and which remain application-enforced.
5. Test bypasses, direct endpoint calls, duplicate requests, malformed bodies, and denial-of-service limits.

### Workstream 4 — Environment and secret contract

1. Add a committed, secret-free environment schema/example with purpose, owner, sensitivity, environments, rotation, and server/client exposure.
2. Validate required configuration at build/startup and fail safely.
3. Ensure secrets never use public `VITE_` variables or enter client bundles, logs, RAG documents, screenshots, or CI artefacts.
4. Document local, preview, production, rotation, revocation, and incident procedures.

### Workstream 5 — Observability, incidents, and recovery

1. Define privacy-safe structured logs and correlation across an enabled critical journey.
2. Add error monitoring, uptime checks, service objectives, alerts, escalation, and ownership.
3. Exercise an alert and incident workflow, including safe diagnostic evidence.
4. Test backup/restore or durable destination recovery for enabled data stores.
5. Define reconciliation and manual recovery for partial external-service failures.

### Workstream 6 — Cross-generation migration evidence

1. Catalogue every retained v1 capability and observable behaviour.
2. Create framework-independent fixtures and acceptance tests covering success, validation, rejection, failure, retry, and authorisation.
3. Version API, event, state, and schema contracts.
4. Create the v1-to-v2 migration template covering transformations, rehearsal, reconciliation, cutover, rollback, and post-cutover monitoring.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| TD-014 | Enabled commands demonstrate server validation, idempotency, replay/concurrency handling, and false-success prevention.       |
| TD-015 | Append-only audit events and review/access/tamper controls pass representative tests.                                         |
| TD-017 | Threat model and tests prove approved limits, abuse controls, body limits, and CORS/origin policy.                            |
| TD-018 | Security-header tests pass locally and on Vercel for public, asset, error, and sensitive route classes.                       |
| TD-019 | Environment schema, startup validation, rotation ownership, and client-bundle secret checks pass.                             |
| TD-020 | Monitoring, alert, correlation, incident, recovery, and redaction exercises produce reviewed evidence.                        |
| TD-055 | Capability catalogue, portable fixtures/contracts, migration rehearsal template, reconciliation, and rollback evidence exist. |

## Validation

- Run the full Sprint 04 CI suite.
- Add integration tests for valid, invalid, unauthorised, duplicate, concurrent, oversized, and failed requests.
- Inspect bundles and logs for seeded canary secrets and prohibited health fields.
- Test security headers and cache behaviour on local and Vercel preview routes.
- Trigger a controlled error and uptime alert; follow the incident path to closure.
- Restore approved non-production fixtures and reconcile record counts/checksums.
- Run the portable acceptance suite independently of React component internals.

## Non-Goals

- Enabling workflows excluded from the approved v1 pilot.
- Storing real patient data in development, CI, fixtures, or RAG documents.
- Treating Vercel controls as a substitute for server-side authorisation or validation.
- Performing the Next.js migration in this sprint.

## Risks and Rollback

Security controls can block legitimate pilot use, while permissive fallbacks can expose sensitive workflows. Introduce limits and headers through preview verification with an emergency disable path. Schema or state changes require reversible migrations and backups. Observability must fail safely without blocking primary transactions or leaking sensitive payloads.

## Documentation and RAG Updates

- Add environment, security, audit, observability, incident, recovery, and migration-contract documentation.
- Update TD-014, TD-015, TD-017–TD-020, and TD-055 only after evidence review.
- Refresh `docs/RAG/02-current-state.md`, `03-platform-evolution.md`, `04-domain-glossary.md`, `05-decision-register.md`, `06-known-limitations.md`, and `07-index.json`.
- Produce `docs/03-completion-reports/phase-01/sprint-05-data-security-operations.md`.
