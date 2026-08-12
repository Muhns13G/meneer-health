---
runbook_id: meneer-environment-secrets
title: Environment Configuration and Secret Lifecycle Runbook
status: active
last_updated: 2026-08-11
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Environment Configuration and Secret Lifecycle Runbook

## Purpose and Current Boundary

This runbook governs application configuration without storing values in documentation or source.
The machine-checked catalogue is `config/environment-catalogue.ts`; `.env.example` lists names only.
Tasks 5.6–5.7 use one optional all-or-none Supabase pair for server-only persistence and managed
identity administration. Task 5.14 adds an optional all-or-none restricted Stripe test-key and
webhook-signing pair. Task 5.19 adds a separate GitHub Actions recovery-runner boundary. Values
remain uncommitted and every adapter or scheduled job stays disabled when absent.

## Current Catalogue

| Name                             | Exposure            | Required | Owner                      | Lifecycle                                                                   |
| -------------------------------- | ------------------- | -------- | -------------------------- | --------------------------------------------------------------------------- |
| `VITE_PEPTIDE_VIDEO_URL`         | Public client/build | No       | Content and release owner  | Replace with the approved media location.                                   |
| `VITE_PEPTIDE_VIDEO_POSTER_URL`  | Public client/build | No       | Content and release owner  | Replace with the associated approved release.                               |
| `VITE_CAMPAIGN_PRINT_PROOF`      | Public client/build | No       | Campaign and release owner | Use exact `true` only for approved proofing; otherwise omit or use `false`. |
| `SUPABASE_URL`                   | Server only         | No       | Data and release owner     | Change with the selected project/environment; HTTPS only.                   |
| `SUPABASE_SECRET_KEY`            | Server secret       | No       | Data and security owner    | Rotate after exposure, role change, or project replacement.                 |
| `SUPABASE_DB_URL`                | Runner secret       | No       | Data and security owner    | Use the approved hosted session-pooler URL; rotate with database access.    |
| `RECOVERY_EXPORT_SOURCE`         | Runner setting      | No       | Data and release owner     | Synthetic for proof; scheduled runs select production.                      |
| `RECOVERY_R2_BUCKET`             | Runner setting      | No       | Operations/security owner  | Replace only through a tested recovery-store cutover.                       |
| `CLOUDFLARE_ACCOUNT_ID`          | Runner setting      | No       | Operations/security owner  | Replace when the recovery bucket changes account.                           |
| `R2_ACCESS_KEY_ID`               | Runner secret       | No       | Operations/security owner  | Bucket-only credential; rotate after exposure or annual review.             |
| `R2_SECRET_ACCESS_KEY`           | Runner secret       | No       | Operations/security owner  | Bucket-only credential; rotate with its access-key identifier.              |
| `RECOVERY_ENCRYPTION_KEY_BASE64` | Runner secret       | No       | Security and data owner    | Retain a separate secured recovery copy; rotate through restore proof.      |
| `BACKUP_HEARTBEAT_URL`           | Runner secret       | No       | Operations/security owner  | Payload-free endpoint; rotate after exposure or monitor replacement.        |
| `STRIPE_RESTRICTED_KEY`          | Server secret       | No       | Payment and security owner | Restricted `rk_test_*` only; rotate after exposure or scope/account change. |
| `STRIPE_WEBHOOK_SIGNING_SECRET`  | Server secret       | No       | Payment and security owner | Test webhook secret; rotate after exposure or endpoint replacement.         |

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
- **Production application:** the owner provisions approved runtime values in Cloudflare only after
  release review. Required configuration must fail at startup when missing or invalid; it must
  never fall back to a preview, test, or developer credential.
- **Hosted recovery runner:** store sensitive Task 5.19 values as GitHub Actions secrets and the
  bucket/account/activation identifiers as repository variables. Keep
  `RECOVERY_EXPORT_ENABLED=false` until the hosted schema, independent off-device encryption-key
  custody, production database export, and isolated production-format restore pass. The synthetic
  success/failure and alert/recovery evidence passed on 12 August 2026.

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
  isolate startup. The optional Supabase pair and Stripe configuration must each be complete or absent; partial,
  non-HTTPS, live/unrestricted Stripe, or undeclared input fails closed.
- `scripts/check-client-bundle.ts` requires a synthetic marker in server output and rejects it or
  any catalogued server-only name in client output.
- Configuration errors use stable generic messages and do not serialize Zod issues, input values,
  environment objects, or credentials.

## Related Documents

- [Cloudflare environment and release runbook](cloudflare-environments-release-runbook.md)
- [Sprint 05 plan](../02-implementation-plans/phase-01/sprint-05-data-security-operations.md)
- [Task 5.3 evidence](../02-implementation-plans/phase-01/annexures/sprint-05-3-environment-security-evidence.md)
- [Task 5.6 evidence](../02-implementation-plans/phase-01/annexures/sprint-05-6-persistence-tenancy-evidence.md)
- [Task 5.7 evidence](../02-implementation-plans/phase-01/annexures/sprint-05-7-managed-identity-evidence.md)
- [Task 5.14 evidence](../02-implementation-plans/phase-01/annexures/sprint-05-14-stripe-checkout-evidence.md)
- [Task 5.19 evidence](../02-implementation-plans/phase-01/annexures/sprint-05-19-hosted-recovery-evidence.md)
- [Stripe operations runbook](stripe-checkout-webhook-runbook.md)
- [Technical-debt registry](../04-technical-debt/technical-debt-registry-v1.md)
