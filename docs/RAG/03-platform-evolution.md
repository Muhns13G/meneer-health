---
rag_id: meneer-platform-evolution
title: Meneer Platform Evolution and Migration Contract
status: owner-confirmed-direction
authority: strategic
last_updated: 2026-08-10
audience: internal
sensitivity: internal
sources:
  - docs/00-blueprints/master-blueprint-v1.md
  - docs/01-audits/project-codebase-audit-2026-08-05.md
  - docs/04-technical-debt/technical-debt-registry-v1.md
  - docs/06-operations/cloudflare-environments-release-runbook.md
  - docs/03-completion-reports/phase-01/sprint-02-lovable-exit-cloudflare-runtime.md
  - docs/07-decisions/DR-003-platform-boundaries-authoritative-state.md
  - docs/07-decisions/DR-004-framework-neutral-contracts-migration.md
  - docs/07-decisions/DR-005-data-tenancy-lifecycle-migration.md
  - docs/07-decisions/DR-006-vendor-evaluation-criteria.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-7-managed-identity-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-2-contract-foundation-evidence.md
  - docs/07-decisions/DR-007-identity-authorisation-architecture.md
  - docs/07-decisions/DR-009-free-tier-pilot-provider-stack.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-5-provider-selection-data-map-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-03-8-architecture-validation-evidence.md
  - docs/03-completion-reports/phase-01/sprint-03-operating-model-architecture.md
---

# Meneer Platform Evolution and Migration Contract

## Generations

### v1 — TanStack Start on Cloudflare

Purpose: stabilise the Lovable-generated MVP, detach Lovable ecosystem coupling, explicitly own and
verify the canonical Cloudflare runtime, and support a controlled one-month real-transaction pilot.
Public marketing remains open; registration,
clinical intake, payment, ordering, and fulfilment are restricted to the enrolled cohort. Every
enabled transaction must be real, durable, monitored, supportable, and portable to v2; peptides
remain gated or waitlisted until approved.

### v2 — Next.js public product

Purpose: absorb verified v1 learning and deliver the public-launch architecture. v2 should retain approved content, terminology, workflows, domain rules, data contracts, fixtures, and acceptance tests while correcting observed v1 weaknesses.

### v3 — Laravel API and React

Purpose: support proven scale, multi-client operations, complex integrations, or team/operational separation when measured demand justifies it. This is a conditional evolution, not a scheduled rewrite.

## Durable Core

DR-003 approves the logical shape of this core: channel-specific public, patient, clinical, and
operations interfaces call an authenticated application/API boundary; framework-neutral domain
modules own invariants and state transitions; persistence and external services remain behind
ports/adapters. v1 may be one modular deployment. This decision does not claim that the core is
implemented today.

The following must survive framework changes where still valid:

- Domain entities, identifiers, workflow states, invariants, and error semantics.
- Versioned API and event contracts.
- Database schema history and data classification.
- Consent versions, audit-event semantics, and retention rules.
- Approved public, clinical, legal, and operational content.
- Framework-independent fixtures and acceptance tests.
- Migration, reconciliation, cutover, rollback, and incident evidence.

React components, route conventions, server-function APIs, Vercel configuration, and framework caches are implementation details. They must not become the sole definition of clinical rules or authoritative records.

Task 5.4 makes the response classes and expected HTTP behaviour portable acceptance requirements:
public documents revalidate, sensitive/error/redirect/cookie-bearing responses are no-store, and
only fingerprinted assets are long-lived immutable. The TanStack Worker wrapper and Cloudflare
`_headers` file are v1 adapters; Next.js/Vercel and Laravel must reproduce the observed contract
using their native response and asset layers rather than copying those implementation files.

## Contract Boundary

DR-004 approves one canonical, runtime-validatable catalogue for commands, queries, results, domain
events, integration messages, errors, and audit facts. It covers identity, consent, intake, triage,
clinical decisions, prescriptions, payments/refunds, orders, fulfilment, support, and audit. Routes,
Server Actions, controllers, ORM models, provider objects, and generated language types are adapters,
not the normative contract.

Compatible changes are additive and optional within a contract major; changed field meaning,
required data, validation, authority, idempotency, errors, state transitions, enumerations without
fallback, or privacy/clinical meaning require a new major. Consumers reject unsupported majors.

Every migration follows inventory, expand, deterministic migration, shadow/reconciliation, staged
cutover, observation, and contraction. Rollback never deletes or rewrites accepted records. Retained
contract fixtures and journey tests—not matching page appearance—prove cross-generation equivalence.

Task 5.2 implements the first portable slice in top-level `contracts/`: strict common command,
event, error, catalogue, and positive-integer-major schemas; synthetic fixtures; compatibility
guards; and framework-independent tests. ESLint enforces the initial inward dependency rules. This
foundation does not yet implement the required business contract families or prove behavioural
equivalence across framework generations; those remain TD-014 and TD-055 work.

## v1 De-Platform Sequence

1. Recover the real brand assets and replace Lovable virtual-asset references.
2. Replace the Lovable Vite wrapper with explicit TanStack Start, Nitro, React, Tailwind, and path-alias configuration.
3. Retain the approved Cloudflare Vite/Workers path while removing hidden Lovable defaults and
   unrelated coupling; reserve the Vercel decision for the later Next.js v2.
4. Normalize the selected-host configuration, then verify TanStack Start
   across local, preview, and production environments.
5. Do not provision `LOVABLE_API_KEY`.
6. **Completed in Sprint 02 Task 2.4:** the Lovable MCP SDK, generated routes, OAuth metadata,
   tools, manifest, and built output were removed. Any future MCP requires a justified use case and
   separately approved vendor-neutral boundary.
7. **Completed in Sprint 02 Tasks 2.5–2.8:** Lovable package-install exceptions, telemetry
   references, historical lockfile cache URLs, and root/fallback identity are removed; hosted
   network and log evidence confirms their absence.
8. **Completed in Sprint 02:** build versions, environment/branch roles, secrets, promotion,
   observability, rollback, SSR, navigation, routes, assets, endpoints, and logs are verified.
   Production and non-production builds pin Bun 1.3.14 and use the documented Bun runner.

## Migration Entry Criteria

A framework migration requires an approved reason based on product evidence, operational need, risk, cost, or scale. Preference alone is insufficient. The source version must have a documented capability catalogue and known limitations before migration begins.

## Migration Completion Criteria

- Retained journeys pass the same framework-independent acceptance tests.
- Intentional changes and removals are approved and documented.
- Data transformation, reconciliation, cutover, and rollback have been rehearsed.
- Security, privacy, accessibility, performance, and operational gates pass.
- No old platform credential, telemetry, runtime route, or deployment dependency remains unintentionally active.
- A completion report records evidence and updates this RAG corpus.

## Platform-Portability Rule

The selected host may provide builds, previews, functions, logs, and static delivery. Selection of identity, PostgreSQL, object storage, messaging, analytics, and clinical integrations must consider POPIA, data location, security, exportability, failure recovery, contractual obligations, and the planned Next.js/Laravel evolution. Replacing Lovable coupling with avoidable host-specific domain coupling is not an acceptable migration outcome.

DR-005 fixes the portable data class at managed PostgreSQL plus encrypted object storage. DR-006
requires each service to pass legal/privacy, security, isolation, portability/exit, recovery,
authority, and commercial gates. DR-009 selects the London Supabase Free project as the v1
PostgreSQL/Auth/private-Storage adapter, Brevo SMTP, Cloudflare telemetry and EU R2 recovery exports, Better Stack uptime/
heartbeat monitoring, and Stripe test mode. Provider bundles and hosting relationships confer no
automatic approval.

This selection remains migration-safe only while ordinary PostgreSQL migrations and dumps,
storage/identity exports, provider-neutral contracts, and tested restore/exit procedures remain
authoritative. Local and CI use local Supabase with synthetic data; Cloudflare branch previews do
not connect to the pilot store. Next.js and Laravel must absorb the proven records and behaviour,
not Supabase-specific UI or workflow logic.

Sprint 03 completes the decision layer for this evolution. Implementation must now demonstrate the
approved contracts and boundaries rather than reinterpret them inside a framework or provider.
Sprint 05 owns the first runtime proof for identity, authorisation, lifecycle, restore, rights, and
portable data operations. Tasks 5.6–5.7 now prove portable tenancy and identity/session boundaries
locally; provider activation and contextual authorisation remain separate gates.

DR-007 keeps identity portable by mapping provider authentication to opaque internal subjects and
server-owned permissions. Tenant, role, resource, assignment, purpose, state, assurance, session,
recovery, break-glass, service-identity, and audit semantics survive an identity or framework
migration; provider claims and framework middleware remain adapters.

Task 3.8 validates the same ownership, permission, lifecycle and contract semantics across nine
required operational and migration scenarios. Cross-generation movement must preserve the approved
retention trigger, restriction/hold, disposition, deletion propagation, audit correlation and
critical one-hour RPO/four-hour RTO rather than resetting lifecycle clocks.
