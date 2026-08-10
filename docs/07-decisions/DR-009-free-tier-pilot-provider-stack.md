---
decision_id: DR-009
title: Free-Tier Pilot Provider Stack
status: approved
accountable_owner: Octothorp ZA architecture owner
implementation_owner: Octothorp ZA technology and operations owners
required_approvers:
  [
    architecture_owner,
    privacy_owner,
    security_owner,
    commercial_owner,
    operations_owner,
    release_owner,
  ]
effective_date: 2026-08-10
supersedes: null
related_debt: [TD-010, TD-013, TD-016, TD-019, TD-020]
last_updated: 2026-08-10
---

# DR-009 — Free-Tier Pilot Provider Stack

## Context and Scope

Task 5.5 must select the pilot's PostgreSQL, identity, private object storage, transactional email,
observability, and payment services before provider-backed implementation. The repository owner
rejected a paid baseline, directed v1 to maximise free tiers, and approved retaining Supabase as the
integrated data platform where possible.

This decision selects an implementation stack and exact environment boundary. It does not provision
services, approve real data, activate a journey, accept vendor terms on behalf of a company, or
waive the remaining privacy, security, clinical, commercial, recovery, and release gates.

### Confirmed Facts

- The v1 pilot is small, invite-only, and peptide-focused, but will process real identity, health,
  payment, and fulfilment state only after its activation gates pass.
- The connected `OITWS` Supabase organisation is on the Free plan. A read-only account check quoted
  the second project at USD 0 per month; the owner subsequently used that remaining slot for the
  healthy `meneer-health` Nano project in London. It currently has no migrations or backups.
- Supabase Free branching is unavailable. The connector quoted a preview branch at USD 0.01344 per
  hour, and current documentation states branching requires Pro.
- PostgreSQL remains the portable system of record. Cloudflare D1/SQLite does not replace DR-005.
- Cloudflare currently hosts the application on a Free Website zone.
- No service, credential, patient record, or payment is created by this decision.

### Explicit Unknowns and Activation Gates

- `[TBC — owner: COMMERCIAL OWNER — gate: TD-010]`: live payment contracting/merchant entity,
  approved prices, tax treatment, refund terms, and live Stripe eligibility.
- `[TBC — owner: PRIVACY OWNER — gate: PILOT ACTIVATION]`: approved POPIA section 72 basis, DPAs,
  subprocessors, and named responsible-party/operator allocation for the selected services.
- `[TBC — owner: SECURITY/DATA/OPERATIONS OWNERS — gate: TASK 5.13]`: whether the demonstrated
  export, restore, monitoring, and recovery process meets the final pilot risk decision.

## Options Considered

| Option                                    | Benefits                                                          | Costs and risks                                                         | Disposition                                    |
| ----------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Supabase Pro + PITR                       | Integrated platform and stronger managed recovery                 | Fixed cost rejected by owner                                            | Rejected for v1 pilot                          |
| Neon Free + separate Auth/Storage         | Limited included restore history                                  | More vendors, adapters, contracts and failure modes                     | Rejected after Supabase allowance verification |
| Supabase Free for PostgreSQL/Auth/Storage | One platform, mature Auth/RLS/Storage, lowest implementation cost | No automatic backups/PITR; low-activity pausing; one hosted environment | Selected                                       |
| Cloudflare D1 + R2                        | Simple Cloudflare-only free stack                                 | SQLite contradicts PostgreSQL portability                               | Rejected                                       |

## Decision

Use this zero-fixed-cost v1 implementation stack:

| Capability                | Exact service and tier                                             | Region/location           | Environment boundary                                      | Purpose                                              |
| ------------------------- | ------------------------------------------------------------------ | ------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| Runtime/edge              | Cloudflare Workers Free                                            | Global edge               | Existing preview and production Worker deployments        | HTTP/runtime only                                    |
| PostgreSQL                | Supabase Free PostgreSQL                                           | London `eu-west-2`        | One hosted Meneer pilot project; local Supabase elsewhere | Authoritative relational state                       |
| Identity                  | Supabase Auth Free with TOTP MFA                                   | London `eu-west-2`        | Same hosted project; local synthetic Auth                 | Authentication only; permissions remain server-owned |
| Private objects           | Supabase Storage Free, private buckets                             | London project boundary   | Same hosted project; local synthetic Storage              | Active private objects and metadata-linked binaries  |
| Recovery exports          | Cloudflare R2 Standard within free allowance, EU jurisdiction      | European Union            | Separate recovery bucket and credentials                  | Encrypted off-site database/object exports only      |
| Transactional email       | Brevo Free SMTP/API                                                | European Union processing | Test and production sender credentials/templates          | Generic delivery only; tracking disabled             |
| Application observability | Cloudflare Workers Logs, Metrics and Traces on available free tier | Cloudflare-managed        | Environment-tagged, redacted telemetry                    | Runtime diagnostics without health payloads          |
| Uptime/backup heartbeat   | Better Stack Free                                                  | Provider-managed          | Production URL monitors and backup heartbeat              | Availability/heartbeat only; no patient payloads     |
| Payments                  | Stripe Checkout and signed webhooks in test mode                   | Stripe-managed            | Test mode until TD-010 passes                             | Payment adapter; live merchant remains blocked       |

The hosted Supabase project is production-named for configuration discipline but may contain only
synthetic data until every applicable DR-006 gate passes and the release owner records go/no-go.

## Environment Model

One Free project cannot provide separate hosted staging and production. The approved
controlled-pilot compromise is:

```text
Local development and CI -> local Supabase + synthetic fixtures
Cloudflare preview       -> provider integrations disabled or synthetic-only
Pilot deployment         -> one hosted Supabase Free project after activation approval
```

- Local development uses the Supabase CLI, versioned migrations, local Auth/Storage and disposable
  synthetic fixtures.
- CI uses an isolated local stack or contract fixtures and never receives hosted secrets or real data.
- Cloudflare preview must fail closed when hosted provider configuration is absent. It cannot use the
  pilot project's service-role/secret key, mutate hosted records, or serve as an administrative path.
- The pilot deployment alone receives hosted configuration after the full activation gate passes.
- Every environment uses distinct URLs, credentials and datasets. A local/fixture environment is a
  legitimate isolated environment; it must not be represented as hosted staging.
- Supabase MCP is restricted to local/synthetic development. It must not be connected with write
  authority to the real pilot dataset; any exceptional diagnostic access must be project-scoped,
  read-only, explicitly approved, and audited.

An additional hosted environment requires either a separately approved Free project under another
eligible company-owned allocation or a paid plan. Neither is assumed by this record.

## Pilot Data Map

| Data class         | Minimum examples                                                      | System of record                              | Permitted processors                                 | Explicit exclusions                                         |
| ------------------ | --------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Identity/access    | Opaque subject ID, verified email, factor/session state               | Supabase Auth; stable mapping in PostgreSQL   | Supabase, Meneer server                              | Passwords, raw TOTP secrets, user metadata as authority     |
| Contact/profile    | Name, email, telephone/WhatsApp, tenant/purpose                       | Supabase PostgreSQL                           | Supabase, Meneer server                              | Marketing enrichment or public storage                      |
| Consent/governance | Version, purpose, policy reference, timestamp, withdrawal             | Supabase PostgreSQL                           | Supabase, Meneer server                              | Browser-only consent or email as evidence                   |
| Intake/clinical    | Versioned answers, triage state, attributed decision references       | Supabase PostgreSQL                           | Supabase; approved partner hand-off after TD-007/009 | Stripe, Brevo, logs, analytics, public objects              |
| Documents/binaries | Approved uploads, checksum, classification, owner, lifecycle state    | Private Supabase Storage; PostgreSQL metadata | Supabase, Meneer server                              | Public buckets or unauthorised direct URLs                  |
| Commerce/order     | Opaque checkout/order IDs, line items, payment/fulfilment states      | Supabase PostgreSQL                           | Supabase, Stripe minimum metadata                    | Symptoms, diagnoses, questionnaire answers in Stripe        |
| Notifications      | Template ID, destination, delivery/retry/suppression state            | PostgreSQL outbox                             | Brevo minimum delivery fields                        | Clinical detail, authoritative order state, tracking pixels |
| Audit/operations   | Actor/subject references, action, outcome, correlation, safe metadata | PostgreSQL append-only facts                  | Supabase; redacted Cloudflare telemetry              | Credentials, message bodies, clinical payloads              |
| Recovery           | Encrypted database dump, object manifest/checksums, restore metadata  | Private EU R2 recovery bucket                 | Cloudflare R2, authorised recovery process           | Plaintext exports, public access, routine application reads |

### Principal Flows

1. Browser authenticates through Supabase Auth. The Worker verifies the token and maps it to an
   internal PostgreSQL subject before any domain action.
2. The Worker validates commands, enforces tenant/role/purpose/state, and writes through explicit
   transaction and idempotency boundaries.
3. Private objects use authorised server commands and private Storage policies; bytes are linked to
   opaque PostgreSQL metadata and are never public.
4. PostgreSQL outbox records drive generic Brevo notifications and Stripe/partner side effects;
   signed results return through idempotent adapters and reconciliation.
5. Redacted outcome/correlation telemetry goes to Cloudflare. Better Stack receives only URL,
   timing, status and heartbeat evidence.
6. A controlled recovery job produces encrypted PostgreSQL and object exports in EU R2 and emits a
   payload-free heartbeat. Task 5.13 must define its runner, frequency, retention and restore proof.

## Supabase Security Boundary

- Prefer non-exposed/private schemas for sensitive tables. Every exposed table has explicit grants,
  RLS and resource/tenant policies; authentication alone is not authorisation.
- `anon` and `authenticated` receive no implicit broad access. `TO authenticated` policies also
  require ownership/tenant predicates; updates require both `USING` and `WITH CHECK`.
- User-editable metadata never determines roles or permissions. Stable internal roles/context live
  in governed application data; server authorisation remains decisive.
- Use publishable client keys only where required. Service-role/secret/database credentials are
  server-only and extend Task 5.3's catalogue, startup validation, rotation and bundle canary.
- Views use invoker security or remain inaccessible. Privileged functions stay in non-exposed
  schemas, use an explicit subject check and have default public execution revoked.
- Workforce TOTP reaches the required assurance level; patient flows remain invite-only and use the
  minimum approved verification method. Session revocation/recovery is tested before activation.
- Storage buckets are private. Object policies bind tenant, subject, purpose and lifecycle state;
  signed access is short-lived and logged without object content.
- Run Supabase security/performance advisors after migrations and before activation.

## Free-Tier Limits and Upgrade Triggers

Free tier is a cost constraint, not a safety waiver. Pause activation/expansion and reassess before:

- Supabase reaches 70% of its current 500 MB database, 1 GB Storage, 5 GB egress, 50,000 MAU or
  relevant execution limits.
- Project pausing, one-day platform logs, absence of automatic backups/PITR, community-only support,
  or missing advanced controls prevents an approved objective.
- Brevo approaches 200 messages/day, delivery is throttled, or the single-seat/support boundary
  prevents controlled operation.
- R2 reaches 70% of its current 10 GB-month, one-million Class A, or ten-million Class B free allowance.
- Cloudflare/Better Stack retention, monitors, checks, alerts, or escalation cannot satisfy Task 5.12.
- The cohort, journeys, data sensitivity, support expectation, or public-launch scope expands.

The implementation must monitor quotas and fail closed or pause intake before restrictions. No
automatic paid overage, add-on, branching charge, or plan upgrade is authorised by this decision.

## Environment and Ownership

| Concern                          | Accountable role         | Required control                                                                       |
| -------------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| Accounts, billing, provisioning  | Repository owner         | Company-controlled accounts, MFA, recovery access, no unapproved payment method        |
| Database/storage and lifecycle   | Data owner               | Migrations, least privilege, RLS, exports, restore/deletion evidence                   |
| Identity and service credentials | Security owner           | Workforce TOTP, bounded sessions, rotation/revocation, deny-default authorisation      |
| Cross-border/data terms          | Privacy owner            | DPA/subprocessor/transfer review before real data                                      |
| Messaging                        | Operations/support owner | Authenticated sender, tracking disabled, generic templates, suppression/retry handling |
| Payments                         | Commercial owner         | Test-only until TD-010 merchant/tax/terms approval                                     |
| Release                          | Release owner            | Synthetic proof first; explicit go/no-go separate from commit/deploy                   |

## Portability and Exit

- PostgreSQL exits through ordinary versioned migrations plus logical dump/restore. Restore into a
  clean PostgreSQL target and reconcile counts/checksums before cutover.
- Supabase Auth exits through identity export mapped to stable internal subject IDs. Force new
  verification/session establishment when secrets or factors cannot migrate safely.
- Storage exits through object export with PostgreSQL metadata, checksums, classifications and
  deletion status; the R2 recovery format cannot be Supabase-dashboard-only.
- Brevo exits by stopping the outbox adapter, exporting safe delivery/suppression state, changing
  sender credentials, replaying pending messages and revoking the old key.
- Cloudflare/Better Stack telemetry is non-authoritative. Export required incident evidence, change
  adapters/monitors and revoke ingestion credentials.
- Stripe exits behind the payment port while the PostgreSQL commerce ledger remains authoritative.

Task 5.13 must prove database/object export, clean restore and reconciliation with synthetic data.
Task 5.16 must preserve provider-neutral fixtures and migration contracts. A failed proof blocks activation.

## Consequences and Risks

- The decision respects the zero-fixed-cost constraint and minimises v1 integrations.
- One hosted project prevents a hosted staging environment. Local/CI proof and disabled preview
  integrations must carry the pre-production boundary until an additional environment is affordable.
- Free plans provide no availability SLA and shorter logs/support/recovery than paid plans.
- Supabase may pause low-activity projects. Real monitoring is required; hidden keep-alive traffic
  must not be used to misrepresent activity.
- R2 recovery adds a second data processor and cross-provider restore path that must be reviewed and tested.
- Thresholds may force an upgrade or smaller pilot. The safe response is to stop expansion, not
  weaken controls or permit unbounded charges.

## Domain Implications

| Domain                             | Required treatment or approval                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| Clinical and safety                | Provider failure/quota exhaustion cannot imply clinical approval or success                    |
| Legal and privacy                  | Named roles, DPAs, transfers, subprocessors, deletion and breach terms remain activation gates |
| Security and access                | Server-only secrets, TOTP workforce MFA, deny-default RLS/authorisation and negative tests     |
| Commercial and tax                 | Zero fixed platform cost; Stripe live merchant/fees remain under TD-010                        |
| Operations and support             | Quota monitoring, pause thresholds, incident escalation and manual recovery                    |
| Data and migration                 | Standard PostgreSQL/object boundaries, encrypted exports, synthetic restore and reconciliation |
| Content and patient representation | No customer-facing wording change and no claim gated services are operational                  |

## Implementation and Verification

- Tasks 5.6–5.13 may implement the approved stack with local/synthetic data and inactive release gates.
- The repository owner has created the London Supabase project. Only the owner may provision any
  R2, Brevo, Better Stack, or additional Supabase resource.
- Every provider consumer adds configuration catalogue/schema/tests, secret rotation/revocation,
  quota/health evidence and client-bundle checks in its first implementation commit.
- Verify least privilege, RLS, export/import, restore, deletion, rotation, alerting, quota thresholds
  and provider failure before any real pilot record.
- Reverify tier limits, region, terms, security evidence, and account controls before applying the
  first hosted migration or runtime credential.

## Affected Documents

- `docs/07-decisions/README.md`
- `docs/02-implementation-plans/phase-01/sprint-05-data-security-operations.md`
- `docs/02-implementation-plans/phase-01/annexures/sprint-05-5-provider-selection-data-map-evidence.md`
- `docs/05-future-considerations/postgres-auth-email-vendor-strategy.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/03-platform-evolution.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`

## Approval

| Approver role                                              | Evidence/reference                                                                                          | Decision                                                                               | Date       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------- |
| Repository/business/architecture owner                     | Required free-tier-first v1, confirmed remaining Supabase allowance and requested full documentation update | Approved implementation selection                                                      | 2026-08-10 |
| Privacy/security/data/commercial/operations/release owners | DR-006 activation evidence                                                                                  | Selection accepted for synthetic implementation; real-data activation approval pending | 2026-08-10 |

Approval selects the implementation target and closes Task 5.5. It does not evidence private role
appointments, provider contracts, real-data processing authority, recovery operation, or pilot release.

## Review Trigger

Review before the first hosted migration or application credential, before real data or live
payment, at 70% of any free allowance, on a pause/restriction/incident or material vendor change,
before pilot expansion/public launch, and before the Next.js or Laravel migration.
