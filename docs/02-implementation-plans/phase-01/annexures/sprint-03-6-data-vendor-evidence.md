---
evidence_id: sprint-03-6-data-vendor
sprint: 03
task: 3.6
status: verified-local
date: 2026-08-08
primary_debt: [TD-012]
---

# Sprint 03 Task 3.6 — Data and Vendor Architecture Evidence

## Mission

Approve the portable data, tenancy, lifecycle, migration, backup, provider-evaluation, and exit
architecture without provisioning vendors or inventing unresolved company/partner particulars.

## Observed Starting State

The repository has no datastore, schema, migration files, tenancy enforcement, backup/restore,
data-subject workflow, or production data vendor. FC-001 contained a preliminary Supabase/Neon/Brevo
shortlist but explicitly did not approve a selection.

## Approved Outcome

[`DR-005`](../../../07-decisions/DR-005-data-tenancy-lifecycle-migration.md) approves managed
PostgreSQL as the portable relational system of record and encrypted object storage for binary
objects. It defines logical domain namespaces, identifiers, tenant isolation, data classification,
lifecycle states, rights procedures, schema migration, backup/restore, pilot-exit, and
cross-generation requirements.

[`DR-006`](../../../07-decisions/DR-006-vendor-evaluation-criteria.md) approves service-specific hard
gates, weighted comparison, evidence packs, environment separation, portability limits, category
minimums, provisioning rules, and exit evidence. It deliberately does not approve Supabase, Neon,
Brevo, or another data service.

## Debt Disposition

TD-012 is **Verified** against its Sprint 03 architecture-decision criterion. The storage class,
logical schemas, tenancy model, migration/rollback ownership, and backup/restore requirements are
approved. Exact providers, regions, physical schemas, migrations, access policies, and restore tests
remain Sprint 05 implementation gates.

TD-016 remains **Decision required** until Task 3.8 approves exact data-class retention, rights,
hold, deletion, backup, and restore schedules; Sprint 05 must then prove a restore and complete
synthetic data-subject request before TD-016 can close.

## Validation

- DR-005 and DR-006 are indexed as Approved and Task 3.6 is Completed.
- Every DR-003 authoritative domain maps to a DR-005 logical namespace.
- DR-006 separates vendor-category approval and rejects bundled/host approval by assumption.
- Technical-debt and future-consideration records preserve all implementation and activation gates.
- Blueprint/RAG sources distinguish approved architecture from absent runtime capability.
- Markdown/JSON formatting, relative links, status assertions, and repository diff checks pass.

## Files in Scope

No source code, dependency, environment variable, vendor account, Cloudflare setting, public content,
or runtime behaviour was changed by Task 3.6.
