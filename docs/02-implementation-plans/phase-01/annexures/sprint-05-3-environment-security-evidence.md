---
evidence_id: phase-01-sprint-05-task-03
title: Sprint 05.3 Environment and Secret Safety
status: verified-task-evidence
date: 2026-08-10
source_commit: 7caf2a1
owner: "@Muhns13G"
related_debt: [TD-019]
---

# Sprint 05.3 Environment and Secret Safety

## Mission and Boundary

Implement a secret-free catalogue, validate current public configuration before compilation,
establish fail-closed server startup validation, and continuously prove server-only configuration
cannot enter browser output. No provider, credential, patient data, route, or transaction is added.

## Implemented Controls

| Surface        | Outcome                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogue      | All three real `VITE_*` variables have purpose, owner, sensitivity, environments, requirement, exposure, and rotation metadata. No placeholder secret exists.                 |
| Public build   | Vite validates only declared `VITE_*` names. Media accepts root-relative or HTTPS locations; print proof accepts exact `true`/`false`; empty optional values remain disabled. |
| Safe failure   | Invalid or unknown public configuration stops the build with `PUBLIC_ENVIRONMENT_INVALID` and a generic message that does not echo values.                                    |
| Server startup | `src/server.ts` is the explicit Worker entry. A server-only strict schema executes at isolate startup and intentionally requires no secret until a real consumer exists.      |
| Import safety  | The server environment module carries TanStack's server-only marker and remains inaccessible to client imports.                                                               |
| Bundle canary  | Every production build requires a synthetic canary in server output and rejects that marker or any catalogued server-only name in `dist/client`.                              |
| Operations     | Local, preview, production, addition, rotation, revocation, evidence, and suspected-exposure procedures are documented without values.                                        |

The established route behavior is preserved. `/peptides`, `/poster`, and `/poster-thanks` now read
the same normalized build values instead of parsing `import.meta.env` independently; their visible
wording and inactive defaults do not change.

## Negative Evidence

- A controlled build with an invalid print-proof value stopped before compilation and emitted only
  `Public build configuration is invalid.`; the supplied value was absent from the error.
- Unit tests reject HTTP/protocol-relative/script media, invalid boolean text, unknown `VITE_*`
  names, and unexpected server fields.
- A production build confirmed the synthetic marker exists in `dist/server` and is absent from
  `dist/client`.

## Verification

- `bun install --frozen-lockfile` — passed with 485 installs across 525 packages and no changes.
- `bun run format:check`, `bun run lint`, and `bun run typecheck` — passed.
- `bun run test -- --reporter=verbose` — passed: 8 files and 35 tests, including 11 environment
  assertions.
- `bun run build` and `bun run build:dev` — passed; both client-bundle canary checks passed.
- `bun run audit` and `bun run audit:prod` — passed with no vulnerabilities.
- `bun run check:generated`, `bun run deploy:dry-run`, and `git diff --check` — passed; the dry-run
  found no bindings and did not deploy. Wrangler emitted its known sandbox-only log-file warning.
- Production preview through the custom Worker entry returned HTTP 200 for `/`, `/peptides`,
  `/poster`, `/poster-thanks`, `/start`, `/privacy`, `/terms`, and `/contact`; an unknown route
  returned HTTP 404. Preview logs contained no startup or request failure.

## Debt Disposition

TD-019 is Verified for the current no-secret runtime. Future provider work must extend—not bypass—
the catalogue, schema, provisioning, rotation, revocation, and bundle checks in the same commit as
its first server consumer. Provider selection remains the separate Task 5.5 gate.

## Next Boundary

Task 5.4 may add public, asset, error, and sensitive-route headers and cache policy. It must preserve
the configuration validation and explicit `src/server.ts` Worker entry added here.
