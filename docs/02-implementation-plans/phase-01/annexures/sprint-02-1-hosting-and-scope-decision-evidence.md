---
evidence_id: phase-01-sprint-02-task-01
title: Sprint 02 Task 2.1 Hosting and Scope Decision Evidence
status: verified
date: 2026-08-07
owner: "@Muhns13G"
---

# Sprint 02 Task 2.1 — Hosting and Scope Decision Evidence

## Decision

The repository owner approved Cloudflare as the runtime host for the TanStack Start v1 pilot.
Vercel is not part of Sprint 02 and remains a possible hosting choice for the planned Next.js v2.
The owner also approved removing the Lovable-backed MCP surface because it has no required v1 pilot
use case.

## Basis

- The current v1 application already runs on Cloudflare and the canonical review deployment is
  available at `https://meneerhealth.co.za`.
- Cloudflare officially supports TanStack Start through its Vite plugin and Workers runtime.
- Workers Free documents limits suitable for the current lightweight review surface: 100,000
  dynamic requests per day, 10 ms CPU per invocation, 128 MB memory, and free ordinary static-asset
  requests. Runtime use must still be monitored as server work grows.
- Vercel supports TanStack Start through Nitro, but Vercel Hobby permits non-commercial personal use
  only. Meneer's commercial pilot would require a paid plan.
- Hosting selection does not select a database, identity, email, payment, or patient-data platform.

References: [Cloudflare TanStack Start](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[Vercel TanStack Start](https://vercel.com/docs/frameworks/full-stack/tanstack-start), and
[Vercel Hobby](https://vercel.com/docs/plans/hobby).

## Documentation Reconciled

The obsolete Vercel-specific Sprint 02 plan was replaced with the approved Cloudflare runtime plan.
The master blueprint, phase index, TD-052, TD-053, RAG project state, platform evolution, glossary,
decision register, limitations, and retrieval index now reflect DIR-030 and DIR-031.

TD-052 and TD-053 remain **In progress**. This task settles their decisions; later Sprint 02 tasks
must still replace hidden configuration, remove MCP, and verify local and hosted behaviour.

## Validation and Boundary

- Current authoritative documentation contains no unresolved v1 host or MCP keep/remove decision.
- RAG index JSON parses successfully.
- Historical Sprint 01 statements remain unchanged as time-specific completion evidence.
- No application source, dependency, generated route, deployment, or branch mapping changed in this
  task.

Task 2.2 must begin only after repository-owner review and manual commit of this documentation-only
boundary. Codex did not push to GitHub or perform a deployment.
