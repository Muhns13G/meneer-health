---
report_id: phase-01-sprint-05-completion
title: Sprint 05 Data, Security, and Operational Foundations
status: completed
date: 2026-08-12
owner: "@Muhns13G"
---

# Sprint 05 Completion Report — Data, Security, and Operational Foundations

## Mission and Outcome

Sprint 05 implemented the minimum portable server, data, identity, authorisation, audit, request
security, observability, recovery, payment, fulfilment, and migration foundations for v1. Tasks
5.1–5.21 are complete, including hosted identity/request-security proof and the final local/hosted
validation matrix.
Inactive customer and provider boundaries continue to fail closed.

## Work and Decisions

- Established versioned framework-neutral contracts, stable errors, environment validation,
  client-secret canaries, CSP/security headers, and explicit cache classes.
- Selected a free-tier-first, replaceable pilot stack and provisioned Supabase in London while
  keeping hosted data/auth/provider integrations disabled pending activation evidence.
- Added twelve versioned PostgreSQL migrations with forced RLS, revoked browser privileges, opaque
  identifiers, tenancy, identity/session governance, contextual authorisation, workflow commands,
  append-only audit, inbox/outbox, lifecycle, payments, and fulfilment reconciliation.
- Implemented provider-neutral application ports and Supabase/Stripe adapters with server-owned
  validation, idempotency, replay/concurrency controls, explicit independent states, and safe
  failure behavior.
- Added payload-free Worker telemetry, denial evidence, controlled incident/recovery exercises,
  encrypted logical archives, and current 125/125 restore reconciliation.
- Provisioned Better Stack monitor `4799009` and proved confirmation, email delivery, 76-second
  acknowledgement, healthy recovery, and automatic closure without application logs or private data.
- Provisioned Task 5.19's private EU R2 bucket, bucket-only writer, 35-day expiry, and payload-free
  heartbeat; proved encrypted upload, durable-write failure without a false heartbeat, missed-alert
  acknowledgement, automatic recovery, R2 read-after-write, decryption, isolated three-record
  restore/reconciliation, synthetic-object deletion, heartbeat ordering, and restoration of the
  permanent monitoring policy.
- Added inactive one-time Stripe Checkout and minimum-data partner/fulfilment boundaries. No charge,
  public mutation, production credential, patient data, or real partner callback was enabled.
- Froze 14 capability records, 14 contract-major mappings, 20 portable fixtures, a CI drift check,
  and a governed v1-to-v2 rehearsal/cutover/rollback template.
- Applied and reconciled all twelve migrations on hosted Supabase, verified Auth and contextual
  authorisation synthetically, configured Brevo custom SMTP, reviewed current advisors, and removed
  all removable hosted synthetic identities after exact dependency checks.

## Deviations from the Plan

- The Sprint was initially recorded as 19 completed commit-sized tasks, but Task 5.19 had been
  narrowed without reconciling its original hosted round-trip requirements. Tasks 5.19–5.21 were
  restored as explicit commit-sized follow-through; Task 5.19 has since passed its hosted proof.
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
- Final cleanup found five orphaned provider identities left by hosted lifecycle exercises. They had
  no immutable-audit or workflow dependencies and were deleted by exact identifier before closure.

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
- A CI secret that is optional for one dispatch mode may arrive as an empty string; environment
  validation must normalise that case without weakening the production-required rule.
- Hosted exercise cleanup needs an independent final inventory; a test's `finally` block can remove
  the provider user while intentionally retained internal-identity triggers leave synthetic rows.

## Technical Debt and Residual Risk

No new technical-debt ID accrued. TD-013–TD-020 and TD-055 are Verified for the implemented,
deliberately inactive Sprint 05 boundary.
Tasks 5.18–5.19 complete public uptime, heartbeat-failure and provider-backed synthetic R2 recovery
evidence. Task 5.20 now passes hosted identity, contextual-authorisation, disabled-break-glass and
inactive request-security exercises and has configured a verified Brevo SMTP sender/domain.
Recovery delivery passes, while the invitation to the published support address hard-bounced
because the recipient account did not exist. A post-alias retry was accepted by Supabase but again
ended in a Brevo block caused by stale hard-bounce suppression. External inbox proof confirmed the
alias, the suppression was removed, and the final approved invitation reached Delivered with Auth
users returned to zero. TD-005 is Verified. Task 5.21 re-ran the complete matrix, reviewed hosted
advisors and state, corrected five orphaned synthetic identities, and Verified TD-013, TD-017, and
TD-020 against their acceptance evidence. Direct provider Auth links remain activation-gated behind
FC-001's future first-party confirmation/OTP boundary. TD-006, TD-007,
TD-009, and TD-010 continue to gate real peptide, operating-party, commercial and fulfilment use.

The final recovery retry also found that provider-user deletion retained the intended stable
subject/contact but recreation did not relink it during Supabase's insert-before-confirmation
sequence. Two migrations and a pgTAP regression now cover returning identities. Hosted proof
created the returning identity, accepted recovery, preserved one stable subject/contact, removed
the temporary Auth user and then removed the exact synthetic retained identity fixture. Final
delivery initially remained blocked by stale Brevo suppression on `sales@`; after exact unblocking,
the final approved recovery email reached Gmail at 13:12 without its token-bearing link being
opened or recorded. A clean local reset applied all twelve migrations and passed nine pgTAP files /
296 assertions before Supabase was stopped cleanly.

## Existing Files Modified

| File or group                                                                           | Sprint change                                                                                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `.env.example`, `.github/workflows/ci.yml`, `.prettierignore`, `AGENTS.md`, `README.md` | Added environment, CI, generated/test, and contributor contracts.                                                  |
| `package.json`, `bun.lock`, TypeScript/ESLint/Vite/Vitest/Wrangler configuration        | Added bounded dependencies, scripts, runtime bindings, and strict validation.                                      |
| `docs/00-blueprints/`, phase plan, debt registry, future considerations, decisions, RAG | Reconciled the selected architecture, delivery evidence, debt, and retrieval state through final Sprint 5 closure. |
| `docs/06-operations/cloudflare-environments-release-runbook.md`, `testing-ci-guide.md`  | Extended environment, provider, test and release operations.                                                       |
| `e2e/boundaries.spec.ts`                                                                | Added security, inactive-endpoint and non-transactional boundary coverage.                                         |
| `src/routes/peptides.tsx`, `poster.tsx`, `poster-thanks.tsx`, `src/routeTree.gen.ts`    | Routed public environment values and retained fail-closed presentation behavior.                                   |

## Existing Files Deleted

No existing file was deleted during Sprint 05.

## Files Created

| File or group                                                                                                          | Purpose                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `config/*`, `contracts/*`, `contracts/fixtures/*`                                                                      | Environment catalogue and portable runtime/domain contracts and fixtures.            |
| `docs/02-implementation-plans/phase-01/annexures/sprint-05-*`                                                          | Task 5.1–5.21 implementation, activation, and verification evidence.                 |
| `docs/06-operations/*` Sprint 05 runbooks and `DR-009`                                                                 | Operating procedures, provider decision, recovery and migration gates.               |
| `scripts/check-*`, `scripts/run-*`, `scripts/test-*`                                                                   | Portability, incident, recovery and synthetic provider/integration exercises.        |
| `src/domain/access/*`, `src/application/*`, `src/adapters/*`                                                           | Provider-neutral rules, services, ports and Supabase/Stripe adapters.                |
| `src/server.ts`, `src/server/config/*`, `src/server/security/*`, `src/server/observability/*`, `src/server/payments/*` | Worker-side configuration, security, telemetry and inactive payment HTTP boundaries. |
| `src/routes/api/payments/*`                                                                                            | Exact inactive local checkout and Stripe webhook routes.                             |
| `supabase/config.toml`, migrations, seed and database tests                                                            | Local/hosted PostgreSQL/Auth foundation and 296 pgTAP assertions.                    |
| `public/_headers`, `worker-configuration.d.ts`                                                                         | Static fallback security policy and generated Cloudflare runtime types.              |

## Validation and Closure Boundary

Task 5.21 records passing format, lint, strict typecheck, 41-file/245-test Vitest, dual zero-finding
audits, production build, generated checks, Cloudflare dry run, 54 Playwright checks, a
twelve-migration/296-assertion pgTAP suite, every synthetic integration, incident rehearsal, and an
encrypted 125/125 restore in seven seconds. The current canonical deployment preserves approved
presentation, headers, caching, redirects, 404s, and inactive transaction boundaries.

The Task 5.17 owner checkpoint and required hosted workflow pass. Tasks 5.18–5.20 add public
monitoring, hosted recovery, identity, request-security, and SMTP evidence. Task 5.21 completes the
final matrix, hosted advisor review, and exact synthetic cleanup. Sprint 05 is fully implemented and
closed as an engineering-foundation sprint. This status does not approve the pilot, real patient
data, live payments, or provider activation; every newly enabled route must pass its separate
activation gate.
