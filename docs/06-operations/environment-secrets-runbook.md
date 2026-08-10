---
runbook_id: meneer-environment-secrets
title: Environment Configuration and Secret Lifecycle Runbook
status: active
last_updated: 2026-08-10
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Environment Configuration and Secret Lifecycle Runbook

## Purpose and Current Boundary

This runbook governs application configuration without storing values in documentation or source.
The machine-checked catalogue is `config/environment-catalogue.ts`; `.env.example` lists names only.
Task 5.6 adds the first optional server consumer through an all-or-none Supabase pair. Values remain
uncommitted and provider-backed persistence stays disabled when the pair is absent.

## Current Catalogue

| Name                            | Exposure            | Required | Owner                      | Lifecycle                                                                   |
| ------------------------------- | ------------------- | -------- | -------------------------- | --------------------------------------------------------------------------- |
| `VITE_PEPTIDE_VIDEO_URL`        | Public client/build | No       | Content and release owner  | Replace with the approved media location.                                   |
| `VITE_PEPTIDE_VIDEO_POSTER_URL` | Public client/build | No       | Content and release owner  | Replace with the associated approved release.                               |
| `VITE_CAMPAIGN_PRINT_PROOF`     | Public client/build | No       | Campaign and release owner | Use exact `true` only for approved proofing; otherwise omit or use `false`. |
| `SUPABASE_URL`                  | Server only         | No       | Data and release owner     | Change with the selected project/environment; HTTPS only.                   |
| `SUPABASE_SECRET_KEY`           | Server secret       | No       | Data and security owner    | Rotate after exposure, role change, or project replacement.                 |

Public media must be root-relative or HTTPS. Unknown `VITE_*` names, invalid URLs, and non-boolean
print-proof values fail the build with a safe message that does not echo the supplied value.

## Adding Configuration

1. Identify the consuming server or client boundary and minimum environments.
2. Add name, purpose, owner, sensitivity, environments, required state, exposure, and rotation rule
   to `config/environment-catalogue.ts`; never add a value.
3. Use `VITE_*` only for information intentionally visible in browser source. Secrets use an
   unprefixed server name and a server-only module.
4. Extend the appropriate Zod schema and add valid, missing, malformed, and safe-error tests.
5. Add only the name and non-sensitive guidance to `.env.example` after the consumer exists.
6. Run the full validation suite. `bun run build` must prove the server canary and every catalogued
   server-only name are absent from `dist/client`.

## Provisioning by Environment

- **Local:** public values may use ignored `.env.local`; future Worker secrets use ignored
  `.dev.vars`. Use synthetic data only and restrict file permissions.
- **Preview:** Supabase is deliberately unconfigured. Never copy production credentials or patient
  data into a public preview.
- **Production:** the owner provisions the approved value in Cloudflare only after release review.
  Required configuration must fail at startup when missing or invalid; it must never fall back to a
  preview, test, or developer credential.

Record only the variable name, environment, owner, provisioning time, and verification outcome.
Never record its value in Git, RAG, issues, screenshots, CI artefacts, logs, or chat.

## Rotation, Revocation, and Incident Handling

1. The variable owner opens a private change record naming the affected consumer and environments.
2. Create a replacement with least privilege. Where supported, overlap old/new credentials only
   for a bounded verification window.
3. Provision local/preview first, run startup and journey checks, then provision production through
   an owner-approved release.
4. Verify the replacement without printing it; revoke the old credential and confirm old access
   fails. Record identifiers or fingerprints only when they are non-secret.
5. For suspected exposure, revoke first, stop affected journeys if safe replacement is unavailable,
   inspect redacted access evidence, notify the security/release owners, and follow the incident
   process added under Task 5.12.
6. Remove retired names from the consumer, schema, provider, catalogue, and `.env.example`, then run
   the client-bundle scan and repository secret scan before closure.

## Validation and Safe Failure

- `vite.config.ts` validates declared public configuration before either client or SSR compilation.
- `src/server.ts` is the explicit Cloudflare Worker entry and validates the server-only schema at
  isolate startup. The optional Supabase URL/secret pair must be complete or absent; partial,
  non-HTTPS or undeclared input fails closed.
- `scripts/check-client-bundle.ts` requires a synthetic marker in server output and rejects it or
  any catalogued server-only name in client output.
- Configuration errors use stable generic messages and do not serialize Zod issues, input values,
  environment objects, or credentials.

## Related Documents

- [Cloudflare environment and release runbook](cloudflare-environments-release-runbook.md)
- [Sprint 05 plan](../02-implementation-plans/phase-01/sprint-05-data-security-operations.md)
- [Task 5.3 evidence](../02-implementation-plans/phase-01/annexures/sprint-05-3-environment-security-evidence.md)
- [Task 5.6 evidence](../02-implementation-plans/phase-01/annexures/sprint-05-6-persistence-tenancy-evidence.md)
- [Technical-debt registry](../04-technical-debt/technical-debt-registry-v1.md)
