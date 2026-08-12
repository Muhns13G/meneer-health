---
plan_id: phase-01-sprint-05
title: Data, Security, and Operational Foundations
status: activation-follow-through
primary_debt: [TD-014, TD-015, TD-017, TD-018, TD-019, TD-020, TD-055]
implementation_follow_through: [TD-013, TD-016]
depends_on: [phase-01-sprint-03, phase-01-sprint-04]
last_updated: 2026-08-11
owner: "@Muhns13G"
---

# Sprint 05 — Data, Security, and Operational Foundations

## Mission

Implement the approved minimum safe server, audit, security, environment, observability, and migration controls for every workflow enabled in the v1 pilot. Create portable contracts and evidence that later Next.js and Laravel implementations can reproduce.

## Intended Outcome

Enabled state changes are server-validated, authorised, idempotent, auditable, rate-limited, monitored, and recoverable. Environment configuration is explicit and secret-safe. Security headers and privacy-safe observability are verified on the approved Cloudflare v1 runtime. Framework-independent fixtures and acceptance tests preserve v1 behaviour for migration.

Capabilities outside the approved pilot scope remain inaccessible and are documented as deferred; they must not be simulated as operational.

## Scope

Primary debt: TD-014, TD-015, TD-017–TD-020, and TD-055. Sprint 05 also supplies the
implementation evidence required to finish TD-013 and TD-016 after Sprint 03 approves their
architecture and procedures.

## Reconciled Starting Point

- Sprint 04 establishes the required Bun/Node contract, clean dependency state, automated tests,
  read-only CI, protected branches, contributor controls, and hosted passing/failing enforcement.
- Every active customer journey remains non-transactional. There is no active form, mutation
  endpoint, `createServerFn`, database, migration, identity provider, session, payment adapter,
  email provider, audit store, application logger, or recovery workflow.
- `.env.example` contains only three public `VITE_*` values. No server secret is currently consumed,
  and `wrangler.jsonc` declares no data, secret, queue, or other runtime binding.
- Cloudflare invocation logs are enabled, but there is no application-owned redaction, correlation,
  alert, incident, backup, restore, or reconciliation implementation.
- The repository defines no CSP or other browser-security header policy. The current build produces
  no tracked or generated `_headers` file.
- Task 5.5 and DR-009 select the free-tier-first pilot stack: one Supabase Free project in London
  for PostgreSQL, Auth, and private Storage; Brevo Free custom SMTP; Cloudflare Workers telemetry;
  Better Stack Free for uptime and backup heartbeats only; Cloudflare R2 in the EU jurisdiction for
  encrypted recovery exports; and Stripe Checkout in test mode. The owner subsequently provisioned
  the London project; it has no migrations or application integration and remains synthetic-only.
- Local development and CI use local Supabase with synthetic data. Cloudflare branch previews must
  keep provider integrations disabled or synthetic and must never connect to the real pilot store.
- TD-006, TD-007, TD-009, and TD-010 still gate claims, peptide authority, named operating parties,
  prices, merchant/tax roles, Stripe activation, and fulfilment particulars. Sprint 05 may build and
  test contained foundations with synthetic data; it must not activate those journeys by assumption.

## Commit-Sized Task Plan

| Task | Commit-sized outcome                                                                                                                                                 | Primary debt / gate                           | Status      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------- |
| 5.1  | Freeze the post-Sprint 04 data/security baseline, reconcile enabled scope and external gates, and record the implementation sequence.                                | All Sprint 05 debt                            | Completed   |
| 5.2  | Establish framework-neutral module boundaries, runtime-validated contract envelopes, stable errors, versioning, and dependency rules with representative tests.      | TD-014, TD-055                                | Completed   |
| 5.3  | Implement the secret-free environment catalogue, server-only configuration validation, safe failure behaviour, and client-bundle canary checks.                      | TD-019                                        | Completed   |
| 5.4  | Add and test public, asset, error, and sensitive-route security headers plus explicit cache policy without changing customer-facing content.                         | TD-018                                        | Completed   |
| 5.5  | Complete the DR-006 data map and select exact PostgreSQL, identity, storage, email, observability, and payment services, regions, owners, environments, and exits.   | TD-013, TD-016, TD-019, TD-020; external gate | Completed   |
| 5.6  | Add the provider-neutral persistence port, selected PostgreSQL adapter, versioned migrations, opaque identifiers, tenancy boundaries, roles, and synthetic fixtures. | TD-014, TD-016                                | Completed   |
| 5.7  | Integrate managed identity with stable internal subjects, verified contact, sessions, recovery, workforce MFA, and scoped service identities.                        | TD-013                                        | Completed   |
| 5.8  | Implement deny-default server authorisation and horizontal/vertical negative tests across subject, tenant, role, assignment, purpose, state, and assurance.          | TD-013                                        | Completed   |
| 5.9  | Implement approved commands, explicit state machines, idempotency, replay/concurrency handling, transactions, and false-success prevention.                          | TD-014                                        | Completed   |
| 5.10 | Implement append-only audit facts plus transactional inbox/outbox records with safe metadata, correlation, access review, and tamper evidence.                       | TD-015                                        | Completed   |
| 5.11 | Threat-model and enforce request size, timeout, origin/CORS, rate, anti-automation, duplicate, malformed-body, and direct-endpoint controls.                         | TD-017                                        | Completed   |
| 5.12 | Add privacy-safe structured logging, monitoring, uptime, objectives, alerts, escalation, redaction tests, and a controlled incident exercise.                        | TD-020                                        | Completed   |
| 5.13 | Implement lifecycle and data-subject workflows, backup monitoring, staging restore, reconciliation, legal holds, and synthetic deletion/export evidence.             | TD-016                                        | Completed   |
| 5.14 | Integrate one-time Stripe Checkout and signed idempotent webhooks for approved test-mode scenarios without health data in payment metadata.                          | TD-014, TD-015, TD-020; TD-010 gate           | Completed   |
| 5.15 | Implement minimum-data Precise Wellness, pharmacy, hub, courier, cancellation, refund, and fulfilment reconciliation behind inactive release gates.                  | TD-014, TD-015, TD-020; TD-007/009/010 gates  | Completed   |
| 5.16 | Build the retained-capability catalogue, portable fixtures, contract suite, schema/version registry, and v1-to-v2 rehearsal/cutover/rollback template.               | TD-055                                        | Completed   |
| 5.17 | Run local and hosted end-to-end validation, restore/incident exercises, reconcile debt/RAG, and issue the Sprint 05 completion report.                               | All Sprint 05 debt                            | Completed   |
| 5.18 | Provision and fail-test the Better Stack public monitor, alert delivery, acknowledgement, recovery, and privacy-safe hosted evidence.                                | TD-020 hosted follow-through                  | Completed   |
| 5.19 | Complete the private EU R2 recovery round trip: upload, download, decrypt, restore/reconcile, safe synthetic-object deletion, and failed-storage/no-heartbeat proof. | TD-020 hosted recovery follow-through         | In progress |
| 5.20 | Apply hosted Supabase migrations and prove synthetic identity, authorisation, break-glass disposition, request-security, WAF/rate, and custom-SMTP boundaries.       | TD-013, TD-017; TD-020 hosted evidence        | Pending     |
| 5.21 | Run the complete local and hosted validation matrix, reconcile TD-013/017/020, and issue the final Sprint 05 closure record.                                         | All remaining Sprint 05 evidence              | Pending     |

Tasks 5.2–5.4 are provider-neutral and may proceed after Task 5.1. Task 5.5 closes the DR-006
selection checkpoint through DR-009 and its evidence annexure; it does not prove provisioning,
security implementation, recovery, or production readiness. Tasks 5.6–5.15 must implement and prove
the selected services before claiming provider-backed completion. Tasks 5.14–5.15 additionally
require the recorded TD-007, TD-009, and TD-010 particulars. All transactional routes and adapters
default disabled until their full activation gate passes.

Task 5.17's owner checkpoint and exact-commit hosted workflow pass. Task 5.18 subsequently completes
the Better Stack public-uptime, controlled incident, and explicit heartbeat-failure evidence without
activating a customer transaction. Task 5.19 has proved hosted encrypted upload, failed storage
without a false heartbeat, and heartbeat alert/recovery. Its download/decrypt/restore/reconcile/
delete implementation and local PostgreSQL acceptance pass; one hosted round-trip run remains.
Tasks 5.20–5.21 retain the original hosted
identity/request-security and final-closure acceptance work. Evidence:
[`sprint-05-17-verification-and-closure-evidence.md`](annexures/sprint-05-17-verification-and-closure-evidence.md),
[`sprint-05-18-better-stack-uptime-evidence.md`](annexures/sprint-05-18-better-stack-uptime-evidence.md),
and [`sprint-05-19-hosted-recovery-evidence.md`](annexures/sprint-05-19-hosted-recovery-evidence.md).

### Workstream 1 — Validated commands and workflow state

1. Implement approved server-side schemas and commands for each enabled submission or state transition.
2. Enforce actor/resource authorisation and reject client-supplied authoritative status.
3. Add idempotency keys, duplicate/replay handling, concurrency rules, transaction boundaries, and explicit state machines where applicable.
4. Define stable error codes and safe user recovery paths.
5. Prove that failed durable writes cannot produce success confirmations.
6. Implement separate clinical, payment, supply, hub receipt, dispatch, delivery, cancellation, and
   refund states; a paid state must never imply clinical approval or fulfilment.

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
4. Document which controls live in Cloudflare and which remain application-enforced.
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
6. Reconcile Stripe events, internal payments, orders, Precise Wellness supply, hub inventory,
   dispatch, delivery, cancellations, and refunds without placing health data in payment metadata or
   operational logs.

### Workstream 6 — Payment and fulfilment integration

1. Use one-time Stripe Checkout Sessions for approved consultation, medication-plus-delivery, and
   bundled orders; keep price and line-item definitions governed and environment-specific.
2. Create Checkout Sessions server-side and store only opaque internal references in Stripe; never
   send symptoms, diagnoses, questionnaire answers, prescriptions, or other unnecessary health data.
3. Verify webhook signatures and make webhook processing idempotent, replay-safe, observable, and
   independent of the browser success redirect.
4. Handle completed, delayed-success, failed, expired, refunded, disputed, and duplicated payment
   events with explicit recovery paths.
5. Prevent supply or dispatch until the approved clinical, payment, stock, and operational conditions
   are all satisfied.
6. Test all three charge scenarios and their clinical rejection, cancellation, refund, partial
   failure, fulfilment exception, and reconciliation paths in Stripe test mode before live enablement.

### Workstream 7 — Cross-generation migration evidence

1. Catalogue every retained v1 capability and observable behaviour.
2. Create framework-independent fixtures and acceptance tests covering success, validation, rejection, failure, retry, and authorisation.
3. Version API, event, state, and schema contracts.
4. Create the v1-to-v2 migration template covering transformations, rehearsal, reconciliation, cutover, rollback, and post-cutover monitoring.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| TD-013 | Server-side role enforcement and horizontal/vertical access-boundary tests satisfy the approved Sprint 03 matrix.             |
| TD-016 | A staging backup restore and complete synthetic data-subject request satisfy the approved Sprint 03 lifecycle procedures.     |
| TD-014 | Enabled commands demonstrate server validation, idempotency, replay/concurrency handling, and false-success prevention.       |
| TD-015 | Append-only audit events and review/access/tamper controls pass representative tests.                                         |
| TD-017 | Threat model and tests prove approved limits, abuse controls, body limits, and CORS/origin policy.                            |
| TD-018 | Security-header tests pass locally and on Cloudflare for public, asset, error, and sensitive route classes.                   |
| TD-019 | Environment schema, startup validation, rotation ownership, and client-bundle secret checks pass.                             |
| TD-020 | Monitoring, alert, correlation, incident, recovery, and redaction exercises produce reviewed evidence.                        |
| TD-055 | Capability catalogue, portable fixtures/contracts, migration rehearsal template, reconciliation, and rollback evidence exist. |

## Validation

- Run the full Sprint 04 CI suite.
- Add integration tests for valid, invalid, unauthorised, duplicate, concurrent, oversized, and failed requests.
- Exercise Stripe webhook signature failure, duplicate delivery, delayed payment, refund, dispute,
  clinical rejection, and browser-return-without-webhook cases using synthetic test-mode data.
- Inspect bundles and logs for seeded canary secrets and prohibited health fields.
- Test security headers and cache behaviour on local and Cloudflare preview routes.
- Trigger a controlled error and uptime alert; follow the incident path to closure.
- Restore approved non-production fixtures and reconcile record counts/checksums.
- Run the portable acceptance suite independently of React component internals.

## Non-Goals

- Enabling workflows excluded from the approved v1 pilot.
- Storing real patient data in development, CI, fixtures, or RAG documents.
- Treating Cloudflare controls as a substitute for server-side authorisation or validation.
- Performing the Next.js migration in this sprint.

## Risks and Rollback

Security controls can block legitimate pilot use, while permissive fallbacks can expose sensitive workflows. Introduce limits and headers through preview verification with an emergency disable path. Schema or state changes require reversible migrations and backups. Observability must fail safely without blocking primary transactions or leaking sensitive payloads.

## Documentation and RAG Updates

- Add environment, security, audit, observability, incident, recovery, and migration-contract documentation.
- Update TD-013–TD-020 and TD-055 only for the acceptance evidence actually demonstrated and
  independently reviewed; Sprint 05 does not replace Sprint 03 decision approvals.
- Refresh `docs/RAG/02-current-state.md`, `03-platform-evolution.md`, `04-domain-glossary.md`, `05-decision-register.md`, `06-known-limitations.md`, and `07-index.json`.
- Produce `docs/03-completion-reports/phase-01/sprint-05-data-security-operations.md`.
