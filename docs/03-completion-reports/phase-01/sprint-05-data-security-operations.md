---
report_id: phase-01-sprint-05-completion
title: Sprint 05 Data, Security, and Operational Foundations
status: activation-follow-through
date: 2026-08-11
owner: "@Muhns13G"
---

# Sprint 05 Completion Report — Data, Security, and Operational Foundations

## Mission and Outcome

Sprint 05 implements the minimum portable server, data, identity, authorisation, audit, request
security, observability, recovery, payment, fulfilment, and migration foundations for v1. All 18
tasks through the Better Stack public-uptime activation are implemented. Inactive customer/provider
boundaries continue to fail closed. The Task 5.17 exact-commit hosted workflow passes; Task 5.18's
documentation now awaits the normal owner-controlled commit and hosted workflow.

## Work and Decisions

- Established versioned framework-neutral contracts, stable errors, environment validation,
  client-secret canaries, CSP/security headers, and explicit cache classes.
- Selected a free-tier-first, replaceable pilot stack and provisioned Supabase in London while
  keeping hosted data/auth/provider integrations disabled pending activation evidence.
- Added nine versioned PostgreSQL migrations with forced RLS, revoked browser privileges, opaque
  identifiers, tenancy, identity/session governance, contextual authorisation, workflow commands,
  append-only audit, inbox/outbox, lifecycle, payments, and fulfilment reconciliation.
- Implemented provider-neutral application ports and Supabase/Stripe adapters with server-owned
  validation, idempotency, replay/concurrency controls, explicit independent states, and safe
  failure behavior.
- Added payload-free Worker telemetry, denial evidence, controlled incident/recovery exercises,
  encrypted logical archives, and current 125/125 restore reconciliation.
- Provisioned Better Stack monitor `4799009` and proved confirmation, email delivery, 76-second
  acknowledgement, healthy recovery, and automatic closure without application logs or private data.
- Added inactive one-time Stripe Checkout and minimum-data partner/fulfilment boundaries. No charge,
  public mutation, production credential, patient data, or real partner callback was enabled.
- Froze 14 capability records, 14 contract-major mappings, 20 portable fixtures, a CI drift check,
  and a governed v1-to-v2 rehearsal/cutover/rollback template.

## Deviations from the Plan

- The Sprint was delivered as 18 commit-sized tasks rather than one change, preserving reviewable
  boundaries and a buildable repository after each task.
- Supabase, Stripe and Docker-backed proof went beyond the original scaffold expectation, but all
  exercises remained synthetic, test-mode, no-charge, and inactive in hosted environments.
- Free-tier constraints produced compensating controls: application-managed session limits,
  encrypted logical recovery exports, payload-free heartbeats, and provider-neutral ports.
- Task 5.17 found that the Task 5.13 recovery schema list had not absorbed Task 5.15’s
  `fulfilment_private` dependency. The dump boundary was extended before closure and now restores
  125/125 records.
- Hosted Task 5.17 evidence is split: the current deployment is response-verified, while exact-commit
  CI followed the owner’s checkpoint commit and passed. Task 5.18 was added as explicit hosted
  activation follow-through rather than overstating Task 5.12's repository-only monitor evidence.

## Lessons Learned

- A recovery exercise must evolve with every later schema migration; a previously passing restore
  is not permanent evidence for a growing database.
- Provider-neutral ports make free-tier services replaceable, but portability claims still require
  executable fixtures, schema links, reconciliation, and rollback evidence.
- Deny-default inactive routes permit realistic integration testing without implying launch or
  exposing incomplete transactions.
- Audit, payment, clinical and fulfilment states must remain independent; provider success alone is
  never workflow completion.
- Hosted response checks and hosted CI prove different things and must be recorded separately.

## Technical Debt and Residual Risk

No new technical-debt ID accrued. TD-014, TD-015, TD-016, TD-018, TD-019, and TD-055 are Verified.
Task 5.18 completes the hosted Better Stack public-monitor and incident-response portion of TD-020.
TD-013, TD-017, and TD-020 remain In progress only for future activation evidence: authenticated
customer/workforce journeys and approved break glass; route-specific hosted abuse/WAF proof; and
the backup heartbeat, private EU R2, Stripe webhook, and partner callbacks. TD-007, TD-009, and
TD-010 continue to gate real peptide, operating-party, commercial and fulfilment use.

## Existing Files Modified

| File or group                                                                           | Sprint change                                                                                         |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.env.example`, `.github/workflows/ci.yml`, `.prettierignore`, `AGENTS.md`, `README.md` | Added environment, CI, generated/test, and contributor contracts.                                     |
| `package.json`, `bun.lock`, TypeScript/ESLint/Vite/Vitest/Wrangler configuration        | Added bounded dependencies, scripts, runtime bindings, and strict validation.                         |
| `docs/00-blueprints/`, phase plan, debt registry, future considerations, decisions, RAG | Reconciled the selected architecture, delivery evidence, debt, and retrieval state through Task 5.18. |
| `docs/06-operations/cloudflare-environments-release-runbook.md`, `testing-ci-guide.md`  | Extended environment, provider, test and release operations.                                          |
| `e2e/boundaries.spec.ts`                                                                | Added security, inactive-endpoint and non-transactional boundary coverage.                            |
| `src/routes/peptides.tsx`, `poster.tsx`, `poster-thanks.tsx`, `src/routeTree.gen.ts`    | Routed public environment values and retained fail-closed presentation behavior.                      |

## Existing Files Deleted

No existing file was deleted during Sprint 05.

## Files Created

| File or group                                                                                                          | Purpose                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `config/*`, `contracts/*`, `contracts/fixtures/*`                                                                      | Environment catalogue and portable runtime/domain contracts and fixtures.            |
| `docs/02-implementation-plans/phase-01/annexures/sprint-05-*`                                                          | Task 5.1–5.18 implementation, activation, and verification evidence.                 |
| `docs/06-operations/*` Sprint 05 runbooks and `DR-009`                                                                 | Operating procedures, provider decision, recovery and migration gates.               |
| `scripts/check-*`, `scripts/run-*`, `scripts/test-*`                                                                   | Portability, incident, recovery and synthetic provider/integration exercises.        |
| `src/domain/access/*`, `src/application/*`, `src/adapters/*`                                                           | Provider-neutral rules, services, ports and Supabase/Stripe adapters.                |
| `src/server.ts`, `src/server/config/*`, `src/server/security/*`, `src/server/observability/*`, `src/server/payments/*` | Worker-side configuration, security, telemetry and inactive payment HTTP boundaries. |
| `src/routes/api/payments/*`                                                                                            | Exact inactive local checkout and Stripe webhook routes.                             |
| `supabase/config.toml`, migrations, seed and database tests                                                            | Local synthetic PostgreSQL/Auth foundation and 293 pgTAP assertions.                 |
| `public/_headers`, `worker-configuration.d.ts`                                                                         | Static fallback security policy and generated Cloudflare runtime types.              |

## Validation and Closure Boundary

The Task 5.17 evidence records passing format, lint, strict typecheck, 40-file/237-test Vitest,
dual zero-finding audits, production build, generated checks, Cloudflare dry run, 54 Playwright
checks, nine-migration/293-assertion pgTAP suite, all synthetic integrations, incident rehearsal,
and encrypted 125/125 restore. The current canonical deployment preserves approved presentation,
headers, caching, redirects, 404s, and inactive transaction boundaries.

The Task 5.17 owner checkpoint is committed and its required hosted workflow passes. Task 5.18's
Better Stack activation and controlled hosted incident also pass; its evidence now awaits the normal
owner-controlled commit and hosted workflow. Sprint 05 remains in activation follow-through while
TD-013, TD-017 and the remaining TD-020 heartbeat/R2/webhook/callback gates are open. This status
does not approve the pilot, real patient data, live payments, or provider activation.
