---
evidence_id: phase-01-sprint-05-task-05
title: Sprint 05.5 Free-Tier Provider Selection and Data Map
status: verified-task-evidence
date: 2026-08-10
source_commit: pending-owner-commit
owner: "@Muhns13G"
related_debt: [TD-010, TD-013, TD-016, TD-019, TD-020]
---

# Sprint 05.5 Free-Tier Provider Selection and Data Map

## Mission and Boundary

Translate DR-006 into an exact, portable, zero-fixed-cost pilot selection covering PostgreSQL,
identity, private objects, transactional email, observability, uptime, recovery exports and
payments. No SDK, account, credential, binding, patient record, transaction, deployment or
customer-facing content is added in this task.

## Owner Direction and Selected Stack

The repository owner rejected a paid baseline, required maximum use of free tiers, confirmed an
expected remaining Supabase allowance, and requested the complete documentation update. Read-only
Supabase account evidence confirmed:

- the `OITWS` organisation is on the Free plan;
- one existing active healthy project consumes one of the two Free project slots;
- the connector quotes the next project at USD 0 per month; and
- a hosted preview branch would cost USD 0.01344 per hour and requires the paid branching feature.

DR-009 therefore selects one Frankfurt Supabase Free project for PostgreSQL, Auth and private
Storage; local Supabase for development/CI; provider-disabled or synthetic Cloudflare previews; an
EU-jurisdiction R2 recovery bucket; Brevo Free; Cloudflare native observability; Better Stack Free
uptime/heartbeats; and Stripe test mode.

No service was created or changed while obtaining this evidence.

## DR-006 Gate Disposition

| Hard gate                    | Task 5.5 disposition | Remaining proof before real data                                                                            |
| ---------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Legal/service authority      | Conditional          | Contracting entities, DPAs/terms, acceptable use, Stripe merchant and partner authority                     |
| Privacy/data map             | Conditional          | DR-009 maps minimum classes/flows; named roles, section 72 basis and processor approval remain              |
| Security                     | Conditional          | Controls selected; accounts, MFA, RLS, secrets, redaction and negative tests remain                         |
| Isolation                    | Conditional          | Local/CI/preview/pilot topology approved; local separation and hosted fail-closed behaviour remain to prove |
| Portability/exit             | Conditional          | PostgreSQL/object/adapter exits defined; synthetic export/import/revocation/deletion proof remains          |
| Reliability/recovery         | Conditional          | R2 recovery target selected; Task 5.13 export, restore, reconciliation and risk approval remain             |
| Clinical/professional safety | Not activated        | TD-007/009 and partner evidence gate every clinical/fulfilment hand-off                                     |
| Commercial viability         | Conditional          | Free limits/triggers defined; live Stripe, fees, tax, price and suspension handling remain                  |

The service selection and data map are complete for synthetic implementation. No hard gate is
represented as production approval.

## Environment Acceptance

| Environment        | Supabase boundary                                 | Data                      | Hosted journey behaviour                           |
| ------------------ | ------------------------------------------------- | ------------------------- | -------------------------------------------------- |
| Local              | Local CLI stack                                   | Synthetic/disposable      | Full contract and migration development            |
| CI                 | Isolated local stack or portable fixtures         | Synthetic/disposable      | Automated schema, RLS, contract and negative tests |
| Cloudflare preview | No hosted Supabase secret or write authority      | None or synthetic adapter | Provider-backed journeys fail closed               |
| Pilot deployment   | One hosted Free project after activation approval | Approved pilot data only  | Active only after release go/no-go                 |

This is an explicit v1 constraint, not equivalence to independent hosted staging. If local/preview
proof is insufficient for any change, that change remains gated until an additional hosted
environment is approved.

## Current Authoritative Evidence

- Supabase Free currently advertises two active projects, 500 MB PostgreSQL, 1 GB Storage, 50,000
  MAU, basic MFA/custom SMTP, one-day platform logs, no automatic backup/PITR and possible pausing
  after insufficient activity.
- Supabase TOTP MFA is free. Default SMTP is not suitable for real external users, so Brevo custom
  SMTP is mandatory before identity email is enabled.
- Supabase documents local development and CLI/GitHub deployments as available on all plans;
  preview branching is a paid Pro feature.
- R2 Standard currently includes 10 GB-month storage, one million Class A operations, ten million
  Class B operations and free egress monthly; an EU jurisdiction is available.
- Brevo Free currently includes 300 daily sends and transactional email.
- Cloudflare Workers Free currently includes native logs/traces with three-day retention within its
  event allowance.
- Better Stack Free currently includes 10 monitors/heartbeats and email/Slack alerts. It is selected
  for uptime and recovery heartbeat only—not patient logs, web analytics or session replay.

These facts are dated selection evidence, not perpetual entitlements. Reverify them at provisioning
and activation and record observed limits without credentials or private documents.

## Debt Disposition

- TD-013 and TD-016 remain In progress until Tasks 5.7–5.8 and 5.13 prove their acceptance evidence.
- TD-019 remains Verified for the current no-secret runtime; each provider implementation must
  extend its environment controls in the same commit.
- TD-020 remains In progress until Task 5.12 proves redaction, objectives, alerts and incident handling.
- TD-010 continues to block live Stripe activation.
- Task 5.5 is Completed as a service-selection/data-map checkpoint. Completion does not authorise
  provisioning, real data, spending, pilot activation, or production-capable claims.

## Documentation Validation

- Prettier passes for every Task 5.5 document.
- Repository ESLint passes.
- `docs/RAG/07-index.json` parses successfully.
- Local Markdown targets in the affected documentation resolve.
- `git diff --check` reports no whitespace errors.
- The stale-language sweep finds no current document claiming Task 5.5 remains pending or that the
  selected provider categories remain unselected.

## References

- [DR-009 free-tier pilot provider stack](../../../07-decisions/DR-009-free-tier-pilot-provider-stack.md)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase deployment workflow](https://supabase.com/docs/guides/deployment)
- [Supabase branching usage](https://supabase.com/docs/guides/platform/manage-your-usage/branching)
- [Supabase regions](https://supabase.com/docs/guides/platform/regions)
- [Supabase TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 data location](https://developers.cloudflare.com/r2/reference/data-location/)
- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Brevo pricing plans](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans)
- [Better Stack pricing](https://betterstack.com/pricing)
