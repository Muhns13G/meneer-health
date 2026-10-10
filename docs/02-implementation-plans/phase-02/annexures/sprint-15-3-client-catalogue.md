---
evidence_id: phase-02-sprint-15-3-client-catalogue
title: Private Client Catalogue and Product Interest
status: completed-local-controlled-browser-boundary
task: 15.3
observed: 2026-10-10
authority: local-and-controlled-browser-evidence-not-hosted-release
owner: "@Muhns13G"
related_debt: [TD-007, TD-009, TD-010]
---

# Task 2.15.3 — Private Catalogue and Interest

## Delivered Flow

An active onboarded client can open **Browse products** from the account overview at
`/portal/products`. Responsive cards show plain customer descriptions and ZAR RRPs without
images, dosing, cart or payment controls. Delivery is separately quoted. Optional interest is
explicitly not ordering, clinical approval, payment or stock reservation. Staff quotes,
notifications, fulfilment and generator actions remain later Sprint-15 work.

POST `/portal/products/command` is a bounded protected JSON/idempotency endpoint. The server
verifies the sealed own-patient cookie, current provider/application authority and proof/context
binding before one service-only RPC. SQL independently rechecks the activated profile, current
verified contact/invitation, patient membership, tenant and native sessions using existing portal
authority. Staff membership or cached browser roles cannot substitute for those facts.

The database selects the current approved/effective catalogue for the tenant and configured
provenance. The strict DTO contains only catalogue ID/version, synthetic marker, customer
product ID/description/RRP/currency, own-interest boolean and expiry. Wholesale costs, SKU,
source fingerprints, approvers, tenant/subject/session IDs and clinical information are excluded.
Real mode never substitutes synthetic products; HTTP also verifies that projection marker.

## Interest Integrity and Privacy

The routed command extends 15.1's reference-only input with `catalogueId`, binding the displayed
version without changing the base schema. Caller identities, totals, approval/provider fields
remain rejected. Changed/withdrawn versions require reload. Same-client requests are serialised;
exact request-key replay creates no duplicate record/audit, and changed reuse conflicts.
Separately keyed requests are immutable declarations, not multiple orders; the customer view
derives a boolean, and normal UI disables an already-recorded item's button.

`commerce_private.product_interests` forces RLS and denies direct browser/service access.
Foreign keys bind catalogue/product/tenant and client; native orphan-retirement guards are
preserved. Interest and opaque central audit commit together. Audit metadata contains no product,
clinical or contact details. This sensitive journal needs scoped lifecycle/export/retention
acceptance before real collection; encrypted schema inclusion alone does not prove subject rights.

Selections/credentials never enter navigation URLs, browser storage or ordinary logs. Page/API
policy is no-store, no-referrer and noindex. Private projections clear on expiry, hide/pagehide,
rejection or failed reload; aborted/late responses are ignored. Request-key references clear on
exit. Pending mutation keys are retained for safe retry, not blindly replaced after uncertainty.
Native controls, live status/focus, clear disabled/empty states and synthetic labels are retained.

## Release Settings

`PRODUCT_CATALOGUE_MODE=disabled` and empty `PRODUCT_CATALOGUE_TENANT_ID` are committed example
and Worker defaults. `synthetic` selects only local-synthetic preparation for approved isolated
proof; `pilot` selects only reviewed Precise Wellness RRPs. Both settings are server-only and
independent of Checkout, clinical and dispensing release. No hosted migration/import/promotion
occurred. Real rollout requires owner release, current RRPs and applicable privacy/lifecycle
scope; product-sale/provider/clinical/pharmacy/courier and required generator gates remain.

## Verification — 10 October

- Final sequential Node 22.23.2 focused unit/domain/HTTP/route/security run: **5 files / 44 tests**.
- Complete local SQL matrix: **48 suites / 2,261 assertions**, including 27 new catalogue checks.
  Current own-client access, empty/synthetic separation, minimum DTO, strict inputs, wrong
  tenant/client/purpose, revocation, replay/conflict, audit privacy, withdrawal and no financial/
  product-authority advancement pass. Function lint and advisors report no issues. Interest/Auth
  fixtures return to zero; local Supabase stopped with its backup retained.
- Final controlled Chromium desktop/Pixel 7 catalogue and portal matrix: **22/22 pass**.
  Keyboard activation, 320-pixel reflow, axe, durable own-interest state, disabled/anonymous paths,
  URL/storage absence and hidden-state clearing pass. Desktop/mobile screenshots were inspected.
- Final Node 22 client/server build, TypeScript, focused ESLint/Prettier, bundle canary,
  retired-MCP, discovery, portability and generated Worker-type freshness checks pass.
  Document links/index and whitespace checks pass. Generated routes contain the intentional
  new private page; no manual generated-file edits or unrelated route changes are retained.
  This is controlled browser plus independent SQL/HTTP evidence, not a hosted provider journey
  or new human VoiceOver speech acceptance. Fresh manual review remains in 15.8.

Early overlapping checks had cold hydration/timing failures, including existing portal tests,
and were interrupted; they are not accepted evidence. The new test now waits for the initial
response boundary. With stable source, local DB stopped and Node 22 for runner/server, sequential
repeats passed without widening old timeouts or relaxing authority. An approval check initially
misread the older frontend audit as current; scoped checks established explicit 15.3 approval,
and the same local migration command was accepted. No workaround bypassed it.

## File Accounting and Handoff

Created: `ClientProductsPage.tsx`/test; `portal.products.tsx`; domain
`client-product-catalogue.ts`/test; server `client-product-http.ts`/test;
`src/test/client-products-fixture.ts`; `e2e/client-products.spec.ts`; migration
`20261009224936_private_client_product_catalogue.sql` and `client_product_catalogue.test.sql`;
this packet. Existing source/config changes: `PatientPortalPage.tsx`, `src/server.ts`,
request-security registration, public-route policy, environment catalogue/example, `wrangler.jsonc`.
Route tree and Worker declarations are tool-generated, not hand-edited. No dependency or seed change.

Plan/Phase-02 README, debt registry, current-state/limitations RAG/index and environment release
runbook are reconciled. React/Supabase/verification skills shaped native accessibility, private
state cleanup, current authority and scoped evidence. No hosted data, messages or payments changed.
The owner stages/commits/deploys. Next: 15.4 assigned staff quotes and friendly context names.
