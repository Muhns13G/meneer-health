---
plan_id: phase-02-sprint-12-3
title: Private Purpose Support Routing and Owner Acknowledgement
status: completed-local
last_updated: 2026-10-06
owner: "@Muhns13G"
depends_on: [phase-02-sprint-12-2, DR-016]
---

# Task 2.12.3 — Purpose Support Routing

## Outcome and boundary

Implemented locally against committed Task 12.2 baseline `b40a80f` on `itws-I`.
Authenticated clients can request secure privacy, service-complaint or clinical/adverse-event
follow-up through `/portal/support`. A route is available only with an unambiguous, current private
coverage policy and two independently authorised owners. No owner appointments, clinical deadlines
or operating hours have been invented. No support route is seeded or activated by this migration.
Existing public `/contact`, `/privacy` and `/terms` wording is unchanged.

This completes the engineering/local slice, not live support acceptance. No hosted migration,
provider contact, email, secret transmission, deployment or Git mutation occurred. Task 12.4 owns
staff follow-up/failed-delivery UI; Task 12.8 owns hosted delivery, acknowledgement, absence/failure
and fallback rehearsal. TD-043 remains Open; TD-037/038 require released-flow accessibility proof.

## Implemented contract

| Boundary          | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Coverage          | Private versioned policy binds purpose, primary/alternate subject, finite validity, roster/mailbox/receipt/absence/failure evidence references and current administrator approval. Clinical policies additionally require independent clinical-authority and after-hours references. References identify reviewed evidence; their presence is not verification of that evidence. Revocation is one-way; policy content is immutable. |
| Current authority | Both owners need active subjects, verified contact and current tenant membership for their exact purpose. Privacy requires auditor/privacy-review, complaints operations or support, and clinical requires clinician/care-delivery. Nonclinical operations and pharmacy software support cannot inherit clinical ownership. AAL2 is required for every workforce response.                                                           |
| Entry             | Sealed own-client session and existing account/profile/document authority are independently checked at HTTP and database boundaries. Same-origin bounded JSON, session-principal rate limits, strict commands and matching idempotency keys prevent browser-supplied tenant, recipient, owner or text payloads.                                                                                                                      |
| Persistence       | Three forced-RLS private identity tables retain immutable coverage, minimal purpose-only requests and immutable owner responses. Direct anonymous/authenticated/service table access and helper execution are denied. Recovery already covers the identity/audit schemas.                                                                                                                                                            |
| Receipt           | Case creation and generic notification intent are atomic. Stable replay returns the original receipt; changed payload conflicts. Maximum ten new requests per client/tenant per 24 hours. Receipt does not mean delivery, human acknowledgement, clinical review, refund or resolution.                                                                                                                                              |
| Acknowledgement   | Only the current policy's exact primary/alternate can respond in its purpose and tenant. Resolution requires prior human acknowledgement. Overdue or unavailable primary coverage projects alternate follow-up; only the current alternate may acknowledge an escalated case. No system-generated human acknowledgement is invented.                                                                                                 |
| Hours/fallback    | Preserve DR-016's qualified answer target within 24 hours where possible, with no fixed public hours or continuous-staffing promise. Clinical acknowledgement deadline/after-hours guidance require approval. Generic support is a non-sensitive privacy/service fallback only; it is not clinical care. The Information Regulator contact remains available for privacy complaints.                                                 |
| Emergency         | Urgent flags return emergency guidance without creating a request or notification. The private page directs urgent/severe symptoms to 112, 10177 or the nearest emergency facility rather than waiting for asynchronous support.                                                                                                                                                                                                     |
| Privacy/transport | No health answers, identity documents, payment details or complaint body are collected in this request form. Generic support notices reuse Task 12.2's disabled transport. Transport failure ownership is not clinical decision authority. No new public aliases, browser storage or query-string identifiers are introduced.                                                                                                        |

The private page explicitly refreshes availability/status, clears stale availability on uncertainty,
retains the same request key for an uncertain retry and clears private UI on authority loss.
Unavailable purpose controls explain why submission is disabled. Abort/cleanup, duplicate-pending
protection, semantic controls and status focus follow the React review checklist; complete browser
flows supplement the independent real SQL/HTTP authority tests, not substitute for hosted proof.

## Files

| Kind             | Files                                                                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New runtime      | `src/domain/support/support.ts`; `src/server/support/support-http.ts`; `src/components/SupportPanel.tsx`; `src/routes/portal.support.tsx`; `supabase/migrations/20261006152000_purpose_support_routes.sql` |
| New tests        | `src/server/support/support-http.test.ts`; `src/components/SupportPanel.test.tsx`; `supabase/tests/database/purpose_support_routes.test.sql`; `e2e/purpose-support.spec.ts`                                |
| Modified runtime | `src/components/PatientPortalPage.tsx`; `src/server.ts`; `src/server/security/request-security.ts`; generated `src/routeTree.gen.ts`                                                                       |
| Documentation    | This packet; Sprint 12 plan; Phase 02 overview; RAG current state, limitations and index; technical-debt registry; Cloudflare release runbook                                                              |

No dependencies, environment variables, Worker bindings or public marketing copy changed.

## Local evidence

- Fresh local migration replay and SQL lint passed. All 32 database suites passed, 1,480 assertions;
  the new rollback-only support packet contributes 50 assertions for route coverage, tenant/purpose,
  ownership, AAL2, revocation, append-only policy/response facts, replay, urgency and atomic rollback.
- Existing notifications concurrent-budget check passed: eight competing claims, one winner,
  baseline restored. Identity security passed five suites/168 assertions; operations rehearsal
  passed nine suites/513 assertions, rollback-only with unchanged payment adapters and no emails.
- Targeted component/HTTP tests cover sealed sessions, strict minimal payloads, same-origin/body/
  rate denials, redacted errors, unavailable routes, uncertainty, emergency and authority loss.
- Desktop/mobile browser checks cover support controls, keyboard submission, axe, no browser
  storage, anonymous endpoint denial and expiry clearing, plus existing portal/public support
  regressions. Positive browser data is explicitly intercepted synthetic data; actual database
  authority is proved by the rollback-only SQL packet, not by those intercepted responses.

- Final desktop/mobile matrix passed 24 checks across purpose support, existing private portal
  and approved public support boundaries. It caught and corrected staff catch-all dispatch order;
  a regression test also protects bounded-request body handling and dispatcher precedence.
- Final application suite passed 126 files/815 tests, including the dispatcher regression.
- Node 22 production build, client-bundle/MCP-absence, generated Worker types, strict typecheck,
  lint, formatting, portability and discovery checks passed. All 183 indexed paths and 270 relative
  links across the seven changed Markdown documents resolve; frontmatter parses successfully.
- The final tightened migration replay passed all 1,480 assertions and SQL lint. Local Supabase
  was stopped with its recoverable development backup retained. No hosted service was contacted.

Automated axe is not manual assistive-technology acceptance.

## Owner-controlled activation / next task

1. After owner approval, apply committed notification and support migrations in dependency order.
   This task did not inspect or change hosted migration state. Deploy only through the owner.
2. Privately appoint current primary and alternate for each purpose, including an independently
   verified clinician. Review mailbox delegation/MFA, coverage, absence/failure tests and evidence.
3. Approve a finite policy version, clinical deadline and after-hours guidance; do not copy local
   synthetic fixtures or treat UUID references as domain sign-off. Leave ambiguous/missing routes
   unavailable and real pilot suspended.
4. Complete staff follow-up/failed-delivery controls (12.4) and explicitly authorised hosted inbox,
   owner acknowledgement, missed deadline, absence, failure and emergency tests (12.8). Preserve
   disabled transport until that bounded rehearsal is authorised. Publish purpose aliases only
   after the release acceptance evidence is satisfied.

Seven existing non-Verified debts remain unchanged. No new debt ID or pilot permission arises.
