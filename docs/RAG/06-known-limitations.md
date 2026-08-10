---
rag_id: meneer-known-limitations
title: Meneer Known Limitations and Answer Guardrails
status: current
authority: derived-from-audit-and-debt
last_updated: 2026-08-11
audience: internal
sensitivity: internal
sources:
  - docs/01-audits/project-codebase-audit-2026-08-05.md
  - docs/04-technical-debt/technical-debt-registry-v1.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-2-incomplete-journey-gate-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-8-safety-campaign-continuation-evidence.md
  - docs/03-completion-reports/phase-01/sprint-01-pilot-risk-containment.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-6-meneer-metadata-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-2-contract-foundation-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-3-environment-security-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-7-managed-identity-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-10-audit-integration-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-11-request-security-evidence.md
  - docs/06-operations/audit-integration-evidence-runbook.md
  - docs/06-operations/request-security-abuse-runbook.md
  - docs/06-operations/environment-secrets-runbook.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-4-http-security-cache-evidence.md
  - docs/06-operations/http-security-cache-policy.md
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
  - docs/07-decisions/DR-009-free-tier-pilot-provider-stack.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-5-provider-selection-data-map-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-03-8-architecture-validation-evidence.md
  - docs/03-completion-reports/phase-01/sprint-03-operating-model-architecture.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-1-repository-health-baseline-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-2-bun-package-contract-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-3-ui-surface-reduction-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md
  - docs/03-completion-reports/phase-01/sprint-04-repository-delivery-health.md
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

DR-004 approves the framework-neutral contract, compatibility, migration, reconciliation, cutover,
and rollback rules. Task 5.2 now supplies strict common machine-readable envelopes, registry/error/
version schemas, portable synthetic fixtures, contract tests, and initial dependency enforcement.
Task 5.9 now supplies the first strict business command and Supabase transaction adapter. Task 5.10
adds its first portable audit/domain-event/inbox contracts and durable local audit/outbox/inbox
foundation, but the repository still has no complete business payload catalogue, delivery worker, retained-
capability suite, or behavioural-equivalence rehearsal. TD-014 and TD-055 are In progress and must
not be described as Verified or as an enabled customer transaction.

DR-005 approves PostgreSQL, object-storage, logical schema, tenancy, lifecycle, migration, backup,
and restore architecture; DR-006 approves vendor evaluation and exit criteria. DR-009 selects the
free-tier-first pilot providers, and the owner has provisioned the empty London Supabase project.
Local/CI contains versioned tenancy, identity, authorisation and workflow-command migrations plus
synthetic provider integration; the hosted project remains unmigrated and credential-free. No
backup, restore, data-subject workflow, or retention enforcement exists in pilot runtime.
Do not describe provider selection as closure of TD-016 or Sprint 05 implementation.

The selected Supabase Free model has one hosted pilot project, so local/CI use local Supabase and
Cloudflare branch previews must keep real providers disabled or synthetic. Free-tier limits,
inactivity pausing, short log retention, and lack of automatic backups/PITR are operational limits,
not accepted recovery controls. Intake must pause or a reviewed upgrade must occur before a stop
trigger is crossed; automatic spend is prohibited.

Task 5.7 implements stable subject/contact mapping, bound invitation/recovery governance, TOTP AAL2,
immutable absolute session origins, atomic idle expiry, revocation and scoped service identities.
The corrected database/Auth lifecycle proof passed on 2026-08-10, closing Task 5.7. Task 5.8 then
implements and locally verifies the ordinary deny-default contextual matrix, horizontal/vertical
isolation, minimum projections and exact service scope. This remains an inactive server foundation,
not an account journey. Tasks 5.10–5.11 now add successful-command audit/review and shared
request-abuse foundations. TD-013 remains In progress while Task 5.12 owns denial evidence,
monitored break glass, abuse alerts and activation evidence.

Task 5.11 adds a locally verified inactive request-security foundation. It protects current reads,
denies and rate-checks unregistered mutations, and defines reusable protected-JSON controls, but it
does not provision Turnstile, configure a hosted WAF rule, publish a command/callback, or prove
route-specific monitoring. Do not describe TD-017 as Verified: every enabled form, identity action,
payment or provider callback still needs its own policy and local/preview/hosted bypass evidence.

Task 5.12 adds strict custom Worker telemetry, local alert thresholds, a passing controlled incident
exercise and append-only identified denial evidence. This is not a hosted monitoring claim.
Automatic invocation logs are disabled; the owner has not yet recorded Better Stack production
monitor activation/failure evidence, and Task 5.13 still owns the backup heartbeat and restore.
Therefore TD-020, TD-013, TD-015 and TD-017 remain In progress despite the completed repository task.

Task 5.9 implements an inactive synthetic workflow command with strict validation, contextual
authorisation, independent clinical/payment/fulfilment state, optimistic versions, durable
payload-bound idempotency, concurrent replay and atomic false-success prevention. It proves the
shared command boundary, not a live registration, consent, booking, payment, prescription, order or
partner workflow. TD-014 remains In progress until Tasks 5.14–5.15 implement the applicable real
commands after their commercial and partner gates pass.

Task 5.10 proves one inactive workflow's atomic audit/outbox evidence, replay-safe fingerprint-only
inbox, append blocking, hash-chain tamper detection and assigned AAL2 audit review. Do not describe
this as complete audit coverage, immutable/WORM storage, active provider messaging, scheduled
monitoring, retention/export enforcement or hosted operation. TD-015 remains In progress through
Tasks 5.12–5.15.

Task 3.8 validates the design and approves a conservative lifecycle/recovery baseline; it does not
prove operation. Final legal/privacy/clinical application to named entities/providers remains an
activation gate. TD-016 is In progress until Sprint 05 demonstrates a staging restore and complete
synthetic rights request with processor and backup reconciliation. Do not describe the nine scenario
walkthroughs as executed customer transactions or runtime tests.

Sprint 03 is complete, but only as an architecture-and-decision boundary. Do not convert that
status into claims that vendors are selected, accountable particulars are verified, controls are
implemented, transactions are enabled, or the pilot is approved. Its residual debts remain TD-009,
TD-010, TD-013, and TD-016.

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

- TypeScript, the production build, generic preview, and Wrangler dry-run pass. Tasks 4.4–4.5 clear
  the tracked formatting, Fast Refresh, and unused-code baseline: format, lint, and typecheck pass
  locally with zero lint findings.
- The Task 4.10 CI workflow declares the clean format/lint baseline, and Task 4.12 proves the full
  sequence from an isolated clone plus hosted passing and controlled-failure runs. Protected
  `develop` rejects the failed required check on closed unmerged PR #10.
- Tasks 4.8–4.9 clear both full and production-filtered Bun audits without an exception. Task 4.10
  declares both gates in CI; Task 4.12 verifies hosted enforcement.
- The unused shadcn/Radix surface and its direct dependencies are removed. New primitives must be
  added with their first approved product use, not as speculative scaffolding.
- The inactive `StartFlow` and `PeptidesPage` prototypes remain deliberate unused-code exceptions.
  They are not rendered, exported, or suitable for activation without their replacement gates.
- Vitest/jsdom unit, component, and redirect-integration coverage exists. Controlled desktop/mobile
  Playwright/axe coverage passes locally and in hosted Task 4.10 CI. Automated axe checks do not
  replace manual keyboard or assistive-technology review.
- The former adapter warnings are resolved; one bounded upstream Cloudflare-tooling deprecation
  remains for routine dependency maintenance.
- The environment/release/rollback contract exists. Broader monitoring, alerting, incident response,
  and stateful recovery remain future work.
- Task 5.3 established the environment boundary; Task 5.6 extends it with an optional all-or-none
  server-only Supabase URL/secret pair. Preview excludes the pair, partial or non-HTTPS configuration
  fails closed, and the bundle canary prevents the names from entering browser output. No hosted
  value is recorded in Git and the adapter remains unsafe to activate until later proof gates pass.
- Task 5.6 provides a local read-side persistence scaffold only. Forced RLS and revoked browser
  privileges deliberately leave no user policy; Supabase service access bypasses RLS and therefore
  remains server-only. Do not describe this as authentication, authorisation, durable workflow,
  hosted schema, backup, restore, patient-data readiness or pilot activation.
- Task 5.4 and TD-018 are Verified locally and on Cloudflare for Worker/static-asset security headers,
  cache classes, HSTS, matching nonce CSP, hydration, and clean browser operation. The CSP
  intentionally permits inline styles for current UI implementation, but not inline scripts; new
  origins or sensitive routes require an explicit policy review and renewed regression evidence.
- Task 4.11 adds root onboarding, contribution/security routing, test/CI guidance, and GitHub change
  templates. Task 4.12 verifies clean-checkout usability and hosted rendering from protected
  production/default `main`; canonical engineering documentation remains on `develop`.
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
