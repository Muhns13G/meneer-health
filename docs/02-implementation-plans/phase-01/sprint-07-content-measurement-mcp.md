---
plan_id: phase-01-sprint-07
title: Content Governance, Measurement, and MCP Boundaries
status: active
primary_debt: [TD-040, TD-045, TD-046, TD-047, TD-048]
depends_on: [phase-01-sprint-02, phase-01-sprint-03, phase-01-sprint-05, phase-01-sprint-06]
last_updated: 2026-08-13
owner: "@Muhns13G"
---

# Sprint 07 — Content Governance, Measurement, and MCP Boundaries

## Mission

Establish one governed public-content model, reconcile the patient journey across channels, introduce privacy-safe pilot measurement, and close the MCP boundary so no AI or analytics surface bypasses clinical, legal, privacy, or release controls.

## Intended Outcome

Website, metadata, messages, campaign materials, and support content derive from approved canonical
content or a controlled generation boundary. Journey steps and promises are consistent. Pilot
measurement excludes health and credential data. MCP remains absent from v1, with a documented
decision boundary for any future public or private reintroduction.

## Scope

Primary debt: TD-040 and TD-045–TD-048.

TD-040, TD-045, and TD-046 are Open at the reconciled baseline. TD-047 and TD-048 are already
Verified through the Sprint 02 removal of MCP and must remain closed through regression evidence;
Sprint 07 does not reintroduce MCP or reopen those debts without a separate owner-approved use case.

## Reconciled Starting Point

- Sprint 06 is closed. Route-aware navigation, private treatment-intent persistence, responsive
  accessibility, support routing, discovery metadata, and the external-font policy are implemented
  and tested. Sprint 07 must preserve those contracts and must not activate gated transactions.
- Public journey wording remains intentionally distributed. The homepage presents three steps,
  `Timeline` presents four events, and the preserved `/start` confirmation presents five events plus
  48-hour and delivery timing. TD-040 therefore remains a real content-model problem, not authority
  to rewrite established customer-facing copy without approval.
- The Sprint 01.5 retained-claim register exists and the Sprint 03 operating/commercial decisions
  clarify several meanings, but claims still lack one versioned publication lifecycle, complete
  evidence/owner links, channel rules, expiry handling, and automated withdrawal controls.
- Treatment availability, descriptions, route metadata, journey copy, campaign/support content,
  and preserved prototypes remain separate constants. The typed treatment-intent catalogue is a
  security/navigation contract, not a canonical public-content source.
- No analytics implementation exists. Cloudflare automatic Web Analytics remains deliberately
  disabled, and treatment intent is prohibited from URLs, referrers, logs, payment metadata,
  analytics, and third-party systems. The provider, lawful/approved purpose, consent position,
  retention, access, and deletion process still require a Sprint 07 decision.
- MCP, its Lovable SDK/plugin, routes, manifest, OAuth metadata, tools, and duplicated content were
  removed in Sprint 02. Hosted MCP paths return ordinary HTML 404 responses. Any future MCP remains
  outside v1 until a separately approved vendor-neutral use case and threat model exist.

## Commit-Sized Task Plan

| Task | Commit-sized outcome                                                                                                                                 | Primary debt / gate                    | Status    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------- |
| 7.1  | Rebaseline every public-content representation, claim, measurement surface, and retired MCP artefact; freeze invariants and implementation order.    | All Sprint 07 debt                     | Completed |
| 7.2  | Approve one canonical journey vocabulary and model, including permitted three-step, timeline, confirmation, delivery, and timing summaries.          | TD-040; owner/domain approval          | Completed |
| 7.3  | Implement a versioned, framework-neutral public-content schema with owners, states, channel rules, review dates, archive, and emergency withdrawal.  | TD-046                                 | Completed |
| 7.4  | Complete the claim register and add fail-closed publication validation for evidence, approver, channel, effective, review, and expiry state.         | TD-047 assurance; domain inputs        | Completed |
| 7.5  | Migrate active website, metadata, campaign, support, and preserved-prototype references to the approved canonical source without ad hoc copy edits.  | TD-040, TD-046                         | Completed |
| 7.6  | Add cross-channel drift, duplicate, expiry, withdrawal, version, and rollback tests for journey, treatment, policy, support, and trust content.      | TD-040, TD-046, TD-047 assurance       | Completed |
| 7.7  | Approve the minimal pilot measurement specification: questions, events, prohibited data, purpose/consent, provider, access, retention, and deletion. | TD-045; privacy/owner approval         | Completed |
| 7.8  | Implement a default-off, provider-neutral measurement boundary with minimal campaign attribution, consent/opt-out behaviour, and strict schemas.     | TD-045                                 | Completed |
| 7.9  | Prove synthetic payload, URL/referrer/log/replay, retention, export, deletion, opt-out, and hosted network behaviour using prohibited-data canaries. | TD-045; hosted/privacy evidence        | Completed |
| 7.10 | Re-prove local and hosted MCP absence and document the future public/private MCP boundary, threat model trigger, and reintroduction prohibition.     | TD-047, TD-048 regression assurance    | Planned   |
| 7.11 | Run complete CI/browser checks and obtain the required content, clinical/legal, privacy/security, and release evidence for implemented scope.        | All Sprint 07 debt; external approvals | Planned   |
| 7.12 | Reconcile debt and RAG documents, record deviations/lessons/new debt and file inventories, and issue the Sprint 07 completion report.                | Sprint closure                         | Planned   |

Each task remains independently committable. A missing domain approval must retain a documented
activation gate; it must not be replaced with invented evidence, silent copy changes, or a claim of
verified completion.

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

1. Apply Sprint 02's removal decision and verify no route, manifest, SDK, metadata, content duplicate,
   built output, or public documentation remains active.
2. Re-run local and hosted negative-path checks against former MCP and OAuth endpoints.
3. Record that any future public MCP requires a named use case, vendor-neutral implementation,
   canonical approved content, read-only scope, rate limits, monitoring, and privacy/security review.
4. Record that account, intake, scheduling, clinical, prescription, order, or support tools require a
   separate threat model, OAuth/authorisation, consent, audit, privacy, and release decision.
5. Keep MCP code and protocol testing outside Sprint 07 because no v1 implementation exists.

## Required Decisions and Inputs

- **Available:** v1 service scope and preserved-copy rule; canonical origin and route policy;
  operating/commercial architecture; initial retained-claim register; prohibited treatment-intent
  leakage rule; and the approved v1 decision to keep MCP removed.
- **Approved in Task 7.2:** five canonical public phases, controlled channel projections,
  pathway-specific conditionality, cross-cutting support/cancellation, and precise intake,
  48-hour, availability, and fulfilment timing semantics.
- **Tasks 7.3–7.6 approval:** content and claim owners, accepted approval states, evidence links,
  effective/review/expiry rules, localisation position, emergency-withdrawal authority, and the
  framework-neutral storage/generation boundary compatible with v2.
- **Tasks 7.7–7.9 approval:** pilot measurement questions and success measures, provider or
  first-party disposition, lawful/approved purpose and consent position, access roles, retention,
  deletion, and privacy/security sign-off.
- **MCP boundary:** removal/defer is already approved for v1. A reimplementation is a non-goal and
  requires a separately named use case and decision; Task 7.10 only verifies absence and records the
  future boundary.

## Acceptance Evidence

| Debt   | Evidence required                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| TD-040 | Approved journey model and automated consistency checks reconcile all retained channel representations.                                   |
| TD-045 | Measurement plan, prohibited-data specification, payload tests, consent/opt-out behaviour, retention, and access review pass.             |
| TD-046 | Website and any retained MCP treatment/journey data derive from one governed source or tested generation boundary.                        |
| TD-047 | Every retained public claim is linked to the claim register and approval lifecycle; future MCP inherits the same source and controls.     |
| TD-048 | Local, built, and hosted evidence confirms MCP remains absent; future public/private reintroduction gates remain documented and approved. |

## Validation

- Run the complete CI and browser suite.
- Compare rendered website, metadata, posters, messages, support content, and any MCP responses against the canonical source.
- Add tests that fail on missing, duplicated, expired, or inconsistent treatment and journey entries.
- Inspect analytics requests, URLs, referrers, logs, replays, exports, and deletion flows with synthetic canary fields.
- Verify former MCP/OAuth paths remain absent from source, dependencies, built output, local routing,
  and hosted routing.
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
