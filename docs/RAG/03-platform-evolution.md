---
rag_id: meneer-platform-evolution
title: Meneer Platform Evolution and Migration Contract
status: owner-confirmed-direction
authority: strategic
last_updated: 2026-08-07
audience: internal
sensitivity: internal
sources:
  - docs/00-blueprints/master-blueprint-v1.md
  - docs/01-audits/project-codebase-audit-2026-08-05.md
  - docs/04-technical-debt/technical-debt-registry-v1.md
---

# Meneer Platform Evolution and Migration Contract

## Generations

### v1 — TanStack Start on an approved host

Purpose: stabilise the Lovable-generated MVP, detach Lovable ecosystem coupling, choose and verify
the v1 host before Sprint 02, and
support a controlled one-month real-transaction pilot. Public marketing remains open; registration,
clinical intake, payment, ordering, and fulfilment are restricted to the enrolled cohort. Every
enabled transaction must be real, durable, monitored, supportable, and portable to v2; peptides
remain gated or waitlisted until approved.

### v2 — Next.js public product

Purpose: absorb verified v1 learning and deliver the public-launch architecture. v2 should retain approved content, terminology, workflows, domain rules, data contracts, fixtures, and acceptance tests while correcting observed v1 weaknesses.

### v3 — Laravel API and React

Purpose: support proven scale, multi-client operations, complex integrations, or team/operational separation when measured demand justifies it. This is a conditional evolution, not a scheduled rewrite.

## Durable Core

The following must survive framework changes where still valid:

- Domain entities, identifiers, workflow states, invariants, and error semantics.
- Versioned API and event contracts.
- Database schema history and data classification.
- Consent versions, audit-event semantics, and retention rules.
- Approved public, clinical, legal, and operational content.
- Framework-independent fixtures and acceptance tests.
- Migration, reconciliation, cutover, rollback, and incident evidence.

React components, route conventions, server-function APIs, Vercel configuration, and framework caches are implementation details. They must not become the sole definition of clinical rules or authoritative records.

## v1 De-Platform Sequence

1. Recover the real brand assets and replace Lovable virtual-asset references.
2. Replace the Lovable Vite wrapper with explicit TanStack Start, Nitro, React, Tailwind, and path-alias configuration.
3. Decide between the current Cloudflare path and the previously preferred Vercel path against
   runtime support, cost, operations, integrations, portability, and rollback requirements.
4. Remove only the configuration that is obsolete for the selected host, then verify TanStack Start
   across local, preview, and production environments.
5. Do not provision `LOVABLE_API_KEY`.
6. Remove the Lovable MCP SDK, generated routes, and manifest; either defer MCP or reimplement a justified public use case with a vendor-neutral SDK.
7. Replace Lovable metadata and package-install exceptions.
8. Verify build, SSR, routes, assets, endpoints, logs, security headers, rollback, and dependency reachability.

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
