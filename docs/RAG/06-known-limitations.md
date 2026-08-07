---
rag_id: meneer-known-limitations
title: Meneer Known Limitations and Answer Guardrails
status: current
authority: derived-from-audit-and-debt
last_updated: 2026-08-07
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
  - docs/06-operations/cloudflare-environments-release-runbook.md
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

Provider identity, registrations, partner arrangements, treatment eligibility, contraindications,
clinical pathways, transactional consent/privacy/terms, pricing, refund rules, delivery promises,
and peptide positioning are not approved in the repository evidence. Versioned website-only privacy
and terms notices are implemented and owner-approved for publication as version 1.0; they are not
authority for health-data collection or transactions. Existing marketing and MCP claims require a
governed claim register and domain review.

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
The Lovable Vite wrapper and MCP surface have been removed. The associated telemetry implementation
and environment references are absent from local source, configuration, and built output; hosted
network/log proof remains open in Task 2.7. Root and fallback metadata now use approved Meneer values; the
broader TD-042 discovery package remains open. The `itws-I-preview` build is served at `meneerhealth.co.za`;
canonical checks verify the local placeholder logo and campaign routes. The longer-term
Vercel decision is deferred to the planned Next.js v2. Cloudflare environment roles and rollback
procedure are now documented, but current-source hosted logs and post-deploy evidence remain open.
Final brand work remains open.

Do not request or recommend `LOVABLE_API_KEY`. Do not state that removing Lovable will disconnect a functioning patient backend; none was found.

The Task 2.2 isolated baseline recorded a generic `bun run preview` 500 failure. Task 2.3 repaired
that path: explicit Cloudflare output now passes Vite preview and Wrangler dry-run. Lint still fails
on 30 formatting errors plus 7 warnings, and the baseline dependency audit reported 41 findings.
One upstream `punycode` deprecation remains in current Cloudflare tooling. Task 2.5 bounded it to
build/development commands and completed package normalization; final upstream remediation belongs
to routine dependency maintenance.

Task 2.4 removes MCP locally: its SDK, plugin, definitions, routes, OAuth metadata, manifest, and
built output are absent, and every former endpoint returns the ordinary HTML 404 in development and
production preview. The currently deployed branch may retain the old surface until the repository
owner commits and deploys this boundary; hosted removal evidence remains Task 2.7.

Task 2.5 removes active Lovable environment and package-install behaviour locally; Task 2.6 removes
three historical Lovable package-cache URLs that its narrower search initially overlooked. The
dependency graph remains 456 installs across 566 packages. `bun audit` reports 31 findings
(15 high, 12 moderate, 4 low), while `bun audit --prod` reports 24 (9 high, 11 moderate, 4 low).
These are unresolved dependency advisories assigned to Sprint 04, not evidence that a specific
deployed Worker path is exploitable. Hosted no-telemetry verification remains Task 2.7.

Task 2.6 removes the remaining Lovable application, author, and social identity from root metadata
and historical Lovable package-cache URLs from the lockfile. Existing route metadata and page copy
remain intact. TD-041 is Verified locally and on the canonical deployment; favicon, absolute
canonical, social-image, robots, and sitemap work remains TD-042.

The canonical Worker now deploys Sprint 2.6 from `itws-I-preview` commit `2e83767`, while `itws-I`
commit `774839d` is available as a non-production version. The public host serves Meneer metadata
and ordinary HTML 404 responses for retired MCP/OAuth routes, closing TD-053. Runtime pins, secret
rules, branch roles, persisted logs, promotion, post-deploy checks, and rollback are documented
locally; Task 2.7 must still be committed and deployed before TD-049 or TD-052 can close.

## Engineering Limits

- TypeScript, the production build, generic preview, and Wrangler dry-run pass. After Task 2.6,
  lint fails with 21 pre-existing formatting errors and 7 warnings. Task 2.5's dependency audits report 31 full
  and 24 production-filtered findings.
- No automated test framework or CI workflow exists.
- The former adapter warnings are resolved; one bounded upstream Cloudflare-tooling deprecation and
  current-source hosted release evidence remain unresolved.
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
