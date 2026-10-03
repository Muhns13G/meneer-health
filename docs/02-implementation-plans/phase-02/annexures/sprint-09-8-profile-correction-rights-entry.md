---
evidence_id: phase-02-sprint-09-8-profile-correction-rights-entry
title: Profile Correction and Private Rights Request Entry
status: completed-locally-with-activation-gates
task: 9.8
observed: 2026-10-03
owner: "@Muhns13G"
related_debt: [TD-009, TD-016, TD-037, TD-038]
---

# Sprint 09.8 — Profile Correction and Private Rights Request Entry

## Mission and implemented boundary

Add the approved correction, export and account-support entry points without ordinary-email
sensitive payloads. The clean starting checkpoint was `310decf` (committed Task 9.7). Implementation
is local and synthetic; it does not publish documents, apply hosted migrations or activate intake.

## Work and decisions

- `/portal/rights` uses the portal's fresh own-client authority and transient lifecycle. DR-014
  permits direct changes only to given/family name and operational email/WhatsApp preference.
  Email, mobile verification, tenant, subject, status, profile version and clinical fields cannot
  be supplied as editable values. Contact changes are request-only, not verification bypasses.
- The POST-only `/portal/rights/command` requires same origin, a sealed unique HttpOnly session
  cookie, bounded JSON, strict fields, rate control, matching idempotency header/body and server-
  derived authority. Application/provider sessions are checked freshly; SQL rechecks live tenant,
  subject, membership, contact, activation and exact receipts before writes and before replay.
- CLI-generated migration `20261003111144_patient_account_rights.sql` adds a private command digest/
  result ledger and a private category-only rights queue with RLS and no direct browser/service
  grants. A narrowly granted server RPC serializes own-profile writes and locks governing records.
  Corrections atomically increment the expected version and append value-free history/audit.
  Same-command retry returns its original outcome; a changed replay or stale version fails.
  Neither names nor contact values are copied into audit or replay evidence.
- Access/export, restriction/objection, closure/deletion, contact-change and support record a
  category, opaque case reference, profile version and server timestamp. One received case per
  category avoids duplicate cases. There is no message text, document upload, clinical data,
  automatic email, export object, restriction, account closure or contact mutation. The UI explicitly
  confirms receipt only and requires an unchecked request acknowledgement.
- Pending forms are disabled; failure cannot show success. Unchanged retries retain the request
  key only in transient component memory; edits get a new key. Successful correction reloads the
  committed profile. Failed authority, expiry or hidden-page revalidation removes private forms.
  Error/receipt status receives focus; labels, fieldsets and request explanations support keyboard
  use. Form actions are POST, never contact-bearing native GET submissions.
- The narrow correction command implements DR-014 without turning the request-only rights route
  into an export/deletion executor. No marketing, clinical, public `/start` or `/peptides` wording
  changed. No new packages, runtime bindings or production secrets are needed.
- Supabase security guidance informed least-privilege RPC grants, RLS and live-session checks;
  React guidance informed request cancellation, focus and private-state cleanup. The browser CLI
  was unavailable; repository-managed Playwright Chromium/axe was used instead.

## Verification and lessons

The final local verification results are recorded below. Browser success uses intercepted synthetic
responses, while pgTAP independently proves real service-role authority and transactional writes.
These are not represented as hosted end-to-end proof.

| Local check                                                                 | Result                                                                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `bun run test`                                                              | 74 files, 425 tests passed                                                                      |
| `bun run test:e2e`                                                          | 154 desktop/mobile checks passed, including six new rights checks                               |
| Migration replay and `bun run db:test`                                      | All local migrations replayed; 16 files, 495 assertions passed                                  |
| Application-schema `supabase db lint --local --level error --fail-on error` | No errors across the seven application schemas                                                  |
| `bun run test:auth`, `bun run test:authz`                                   | Both local synthetic provider/authority exercises passed                                        |
| `bun run typecheck`, `check:portability`, `check:discovery`                 | Passed; 14 capabilities, 18 contract majors and 22 portable fixtures                            |
| `bun run lint`, `bun run format:check`, `bun run build`                     | Passed; production client/server bundle, client canary and retired-MCP absence checks succeeded |

The final build exited successfully but Wrangler could not write its workstation log outside the
sandbox. This diagnostic is not treated as a deployed-runtime failure. The local Auth exercise
also needed permission for the CLI's workstation telemetry file; its rerun and authorisation check
both passed. No hosted service or production data was used.

SQL checks cover browser/direct-table denial, tenant/subject/purpose, version/replay conflicts,
forbidden fields/null values, unchanged contacts, duplicate-category receipt, value-free audit,
revoked provider/application sessions and tenant/membership denial. Injected late audit failure
proves rollback of both correction and request receipt. Browser checks cover safe retry, receipt-only
wording, explicit acknowledgement, stale conflict, revoked-account clearing, 320px reflow, axe and
absence of storage/URL payloads.

Initial HTTP test expectations assumed 415/422 for all malformed transport cases; the established
request-security contract intentionally uses safe 400 responses, so expectations were corrected
without relaxing guards. An existing wall-time expiry test raced a page lifecycle event; controlled
Playwright time now proves expiry without a short real-time sleep. Application-schema lint excludes
pgTAP internals: the broad lint reports existing test-extension functions that depend on temporary
test objects or older catalogue columns, not new application-function errors.

## Remaining operations and debt

No new debt ID accrued; no in-scope entry-point code is deferred. TD-009 remains in progress and
TD-016's operational privacy lifecycle obligations are not discharged by accepting a request.
TD-037/TD-038 retain live released-flow assistive-technology approval.

Before pilot, the accountable owner must verify assigned staff review and safe case routing,
renewed identity/step-up and new/previous-channel confirmation for contact changes, secure expiring
export delivery, lawful holds and restriction/closure handling, DR-005/DR-014 case/replay retention
and downstream reconciliation. These entry points do not claim fulfilment. The queue has only
`received` state and no general staff read; a reviewed processor and resolution lifecycle must be
installed before operational use. Do not grant broad table access or add an email/free-text shortcut.
Task 9.9 must include both new private tables in direct hosted inventory and verify synthetic
commands; later staff/support/notification work supplies the reviewed operations channel.

## File inventory

| Existing files modified                                                 | Purpose                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/application/identity/patient-portal-service.ts`                    | Reuse fresh server authority without duplicating checks |
| `src/components/PatientPortalPage.tsx`                                  | Rights mode, navigation and correction guidance         |
| `src/server.ts`, `src/server/security/request-security.ts`              | Register the protected POST command                     |
| `src/lib/public-route-policy.ts`, `src/routeTree.gen.ts`                | Noindex policy and build-generated route                |
| `e2e/patient-portal.spec.ts`                                            | Deterministic existing expiry proof                     |
| Sprint 09 plan, debt registry, HTTP policy, RAG state/limitations/index | Reconcile task completion and operational gates         |

| New files                                                                             | Purpose                                                  |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/domain/identity/patient-rights.ts`                                               | Strict commands/results and conflict type                |
| `src/application/identity/patient-rights-service.ts` and `.test.ts`                   | Fresh authority and durable-result validation            |
| `src/adapters/identity/supabase/supabase-patient-rights-repository.ts` and `.test.ts` | Governed RPC with safe errors                            |
| `src/server/identity/patient-rights-http.ts` and `.test.ts`                           | Cookie, origin, rate, body and replay transport controls |
| `src/components/PatientRightsPanel.tsx`, `src/routes/portal.rights.tsx`               | Accessible correction/request entry                      |
| `e2e/patient-rights.spec.ts`                                                          | Desktop/mobile rights proofs                             |
| `supabase/migrations/20261003111144_patient_account_rights.sql`                       | Private receipt/command storage and atomic RPC           |
| `supabase/tests/database/patient_account_rights.test.sql`                             | 34 command/authority/rollback assertions                 |
| This annexure                                                                         | Evidence, decisions, deviations and remaining gates      |
