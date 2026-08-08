---
rag_id: meneer-known-limitations
title: Meneer Known Limitations and Answer Guardrails
status: current
authority: derived-from-audit-and-debt
last_updated: 2026-08-08
audience: internal
sensitivity: internal
sources:
  - docs/01-audits/project-codebase-audit-2026-08-05.md
  - docs/04-technical-debt/technical-debt-registry-v1.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-2-incomplete-journey-gate-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-8-safety-campaign-continuation-evidence.md
  - docs/03-completion-reports/phase-01/sprint-01-pilot-risk-containment.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-6-meneer-metadata-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-7-cloudflare-release-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-8-verification-and-closure-evidence.md
  - docs/03-completion-reports/phase-01/sprint-02-lovable-exit-cloudflare-runtime.md
  - docs/06-operations/cloudflare-environments-release-runbook.md
  - docs/07-decisions/DR-001-operating-model-responsibility.md
  - docs/07-decisions/DR-008-governance-ownership-approval.md
  - docs/07-decisions/DR-002-commercial-fulfilment-model.md
  - docs/07-decisions/DR-003-platform-boundaries-authoritative-state.md
  - docs/07-decisions/DR-004-framework-neutral-contracts-migration.md
  - docs/07-decisions/DR-005-data-tenancy-lifecycle-migration.md
  - docs/07-decisions/DR-006-vendor-evaluation-criteria.md
  - docs/07-decisions/DR-007-identity-authorisation-architecture.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-03-8-architecture-validation-evidence.md
---

# Meneer Known Limitations and Answer Guardrails

## Current Capability Limits

Do not state that Meneer currently provides functioning registration, consent capture, medical questionnaires, clinician review, prescribing, payment, pharmacy fulfilment, delivery tracking, support case management, or follow-up. The v1 interface implies several of these capabilities but does not implement their backend or durable records.

Do not state that form submission succeeded. As of the verified Sprint 1.2 working-tree boundary,
`/start` and `/peptides` render non-transactional gates with no forms or inputs. Their previous
local-state prototypes remain preserved in source but are not active customer journeys.

TD-002 and TD-004 are verified only through disabled-capability outcomes at commit `3c1ff01`.
Meneer still has no implemented consent-record or identity system. Before either capability is
enabled, apply the full replacement requirements in the technical-debt registry; do not interpret
containment as production readiness.

TD-001 and TD-003 are likewise verified only through disabled-capability outcomes at commit
`3c1ff01`. Meneer still has no durable intake transaction or approved clinical questionnaire. Apply
the registry's full transaction, validation, questionnaire, exclusion, and emergency-routing
requirements before enabling submission; the preserved prototype is not suitable for reactivation.

## Clinical and Legal Limits

DR-001 approves the role boundary: Meneer is the working brand, OCTOTHORP ZA is the
technology/marketing/general-support/operations layer, and verified independent clinical/pharmacy
actors retain professional authority. It does not approve the remaining contracting and
information-responsibility allocations, registrations, partner evidence, treatment eligibility,
contraindications, clinical pathways, transactional consent/privacy/terms, pricing, refund rules,
delivery promises, or peptide authority. Versioned website-only privacy and terms notices are
implemented and owner-approved for publication as version 1.0; they are not authority for
health-data collection or transactions. Existing marketing claims require a governed claim
register and domain review.

DR-002 approves conservative v1 commercial and fulfilment principles, not universal industry norms.
No price, tax treatment, merchant-of-record allocation, transactional term, Stripe activation, or
delivery performance is live or approved merely because the policy exists. Retained cancellation
and no-charge-on-clinical-rejection wording is unchanged and must be reconciled against approved
gated particulars and implemented evidence before checkout is enabled.

The owner-confirmed provisional operator and development fixtures are centralized in the pilot
compliance profile. `Dr John Doe`, `Jane Doe`, `HPCSA-PLACEHOLDER`, and
`Y-NUMBER-PLACEHOLDER` are not verified identities or registrations and must never be presented as
such. Their presence deliberately keeps activation blocked. `/start` provides universal emergency
containment only; it is not a substitute for condition-specific clinical rules or server enforcement.

Peptides are owner-confirmed as the first intended v1 rollout product, not a "coming soon" category.
The current transaction is nevertheless gated until its product-level, partner, questionnaire,
data-transfer, dispensing, exclusion, escalation, and operational evidence is approved. Preserve
established customer-facing messaging while keeping that implementation boundary explicit.

BPC-157 plus TB-500 (“Wolverine stack”) is the initial candidate pairing, not an approved offering.
SAHPRA's public warning names both among illegally marketed peptides; product-specific registration
or valid Section 21 authority is required before either can enter transactional scope.

Never generate patient-specific diagnosis, dosing, eligibility, or treatment advice from this corpus. Never treat the blueprint's intended journey as an approved clinical protocol.

## Platform Limits

The repository is hosted for contained review but is not ready for transactional pilot use.
DR-003 approves logical channel, application/API, domain, persistence, integration, audit, and
authoritative-state boundaries. It does not implement them. Do not describe the current site as
having a backend, durable modular core, system of record, clinical/operations workspace, or
transactional integration merely because the target architecture is approved.

DR-004 approves the future framework-neutral contract, compatibility, migration, reconciliation,
cutover, and rollback rules. The repository still has no canonical machine-readable schemas,
runtime validators, command/event infrastructure, provider adapters, contract fixtures, contract
tests, or behavioural-equivalence suite. TD-054 decision closure must not be described as closure
of TD-014, TD-055, or transactional implementation.

DR-005 approves PostgreSQL, object-storage, logical schema, tenancy, lifecycle, migration, backup,
and restore architecture; DR-006 approves vendor evaluation and exit criteria. No database, object
store, identity, messaging, or other production data service is selected or provisioned. No physical
schema, migration, tenant policy, backup, restore, data-subject workflow, or retention period exists
in runtime. TD-012 decision closure must not be described as closure of TD-016 or Sprint 05
implementation. Supabase, Neon, and Brevo remain candidates only.

DR-007 approves patient/workforce/service identity, MFA, sessions, recovery, roles, contextual
permissions, break glass, audit, and access-test requirements. No identity provider or control is
implemented. TD-013 is In progress—not Verified—until Sprint 05 proves server-side permissions,
horizontal/vertical isolation, privileged MFA, recovery, revocation, and service identities.

Task 3.8 validates the design and approves a conservative lifecycle/recovery baseline; it does not
prove operation. Final legal/privacy/clinical application to named entities/providers remains an
activation gate. TD-016 is In progress until Sprint 05 demonstrates a staging restore and complete
synthetic rights request with processor and backup reconciliation. Do not describe the nine scenario
walkthroughs as executed customer transactions or runtime tests.

The Lovable Vite wrapper and MCP surface have been removed. The associated telemetry implementation
and environment references are absent from local source, configuration, built output, hosted
browser network, and persisted logs. Root and fallback metadata now use approved Meneer values; the
broader TD-042 discovery package remains open. The `itws-I-preview` build is served at `meneerhealth.co.za`;
canonical checks verify the local placeholder logo and campaign routes. The longer-term
Vercel decision is deferred to the planned Next.js v2. Cloudflare environment roles and rollback
procedure and pinned build paths are documented and verified. Cloudflare Fonts and automatic Web
Analytics are disabled for the pilot. TD-052 is Verified. Final brand work remains open.

Do not request or recommend `LOVABLE_API_KEY`. Do not state that removing Lovable will disconnect a functioning patient backend; none was found.

The Task 2.2 isolated baseline recorded a generic `bun run preview` 500 failure. Task 2.3 repaired
that path: explicit Cloudflare output now passes Vite preview and Wrangler dry-run. Lint still fails
on 30 formatting errors plus 7 warnings, and the baseline dependency audit reported 41 findings.
One upstream `punycode` deprecation remains in current Cloudflare tooling. Task 2.5 bounded it to
build/development commands and completed package normalization; final upstream remediation belongs
to routine dependency maintenance.

Task 2.4 removed MCP: its SDK, plugin, definitions, routes, OAuth metadata, manifest, and built
output are absent, and every former endpoint returns the ordinary HTML 404 locally and on both
hosted origins.

Task 2.5 removes active Lovable environment and package-install behaviour locally; Task 2.6 removes
three historical Lovable package-cache URLs that its narrower search initially overlooked. The
dependency graph remains 456 installs across 566 packages. `bun audit` reports 31 findings
(15 high, 12 moderate, 4 low), while `bun audit --prod` reports 24 (9 high, 11 moderate, 4 low).
These are unresolved dependency advisories assigned to Sprint 04, not evidence that a specific
deployed Worker path is exploitable. Hosted no-telemetry verification passed in Task 2.8.

Task 2.6 removes the remaining Lovable application, author, and social identity from root metadata
and historical Lovable package-cache URLs from the lockfile. Existing route metadata and page copy
remain intact. TD-041 is Verified locally and on the canonical deployment; favicon, absolute
canonical, social-image, robots, and sitemap work remains TD-042.

The canonical Worker serves production version `ee3a151d-e25b-47b8-a036-c041a9225d13`; aliased
non-production version `641f728e-b460-4cd9-bbea-4448f98f7fba` remains available. Public metadata,
retired-route 404s, browser hydration, assets, logs, rollback availability, and both pinned build
paths pass, closing TD-049, TD-052, and TD-053.

## Engineering Limits

- TypeScript, the production build, generic preview, and Wrangler dry-run pass. After Task 2.6,
  lint fails with 21 pre-existing formatting errors and 7 warnings. Task 2.5's dependency audits report 31 full
  and 24 production-filtered findings.
- No automated test framework or CI workflow exists.
- The former adapter warnings are resolved; one bounded upstream Cloudflare-tooling deprecation
  remains for Sprint 04 dependency maintenance.
- The environment/release/rollback contract exists. Broader monitoring, alerting, incident response,
  and stateful recovery remain future work.
- Accessibility, navigation, SEO, content consistency, final media, and campaign print-production
  QA remain open.

Build and audit counts are dated evidence. Re-run checks before using them in a current-status report.

## Release Limits

The codebase is not approved for public launch or health-information collection. The controlled-
pilot charter is owner-approved, but activation still requires its
operating model, consent/data handling, monitored destination for every enabled submission, support
and incident procedures, accountable approvers, and passing gate evidence.

Technical debt is authoritative for outstanding obligations. An item is not resolved because a recommendation exists or code was edited; it must be marked `Verified` with acceptance evidence.

Sprint 01 is closed as an engineering containment boundary, not as pilot activation approval.
TD-008 is Verified only through the current disabled-capability outcome; enabling any condition
transaction requires its approved clinical rules, verified accountable parties, server enforcement,
and renewed evidence. TD-005 is Verified through the current website-only policy/support
containment, TD-033 is Verified through isolated-preview containment, and TD-056 is Verified through
the approved charter. TD-032 and TD-034 are Verified through canonical hosted asset, redirect,
destination, and owner-confirmed QR-scan evidence. TD-006–TD-007 are the only original Sprint 01
debts still in progress, with an exact external close-out pack.

## Retrieval Response Pattern

When answering a question that touches an unresolved area:

1. State what is observed now.
2. State the owner-confirmed target separately.
3. Identify the open decision or debt ID.
4. Avoid filling gaps with assumptions.
5. Point to the authoritative source and date.

For example: “The interface currently simulates consent in browser state (observed). Versioned durable consent is required for the intended platform (target). Its wording, owner, storage, and withdrawal workflow remain unresolved under TD-002, TD-009, TD-012, and TD-016.”
