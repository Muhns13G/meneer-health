---
plan_id: phase-02-sprint-15-task-09
status: in-progress-awaiting-separate-owner-deployment
last_updated: 2026-10-20
---

# 15.9 — Isolated product-order acceptance and recovery

## Authority and non-disruption boundary

The owner approved exactly the two pending committed migrations, disposable synthetic hosted
client/workforce fixtures with genuine fresh TOTP, and scoped cleanup. The provider budget is at
most two sandbox captures on `acct_1U32UbFfj16Nnr1i`: one R999 deposit and one credited synthetic
product balance, both refunded to their original methods. At most two further unpaid test
Sessions and one isolated test webhook are permitted. No emails/SMS, generator access, actual
clinical approval, real supply, real money or real-pilot configuration changes are included.
Stripe retains its test-account records. A test capture is not a real client payment.

The owner separately approved preparing a restricted rehearsal Worker. They retain all source
staging/commit, deployment/promotion and rollback control. Do not use historical rehearsal scripts
that substitute a synthetic tenant on `meneerhealth.co.za` or assume the hosted database is empty.

## Verified checkpoint — 20 October

The linked CLI dry run listed only the approved migrations, with no seed or role application:

- `20261010160000_manual_product_fulfilment.sql`
- `20261020113457_product_fulfilment_notifications.sql`

Both applied under their canonical versions; no history repair was needed. Independent hosted
readback confirms both history entries, forced RLS, denied direct service-role writes and zero
fulfilment events. The real pilot remains active; Auth inventory is 12 users. No test identities,
payment records, messages or product publications have been created by this task at this checkpoint.
Do not use these counts as a future destructive cleanup target.

The read-only deployment inventory identifies active main Worker version
`9138a5e0-7ba6-4ee5-b587-4c8d1112dc5b`, created 13 October. A local Sprint-15 commit is not evidence
that the new product routes are deployed. The active Worker was not changed by this task.

## Local populated recovery proof

`bun --no-env-file run test:products:recovery` passes **178 assertions** and the additional archive,
scope, decryption and quarantine invariants. It rejects inherited hosted/provider configuration
and uses only the fixed local container, a baseline with no Auth users and disposable manifested
source/restore databases. The existing local fulfilment packet is committed only in its disposable
source database. Its explicit SQL-simulated funding is **not** Stripe settlement evidence and must
never be copied to hosted Supabase.

The archive retains shipping/delivery references, exact draft/evidence/issued-offer/acceptance,
credit/settlement, seven custody events, generic outbox and audit records. A second synthetic
shipping snapshot contains real AES-GCM ciphertext under a fresh ephemeral shipping key; it does
not overwrite the historical address referenced by the quote. A separate ephemeral archive key
protects the dump. Checksum, exact restored chain, decryption and wrong-key/wrong-client rejection
pass. Newer withdrawal is reconciled before use, releases are disabled, provider Auth users/sessions
are absent and restored service-role execution is denied. This is local/offline proof, not an R2
backup of real orders or authority to restore into production. Keys and addresses are not logged.

Both disposable databases are removed and the original local all-row/security/trigger/function
fingerprint is checked unchanged, including failure paths. Provider ACL grantors are not portable;
the source replays effective application privileges from the local baseline under its disposable
owner. The offline destination revokes application access rather than activating restored grants.

## Separate Worker preparation

See [the rehearsal runbook](../../../../operations/product-rehearsal/README.md).
The separate entry wraps the same application and native handlers, not a mock success service.
The main entry, root Wrangler configuration, production origin policy and real-pilot bindings
are not widened or replaced. Missing configuration fails closed, including all assets.

Access requires an independent 256-bit secret through a POST form/secure host-only HttpOnly cookie;
no access secret goes into a URL or client bundle. The configuration requires one non-pilot
synthetic tenant across all product/payment scopes, the exact approved sandbox account, a bounded
24-hour-or-shorter lease and disabled signup/invitation/notification modes. Live/provider messaging
credentials are rejected. Only allowlisted product/queue requests and the existing signature-checked
Stripe webhook pass. The wrapper exports no scheduled handler and the separate configuration has
no cron or preview URLs. Production proof cookies must not be reused: provision a dedicated
session-sealing key and synthetic provider identities after the initial disabled deployment.

Exact same-origin requests are internally translated to the unchanged canonical handler origin;
cross-origin commands are rejected first. This translation exists only in the separate entry.
Sandbox Checkout may return to the exact rehearsal `workers.dev` origin instead of taking the
reviewer into the live portal. Live Checkout rejects a non-canonical return origin; the production
default remains unchanged. `STRIPE_SANDBOX_RETURN_ORIGIN` stays blank outside this rehearsal.

The build uses a separate output directory and restores Wrangler's original deployment pointer
even if compilation fails. Never deploy the root application to test this packet.

## Remaining acceptance — not completed

Preparation validation passes **41 focused tests in six files**, strict TypeScript, targeted
ESLint, repository formatting, discovery and portability checks, and the separate Node-22
production build with its private-client canary check. The broad ESLint attempt was stopped;
it is not reported as full-suite validation. No new dependency or generated route/binding edit
is required. The local test stack is stopped with its backup retained. Broader full validation
remains Task 15.10, and none of these checks substitutes for the hosted journey below.

The explicit rehearsal upload dry run passes without deployment. A disposable Chromium smoke
check against the compiled local Worker confirms both `/portal/order` and an actual generated
JavaScript asset return `503` while unconfigured, with private no-store responses and zero page
errors. The verification skill keeps this negative runtime evidence separate from an authenticated
hosted journey. The local Worker/browser were stopped afterward; the ordinary deployment pointer
still targets `dist/server/wrangler.json`.

1. Owner deploys the separate fail-closed Worker and returns its URL/version; verify the main
   deployment is unchanged. Prepare only the approved synthetic tenant/identities and independent
   session/shipping keys in an ignored private manifest. Do not provision real users or reuse keys.
2. Provision a short lease, exact isolated scopes and test-only credentials on that Worker;
   owner promotes its prepared version. Independently verify restriction and no-send boundaries.
3. Exercise actual browser → deployed handlers → hosted database → response: catalogue/interest,
   assigned independent evidence, quote/delivery, acceptance, deposit credit, exact product balance,
   custody/exception/replay and client coarse progress. Verify wrong tenant/role/assignment,
   expired evidence and competing commands fail without duplicate side effects.
4. Complete the approved sandbox Checkout(s), verify genuine signed settlement, compare native
   credit/funding and exact order state, then refund only those captures. Never manufacture a
   provider success or treat a return URL as settlement. All addresses/products/evidence are synthetic.
5. Independently reconcile provider refunds and unfinished Sessions, revoke exact synthetic
   sessions, remove only manifested application/Auth fixtures under the approved locked cleanup,
   restore guards before commit and verify real-record preservation. Disable the separate Worker
   and remove its test webhook. Preserve minimal payload-free evidence, not credentials.

No hosted browser, captured sandbox payment, concurrency, hosted populated-order recovery or
cleanup completion is claimed yet. The separate deployment is the next required owner action;
15.9 and Sprint 15 remain open. Product-sales GO remains separately gated.
