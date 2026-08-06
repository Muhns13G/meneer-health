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

Provider identity, registrations, partner arrangements, treatment eligibility, contraindications, clinical pathways, consent wording, privacy terms, pricing, refund rules, delivery promises, and peptide positioning are not approved in the repository evidence. Existing marketing and MCP claims require a governed claim register and domain review.

The owner-confirmed provisional operator and development fixtures are centralized in the pilot
compliance profile. `Dr John Doe`, `Jane Doe`, `HPCSA-PLACEHOLDER`, and
`Y-NUMBER-PLACEHOLDER` are not verified identities or registrations and must never be presented as
such. Their presence deliberately keeps activation blocked. `/start` provides universal emergency
containment only; it is not a substitute for condition-specific clinical rules or server enforcement.

Peptides are owner-confirmed as the first intended v1 rollout product, not a "coming soon" category.
The current transaction is nevertheless gated until its product-level, partner, questionnaire,
data-transfer, dispensing, exclusion, escalation, and operational evidence is approved. Preserve
established customer-facing messaging while keeping that implementation boundary explicit.

Never generate patient-specific diagnosis, dosing, eligibility, or treatment advice from this corpus. Never treat the blueprint's intended journey as an approved clinical protocol.

## Platform Limits

The repository is not yet ready for hosted pilot use. Lovable's Vite wrapper, MCP
SDK, telemetry path, manifest, and metadata remain. Cloudflare plugin and Wrangler configuration
remain. Sprint 01.6 replaces the shared logo's virtual-asset dependency with a local approved
placeholder. Local desktop/mobile visual evidence is complete; the Cloudflare-versus-Vercel choice,
selected-host preview/production verification, and final brand work remain open.

Do not request or recommend `LOVABLE_API_KEY`. Do not state that removing Lovable will disconnect a functioning patient backend; none was found.

## Engineering Limits

- TypeScript and the production build passed at Sprint 01 closure. Lint still failed with 32 errors
  and 7 warnings; dependency-audit findings remain dated audit debt.
- No automated test framework or CI workflow exists.
- Build warnings and deployment-adapter drift remain unresolved.
- No environment contract, deployment guide, monitoring, incident runbook, or rollback procedure exists.
- Accessibility, navigation, SEO, content consistency, media, and QR defects remain open.

Build and audit counts are dated evidence. Re-run checks before using them in a current-status report.

## Release Limits

The codebase is not approved for public launch or health-information collection. A controlled pilot also requires its own approved scope, operating model, consent/data handling, monitored destination for every enabled submission, support and incident procedures, success measures, and stop criteria.

Technical debt is authoritative for outstanding obligations. An item is not resolved because a recommendation exists or code was edited; it must be marked `Verified` with acceptance evidence.

Sprint 01 is closed as an engineering containment boundary, not as pilot activation approval.
TD-008 and TD-034 now have verified local implementation progress but remain acceptance-gated;
TD-005–TD-008, TD-032–TD-034, and TD-056 remain unresolved as recorded in the completion report and
registry.

## Retrieval Response Pattern

When answering a question that touches an unresolved area:

1. State what is observed now.
2. State the owner-confirmed target separately.
3. Identify the open decision or debt ID.
4. Avoid filling gaps with assumptions.
5. Point to the authoritative source and date.

For example: “The interface currently simulates consent in browser state (observed). Versioned durable consent is required for the intended platform (target). Its wording, owner, storage, and withdrawal workflow remain unresolved under TD-002, TD-009, TD-012, and TD-016.”
