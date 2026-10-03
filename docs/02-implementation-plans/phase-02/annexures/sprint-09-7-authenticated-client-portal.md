---
evidence_id: phase-02-sprint-09-7-authenticated-client-portal
title: Authenticated Own-Client Portal
status: completed-locally-with-activation-gates
task: 9.7
observed: 2026-10-03
owner: "@Muhns13G"
related_debt: [TD-009, TD-037, TD-038]
---

# Sprint 09.7 — Authenticated Own-Client Portal

## Mission and outcome

Provide a read-only account portal for an activated invitee without collecting clinical intake or
opening public registration. Task 9.6 was committed at the clean starting checkpoint `67c68e3`.
This task is implemented locally; it does not imply hosted migration, publication or pilot release.

## Delivered work and decisions

- `/portal` displays account status, the exact accepted account terms and acknowledged privacy
  notice, and recorded operational workflow states. `/portal/profile` displays only DR-014's minimum
  profile, its version and timestamps. Mobile verification remains literal; an unverified mobile
  is not presented as an identity/recovery factor. Profile correction is deliberately Task 9.8.
- Exact instrument bodies, versions, hashes, effective dates and receipt dates are available for
  reading and exact-text download. No marketing opt-in, clinical consent, prescription, product,
  payment status or inferred clinical eligibility is added. Empty workflows are shown truthfully;
  dispatch, delivery and cancellation labels reflect stored states rather than a fabricated journey.
- A sealed HttpOnly session cookie supplies server-derived authority to `/portal/account`. Each read
  verifies the managed identity and application session, then a server-only RPC checks the live Auth
  session, confirmed contact, tenant, subject, single patient membership, activation, accepted
  invitation and exact current receipts in one snapshot. Only a successful read refreshes activity.
  Browser roles receive neither table grants nor permission to call the projection RPC.
- Strict response schemas reject unexpected fields. Query-controlled authority, duplicate cookies,
  cross-origin requests, invalid methods/bodies and rate-limit failures are denied. Safe failures
  return no account payload. Shells and data use private no-store/no-referrer/noindex policies, and
  discovery explicitly excludes `/portal`.
- Private data is transient component state, not browser storage or a router loader cache. It is
  cleared on expiry, hidden-page/page-hide events and failed revalidation. Returning to the page
  requires a fresh read; renewal uses the existing governed session command. Async headings receive
  focus, pending/error states are announced, and exact-document controls support keyboard use.
- Successful first-party sign-in links to the portal without an arbitrary return URL. Testing also
  exposed a pre-hydration native GET submission risk in the existing sign-in/recovery component:
  explicit POST actions and hydration-disabled submission now prevent contacts entering a GET URL.
  This is a scoped security correction, not a marketing-message change.
- Supabase guidance informed fresh live-session verification and least-privilege projection;
  React guidance informed transient state and race-safe cleanup. No dependency was added.

## Validation and lessons

| Check                                                       | Result                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Migration replay and database lint                          | Local replay succeeded; lint reported no errors                                                      |
| SQL authority/projection checks                             | 35 portal assertions, including real service-role success and browser-role denial                    |
| Full pgTAP suite                                            | 15 files, 461 assertions after resetting disposable integration-test leftovers                       |
| Vitest                                                      | 71 files, 403 tests                                                                                  |
| Portal Playwright/axe checks                                | 12 passed across desktop and Pixel 7 profiles                                                        |
| Full browser matrix                                         | 147 passed initially; one existing reflow timeout passed on isolated desktop/mobile rerun (2 checks) |
| Build, strict types, lint/format, portability and discovery | Passed                                                                                               |
| Local Auth and contextual authorisation integrations        | Passed; hosted integration was not run                                                               |

Browser success uses intercepted synthetic responses. Real database authority and projection are
independently tested by pgTAP; these are not represented as a hosted end-to-end user journey.
The agent-browser CLI was unavailable, so the repository's managed Playwright Chromium provided
browser/axe verification. Live assistive-technology approval remains a separate release gate.

Initial denial fixtures violated existing lifecycle constraints; correcting their timestamps and
required approval fields preserved runtime guards. A database run overlapped the existing Auth
integration and subsequent runs encountered its synthetic leftovers: resetting the disposable
local database and rerunning serially restored the committed baseline. Do not weaken seed-count
assertions or run shared database suites concurrently. The browser timeout was not an overflow
assertion failure; its isolated rerun required no test timeout or runtime change.

## Remaining gates and debt

No new debt ID accrued and no in-scope engineering item is deferred. TD-009 remains in progress;
TD-037/TD-038 retain released-flow keyboard/screen-reader review. Task 9.8 owns correction, export
and account-support entry points; Task 9.9 owns hosted synthetic authority/release proof. Public
`/start` and `/peptides` gates remain unchanged. No hosted migration, real identity, instrument
publication, production secret access, staging, commit, push, deployment or branch change occurred.

## File inventory

| Existing files modified                                            | Purpose                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| `src/components/AccountCodePage.tsx`                               | Portal continuation; safe pre-hydration POST submission |
| `src/server.ts`                                                    | Register private account projection handler             |
| `src/server/security/response-policy.ts` and `.test.ts`            | Private portal response policy                          |
| `src/lib/public-route-policy.ts`, `public/robots.txt`              | Exclude private portal routes from discovery            |
| `src/routeTree.gen.ts`                                             | Build-generated portal route registration               |
| Sprint 09 plan, debt registry, RAG current state/limitations/index | Reconcile local completion and retained gates           |
| `docs/06-operations/http-security-cache-policy.md`                 | Document portal response/data policy                    |

| New files                                                                             | Purpose                                                            |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/domain/identity/patient-portal.ts`                                               | Strict minimum account projection schemas                          |
| `src/application/identity/patient-portal-service.ts` and `.test.ts`                   | Fresh identity/session authority and bounded expiry                |
| `src/adapters/identity/supabase/supabase-patient-portal-repository.ts` and `.test.ts` | Server-only RPC adapter and payload/error checks                   |
| `src/server/identity/patient-portal-http.ts` and `.test.ts`                           | Cookie, origin, method, rate and response controls                 |
| `src/components/PatientPortalPage.tsx`                                                | Read-only profile, exact instruments and literal operations status |
| `src/routes/portal.index.tsx`, `src/routes/portal.profile.tsx`                        | Private noindex route shells                                       |
| `src/test/patient-portal-fixture.ts`, `e2e/patient-portal.spec.ts`                    | Synthetic fixture and desktop/mobile lifecycle/axe proofs          |
| `supabase/migrations/20261003103425_patient_portal_projection.sql`                    | CLI-generated least-privilege projection migration                 |
| `supabase/tests/database/patient_portal_projection.test.sql`                          | Own-account success, field minimisation and authority denials      |
| This annexure                                                                         | Task decisions, evidence, deviations and remaining gates           |
