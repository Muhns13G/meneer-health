---
plan_id: phase-02-sprint-15-task-05
status: completed-local-controlled-browser-boundary
last_updated: 2026-10-10
---

# 15.5 — Independently attributed product evidence

Bind separate clinical, provider-stock, pharmacy-authority and address/custody evidence to an
immutable exact draft. Native fresh TOTP/AAL2, active tenant/role/purpose and case-specific access
remain required. Clinical approval requires a clinician's current `medical_review` grant against
the submitted, unheld intake snapshot; operations staff cannot record it. Provider evidence is
an assigned operations review of an actual private source reference, by someone other than the
draft preparer. It is not a clinician/pharmacy impersonation, generator output or automated stock
verification. Keep source documents and medical answers outside these ordinary command payloads.

Records and revocation facts are append-only, scoped and audited atomically. Validity is bounded
to 24 hours and current references. Changed draft/case/catalogue/address/delivery/intake, expiry,
restriction, restore quarantine, revoked grants or inactive reviewers block use. A private
readiness primitive is for later quote issue, not a payable gate or release switch.

No new real staff permissions, hosted migrations, source deployments, messages, payments or
generator activity are authorised here. The endpoint defaults disabled using the existing
product-quote mode/tenant boundary. Task 15.6 owns issued offers/acceptance/credit integration;
15.7 owns actual supply transitions; 15.9 owns separately approved hosted/recovery acceptance.

## Evidence

- Current focused contracts/HTTP/UI/intake/queue/draft run: 7 files / 53 tests pass.
- Fresh local reset applies the final forward migration. All 50 SQL suites / 2,378 assertions
  pass, including 68 new evidence assertions and the native unbounded patient membership regression.
  SQL lint and advisors report no issues. Local Supabase stopped with its backup retained.
- New controlled desktop/Pixel 7 evidence matrix: 6/6 pass against the local dev Worker.
  Exact clinician/operations record/revoke payloads, role separation, unchecked acknowledgement,
  keyboard activation, axe, 320-pixel reflow, expiry/hide clearing, no URL/storage identifiers and
  disabled anonymous API checks pass. Synthetic narrow-screen screenshots inspected.
- Final client/server production build passes. Compiled local staff draft/queue/workforce
  regressions pass all 22 distinct checks across a main run (20 passed) and a separately isolated
  two-case mobile recheck. Final strict TypeScript, repository ESLint, formatting, bundle canary,
  discovery, portability, retired-MCP, generated-route and whitespace checks pass. No owner CI or
  hosted acceptance is claimed. Hosted dotenv loading stayed disabled; the expected local
  missing journey-key warning is not evidence about production secrets.

The first clinical axe check found an h1-to-h3 heading jump; placing the parent section's h2 before
the evidence panel fixes it. Earlier fixtures attempted submission without first saving, accessed
a private fixture table under service role, and reused a consumed mock Response; these were
corrected before accepted results. Cross-feature native activation also exposed 15.4's rejection
of a valid patient membership with null expiry. The guarded forward correction preserves its
security metadata and original migration, and does not relax expiring workforce approval.

An overlapping local queue unit run timed out; the sequential focused rerun passes. Initial dev
staff browser regressions timed out during cold loading/hydration before the new panel mounted.
Those runs were stopped and are not accepted evidence. A temporary compiled-preview configuration
keeps repository assertions/timeouts unchanged. Its main run had one mobile page-fixture setup
timeout before application code ran and one overall hand-off timeout; both isolated rechecks pass
in 3.6/4.2 seconds. This is not a claim that the entire dev matrix passed or that owner CI ran.

## Verification story and boundaries

Assigned operations/medical-review work opens an exact product draft, sends a strict protected
command, checks native role/session/grant/reference authority, appends evidence/audit together and
returns a short-lived minimum projection. Revocation appends a fact rather than overwriting history.
The Supabase guidance informs forced RLS, service-only RPCs and native—not user-metadata—authority;
React guidance informs explicit actions, cancelled/late-response rejection and private state expiry.

The browser uses synthetic transport; HTTP injection and independent native SQL prove their own
boundaries, not a single hosted provider journey. No new spoken VoiceOver acceptance is claimed.
Fresh manual/accessibility and role-navigation polish remain 15.8. Current evidence must be checked
again by 15.6/15.7 before issue/accept/Checkout/supply. This task does not populate old aggregate
product-release booleans or reactivate the generator. Hosted/concurrent/populated-recovery proof
remains separately approved 15.9 work. No real clinical/provider evidence was fabricated.

## File accounting

- Strict command/projection and tests: `src/domain/payments/product-quote-evidence.ts`,
  `src/domain/payments/product-quote-evidence.test.ts`.
- Protected server handler and tests: `src/server/payments/product-evidence-http.ts`,
  `src/server/payments/product-evidence-http.test.ts`; registration in `src/server.ts`,
  `src/server/security/request-security.ts`, `src/lib/public-route-policy.ts`.
- Private UI and tests: `src/components/ProductEvidencePanel.tsx`,
  `src/components/ProductEvidencePanel.test.tsx`, `src/components/MedicalWorkPage.tsx`,
  `src/components/StaffQueuePage.tsx`, `src/test/product-evidence-fixture.ts`,
  `e2e/product-evidence.spec.ts`.
- Forward persistence/native tests: `supabase/migrations/20261010032231_product_quote_evidence.sql`,
  `supabase/tests/database/product_quote_evidence.test.sql`,
  `supabase/tests/database/staff_product_quote.test.sql`.
- Documentation: this packet, Sprint-15 plan, Phase-2 README, debt registry, release runbook,
  RAG current state, known limitations and index.
- No dependency, lockfile, environment, generated route/Worker-type, real grant or hosted setting
  changes. Everything remains unstaged; owner controls commits, migration approval and releases.
