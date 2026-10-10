---
plan_id: phase-02-sprint-15-task-06
status: completed-local-controlled-browser-boundary
last_updated: 2026-10-10
---

# 15.6 — Issued product quotes and credited Checkout

Assigned fresh-TOTP operations staff issue an exact immutable draft only when all four independently
attributed 15.5 evidence records, catalogue, address/delivery, funding and product terms are current.
The new private link retains their exact IDs and publication; later acceptance/Checkout must
revalidate that link rather than trusting legacy aggregate booleans. Map reviewed catalogue items
to immutable payable prices with truthful provenance; never label real RRPs synthetic.

Reuse the existing offers, acceptance receipts, deposit funding, credit reservations, Checkout
intents, signed settlement and original-funding refund machinery. R999 is capped against first
product subtotal; delivery is separate. No second deposit, wallet, subscription or automatic
dispensing. Zero additional payment still needs the governed provider/no-payment confirmation.
The Checkout payload remains generic and contains no medical/product narrative.

Clients review full exact product terms with unchecked acceptance and can decline an unstarted
quote. Decline releases only its unspent reserved credit, never deletes receipts or fabricates a
refund. An existing Checkout/uncertain result requires reconciliation/cancellation, not blind
replacement. A changed quote needs a new draft/evidence/offer and fresh acceptance. Payment
display matches the selected offer, not a historical confirmed review deposit.

Product issue/acceptance/balance Checkout remain separately disabled by default. Product terms
must be independently approved/published before real use; engineering templates and synthetic
publications are not legal/clinical/provider approval. No hosted migration, grant, publication,
provider record, payment, key change or deployment is authorised by this task. Hosted/provider
acceptance is separately bounded 15.9 work; supply/generator and whole-sales release remain gated.

## Verification

The complete local database regression passes 51 suites / 2,491 assertions. After the final
readiness refinement, a fresh reset applies the forward migration and the final quote packet
passes 114 assertions, including capped/zero-total quotes, native issue/acceptance/decline replay,
single credit reservation, no second deposit, exact-evidence withdrawal, immutable links and
service-only access. Existing original-funding/refund/reconciliation packets remain in the full
matrix. SQL lint and advisors report no issues; local Supabase is stopped with its backup retained.

Focused Node-22 tests pass 12 files / 109 tests across domain, HTTP, private UI, queue,
request security, Checkout and refunds. The initial multi-file run stalled under local resource
pressure and had a panel timeout; it was stopped, and unchanged panel assertions pass separately
(four tests), followed by the remaining eleven files / 105 tests. No timeout was widened.

The final reset emitted an optional pg-delta catalogue-cache connection timeout after applying
migrations; reset completed and native tests passed. SQL lint's first connection attempt timed out;
direct local PostgreSQL connectivity and the single lint/advisor retry pass. These tool warnings
are not represented as clean initial runs or hosted failures.

The production client and Worker build pass. Controlled compiled-preview acceptance passes all
26 desktop/Pixel-7 checks in one run: six new issue/client/disabled-endpoint checks plus twenty
existing order, payment-status and staff-draft regressions. Exact commands, unchecked consent,
explicit decline, matching-offer payment status, keyboard activation, axe, staff 320-pixel reflow,
expiry/hide clearing and no URL/storage identifiers pass. Both narrow-screen issue screenshots
were visually inspected. No Stripe Checkout was completed or provider request made by this matrix.

The first dev run failed during web-server readiness: Vite started after 64 seconds, but cold root
requests exceeded the existing request deadline, and Playwright's unchanged 120-second startup
limit elapsed before tests ran. It is not accepted browser evidence or a claim of production
failure. A temporary compiled-preview configuration reuses the repository assertions/timeouts;
no production deadline, repository Playwright setting or framework behavior was relaxed.
Hosted dotenv loading remained disabled; the expected missing local journey-key warning is not
evidence about production secrets. Strict TypeScript and repository ESLint pass.
Client-bundle canary, retired-MCP absence, discovery, portability, generated-route and regenerated
Worker-type checks pass. Final changed-file formatting and whitespace checks pass. No owner CI
run, hosted migration or product-sales activation is claimed.

## Corrections found during verification

- The server registration initially sat behind an unrelated endpoint's return. It now routes before
  the general staff handler; the browser's anonymous test requires this endpoint's exact disabled
  412 response rather than accepting an unrelated staff 401.
- A retained quote projection now clears when the selected case changes, in addition to expiry,
  page hide and visibility loss; a component regression covers this boundary.
- Native ready-state projection cannot advertise synthetic product prices under live configuration.
  The test initially expected that later guard, but the earlier account-environment guard correctly
  denies rebinding an already funded sandbox account. The final assertion verifies that real guard.

## Story and release boundary

Assigned fresh-TOTP operations staff check and issue an immutable exact draft through the protected
HTTP command and native authority/evidence checks. Own-client review returns minimum financial
details plus the exact published product instrument, without address/clinical source records.
Acceptance binds the composite quote hash; decline releases only unspent reserved credit. Existing
Checkout uses the selected offer, generic provider lines and the original financial ledger. A
historical confirmed deposit cannot hide a new product quote or imply product settlement.

Supabase/Postgres guidance informs forced RLS, private service-only functions and case-first locks;
Stripe guidance informs reuse of Checkout/idempotency and signed financial facts rather than new
payment primitives; React guidance informs cancelled late responses, explicit actions and private
state clearing. Controlled browser transport, injected HTTP tests and native SQL prove separate
boundaries, not a hosted captured-payment journey. No new manual VoiceOver observation is claimed;
15.8 owns that review, and 15.9 owns approved hosted/provider/concurrent/populated-recovery proof.

Unresolved Checkout intents are deliberately not superseded or declined. Staff must reconcile the
existing attempt; changed quotes require a new immutable draft/evidence and client acceptance.
No real shipping address/key, tariff, clinical/provider proof, terms publication or sales release
is provisioned here. The internal terms review draft is not customer-approved publication.

## File accounting

- Native persistence/tests: `supabase/migrations/20261010043156_issued_product_quotes.sql`,
  `supabase/tests/database/issued_product_quotes.test.sql`.
- Strict domain schemas/tests: `src/domain/payments/product-quote-issue.ts`,
  `src/domain/payments/product-quote-issue.test.ts`, `src/domain/payments/order-review.ts`,
  `src/domain/payments/pilot-commerce.ts`, `src/domain/payments/pilot-commerce.test.ts`.
- Protected handlers/tests: `src/server/payments/product-quote-issue-http.ts`,
  `src/server/payments/product-quote-issue-http.test.ts`,
  `src/server/payments/order-review-http.ts`, `src/server/payments/order-review-http.test.ts`;
  registration/policy in `src/server.ts`, `src/server/security/request-security.ts`,
  `src/lib/public-route-policy.ts`.
- UI/fixtures/browser: `src/components/ProductQuoteIssuePanel.tsx`,
  `src/components/ProductQuoteIssuePanel.test.tsx`, `src/components/StaffQueuePage.tsx`,
  `src/components/OrderReviewPage.tsx`, `src/test/product-quote-issue-fixture.ts`,
  `e2e/product-quote-issue.spec.ts`.
- Configuration: `.env.example`, `config/environment-catalogue.ts`, `wrangler.jsonc` and
  Wrangler-regenerated `worker-configuration.d.ts` (not manually edited).
- Documentation: this packet and the product-terms review draft, Sprint-15 plan, Phase-2 README,
  debt registry, Cloudflare release runbook, RAG current state, known limitations and index.
- No dependency/lockfile/generated-route change, Git index mutation, real/provider activity,
  hosted migration, key provision or deployment. All changes remain unstaged for owner review.
