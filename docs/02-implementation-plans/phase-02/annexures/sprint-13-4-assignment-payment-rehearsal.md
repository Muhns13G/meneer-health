---
plan_id: phase-02-sprint-13-4
title: Assignment and Sandbox Review-Deposit Rehearsal
status: completed
last_updated: 2026-10-07
owner: "@Muhns13G"
depends_on: [phase-02-sprint-13-3]
---

# Task 2.13.4 — Assignment and Payment Rehearsal

## Starting Boundary

Task 13.3 is committed at `33430fc`; the working tree was clean. Its disposable fixtures were
removed, the real pilot remained suspended and intake was restored to disabled. This task follows
the [13.1 contract](sprint-13-1-rehearsal-contract.md), not the historical Sprint 11 permissions.
No real client, live money, product order, dispensing, clinical approval or generator action is in scope.

Linked Supabase CLI dry-run reports no pending migrations. Read-only Stripe preflight confirms a restricted **test** key targets standalone sandbox account
`acct_1U32UbFfj16Nnr1i`, with zero webhook endpoints. This is not Stripe Connect. No test payment,
endpoint or hosted fixture has been created by this task yet.

## Bounded Execution Packet

Use a new isolated tenant and `.invalid` client/workforce identities, with actual provider sessions
and genuine TOTP/AAL2 for workforce actors. Generated OTPs are declared session prerequisites,
not email-delivery evidence. Synthetic profile, publication, commercial price and submitted-intake
prerequisites must be labelled as fixtures; they cannot replace 13.3's actual routed intake proof.
Financial release authority must remain independent of the client and assigned operations actor.

| Scenario            | Required observed evidence                                                                                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authority           | Workforce email alone denied; genuine AAL2 succeeds. Unassigned, wrong-role and wrong-case access denied; assigned case is visible without medical answers.                                                                                                            |
| Claims              | Actual versioned claim/release commands and durable ownership match; stale/replayed requests cannot steal or duplicate a claim. Do not seed a claim and call it routed proof.                                                                                          |
| Deposit             | Client reads the exact synthetic R999 review deposit, acknowledges current terms/hash, and creates one authenticated Checkout through the existing adapter.                                                                                                            |
| Before settlement   | Checkout creation/redirect alone leaves paid-review eligibility false. No fabricated capture or manually seeded funding record.                                                                                                                                        |
| Provider settlement | Official sandbox card completes the exact Session; independently retrieve `livemode=false`, complete/paid, ZAR 99900, matching account, Session/PaymentIntent and opaque intent reference.                                                                             |
| Signed ingestion    | Actual disposable Stripe endpoint delivery creates the matching immutable receipt/application, one settlement and one deposit-funding fact. Locally generated signatures are adversarial checks only, not positive delivery proof.                                     |
| Projection          | Routed client/assigned-staff status agrees with independent SQL. Paid-review eligibility becomes true only from reconciled deposit facts; no clinical, transfer, fulfilment or dispatch state advances.                                                                |
| Cleanup             | Refund only the exact captured test PaymentIntent to its original method; independently confirm success. Expire exact unfinished Sessions, remove the disposable webhook, restore settings, revoke/delete test identities and reconcile application/security baseline. |

Stripe retains sandbox payment/refund records. Record that disposition honestly rather than claiming
deletion. Refund here is provider cleanup, not Task 13.6's full application refund/exception proof.

## Authority and Safety

Fresh explicit approvals cover three distinct scopes: isolated hosted fixtures/temporary settings
and webhook; one no-real-money capture plus exact refund cleanup; guarded application/Auth fixture
cleanup. The owner approved all three on 7 October. No general or later-task authority is inferred.

The disposable endpoint generates a new signing secret. Cloudflare cannot reveal the old secret
value. The owner explicitly approved the saved local Stripe values as a new **disabled restoration
baseline**, not proof that they reproduce the unknown original hosted values. The saved test key
targets the approved account; saved signing-secret/service-identity values are format-valid, but
the saved service identity has no hosted row and remains inert. The account ID is the independently
verified constant above, not a missing local environment value. Do not remove pre-existing secrets,
rotate keys or claim exact restoration of unknown values. Before configuration changes, explicitly
settle the final disabled tenant pointer, whose original secret value is also unreadable.
The owner subsequently approved restoring that pointer to the suspended real-pilot tenant
`80000000-0000-4000-8000-000000000001`, with all four commerce modes disabled.

Capture current runtime/source and aggregate table/Auth/trigger/configuration baseline immediately
before execution. Stop on unrelated data, live key/account mismatch, concurrent deployment, unsafe
payload, failed signature/authority, or unexplained state. Restore only temporary settings on the
same deployed script; never roll back to a historical secret-bearing version.

The old `test-hosted-pilot-journey.ts` is **not** executable as this packet: it hardcodes Sprint 11
tenant/restoration IDs and continues into product/refund/exception scenarios outside this task.
Adapt a dedicated deposit-only driver and fixed SQL packet with fresh scope, private resource
manifest and rollback-proven cleanup before any mutation. Reuse reviewed primitives, not old
authority, old IDs, inferred captures or a full local seed.

### Queue Conflict Correction — TD-061

Static inspection and a read-only hosted function-definition count confirm four intentional
`QUEUE_CONFLICT` raises use `40001` in `command_operations_queue`. This can invoke PostgREST
serialization retries rather than return a permanent business conflict. No new hosted stale-command
failure was deliberately provoked. TD-060 covers intake only and is not repurposed.

The local migration `20261007220000_operations_queue_business_conflict_status.sql` changes only
those four raises to `PT409`, asserting unchanged owner, ACL, security-definer and configuration.
Only the queue command adapter gains `PT409` recognition; real serialization failures and other
RPCs remain unchanged. Local validation, fresh hosted approval and owner deployment were required
before execution; the following records their completion. Source deployment remains owner-controlled.

Local correction validation passes: **33 tests across four suites**, strict TypeScript and focused
ESLint. The locally applied migration's metadata guards pass, and **103 SQL assertions** across
queue commands/projections pass, including all four conflict branches, exact replay, unchanged
audit/claim ownership and authority denials. This is not hosted 409 or payment proof.

The owner committed preparation at `8aaf059` and explicitly approved hosted application. CLI
dry-run contained only `20261007220000_operations_queue_business_conflict_status.sql`, with no
seeds or other migrations; application succeeded. Independent read-only verification confirms
four `PT409` conflict raises, no intentional `40001` in this function, security-definer retained,
anonymous/browser execution denied, service-wrapper execution allowed and the matching history
version. The migration's unchanged owner/ACL/configuration assertions passed atomically.

At preflight, Cloudflare served version `55f8c095-fea6-45f8-aa15-24050087c608` at 100%, with script ETag
`73343c58921177836d9fc29d1b50e14d75e4966033d8a8c528ff769fc67b536b`. This is a fresh
runtime checkpoint after the owner's branch update, not independent source-SHA mapping or
authenticated claim-conflict proof. All commerce mode/tenant and Stripe bindings are write-only
secrets. Exact old values cannot be read from this metadata. No configuration, Auth fixture,
webhook or payment was created by this verification.

The new `scripts/sql/sprint-13-payment-setup.sql` scopes prerequisites to `e134…` with five distinct
Auth identities, two operations actors and a separate administrator/negative-role clinician.
It deliberately seeds no assignment, claim, Checkout, provider receipt, settlement or deposit
funding; no product gate/order is included. Its static safety tests were preparation only;
runtime substitution, rollback-only SQL/setup/cleanup and the dedicated driver are validated below.

## Preparation Evidence and Status

The dedicated operator-only driver is `scripts/test-sprint13-hosted-payment.ts`. Its six static
safety tests, strict TypeScript and focused lint pass. It uses a private 0600 resource manifest,
fresh baseline/runtime checks, actual provider sessions/TOTP, routed claim/version/replay commands,
one authenticated deposit Checkout and actual signed provider delivery. It creates no product
order, transfer, approval, dispensing or generator action; outbound operations alerts stay disabled.

The first hosted attempt passed rollback-only setup/cleanup, genuine AAL2 and email-only denial,
unassigned/wrong-role/wrong-case denials, actual claim/replay and immediate stale/changed-payload
409s. Independent SQL confirmed sole ownership, unchanged version and one replay receipt; explicit
release/reclaim between assigned operators passed. Its Checkout was created but **not paid**.
The verifier incorrectly called a deliberately private readiness function using the management
read-only role. Its permission denial stopped the run before card entry. The verifier now uses
the approved operator connection for that SELECT without changing the function ACL.

The exact uncompleted Session was expired, its webhook removed and same-source configuration
restored forward to disabled version `315822bb-eee5-4200-9746-f79e34c21987`. Provider sessions
were revoked. Fixture cleanup initially stopped on `CHECKOUT_INTENT_IMMUTABLE`: the generic
onboarding cleanup did not include `commerce_private.checkout_intents.checkout_intents_guard`.
Only that exact named immutable-delete trigger is now included within the previously approved
locked transaction; it is re-enabled before commit. Completed independent cleanup verifies all
125 original fingerprints, 13 baseline rows, zero Auth users/sessions and no disabled triggers.
The private failed-attempt manifest is retained as failure evidence, not rewritten as success.

The fresh corrected attempt passed. Neither the uncompleted Checkout nor the first attempt is
payment/settlement evidence; closure relies on the fresh successful packet below.

## Verified Hosted Result — 7 October 2026

The fresh deposit-only packet passed rollback-proven setup/cleanup, genuine provider TOTP/AAL2,
email-only/unassigned/wrong-role/wrong-case denials, actual claim/release/reclaim, exact replay,
immediate stale/changed-payload 409s and foreign-operator release denial. Independent SQL confirmed
unchanged conflict version/ownership, one replay receipt and the final claimed case at version 6.
This closes TD-061's specific queue-conflict scope; other RPCs are not covered by this fix.

The client read the exact synthetic R999 deposit and accepted current publication/content/snapshot
hashes through `/portal/order/command`; Checkout was created by the existing authenticated adapter.
Independent account/Session/opaque-reference/amount/currency checks passed. Before capture, funding
was absent and deposit eligibility false. The browser displayed **Meneer Health sandbox — Review
deposit — ZAR 999.00**; only official test card `4242` and synthetic `.invalid` contact/name were
submitted, with no saved payment method. Stripe returned to `/portal/order`; that separate browser
had no rehearsal client cookie, so its sign-in-required state is not authenticated portal proof.

Actual Stripe retrieval confirmed `livemode=false`, complete/paid, ZAR 99900 and the exact
PaymentIntent. The disposable endpoint's genuine signed `checkout.session.completed` delivery
matched immutable receipt/application, payment binding, paid settlement and exactly one R999
funding fact. No generated test signature or manually seeded paid flag substitutes for this proof.
Private deposit/readiness functions confirmed paid-review eligibility; authenticated client and
assigned-staff `/payments/read` projections both passed their strict schema and showed one
confirmed R999 review deposit, zero refund at observation, no dispute and no reconciliation hold.
Case remained `onboarding_pending` at version 6; no handoff or fulfilment row was created.

Exact provider cleanup succeeded: the sole captured test PaymentIntent received one **R999
original-method refund**, independently re-retrieved as `succeeded`, matching the exact PaymentIntent
and full amount. Stripe retains this refunded test-account transaction. The earlier uncompleted
Session remains expired; no real money moved. All disposable webhook endpoints are removed.

Final Worker version **`26678aba-8b3d-4e58-85a2-cc57016c31f8`** serves 100% with unchanged script
ETag `73343c58921177836d9fc29d1b50e14d75e4966033d8a8c528ff769fc67b536b`. Forward restoration
sets all four commerce modes disabled, the owner-approved suspended real-pilot tenant pointer and
the owner-approved saved local Stripe restoration values. This is a new agreed disabled baseline,
not proof of matching unreadable previous secret values. No source build/deployment or Git action
was performed by the agent. Canonical review/refund routes return 412 and webhook returns 404.

Guarded cleanup restored all **125 original table fingerprints**, **13 baseline rows**, all original
trigger states and **zero Auth users/sessions**. A second independent read-only inventory confirms
those results and the one suspended real pilot. The successful private manifest is retained outside
Git (`meneer-sprint13-payment-sxBmsP`); it contains resource references/counts/checksums, not secrets,
questionnaire answers or real patient data. The failed-attempt manifest remains separately retained.

Local targeted regression passed **47 tests across eight suites**: queue command/projection/HTTP,
order review/domain/HTTP, Checkout adapter, signed webhook and provider-proof guards. These are
controlled local tests, not hosted claims, capture or signed-delivery proof.

At preparation, the three new SQL-packet safety tests also passed (50 targeted tests total),
alongside strict TypeScript, focused ESLint, formatting and whitespace checks. Hosted rollback
setup/cleanup validation then passed in both recorded attempts. Final combined regression passes
**65 tests across ten suites** (including six driver/packet guard tests), strict TypeScript,
focused ESLint, changed-document formatting and whitespace checks. No new source build or full
browser/AT matrix is claimed; Task 13.8 owns that broader validation.

### Operator Invocation

This driver is intentionally not ordinary CI or an automatic `package.json` script. Only execute
under fresh explicit fixture/configuration/capture/refund/cleanup permission, with the exact current
100%-active baseline version and approved saved-local disabled restoration values. It requires an
interactive terminal, rejects CI/live keys, and never outputs credentials. The approved current
packet used these non-secret confirmations:

```sh
SPRINT13_PAYMENT_BASELINE_VERSION="<verified-current-worker-version>" \
SPRINT13_PAYMENT_CONFIRM=isolated-deposit-capture-refund-only \
SPRINT13_PAYMENT_RESTORE_CONFIRM=saved-stripe-disabled-suspended-pilot \
SPRINT13_NODE_DIRECTORY="<approved-node-22-bin-directory>" \
bun --env-file=.env.production.local run scripts/test-sprint13-hosted-payment.ts
```

The private `checkout.json` identifies only the exact test Session URL. Use an official test card
through Stripe's visible Checkout, then enter `paid`; the driver independently checks actual
provider capture and signed storage rather than trusting that input. It refunds/expires only the
manifested Session, removes its exact endpoint, restores same-source disabled configuration and
verifies scoped database/Auth/trigger baselines. Preserve manifests on failure and reconcile them;
do not run another exercise over unresolved fixtures or assume `finally` means cleanup succeeded.

Task **2.13.4 is completed at its isolated synthetic boundary**. Source staging, commits, pushes
and deployment remain owner-controlled. Real pilot activation remains unavailable. Task 13.5's
manual handoff/provider compatibility, 13.6's full application refund/failure paths, 13.7's wider
evidence reconciliation and 13.8's released browser/AT matrix are not claimed by this packet.
