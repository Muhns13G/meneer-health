---
consideration_id: FC-001
title: PostgreSQL, Authentication, and Transactional Email Vendor Strategy
status: selected-with-activation-gates
decision_due: before-pilot-activation
last_reviewed: 2026-08-10
owner: Octothorp ZA architecture and data owners
sensitivity: internal
---

# PostgreSQL, Authentication, and Transactional Email Vendor Strategy

## Current Decision

DR-009 approves an integrated, free-tier-first v1 provider stack. Selection closes Sprint 05 Task
5.5. The owner has since provisioned the selected Supabase project; this does not approve
health-data processing or activate a transaction.

- **Database, identity, and primary private files:** one Supabase Free project in London
  (`eu-west-2`) using PostgreSQL, Supabase Auth, and private Storage.
- **Transactional email:** Brevo Free as Supabase custom SMTP with generic message content. Brevo's
  current SMTP tracking behaviour rewrites links; its anonymous-tracking option improves privacy but
  does not disable rewriting. Token-bearing Auth links therefore remain activation-gated.
- **Recovery exports:** encrypted PostgreSQL and object exports in a Cloudflare R2 bucket restricted
  to the EU jurisdiction. R2 is recovery storage, not the primary patient-data store.
- **Runtime telemetry:** redacted Cloudflare Workers Logs, Metrics, and Traces.
- **External monitoring:** Better Stack Free for uptime and backup-job heartbeats only; no health
  information, application log payloads, or session replay.
- **Payments:** Stripe Checkout in test mode until TD-010's commercial and live-activation gates pass.

The owner verified that the OITWS Supabase organisation is on the Free plan and then used the
remaining zero-monthly-cost project slot for `meneer-health`. The healthy London Nano project has no
migrations or backups and remains synthetic-only. Supabase hosted branching is not selected because
it is billed; local Supabase provides development and CI databases instead.

## Environment Contract

| Environment               | Data and provider rule                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Local development         | Local Supabase only; synthetic data; local or sandbox service adapters.                                          |
| CI                        | Ephemeral local Supabase; synthetic fixtures; no hosted pilot credentials.                                       |
| Cloudflare branch preview | Provider integrations disabled or synthetic; never connect to the pilot database.                                |
| Pilot production          | The single hosted Supabase project and approved live integrations, only after the relevant Sprint 05 gates pass. |

This compromise is necessary because the free plan does not provide a second hosted environment.
Environment separation is therefore enforced through local infrastructure and deny-default preview
configuration rather than hosted database branches.

## Implementation Requirements

- Keep ordinary version-controlled PostgreSQL migrations and portable export/restore procedures.
- Put sensitive tables in private or deliberately non-exposed schemas where practical.
- Use server-side application services for sensitive workflows; do not expose unrestricted
  browser-to-database access.
- Enable and test Row Level Security on every exposed table. Authentication alone is not
  authorisation.
- Derive tenant and permissions server-side. Never use user-editable metadata for authority and
  never expose service-role credentials.
- Keep clinical and workflow rules behind provider-neutral contracts so Next.js and Laravel can
  absorb the validated v1 behaviour.
- Use private Storage buckets, signed short-lived access, safe object names, and metadata-only audit
  records.
- Re-run Supabase database and security advisors before activation and after material schema or
  policy changes.
- Test encrypted exports and a staging/local restore before any real data is accepted. Free-tier
  absence of automatic backups or PITR must not be mistaken for an acceptable recovery control.

## Upgrade and Stop Triggers

Do not enable automatic spend. Pause intake or approve a reviewed upgrade before any free limit,
operational requirement, or safety margin is breached. Triggers include:

- database, Storage, egress, Auth MAU, email-volume, telemetry, monitor, or R2 allowance pressure;
- the need for a second isolated hosted environment, longer log retention, automatic backups,
  point-in-time recovery, higher availability, or contractual support;
- an inability to meet the approved RPO/RTO, restore, privacy, security, or incident obligations;
- material changes to pricing, regions, terms, product defaults, or provider availability.

## Portability and Alternatives

Neon remains a PostgreSQL-focused fallback or exit target, not the selected v1 service. It should be
reconsidered if database branching, Vercel integration, or infrastructure separation becomes more
valuable than Supabase's integrated Auth/RLS/Storage path. Sentry may be introduced when actionable
application exceptions exceed Cloudflare telemetry; Datadog remains disproportionate for the v1
pilot unless broader infrastructure observability becomes necessary.

Portability evidence must include standard PostgreSQL migrations and dumps, storage-object exports,
identity export/mapping, documented SMTP templates, provider-neutral contracts, and a restore or
migration rehearsal. Provider-specific code stays behind adapters.

## Remaining Activation Gates

Before receiving real personal or health information, the selected stack still requires the final
data map and named-party roles, cross-border/privacy assessment, applicable contracts, secrets and
rotation procedures, migrations, RLS and authorisation tests, lifecycle workflows, audit controls,
monitoring and incident exercises, recovery proof, and domain approval. Stripe live mode also
requires TD-010. Partner fulfilment remains gated by TD-007 and TD-009.

## Future Auth-Link Hardening

Before the first customer account, invitation, confirmation, recovery, or email-change journey is
enabled, replace direct provider links with a Meneer-owned `/auth/confirm` boundary. Prefer a
Supabase `TokenHash` flow, or an OTP `Token` flow where the user deliberately submits the code.
The route must avoid logging secrets, validate the Auth flow type, accept only allowlisted relative
destinations, and consume the credential only after an explicit user action. Brevo may remain the
SMTP transport; anonymous tracking may be enabled for privacy, but it is not evidence that link
rewriting is disabled.

Acceptance requires delivered confirmation, invitation, recovery, and email-change exercises;
mobile and desktop accessibility; generic templates; resend and rate controls; and denials for
malformed, expired, replayed, and cross-flow credentials. Recovery must also prove the intended
session-revocation outcome. Consider a dedicated authenticated Auth-sending subdomain or sender if
reputation or operational separation becomes necessary.

## Authoritative Records

- [DR-009 free-tier pilot provider stack](../07-decisions/DR-009-free-tier-pilot-provider-stack.md)
- [Sprint 05.5 provider-selection evidence](../02-implementation-plans/phase-01/annexures/sprint-05-5-provider-selection-data-map-evidence.md)
- [DR-005 data, tenancy, lifecycle, and migration](../07-decisions/DR-005-data-tenancy-lifecycle-migration.md)
- [DR-006 vendor evaluation and exit criteria](../07-decisions/DR-006-vendor-evaluation-criteria.md)
- [DR-007 identity and authorisation architecture](../07-decisions/DR-007-identity-authorisation-architecture.md)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase local development and deployment](https://supabase.com/docs/guides/deployment)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 data location](https://developers.cloudflare.com/r2/reference/data-location/)
- [Brevo plans](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans)
