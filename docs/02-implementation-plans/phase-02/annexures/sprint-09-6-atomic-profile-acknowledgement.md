---
evidence_id: phase-02-sprint-09-6-atomic-profile-acknowledgement
title: Atomic Profile and Versioned Account Acknowledgement
status: completed-locally-with-activation-gates
task: 9.6
observed: 2026-10-03
owner: "@Muhns13G"
related_debt: [TD-009, TD-037, TD-038]
---

# Sprint 09.6 — Atomic Profile and Versioned Account Acknowledgement

## Mission and outcome

Build DR-014's minimum profile and DR-015's distinct account-terms acceptance/privacy
acknowledgement without false success. The clean starting checkpoint was `a5a566f` (Task 9.5).
The task is completed locally; hosted release and real instrument publication are not implied.

## Delivered work and decisions

- `/account/activate` loads exact current `en-ZA` documents only with the encrypted ten-minute
  invitation proof and a freshly verified provider identity. The documents, version/effective date
  and exact-text download appear before profile fields. Missing proof, inactive tenant or missing
  approved publications leave the page unavailable; website-only `/terms` and `/privacy` remain
  unchanged. Successful invitation verification links to setup.
- The form collects only given/family name, E.164 mobile and operational email/WhatsApp preference.
  Email is provider-owned; mobile remains unverified. Separate unchecked controls distinguish
  acceptance from notice acknowledgement. No password, health, product, marketing or payment fields
  are collected. Input/description/error associations, linked focused error summary, step/focus
  announcements and disabled pending fields support keyboard and assistive-technology use.
- A bounded same-origin JSON command uses server-derived tenant/provider/session context and a
  request key. Provider credentials remain in the encrypted HttpOnly cookie. Responses are private,
  no-store and noindex; completion returns an empty 204 only after the durable RPC succeeds.
- CLI-generated migration `20261003000011_pilot_account_activation.sql` adds a server-only atomic
  command. It locks governing records, verifies the live Auth session, confirmed contact digest,
  active subject/tenant, invitation and permitted membership, and exact effective publication
  IDs/hashes. Profile, two immutable receipts, invited-to-active membership, accepted invitation,
  value-free profile/lifecycle/audit facts and private replay evidence commit together.
- Identical retries return the original reference without duplicate facts; changed payload/key
  reuse is rejected. A private command digest avoids duplicating raw profile values. The short-lived
  proof remains available for a lost-response retry but does not grant account access. Completion
  asks the client to use the existing sign-in flow; it does not silently create a session.
- Full axe testing found unnamed shared navigation landmarks. Distinct header/footer labels fix
  that issue without changing visible marketing text. The React review kept server-only mutation
  checks and transient retry state separate from UI state; no new packages were added.

## Validation and lessons

| Check                                                       | Result                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Local migration replay and pgTAP                            | Passed: 14 files, 426 assertions, including 35 activation assertions |
| Local Auth and contextual authorisation integrations        | Passed                                                               |
| Database lint                                               | Passed, no errors                                                    |
| Vitest                                                      | Passed: 382 tests                                                    |
| Full desktop/mobile Playwright matrix                       | Passed: 136 tests                                                    |
| Final activation keyboard/error/retry checks                | Passed on desktop and mobile                                         |
| Build, strict types, lint/format, portability and discovery | Passed                                                               |

The activation tests cover missing/withdrawn documents, wrong tenant/provider, inactive subject or
tenant, expired invitation/provider session, separate refusal, invalid/extra fields, hash mismatch,
conflicting replay and duplicate prevention. An injected late audit failure proves rollback of
profile, receipts, membership and invitation—not merely a mocked failure response. Browser success
uses intercepted synthetic responses; database atomicity is independently proven by pgTAP, not
claimed as a hosted end-to-end exercise.

Initial local browser startup needed port permission; rerunning outside the restrictive sandbox
worked. The expanded expired-invitation fixture initially violated its own creation/expiry
constraint; correcting the fixture demonstrated the intended denial. Neither required weakening
runtime guards. Final validation is recorded above rather than treating the initial attempts as
passing evidence.

## Remaining gates and debt

No new debt ID accrued. TD-009 retains legal-party/publication and hosted activation obligations;
TD-037/TD-038 retain live keyboard/screen-reader approval of the released asynchronous flow.
This task publishes no instrument, creates no hosted identity/profile, reads no production secret,
and applies no hosted migration. The production tenant remains outside this local exercise.
Task 9.7 owns portal projections, 9.8 owns correction/rights and 9.9 owns hosted synthetic proof.
The engineering implementation has no deferred in-scope code item.

## File inventory

| Existing files modified                                            | Purpose                                    |
| ------------------------------------------------------------------ | ------------------------------------------ |
| `src/routes/account/verify.tsx`                                    | Continue verified invitations to setup     |
| `src/server.ts`, `src/server/security/request-security.ts`         | Register activation HTTP and GET display   |
| `src/lib/public-route-policy.ts`, `src/routeTree.gen.ts`           | Noindex route policy and generated route   |
| `src/components/Nav.tsx`, `src/components/Footer.tsx`              | Distinct navigation landmark names         |
| Sprint 09 plan, debt registry, RAG current state/limitations/index | Synchronize task status and retained gates |

| New files                                                                                 | Purpose                                              |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `src/domain/identity/pilot-activation.ts`                                                 | Strict portable profile/action/view schemas          |
| `src/application/identity/patient-activation-service.ts` and `.test.ts`                   | Fresh managed identity and durable command boundary  |
| `src/adapters/identity/supabase/supabase-patient-activation-repository.ts` and `.test.ts` | Governed RPC adapter and safe failures               |
| `src/server/identity/patient-activation-http.ts` and `.test.ts`                           | Cookie, origin, size, rate and idempotency controls  |
| `src/routes/account/activate.tsx`, `e2e/identity-activation.spec.ts`                      | Accessible document/profile flow and browser proofs  |
| Activation migration and `supabase/tests/database/pilot_account_activation.test.sql`      | Atomic commit, replay, privileges and rollback proof |
| This annexure                                                                             | Task decisions, evidence, lessons and gates          |
