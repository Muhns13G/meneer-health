---
evidence_id: phase-01-sprint-05-task-02
title: Sprint 05.2 Framework-Neutral Contract Foundation
status: verified-task-evidence
date: 2026-08-10
source_commit: dc366f9
owner: "@Muhns13G"
related_debt: [TD-014, TD-055]
---

# Sprint 05.2 Framework-Neutral Contract Foundation

## Mission and Boundary

Create the first executable implementation of DR-004 without activating a transaction or selecting
an external provider. The task establishes portable module rules, strict common envelopes, stable
safe errors, integer-major compatibility, registry metadata, and representative contract tests.
It does not define gated business payloads, persist records, expose an endpoint, or change public
wording.

## Implemented Foundation

| Surface            | Outcome                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical location | Top-level `contracts/` is independent of React, TanStack, Cloudflare, routes, ORMs, and provider SDKs.                                                                                     |
| Envelopes          | Strict command and committed-event schemas implement the semantic fields approved in DR-004.                                                                                               |
| Validation         | Opaque transport-safe identifiers, lower-case dot names, RFC-3339 timestamps, non-negative expected versions, and positive integer contract majors are checked at runtime.                 |
| Errors             | Ten stable DR-004 error classes use bounded single-line safe messages and explicit retry classifications.                                                                                  |
| Catalogue          | Definitions require kind, owner, consumers, version, sensitivity, idempotency, and lifecycle metadata.                                                                                     |
| Compatibility      | Consumers can test or assert support for an explicitly registered positive integer major and reject unknown majors safely.                                                                 |
| Dependencies       | ESLint prevents canonical contracts from importing application/UI/framework code and prevents future domain/application layers from depending outward on routes, UI, or concrete adapters. |
| Fixtures and tests | Synthetic valid and invalid command/event/error/catalogue/version fixtures execute outside route and framework code.                                                                       |

Zod 4.4.3 was reintroduced in `dependencies`, not `devDependencies`, because production contract
modules execute runtime validation when a server boundary consumes them; it is not build/test
tooling. No transactional route consumes the foundation yet. `bun.lock` is synchronized. The
feature trigger and outcome are recorded in the dependency-reintroduction register.

## Verification

- `bun install --frozen-lockfile` — passed with 485 installed packages checked and no changes.
- `bun run format:check` — passed.
- `bun run typecheck` — passed.
- `bun run lint` — passed, including dependency restrictions.
- `bun run test -- --reporter=verbose` — passed: 7 files and 24 tests, including 13 new contract
  assertions.
- `bun run audit` and `bun run audit:prod` — passed with no vulnerabilities.
- `bun run build` and `bun run check:generated` — passed; canonical contracts did not change the
  generated route tree.
- `bun run deploy:dry-run` — passed with no bindings and no deployment. Wrangler emitted its known
  sandbox-only log-file permission warning while still completing the build and upload validation.
- `git diff --check` — passed.
- No route, component, stylesheet, asset, environment value, Cloudflare binding, or public wording
  changed.

## Debt Disposition

TD-014 and TD-055 move from Open to In progress. Neither is Verified:

- TD-014 still requires approved payload contracts, authorisation, real commands and state
  machines, durable idempotency, replay/concurrency handling, transactions, and false-success tests.
- TD-055 still requires the retained-capability catalogue, full portable fixture/acceptance suite,
  behavioural-equivalence evidence, and migration rehearsal/cutover/rollback proof.

The generic `example.perform` fixtures are deliberately synthetic and contain no patient, health,
clinical, payment, provider, or partner data.

## Next Boundary

Task 5.3 may implement the secret-free environment catalogue and server-only configuration
validation. The canonical contract foundation must remain provider neutral; business contract
families may be added only when their DR-005, DR-006, and DR-007 fields and authorities are approved.
