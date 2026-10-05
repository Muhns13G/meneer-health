---
evidence_id: phase-02-sprint-10-task-08
status: completed-locally-with-release-gates
task: 2.10.8
last_updated: 2026-10-05
related_debt: [TD-009, TD-043]
---

# Task 2.10.8 — Own-Client Administrative Case Progress

## Mission and Implemented Boundary

Add the approved minimum non-clinical case projection to the existing private `/portal` overview.
Task 10.7 is committed and formally closed with hosted Cron and owner-confirmed receipt evidence.
This task introduces neither medical intake nor clinical/payment authority, and changes no public
marketing copy. DR-018's first-party intake stream still precedes the expanded Task 10.9 rehearsal.

The server-only `read_patient_portal_with_operations` RPC reuses the governed account projection:
live provider/application patient sessions, active tenant/subject/profile, one current membership,
confirmed contact, accepted invitation, activated lifecycle and exact current instrument receipts.
It projects only own-tenant/own-subject cases. Each case has exactly `reference`, `status` and
`updatedAt`; internal state, outcome, exception, staff, clinical, product and payment fields never
cross this boundary. A strict schema rejects unexpected fields rather than stripping them silently.
No browser table or RPC grants are added. The unchanged `/portal/account` handler retains sealed
session cookies, origin/method/rate controls, private no-store responses and noindex headers.

| Internal state                                                   | Client status     | Interpretation                                                           |
| ---------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------ |
| `onboarding_pending`                                             | Waiting           | Administrative waiting, not a fabricated intake task                     |
| `ready_for_handoff`                                              | Hand-off pending  | No recorded hand-off yet                                                 |
| `handed_off`, `provider_acknowledged`, `provider_review_pending` | Hand-off recorded | No recipient/clinical-state distinction disclosed                        |
| `handoff_exception`, `cancelled`                                 | Paused            | Internal reason and withdrawal/cancellation details excluded             |
| `provider_outcome_recorded` (every outcome)                      | Completed         | Administrative processing closed, not treatment/payment/delivery success |

`action_required` remains an approved strict vocabulary value for future explicit client-action facts;
no present internal reason or readiness failure invents that obligation. The intake amendment owns
such facts. No case yields an honest empty state. More than 100 own cases fails closed, without
silent truncation; pagination is a reviewed scale-up change, not required for the bounded pilot.

## Audit, UI and Failure Behaviour

The volatile RPC appends `operations.client.status.read` before returning data. Audit failure aborts
disclosure. It rechecks live account authority after audit-lock waiting, including wall-clock session,
membership, provider and publication expiry. Case values are a read snapshot, not a real-time event
stream. The new stateless section reuses the portal's refresh, expiry, hidden-page clearing and
obsolete-request cancellation; it adds no fetch waterfall, local/session storage or third-party call.
The React review kept presentation separate from authority and reused existing lifecycle handling.

## Validation and Release Gates

- Local migration replay succeeded. Full pgTAP: **908 assertions across 22 files**, including **46**
  portal checks: coarse mappings, own-scope exclusion, server-only ACLs, exact fields, audit failure,
  expiry during audit waiting, revoked/suspended/wrong-role/purpose/provider authority and capacity.
- SQL lint and local security advisors reported no issues. Focused application packet: **29 tests**.
- Full Vitest: **610 tests across 99 files**. Desktop/mobile Playwright/axe portal matrix: **18 passed**,
  including keyboard refresh/session denial, absence of internal fields and no browser storage.
  Controlled browser responses are not hosted own-client proof.
- Production build, strict types, lint, portability, discovery and generated-route checks passed.
  The React/browser skill reviews added no dependencies or public-message changes; managed Playwright
  was used because the agent-browser CLI is unavailable.
- Hosted application of `20261005074014_patient_case_status_projection.sql` needs separate approval
  before deploying the new RPC consumer. Missing migration fails the portal closed (503), not to an
  unaudited legacy fallback. Hosted own-client acceptance belongs to the approved synthetic release
  rehearsal; no hosted writes, real identities, publication, pilot activation or deployment occurred.

## Deviations, Lessons and Debt

Reuse the existing portal endpoint rather than create another status route. Existing literal workflow
dispatch/delivery/cancellation projection remains unchanged and distinct from these administrative
case labels. Synthetic timestamp and membership fixtures were corrected to satisfy existing database
constraints. The browser test synchronises with the account response rather than initial SSR loading.
No new debt ID accrued; TD-009/TD-043 retain their wider activation requirements, and manual
assistive-technology approval remains a release gate. No branch, staging, commit or push changes.

## File Inventory

| Existing files modified                                                               | Purpose                                                                 |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/domain/identity/patient-portal.ts`                                               | Strict three-field status schema and bounded account array              |
| `src/adapters/identity/supabase/supabase-patient-portal-repository.ts` and `.test.ts` | Audited own-client RPC and field/error rejection                        |
| `src/components/PatientPortalPage.tsx`                                                | Integrate case section into private overview                            |
| `src/test/patient-portal-fixture.ts`                                                  | Honest empty synthetic case inventory                                   |
| `supabase/tests/database/patient_portal_projection.test.sql`                          | Projection/audit/expiry and isolation packet                            |
| `e2e/patient-portal.spec.ts`                                                          | Desktop/mobile coarse states, axe, data clearing and extra-field denial |
| Sprint 10 plan, phase README, registry, RAG current state/limitations/index           | Reconcile task outcome and release boundary                             |

| New files                                                               | Purpose                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `src/components/ClientCaseProgress.tsx` and `.test.tsx`                 | Stateless minimum display and strict vocabulary tests |
| `supabase/migrations/20261005074014_patient_case_status_projection.sql` | CLI-generated server-only audited wrapper             |
| This annexure                                                           | Mission, decisions, evidence and retained gates       |
