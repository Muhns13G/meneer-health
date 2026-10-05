---
evidence_id: phase-02-sprint-11-3-order-review-acceptance
title: Authenticated Exact-Order Review and Acceptance
status: completed-local-review-boundary
task: 11.3
observed: 2026-10-05
completed: 2026-10-05
source_commit: 99944b6
owner: "@Muhns13G"
related_debt: [TD-010, TD-037, TD-038]
---

# Sprint 11.3 — Order Review and Acceptance

## Delivered Scope

An active own-client account can open `/portal/order` from its private portal. The page reads only
an existing server-prepared offer; it does not manufacture a placeholder offer, select a product,
prepare a second deposit or create a Checkout Session. Task 11.4 owns the connection from the
payable case into preparation/Checkout. Without a valid offer and published scenario-specific
terms, the page remains unavailable or reports no order. No real customer terms were published.

The new POST-only `/portal/order/command` boundary is disabled unless `COMMERCE_REVIEW_MODE=enabled`
and the sealed patient's tenant equals `COMMERCE_REVIEW_TENANT_ID`. Both are optional server-only
bindings; the committed example defaults disabled. It reuses current provider/application session
verification, strict request/origin/size/rate/idempotency checks and database authority. No client
tenant, role, amount, metadata or health payload is accepted. Responses are private/no-store,
no-referrer and noindex; usable credentials never appear in URLs.

## Disclosure and Durable Evidence

The page presents server-owned descriptions, quantities, unit prices and price versions, supplier,
delivery and its quote version, deposit credit, unused-deposit refund, total/currency, VAT-planning
classification and the exact full order instrument/version. Plain text is escaped, not inserted as
HTML. Print/save uses the displayed version. Real tax/invoice classification remains domain-gated;
VAT-inclusive planning is not tax registration evidence.

Acceptance is separate and unchecked, retaining DR-015's meaning. It binds one immutable offer to
the exact publication ID, locale/version/content hash and canonical snapshot hash, patient/tenant,
session assurance, request key and server timestamp. Private append-only receipt insertion and
central audit commit atomically. A browser checkbox or account acceptance is not a receipt.
Exact replay returns the original receipt; changed keys/payload, wrong hash/publication, null
binding, withdrawn terms, stale offer or changed prerequisite fails closed.

Scenario publications and receipts are private RLS tables with no direct browser/service grants.
The narrow service-only RPC uses a fixed empty search path, current own-patient checks and the
existing private preparation primitive to revalidate readiness. It does not grant schema browse
or fabrication access. One-way publication withdrawal preserves immutable history; new publication
does not make an old receipt valid for new wording. Real rendered supplier/terms approval remains
a release input, not an assertion produced by an approval-reference field.

The client response excludes internal tenant/subject/session/provider IDs, provenance schedules,
practitioner costs, approval references and medical answers. Session/offer/publication expiry caps
the view deadline. Denial, reload failure or expiry clears private details and acknowledgement;
aborted/late responses cannot repopulate them. Only durable receipt confirmation shows acceptance
success, explicitly stating that payment has not been taken. `checkoutEnabled` is strictly false.

## Verification and Corrections

The local SQL packet extends the existing real synthetic Auth/account/intake fixture, then removes
all changes through rollback. It covers exact offer/terms, unchecked/null/hash denial, durable
receipt/replay, append-only audit, changed/withdrawn publications, wrong tenant and revoked session.
Synthetic safety readiness is explicitly set only within that transaction, not through a runtime
hold-clearing or paid bypass. Private catalogue tests still assert their original six tables;
adding the two new tables does not weaken their RLS/access tests.

HTTP tests prove sealed-cookie authority, tenant/origin/URL guards, disabled mode, strict input,
mutation-key binding, safe projection and revoked-session clearing. Their injected repositories
are HTTP-boundary evidence; actual persistence is the separate SQL packet. Browser tests intercept
synthetic responses and prove desktop/mobile rendering, keyboard unchecked acceptance, axe,
durable-success messaging, session-denial clearing and actual wall-clock expiry. They are not
provider or hosted Auth/payment proof.

Initial checks found and corrected audit subject/order linkage, a test fixture that expired during
first-route compilation, and a missing environment-inventory expectation for the new disabled
bindings. Browser checks now wait for the actual review response before asserting rendering;
assertions were not weakened. Commercial refusals are distinct from authentication failures so
missing terms do not clear a valid cookie. The sandbox initially blocked Vite inspector listeners;
the bounded local browser run required escalation. The unavailable `agent-browser` CLI was replaced
by managed Playwright and visual screenshot inspection, without installing another browser tool.

Accepted evidence: final full Vitest passes 695 tests/110 files. A focused 35-test environment/
HTTP/schema packet also passes, including the added size/rate/tenant guard. Full SQL passes 1,086 assertions
across 26 rollback-only packets, including 20 added review/acceptance assertions. All six targeted
desktop/mobile browser checks pass; desktop screenshot was visually inspected. TypeScript, lint,
formatting, portability (15 capabilities/20 contract majors/26 fixtures), discovery, production
build/client canary/MCP absence, database function lint and local advisors pass. Encrypted recovery
reconciles 57 synthetic source/restored records; local Supabase was then stopped.

The framework generated the new route-tree entry; it was not manually edited. It belongs in this
commit. `check:generated`'s clean-tree gate applies after the owner commits that expected change,
not by staging it during development. No full-site browser run or hosted acceptance/payment proof
is claimed. No hosted
migration, real user, ordinary email, Stripe call or charge occurred. Both production payment
readiness adapters and real pilot activation remain closed. TD-010/037/038 retain their existing
statuses; these corrections introduce no new debt ID.

## File Inventory and Handoff

New files: `OrderReviewPage.tsx`, `portal.order.tsx`, domain order-review schema/tests,
`order-review-http.ts` and its tests, synthetic review fixture, `e2e/order-review.spec.ts`,
`20261005180428_pilot_commerce_order_acceptance.sql`, and this packet.

Existing implementation files: `PatientPortalPage.tsx` (private link only), `src/server.ts`,
request route registration, environment catalogue/test, `.env.example`, the two related SQL test
packets, and the framework-generated route tree. Plan/phase/debt/RAG/index updates accompany them.
No dependency or public marketing wording changed. The owner stages/commits; branch stays `itws-I`.

11.4 connects approved case/offer preparation and test-mode Checkout behind existing independent
receipt, session, environment and workflow gates. 11.5 supplies provider-confirmed payment evidence;
acceptance never authorises clinical review, dispensing, custody or delivery by itself. Hosted
application of both Sprint 11 migrations and reviewed publication/temporary fixtures requires
separate explicit authority and cleanup.

Final document checks validate 233 local links and 174 indexed paths with unique identifiers;
repository-wide formatting and whitespace checks pass. No file was staged and branch stayed `itws-I`.

Supabase guidance shaped narrow private-data access and transaction guards; Stripe guidance kept
acceptance separate from provider payment evidence. React/verification guidance shaped stable
request callbacks, expiry/abort clearing, keyboard/axe and distinct UI/HTTP/database proof.
