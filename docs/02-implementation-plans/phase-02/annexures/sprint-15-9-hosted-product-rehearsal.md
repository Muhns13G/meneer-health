---
plan_id: phase-02-sprint-15-task-09
status: completed-isolated-hosted-acceptance-and-cleanup
last_updated: 2026-10-20
---

# 15.9 — Isolated product-order acceptance and recovery

## Authority and non-disruption boundary

The owner approved exactly the two pending committed migrations, disposable synthetic hosted
client/workforce fixtures with genuine fresh TOTP, and scoped cleanup. The provider budget is at
most two sandbox captures initially on `acct_1U32UbFfj16Nnr1i`: one R999 deposit and one credited synthetic
product balance, both refunded to their original methods. The owner subsequently approved exactly
one replacement R999 deposit after the first deposit was refunded: the cumulative ceiling is
three captures, not a fresh budget per attempt. At most two further unpaid test
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

The initial read-only deployment inventory identified main Worker version
`9138a5e0-7ba6-4ee5-b587-4c8d1112dc5b`, created 13 October. A local Sprint-15 commit is not evidence
that the new product routes are deployed. The active Worker was not changed by this task.

### Separate target deployed and configuration prepared — 20 October

The owner deployed `meneer-product-rehearsal` at
`https://meneer-product-rehearsal.itws-dns-cdn-hq.workers.dev`, version
`b779e6fb-5a23-4c9f-b3fc-77d464da3bad`. Independent HTTPS checks confirm the order page, unlock
page and an actual generated asset all return `503`/no-store while unconfigured. Metadata confirms
worker-first assets and only a fetch handler. The main Worker has subsequently been owner-deployed
as `c4be0ea5-2e9f-45b5-9022-a331d5b30d69`; preparation preserves that current baseline, not a
rollback to the earlier 13 October version.

The guarded preparation script creates one manifested Stripe **test** webhook under the exact
approved account and keeps the endpoint disabled until acceptance starts. It generates independent
access/session/shipping keys in a mode-0600 ignored private manifest. A strict allowlist transmits
only the separate Worker's required bindings; no live Stripe, messaging, archive or production
session-encryption keys are copied. No full environment file is uploaded. Supabase credentials
remain server-only and native tenant/role gates remain required. No synthetic tenant or identity
has been inserted yet.

Prepared version `ba30037f-a440-4075-b8a4-5d8d196a2380` retains the deployed source ETag/assets.
Readback confirms the scoped bindings, absence of forbidden credentials, and unchanged active
versions on both Workers. Its lease expires at `2026-10-21T15:40:27.066Z` (21 October, 17:40 SAST).
Only the owner may promote it on the **separate** Worker. A version upload is not active
configuration or end-to-end acceptance.

Independent hosted inventory remains 12 Auth users, four profiles, zero fulfilment events and an
active real pilot. No new Auth identities, SQL fixture rows, captures, messages or publications
have been created. The dormant test webhook is the only provider record created at this checkpoint;
its exact eventual deletion remains mandatory. Preparation resumes its private manifest and reuses
the same endpoint/version rather than creating duplicates. An expired lease or changed active
deployment fails closed instead of silently rebasing/promoting.

Preparation adds two no-network tests for explicit authority, fixed account/origin, scope and
configuration allowlisting; the updated focused packet passes **43 tests in seven files**.
Strict TypeScript and targeted ESLint pass for the preparation script/helpers. Stripe/Supabase
skill guidance informed independent keys, no-send provider verification and dormant webhook
handling. No source upload or owner promotion is performed by the script. The preparation-only
files do not require another source deployment before promoting the already prepared version.

## Promoted hosted acceptance checkpoint — 20 October

The owner promoted `ba30037f-a440-4075-b8a4-5d8d196a2380` on the separate Worker.
Independent checks confirm anonymous commands remain denied, unlocking requires the private
host-only secure cookie, and native patient/workforce authority is still required. The main
Worker remains `c4be0ea5-2e9f-45b5-9022-a331d5b30d69`; no pilot settings are substituted.

The new manifested driver established actual no-send provider verification, native account
activation/current-document receipts, an encrypted synthetic questionnaire submission, and five
genuine workforce TOTP/AAL2 sessions. Mobile Chromium rendered the synthetic catalogue. One
R999 **sandbox** Checkout was paid using Stripe's official test card; genuine signed settlement
was observed. Quote preparation subsequently failed, so this is not product-order acceptance.
The exact original-method refund was independently confirmed in full. No second capture occurred.

Earlier no-capture attempts exposed a harness client-isolation mistake: OTP verification on the
service repository client replaced its in-memory bearer with the patient session. The driver now
authenticates through a separate provider client. Diagnostic function calls use the intended
service-only RPC instead of the management read-only role. Neither correction widens deployed
permissions. Do not infer a defect in real clients' document receipts from these fixture errors.

Post-payment cleanup initially rolled back because payment releases have a logical, non-FK
dependency on their intents/receipts. The product-specific cleanup now observes that ordering
without disabling the payment-environment guard. Its rollback rehearsal and committed cleanup
both passed. Every affected named immutable guard was restored before commit; original application
row counts/fingerprints and all 12 original Auth IDs matched. All six disposable identities were
removed. The exact test webhook is disabled, not yet deleted.

A fresh, no-payment preflight then passed the same routed quote preparation using new synthetic
native prerequisites and genuine MFA. It created no Checkout/capture and passed exact cleanup.
The earlier post-settlement failure is not yet conclusively explained; a successful preflight
does not establish the funded quote/issue/product/custody path. The first deposit is now refunded
and cannot be reused as current funding. The owner subsequently approved one replacement sandbox
deposit, raising the original total capture ceiling from two to three. Never
silently reset that ceiling or reuse SQL-simulated funding as provider proof.

The added preparation/cleanup regression packet passes five tests; strict TypeScript, targeted
ESLint and formatting pass. The driver/cleanup scripts are local orchestration only, so these
changes do not themselves require another Worker source deployment. Owner-controlled staged
changes are preserved; the assistant has not staged, committed or deployed.

### Successful replacement journey and final reconciliation — 20 October

The replacement run passed the actual separate deployment → hosted database → response chain:

- Native account activation/current receipts, encrypted synthetic questionnaire submission,
  five genuine workforce TOTP/AAL2 sessions and mobile Chromium catalogue rendering.
- Actual R999 Stripe test-card deposit and genuine signed settlement; native funded quote draft,
  explicit operations-to-clinical denial and four independently attributed evidence records.
- Native quote issue and exact client acceptance; R3,000 synthetic product RRP plus R100 delivery,
  less one R999 credit, produced a R2,101 balance. That balance was actually captured in sandbox
  and its signed settlement confirmed. No second deposit was requested for the product order.
- Seven custody events, including exception/resolution, and exact command replays produced
  seven events and seven generic unsent outbox items. The client projection reached `delivered`.
  These are synthetic attestations, not actual clinical approval, dispensing or delivery.

The harness refreshed genuinely stale authenticator proof before sensitive steps and bounded
clinical evidence expiry below its grant expiry. The replacement passed the earlier failure
point; the original post-deposit failure was not independently reproduced or conclusively rooted.

After both captures were refunded, a read-only export included only 14 allowlisted synthetic
record groups: two offers/acceptances/intents/settlements, one draft/issued quote/funding/credit/
shipping/delivery/generated product price, four evidence records, seven custody events and seven
notices. An independent AES-GCM archive key, checksum, in-memory SQLite record restoration,
relational offer/credit links, shipping decryption and wrong-archive-key denial passed. Eight
concurrent requests with revoked staff proof were denied with unchanged records. This is a scoped
hosted **record-level** roundtrip, not hosted PostgreSQL schema/ACL restoration. The separate
178-assertion local PostgreSQL recovery/quarantine proof remains the full-schema recovery evidence;
successful concurrent writers/expiry permutations are not inferred from revoked-request fan-out.

Cleanup stopped safely when the server-generated product price was outside the initial root set.
An internal rollback-only comparison identified only `commerce_private.prices` (one extra row).
The exact parent price was resolved through this manifested synthetic catalogue's binding,
`catalogue-<id>` version and `local-synthetic` provenance. With that explicit root, both rollback
and committed cleanup passed. No shared price or real record was removed. Original all-application
counts/fingerprints and all 12 original Auth IDs matched; independent readback confirms four real
profiles, zero rehearsal tenants/fulfilment events, an active pilot and restored payment guards.

Final Stripe readback confirms exactly **three** distinct test captures, three complete original-
method refunds totalling **409,900 minor units**, no open manifested Sessions, and deletion plus
independent inventory absence of the one disposable webhook. Stripe retains its sandbox records.
No emails, SMS, generator requests or live transactions were sent. Main Worker version remains
`c4be0ea5-2e9f-45b5-9022-a331d5b30d69`.

The focused packet now passes **94 tests in 13 files**, strict TypeScript and targeted ESLint.
Broader final validation remains 15.10. Finalization independently verifies shutdown version
`4c9b441d-272d-4de7-8b49-5c8a421837b3`: unchanged source ETag/assets/runtime and all bindings except
the expired rehearsal lease. The owner subsequently promoted it to 100% on
`meneer-product-rehearsal`. Independent readback at `2026-10-20T21:51:15.011Z` confirms it is the
sole active version. Six HTTPS probes across `/__rehearsal`, `/portal/order` and `/portal/products`,
each without and with the old private access cookie, all return `503`/no-store and the exact closed
response. The main Worker remains `c4be0ea5-2e9f-45b5-9022-a331d5b30d69`; its homepage returns
`200`. The isolated release/cleanup boundary is closed. No source deployment or further test
capture is required, and the main pilot was not disabled.

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

## Completed acceptance checklist

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

1. Completed: separate fail-closed deployment/source/HTTP readback, plus preparation of independent
   keys, a scoped short lease and one dormant test webhook. No main-Worker settings are replaced.
2. Completed: owner promoted the exact prepared configuration on the separate Worker; restriction,
   no-send boundaries and manifested native/provider prerequisites passed. Create only synthetic tenant/identities
   using actual no-send provider verification and fresh TOTP. Native application gates stay closed
   until those prerequisites exist. Enable only the exact test webhook immediately before captures.
3. Paid catalogue/order/custody path completed: actual browser → deployed handlers → hosted database → response. Catalogue/interest,
   assigned independent evidence, quote/delivery, acceptance, deposit credit, exact product balance,
   custody/exception/replay and client coarse progress. Verify wrong tenant/role/assignment,
   expired evidence and competing commands fail without duplicate side effects.
4. Completed: approved sandbox Checkouts, genuine signed settlement and native
   credit/funding and exact order state, then refund only those captures. Never manufacture a
   provider success or treat a return URL as settlement. All addresses/products/evidence are synthetic.
5. Cleanup and owner shutdown completed: independently reconciled provider refunds and Sessions, revoked exact synthetic
   sessions, remove only manifested application/Auth fixtures under the approved locked cleanup,
   restore guards before commit and verify real-record preservation. Disable the separate Worker
   and remove its test webhook. Preserve minimal payload-free evidence, not credentials.

Hosted paid product issuance/balance/custody/replay, record-level encrypted recovery and exact
provider/application/Auth cleanup now pass, alongside the existing local PostgreSQL recovery and
denial matrix. Owner shutdown and independent active-version/HTTP readback also pass: **15.9 is
complete at its isolated acceptance boundary**. Sprint 15's final validation/reporting is now
recorded in [15.10's completion report](../../../03-completion-reports/phase-02/sprint-15-product-orders-manual-fulfilment.md); product-sales GO
remains separately gated. No hosted full-schema disaster restore or real clinical/supply action
is inferred from this completion.
