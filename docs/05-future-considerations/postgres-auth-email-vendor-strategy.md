---
consideration_id: FC-001
title: PostgreSQL, Authentication, and Transactional Email Vendor Strategy
status: evaluation-pending
decision_due: before-phase-01-sprint-05-provisioning
last_reviewed: 2026-08-08
owner: Octothorp ZA architecture and data owners
sensitivity: internal
---

# PostgreSQL, Authentication, and Transactional Email Vendor Strategy

## Purpose

Record the Phase 01 assessment of PostgreSQL, identity, and transactional email options without
treating a shortlist as approval. The owner has confirmed that v1 will collect real information and
support real payments, orders, and fulfilment, so durable data, identity, and transactional
notification capabilities are required before the pilot can operate. No vendor should receive
patient information until the operating model, data map, security requirements, cross-border basis,
contracts, and exit procedure are approved.

## Current Recommendation

DR-005 now approves managed PostgreSQL as the portable relational system of record and encrypted
object storage for binaries. DR-006 approves the vendor-evaluation and exit method. No database,
identity, email, or storage vendor is selected or provisioned by those decisions; the options below
remain a shortlist that must be reverified against current primary evidence before selection.

- Do not provision production services until Task 3.8 approves the remaining identity/lifecycle
  decisions and the selected service passes DR-006.
- Select exact database, identity, storage, and email services before Sprint 05 production-capable
  provisioning, after the data map, roles, retention, residency, and vendor requirements are approved.
- Implement the approved pilot scope in Sprint 05. A production-grade database and identity service
  are mandatory because registration, consent, intake, payment/order state, fulfilment, and audit
  evidence must be durable.
- Transactional email is required for approved verification, recovery, payment/order receipts,
  fulfilment updates, and operational notifications. Messages must remain generic and must not become
  the authoritative clinical or order record. Marketing email remains outside the initial need.

## Preliminary Vendor Position

### Supabase — preferred v1 shortlist

Supabase is the provisional v1 preference because it combines PostgreSQL, managed authentication, Row Level Security, and optional storage, reducing integration work for a short controlled pilot.

If selected:

- Keep ordinary version-controlled PostgreSQL migrations and test export/restore.
- Keep sensitive tables in private or deliberately non-exposed schemas where practical.
- Use server-side application services for sensitive workflows rather than unrestricted browser-to-database access.
- Enable and test RLS on every exposed table; authentication alone is not row-level authorisation.
- Never expose secret/service-role credentials or use user-editable metadata for authorisation.
- Keep clinical and workflow rules outside Supabase-specific functions so Next.js and Laravel can absorb them.
- Pin client/CLI dependencies, commit the lockfile, run database/security advisors, and record schema changes through migrations.

Supabase changes frequently. Recheck its changelog, Data API defaults, Auth guidance, supported regions, pricing, backup/recovery options, and DPA immediately before approval or implementation.

### Neon — portability-focused alternative

Neon is the alternative when focused PostgreSQL infrastructure, database branching, and Vercel integration are more valuable than Supabase's integrated Auth/RLS workflow. Standard PostgreSQL dump/restore and logical replication support the planned migration strategy.

Neon may require more Phase 01 integration if identity, storage, and email are selected separately. Neon Auth must be assessed as its own identity choice rather than assumed merely because Neon PostgreSQL is selected.

### Brevo — conditional transactional email shortlist

Brevo is a candidate custom SMTP/API provider if the pilot sends real authentication or transactional email. It is not required for a demonstration-only or no-email pilot.

If selected:

- Use generic messages such as “You have a secure update”; never place symptoms, conditions, questionnaire responses, diagnoses, prescriptions, or credentials in email.
- Use separate sender identities/domains for authentication and future marketing.
- Configure SPF, DKIM, and DMARC.
- Disable open/click tracking unless separately justified and approved.
- Treat PostgreSQL workflow/outbox records as authoritative; email delivery is an external side effect requiring retry and reconciliation.
- Record bounce, suppression, retry, retention, deletion, incident, and provider-exit behaviour.

When Supabase Auth sends email, production use requires a custom SMTP provider. Supabase's default sender is intended for demonstration, is restricted to authorised team addresses, and has a low best-effort limit.

## Data Location and POPIA Gate

At review time, neither Supabase's published region list nor Neon's published supported-region list included a South African region. Brevo states that its data is stored and processed in the European Union. Any selected combination therefore requires a documented cross-border assessment before receiving personal or health information.

The approval record must address:

- The responsible party/operator relationship and contract.
- POPIA section 72 transfer conditions and any applicable prior-authorisation question.
- Health-information notices and the protection afforded in the destination.
- Vendor DPA, subprocessors, onward transfers, breach duties, government-access process, and deletion/return terms.
- Chosen region and measured latency from South Africa.
- Encryption, key/secret management, access controls, MFA, logging, backup, recovery, and support tier.
- Retention, deletion, export, migration, reconciliation, and tested exit procedures.

This record is not legal approval. The appointed Information Officer/privacy adviser and relevant clinical/legal owners must review the final arrangement.

## Decision Options

| Option                                               | Advantages                                                         | Principal concerns                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Supabase PostgreSQL + Auth + Brevo SMTP              | Fastest integrated pilot path; RLS and Auth share identity context | Supabase-specific Auth/RLS coupling; no South African region; careful Data API policy required   |
| Neon PostgreSQL + separate Auth + Brevo              | Strong database portability and Vercel branching                   | More vendors, contracts, integration, failure modes, and identity work                           |
| No database/email                                    | Not compatible with the confirmed real-transaction pilot           | Rejected for enabled registration, intake, payment, order, fulfilment, and notification journeys |
| South African-hosted PostgreSQL/identity alternative | Potential residency and latency benefits                           | Requires separate capability, security, reliability, portability, and cost assessment            |

## Decision Questions

1. Which exact pilot journeys persist data, and which data fields are necessary?
2. Is identity required, and should the pilot use invite-only magic links rather than passwords?
3. Will health information be stored, or only minimal contact/waitlist information?
4. Which entity is responsible for each data class and vendor contract?
5. Which region, transfer basis, DPA, subprocessor list, backup, and deletion terms are acceptable?
6. Is direct client Data API access needed, or should all sensitive access remain server-side?
7. What recovery point, recovery time, availability, support, audit, and incident commitments are required?
8. Which authentication and data contracts must remain portable to Next.js and Laravel?
9. Which emails are strictly necessary, and can they remain generic and tracking-free?
10. How will database and email delivery be reconciled, retried, exported, and migrated?

## Approval and Implementation Gate

Before provisioning production-capable services, Sprint 03 must produce an approved decision record covering options, rationale, region, contracts, data map, roles, security controls, lifecycle, cost, portability, exit plan, owners, and review triggers. Sprint 05 must then prove migrations, RLS/authorisation, secret isolation, audit events, backups/restores, observability, outbox/retry behaviour, and cross-generation fixtures using synthetic data.

## Review Triggers

Reassess this consideration when the pilot scope changes, before vendor provisioning, before collecting health information, before public launch, before material pricing/region/product changes, and before the Next.js or Laravel migrations.

## References

- [Supabase breaking-change changelog](https://supabase.com/changelog?types=breaking-change)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase available regions](https://supabase.com/docs/guides/platform/regions)
- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Neon supported-region status](https://neon.com/docs/introduction/status)
- [Neon migration guides](https://neon.com/docs/import/migrate-intro)
- [Brevo data storage location](https://help.brevo.com/hc/en-us/articles/360001005510-Data-storage-location)
- [Protection of Personal Information Act 4 of 2013](https://www.justice.gov.za/legislation/acts/2013-004.pdf)
- [Information Regulator health-information regulations](https://inforegulator.org.za/wp-content/uploads/2025/09/SECTION-112_2_C_-HEALTH-REGULATIONS-FINAL.pdf)

## Related Project Documents

- [DR-005 data, tenancy, lifecycle, and migration model](../07-decisions/DR-005-data-tenancy-lifecycle-migration.md)
- [DR-006 vendor evaluation and exit criteria](../07-decisions/DR-006-vendor-evaluation-criteria.md)
- [Phase 01 plan](../02-implementation-plans/phase-01/README.md)
- [Sprint 03 operating model and architecture](../02-implementation-plans/phase-01/sprint-03-operating-model-architecture.md)
- [Sprint 05 data, security, and operations](../02-implementation-plans/phase-01/sprint-05-data-security-operations.md)
- [Technical debt registry](../04-technical-debt/technical-debt-registry-v1.md)
- [RAG decision register](../RAG/05-decision-register.md)
