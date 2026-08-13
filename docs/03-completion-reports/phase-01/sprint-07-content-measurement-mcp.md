---
report_id: phase-01-sprint-07-completion
title: Sprint 07 Content Governance, Measurement, and MCP Boundaries
status: completed
date: 2026-08-14
owner: "@Muhns13G"
---

# Sprint 07 Completion Report — Content Governance, Measurement, and MCP Boundaries

## Mission and Outcome

Sprint 07 established one governed public-content model, reconciled patient-journey projections,
implemented a privacy-minimised measurement boundary, and re-proved that MCP remains absent from v1.
Tasks 7.1–7.12 are complete. TD-040, TD-045, TD-046, TD-047, and TD-048 are Verified. The Sprint
does not activate measurement, transactional pathways, MCP, or claims that still lack domain evidence.

## Work and Decisions

- Approved five canonical public journey phases with controlled three-step, four-event, intake,
  confirmation, metadata, support, and campaign projections.
- Added portable `public-content.catalogue@1` and `public-claims.register@1` contracts with stable
  IDs, revisions, channels, owners, approval/evidence requirements, lifecycle dates, withdrawal,
  archive, rollback, and fail-closed publication rules.
- Centralised 22 website, metadata, campaign, support, and preserved-prototype consumers without
  changing established messaging beyond three owner-approved qualified timing replacements.
- Mapped and tested 34 retained content representations. Twenty-eight active claim variants remain
  pending named evidence; three displaced stronger timing variants remain rejected history.
- Approved a tiered first-party data strategy and implemented nine allowlisted generic events behind
  explicit opt-in, withdrawal, strict prohibited-data rules, private Supabase storage, governed
  aggregation/export/deletion, and 30-day raw/12-month evidence limits.
- Kept measurement disabled with no public caller. Hosted tests proved both endpoints remain hidden
  and the Supabase governance, access, retention, purge, export, deletion, and cleanup boundaries.
- Re-proved MCP absence in source, dependencies, generated routes, build output, local routing, and
  hosted routing. Any future public or private MCP requires a separately approved use case and
  threat model.
- Completed the full local, database, browser, audit, build, dry-run, hosted-negative-boundary, and
  encrypted treatment-intent validation matrix.

## Deviations from the Plan

- The original minimal-measurement discussion was expanded into an owner-approved tiered strategy:
  useful generic funnel and operating evidence is retained, while identity, health, treatment
  intent, credentials, free text, replay, fingerprints, and advertising profiles remain prohibited.
- Measurement received hosted Supabase governance proof during Task 7.9, exceeding a repository-only
  implementation while still leaving collection disabled.
- Task 7.11 initially failed because the active Worker lacked its required intent secret. Declaring
  the secret in Wrangler and generated types converted this from a silent fail-closed state into a
  deployment requirement.
- A later hosted failure was not a key mismatch: cryptographic authentication succeeded, but a
  457 ms Worker/local clock difference triggered a zero-tolerance future-time check. A bounded
  60-second tolerance was added and verified without changing the 30-minute expiry.
- Clinical/legal/pharmacy evidence was not invented to satisfy closure. The affected claims remain
  fail-closed under existing TD-006/TD-007 activation gates.

## Lessons Learned

- Centralisation improves maintainability only when the source also carries lifecycle, evidence,
  channel, rollback, and withdrawal controls.
- Product measurement can support commercial learning without collecting every available datum;
  explicit questions and strict schemas produce more defensible evidence than unrestricted capture.
- Disabled-by-default capability still requires full persistence, access, retention, deletion, and
  hosted-network proof before later activation can be considered.
- Runtime-secret presence and deployed-version scope need explicit hosted evidence; local and build
  success cannot prove them.
- Distributed clocks cannot be assumed identical. Short-lived authenticated state needs a bounded,
  tested skew allowance while expiry and tamper checks remain fail-closed.

## Technical Debt and Residual Risk

No new technical-debt ID accrued.

- **Verified:** TD-040 canonical journey consistency; TD-045 privacy-safe measurement governance;
  TD-046 governed shared public-content source; TD-047 claim/MCP publication controls; TD-048 MCP
  absence and reintroduction boundary.
- **Existing activation gates:** TD-006 and TD-007 remain In progress until the 28 retained claim
  variants and peptide pathway receive the named evidence and domain approvals.
- Measurement remains disabled until an approved public consent interface and explicit
  privacy/security release approval exist.
- Transactional routes, patient data, clinical decisions, payments, fulfilment, and MCP remain
  outside this Sprint's activation authority.

## Existing Files Modified

| File or group                                                                                                                                                 | Sprint change                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `.env.example`, `.github/workflows/ci.yml`, `AGENTS.md`, `package.json`                                                                                       | Added governed measurement, hosted validation, MCP-absence, and configuration guidance/checks. |
| `config/environment-catalogue.ts`, `src/config/environment.test.ts`, `src/server/config/environment-schema.ts`, `worker-configuration.d.ts`, `wrangler.jsonc` | Registered default-off measurement and required intent-secret runtime boundaries.              |
| `contracts/capabilities.ts`, `catalogue.ts`, `index.ts`, `portability.ts`, `registry.ts`, and `contracts/fixtures/retained-capabilities.json`                 | Registered portable public-content, claim, and measurement contracts and migration invariants. |
| Sprint 07 plan, technical-debt registry, and `docs/RAG/{00,02,04,05,06,07-*}`                                                                                 | Reconciled decisions, evidence, debt, limitations, retrieval state, and closure.               |
| `e2e/boundaries.spec.ts`, `e2e/fixtures.ts`                                                                                                                   | Extended inactive measurement and retired MCP browser boundaries.                              |
| `src/components/{Benefits,CtaSection,Discretion,Doctor,Footer,Hero,HowItWorks,Nav,Timeline,Treatments,TrustStrip}.tsx`                                        | Migrated public representations to the canonical runtime source.                               |
| `src/lib/campaigns.ts`, `src/lib/support-channels.ts`                                                                                                         | Centralised campaign and support content references.                                           |
| `src/routes/{__root,contact,index,peptides,poster-thanks,poster,privacy,start,terms}.tsx`, `src/routeTree.gen.ts`                                             | Migrated route copy/metadata and generated the two measurement API routes.                     |
| `src/domain/journey/treatment-intent.ts` and its test; `src/server/journey/treatment-intent-http.test.ts`                                                     | Required the hosted secret and added bounded clock-skew regression behaviour.                  |
| `src/server/security/request-security.ts` and its test                                                                                                        | Added measurement request-security policies and negative evidence.                             |
| `src/adapters/recovery/hosted-recovery-support.ts`, `tsconfig.json`, `vitest.config.ts`                                                                       | Preserved Worker environment typing and included the new portable/content test surfaces.       |

## Existing Files Deleted

No existing file was deleted during Sprint 07.

## Files Created

| File or group                                                                                                                                  | Purpose                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `content/public-content.ts`, `public-content.test.ts`, `public-content-governance.ts`, `public-content-governance.test.ts`                     | Framework-neutral runtime content source, mappings, and lifecycle/drift verification.                  |
| `contracts/{public-content,public-claims,measurement}.ts` and tests; `contracts/retained-public-claims.ts`                                     | Portable content, exact-claim, and measurement contracts plus retained-claim inventory.                |
| `docs/02-implementation-plans/phase-01/annexures/sprint-07-*.md`                                                                               | Task 7.1–7.11 decisions, implementation boundaries, and verification evidence.                         |
| `docs/03-completion-reports/phase-01/sprint-07-content-measurement-mcp.md`                                                                     | Sprint mission, decisions, deviations, lessons, debt, inventory, and closure evidence.                 |
| `scripts/check-mcp-absence.ts`, `test-hosted-mcp-absence.ts`, `test-hosted-measurement-network.ts`, `test-supabase-measurement-integration.ts` | Static, built, hosted, and database boundary proofs.                                                   |
| `src/application/measurement/*`, `src/adapters/persistence/supabase/supabase-measurement-repository*`                                          | Provider-neutral measurement service/repository ports, implementation, and tests.                      |
| `src/server/measurement/*`, `src/routes/api/measurement/{consent,events}.ts`                                                                   | Server-only default-off consent/event boundary and HTTP tests/routes.                                  |
| Three `supabase/migrations/20260813*_measurement_*.sql` files and two `supabase/tests/database/pilot_measurement_*.test.sql` files             | Private forced-RLS persistence, governance, export role/purpose matrix, retention, and pgTAP evidence. |

Git records 42 added and 56 modified files from Sprint 06 closure `721528f` through this Task 7.12
working tree; no file was deleted.

## Validation and Closure Boundary

Task 7.11 recorded Bun 1.3.14 and Node 22.22.2; 58 Vitest files/323 tests; 15 migrations;
11 pgTAP files/336 assertions; all synthetic integrations; incident and 125/125 encrypted recovery;
two zero-finding audits; production build, portability, generated-route/client checks, Worker
dry-run; and 118/118 desktop/mobile Playwright/axe checks. The owner confirmed exact-commit GitHub
CI and deployed the Worker corrections.

The final canonical `test:intent:hosted` exercise passed valid opaque selection, secure cookie
attributes, invalid-selection fail-closed behaviour, tamper and expiry rejection, and zero URL or
response-payload intent fields. Task 7.12 revalidated the focused intent tests, strict TypeScript,
ESLint, Prettier, production build, generated outputs, RAG JSON, and diff integrity.

Sprint 07 is fully implemented and closed at its governed inactive boundary. Closure does not
constitute clinical, legal, pharmacy, privacy/security activation, pilot launch, or public release
approval. The next commit must pass required hosted CI before it becomes the exact closure-document
checkpoint.
