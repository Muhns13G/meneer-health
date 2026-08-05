---
plan_id: phase-01-sprint-07
title: Content Governance, Measurement, and MCP Boundaries
status: planned
primary_debt: [TD-040, TD-045, TD-046, TD-047, TD-048]
depends_on: [phase-01-sprint-02, phase-01-sprint-03, phase-01-sprint-05, phase-01-sprint-06]
last_updated: 2026-08-06
owner: unassigned
---

# Sprint 07 — Content Governance, Measurement, and MCP Boundaries

## Mission

Establish one governed public-content model, reconcile the patient journey across channels, introduce privacy-safe pilot measurement, and close the MCP boundary so no AI or analytics surface bypasses clinical, legal, privacy, or release controls.

## Intended Outcome

Website, metadata, messages, campaign materials, support content, and any retained MCP output derive from approved canonical content or a controlled generation boundary. Journey steps and promises are consistent. Pilot measurement excludes health and credential data. MCP is either absent or explicitly constrained to approved public read-only information with a documented future-private boundary.

## Scope

Primary debt: TD-040 and TD-045–TD-048.

### Workstream 1 — Canonical journey and content model

1. Approve one canonical end-to-end journey and define permitted channel-specific summaries.
2. Reconcile three-step, four-step, five-event, delivery, 48-hour, consultation, cancellation, and fulfilment language.
3. Create a versioned content schema or controlled module for treatments, availability, journey steps, support routes, pricing state, policies, and trust markers.
4. Define content owners, approval states, effective/review dates, channels, localisation, archival, and emergency withdrawal.
5. Add consistency tests so treatments and core promises cannot drift silently.

### Workstream 2 — Claim governance

1. Complete the claim register begun in Sprint 01.
2. Link each retained public claim to evidence, accountable clinical/legal owner, allowed channels, effective date, and review/expiry date.
3. Prevent draft, expired, rejected, or channel-inappropriate claims from publishing.
4. Include website, posters, metadata, support scripts, lifecycle messages, social previews, and any MCP output.

### Workstream 3 — Privacy-safe measurement

1. Define pilot questions, success measures, event names, owners, lawful/approved purpose, retention, and access.
2. Establish prohibited analytics fields and events, including symptoms, conditions where avoidable, questionnaire answers, credentials, free text, contact details, tokens, and clinical decisions.
3. Minimise campaign attribution and prevent health intent from entering URLs, referrers, third-party properties, or session-replay payloads.
4. Implement consent behaviour where required and verify opt-out/withdrawal.
5. Test analytics payloads and retention/deletion procedures using synthetic data only.

### Workstream 4 — MCP disposition and boundary

1. Apply Sprint 02's MCP decision. If removed, verify no routes, manifest, SDK, metadata, content duplicate, or public documentation remains active.
2. If reintroduced, use a vendor-neutral SDK and canonical approved content rather than MCP-specific constants.
3. Keep v1 MCP unauthenticated only if it is deliberately public, read-only, rate-limited, monitored, and contains no private or inferred patient information.
4. Document that account, intake, scheduling, clinical, prescription, order, or support tools require a separate future threat model, OAuth/authorisation, consent, audit, privacy, and release decision.
5. Test tool listing, invocation, unsupported tools, malformed requests, origins, rate limits, redaction, and content consistency.

## Required Decisions and Inputs

- Approved canonical journey, service scope, commercial model, claims, policies, and owners.
- Pilot measurement goals and privacy approval.
- MCP remove/defer/reimplement decision and named use case.
- Canonical content storage/generation approach compatible with v2 migration.
- Approved retention and access rules for analytics and public-content history.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| TD-040 | Approved journey model and automated consistency checks reconcile all retained channel representations.                                    |
| TD-045 | Measurement plan, prohibited-data specification, payload tests, consent/opt-out behaviour, retention, and access review pass.              |
| TD-046 | Website and any retained MCP treatment/journey data derive from one governed source or tested generation boundary.                         |
| TD-047 | Every retained MCP/public claim is linked to the claim register and approval lifecycle; unsupported claims are absent.                     |
| TD-048 | MCP is removed or its public read-only boundary, threat model, limits, monitoring, and future-private prohibition are approved and tested. |

## Validation

- Run the complete CI and browser suite.
- Compare rendered website, metadata, posters, messages, support content, and any MCP responses against the canonical source.
- Add tests that fail on missing, duplicated, expired, or inconsistent treatment and journey entries.
- Inspect analytics requests, URLs, referrers, logs, replays, exports, and deletion flows with synthetic canary fields.
- If MCP remains, run protocol list/invoke, malformed request, unknown tool, CORS/origin, rate-limit, injection/content, and observability tests.
- Obtain clinical/legal approval for claims and privacy/security approval for measurement and MCP boundaries.

## Non-Goals

- Patient-specific MCP tools or AI-generated clinical advice.
- Broad growth analytics before the pilot establishes safe, useful measures.
- Copying Hims, Ro, AndroLab, or partner claims without local evidence and approval.
- Building a full CMS unless the approved content workflow requires it.

## Risks and Rollback

Canonical content can propagate an error across every channel. Require approval states, preview, versioning, rapid withdrawal, and rollback to the last approved version. Analytics and MCP can create silent data egress; default to no collection/no endpoint when validation fails. Any private-tool proposal must remain disabled until separately approved.

## Documentation and RAG Updates

- Add the canonical content schema, claim register, measurement specification, and MCP boundary decision.
- Update TD-040 and TD-045–TD-048 only after evidence review.
- Refresh all affected internal RAG documents and `07-index.json`.
- Create a separate future public/clinical corpus only from approved versioned material; do not mix it with internal RAG.
- Produce `docs/03-completion-reports/phase-01/sprint-07-content-measurement-mcp.md`.
