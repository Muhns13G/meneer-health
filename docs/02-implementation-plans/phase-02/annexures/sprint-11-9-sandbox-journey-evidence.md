---
task_id: phase-02-sprint-11-9
title: Stripe Sandbox and Hosted Journey Evidence
status: in-progress-hosted-zero-webhook-passed
last_updated: 2026-10-06
source_commit: 25f2fbc
primary_debt: [TD-010]
---

# Task 2.11.9 — Sandbox and Hosted Journey Proof

## Mission and Authority

Prove the current R999 deposit, credited approved-product order and financial exception paths
against actual test-account objects and the deployed authenticated journey. A mocked provider,
locally generated signature or success redirect cannot stand in for an actual captured payment.
Task 11.8's engineering closure is committed at `a6382de`; the working tree was clean on `itws-I`.

The owner explicitly authorised all eight committed Sprint-11 hosted migrations, isolated
disposable synthetic tenant/identity/financial fixtures, temporary sandbox configuration and scoped
cleanup/restoration. The owner also authorised official test-payment-method transactions,
duplicate captures, refunds and dispute/failure exercises. No live credentials or real-money charge
is authorised. Deployment remains the owner's action. The real pilot must stay suspended.

## Implemented and Observed

- Added a separate current-adapter provider exercise rather than misrepresent the historical
  `test:payments:provider` consultation/bundle exercise as Sprint-11 proof.
- The new command requires explicit `uncompleted-test-checkouts-only` confirmation, a restricted
  test key and an exact independently verified standalone account. It invokes the actual
  `PilotCheckoutProvider` and `PilotRefundProvider` terminal inspector.
- Actual Stripe test-account proof passed for deposit R999, a **synthetic** credited product balance
  R751 plus R100 delivery, and zero additional balance. No confidential RRP or delivery tariff was
  invented or approved by those synthetic amounts.
- All three actual Sessions were retrieved independently, matched exact ZAR totals, line names,
  opaque-only metadata, canonical return URLs and stable idempotent retries. They remained unpaid,
  were expired and independently inspected as terminal unpaid. No payment was completed.
- Cleanup checks only this run's exact returned test Session IDs, and a failed cleanup prevents a
  successful report. Expiration does not delete Stripe's test-account history or generated
  inline-price/product objects. A creation timeout before an ID is returned requires operator
  inspection of the stable retry identity; no broad resource deletion is performed.
- Before migrations, the guarded hosted inventory passed: one suspended `meneer-pilot` tenant,
  zero Auth users, 48 exposed table resources, 18 service-unreadable resources, and only the approved
  tenant/provider-gate baseline in service-readable tables. This is not direct SQL proof of hidden
  private tables.
- The linked migration dry run listed exactly eight approved files, with no seeds or role changes.
  All eight were applied successfully; a subsequent independent dry run returned up to date with
  no pending migrations. The guarded post-application inventory matched the original baseline:
  one suspended pilot tenant, zero Auth users and unchanged service-readable application counts.
  A subsequent linked, pure-SELECT private check verified 30 empty commerce tables, forced RLS,
  browser/service-role direct-table denial, ten service-only security-definer RPCs, enabled
  non-internal triggers, zero Auth users and the suspended pilot baseline. No row content or DDL
  was used by the retained count-only packet.
- The owner confirmed deployment of the latest committed code (`25f2fbc`). Cloudflare inventory
  identified active Worker version `493fcd6f-b91a-419a-b3cc-732dce97c444`, deployed 5 October at
  23:26 UTC. Its metadata does not independently expose the Git SHA. Anonymous same-origin POST
  checks against `/portal/order/command` and `/portal/payments/read` returned the expected disabled
  status 412; these checks are not authenticated-journey proof.
- Commerce/Stripe bindings are absent from that version. The approved standalone Stripe sandbox
  has no webhook endpoints. Restricted-key read checks succeeded for PaymentIntents, refunds,
  disputes and webhook configuration. The owner subsequently confirmed configuration-only
  activation and restoration, without code upload or Git mutation. A disposable endpoint
  creation/disable/delete permission check passed.
- A bounded **transport-only** rehearsal then created one isolated tenant/service identity and
  one unpaid current-adapter deposit Session. Only the expiry event was subscribed; Checkout,
  refund and client-review modes remained disabled. The real Stripe expiry delivery was signature
  verified and durably held as `UNMATCHED`/`pending`, with no settlement or Auth user created.
  Invalid signature rejection also passed. This is genuine provider delivery, not an SDK-generated
  local signature, but it is **not** captured-payment or authenticated-journey proof.
- Configuration-only version `d6662c59-8cf3-4786-acaa-0c202c094fd4` patched the existing code's
  secret bindings without a code upload. The original version
  `493fcd6f-b91a-419a-b3cc-732dce97c444` was restored to 100%; independently checked endpoints
  returned order-command 412 and webhook 404 afterward. The exact endpoint and isolated fixture
  were removed. The locked cleanup temporarily relaxed only three named append-only triggers,
  restored them before commit and passed both the private and service-readable baseline checks.
  Inactive configuration-version history and expired Stripe test objects remain provider-managed
  history, not active integrations.

## Remaining Acceptance Matrix

### Authenticated Capture and Refund Regression Checkpoint

The subsequent isolated authenticated rehearsal used disposable `.invalid` Auth identities,
actual sealed own-client sessions and real workforce TOTP/AAL2. Email-only staff access was denied;
unassigned staff, wrong-role and wrong-case payment reads were denied. An independently assigned
operations actor could read the case. Actual hosted client acceptance enabled the R999 deposit
Checkout. An official Stripe test card completed that Session; independent provider retrieval and
genuine signed delivery established exactly one authoritative R999 deposit funding record. This
supersedes the transport-only/no-capture checkpoint above, not the unfinished exception matrix.

Cleanup returned captured test money to its original method, independently confirmed refund
success, revoked disposable sessions and restored the disabled owner-deployed configuration.
The setup harness now resolves internal subject IDs created by Auth synchronisation rather than
assuming they equal provider Auth IDs. Earlier preflight attempts left 12 synthetic internal
subject/contact rows; an exact guarded cleanup removed those rows after independent public-table
inventory caught them. Lesson: zero Auth users and empty commerce tables alone are not sufficient
restoration proof. Retained cleanup checks the complete application-table baseline.

Local reproduction then found that a confirmed automatic unused-deposit refund permanently blocked
a later eligible product-before-release refund. The owner approved the narrow fix in
`20261006013000_refund_after_confirmed_remainder.sql`, which was applied hosted after a dry run
identified that file alone. It changes only the retained refund primitive; outer authority checks
and immutable money reservations remain intact. Pending/uncertain and duplicate refunds remain
blocked. Six regression assertions cover the pending hold, confirmed remainder, exact aggregate
refund limit, safe replay and duplicate denial. That checkpoint passed **29 database files /
1,330 assertions** and **121 Vitest files / 748 tests**. Hosted product/refund retesting is still
in progress; applying the fix is not itself acceptance proof.

The next hosted run passed paid-review/manual-handoff readiness without creating fulfilment.
An explicitly synthetic R800 product offer applied R800 credit once, reserved R199 unused deposit
and captured only R100 delivery through official Stripe test Checkout. Its browser summary displayed
zero product balance and R100 delivery; these synthetic prices are not approved commercial tariffs.
Staff refund-read then returned 503 before dispatch. Regression traced it to `src/server.ts` passing
the original Request after the timeout wrapper transfers its body. Both refund routes now use the
bounded replacement; tests reproduce the old 503 and require successful bounded reads/correct wiring.
The owner subsequently confirmed the corrected source was deployed; the successful retest below
supersedes that deployment prerequisite.

Review caught an unintended service-role execute grant in the SQL fix. The owner approved
`20261006014500_restore_retired_refund_primitive_acl.sql` to restore the original wrapper-only ACL.
A regression checks that the service role cannot invoke the retired primitive. All **29 database
suites / 1,331 assertions** and **33 focused HTTP/request-security tests** pass locally. The final
full suite passes **121 files / 750 tests**, including the two request-body regressions. Production
build, strict typecheck, lint and portability checks pass. The ACL migration's dry run identified
only that approved file, but application failed at login-role initialisation with HTTP 500
`FGA Authentication Error. Unauthorized`. An independent read-only management query also returned
500 at that checkpoint. The subsequent approved retry succeeded after a dry run listed only the
ACL file. Independent read-only evidence now confirms its migration-history version is present
and `has_function_privilege` reports **false** for service-role execution on the retired primitive.
Cleanup refunded test captures,
removed disposable Auth/application fixtures and restored disabled Worker configuration. Independent
inventory again found one suspended pilot, 12 provider gates and zero Auth users. No live charge,
patient data or supply advancement occurred. This remains partial Task 11.9 proof.

Every row needs redacted results identifying its evidence class. Do not label SDK-generated test
signatures or injected event bodies as real Stripe delivery. Never submit real clinical information.

### Deployed Refund Acceptance and Forward Restoration

The latest repeat authenticated rehearsal passed the deployed refund read, independent case financial
grant, review and dispatch commands. Genuine signed provider evidence confirmed R199 unused deposit,
R800 credited product and R100 delivery refunds, each to its original payment method. The sum was
R1,099, exactly the two test captures; no refund was inferred from a successful redirect or HTTP alone.
An earlier dispatch attempt returned 503 although independent Stripe inspection showed the three
refunds succeeded. Its cause was not established. The harness does not treat a failed response as
permission to resubmit money; it now retains only coarse status/count diagnostics before cleanup.
The subsequent complete run returned success for both operational dispatch and signed confirmation.

The local refund SQL packet additionally passes four public-wrapper claim/record assertions for
delivery and credited-product refunds after the confirmed remainder (**49 assertions** in that file).
The disposable endpoint now subscribes to `refund.created` as well as refund updates/failures.
Temporary configuration propagation uses a bounded active-version-checked poll rather than assuming
instant availability.

Restoration created a forward **configuration-only** disabled version
`c6af1c24-958d-4e35-865e-baf541d4f99e`, verified the unchanged script checksum and exclusive owned
active version, and returned order-command 412 / webhook 404. It did not force a rollback across
secret changes or upload source. Disposable sessions, identities, endpoint and application fixtures
were removed; full private/public baseline checks passed. Stripe's sandbox transaction history
remains, as authorised. These are refund acceptance results, not full exception-matrix completion.

### Actual Zero-Total Status Mismatch — Narrow Fix Awaiting Hosted Approval

Historical diagnosis below is superseded by the approved application and acceptance checkpoint
at the end of this section; it is retained to explain why the migration exists.

The next isolated test captured its R999 deposit and completed a genuine Stripe **R0** product
Checkout in the browser. Independent provider retrieval reported `status=complete`,
`payment_status=paid`, `amount_total=0`, `payment_intent=null`, and `livemode=false`. This differs
from the reconciler's assumed exclusive `no_payment_required` zero-total status: it quarantines the
actual provider result as `BINDING_MISMATCH` rather than completing the zero-balance allocation.
The zero-balance acceptance row remains failed/unaccepted, not silently waived.

`20261006073500_zero_total_paid_checkout.sql` is **local-only pending explicit hosted approval**.
It classifies either zero-total status as no additional payment only with the exact approved R0
amount and no PaymentIntent. Positive totals without payment lineage, zero totals with a
PaymentIntent, wrong currency/amount and missing readiness remain denied/held. The guarded
replacement preserves the reconciler's remaining body and ACL; baseline drift stops the migration.
The rollback-only packet `pilot_zero_checkout.test.sql` passes **15 assertions**, including
both zero statuses, seven negative variants, no invented capture/supply and private execute denial.
Stripe's [no-cost Checkout guidance](https://docs.stripe.com/payments/checkout/no-cost-orders)
and the observed provider object distinguish a completed free order from an additional payment.

The harness now polls processing completion and does not attempt a nonexistent zero-total refund.
The first zero run's cleanup reported only `provider-session` failure because that old cleanup
assumed every `paid` Session had a PaymentIntent. Its deposit was refunded; endpoint, identities,
application baseline and disabled Worker restoration passed. Forward restored version is
`2b2ce679-3984-408d-8cff-b0298d4c4fd0`. Independent terminal R0/no-PaymentIntent inspection
establishes that there is no second capture to refund. This does not retroactively turn the failed
acceptance run into a pass. The corrected migration and another complete hosted retest are required.

After the usage-limit interruption, independent read-only checks confirmed the exact R999 deposit
charge was fully refunded (`remainingAmount=0`), Stripe had zero webhook endpoints, and the retained
hosted private baseline passed: zero Auth users/private commerce rows, 30 protected tables, ten
governed RPCs, enabled append-only triggers and the real pilot suspended. No cleanup write or
real-pilot activation was needed. The new zero-total migration has not been applied hosted.

The final local checkpoint passes **121 Vitest files / 750 tests**, **30 database files / 1,350
assertions**, strict typecheck, portability, production build, ESLint and whitespace checks.
Local Supabase was stopped with its recoverable test backup. These results do not replace the
remaining hosted exception tests or imply Task 11.9 is complete.

The owner subsequently approved hosted application and the isolated retest. A linked dry run listed
only `20261006073500_zero_total_paid_checkout.sql`; application succeeded without seeds/roles.
Independent SELECT checks confirmed its exact migration version, zero-status guard, all three
private-function execute denials and zero Auth users before setup. The authenticated repeat proved
genuine completed R0 Checkout, no PaymentIntent/additional capture, exactly one R999 credit
allocation, no unused-refund job and no fulfilment advancement. An earlier harness expected
`paid_confirmed` for this free order; an independent read proved `no_additional_payment=true`,
`paid_confirmed=false`, applied credit and clear reconciliation. That assertion was corrected,
and the subsequent run passed its complete zero-total assertions.

The same run passed the actual hosted signature/raw-body endpoint with **SDK-signed synthetic**
adversarial envelopes: raw-body tamper 400, exact durable replay 200/replayed, conflicting same-ID
acknowledgement with one immutable receipt and a held conflict, and out-of-order expired evidence
without supply advancement. These are deliberately injected events, not genuine Stripe deliveries.
Genuine captured and zero-total completion delivery remains separately proven above. Bun requires
`generateTestHeaderStringAsync`; the first synchronous attempt stopped before transmission and
cleanup passed. The corrected asynchronous packet passed hosted. Exact cleanup then passed all
boundaries, restoring forward disabled configuration-only version
`b88bb4fc-7fc3-491f-bc83-cf193cc740b7` with the same source checksum and empty private/public baseline.

| Boundary                                | Evidence required                                                                                                                        | Current status                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Current adapter Sessions and retries    | Actual deposit, credited order and zero-balance objects; exact metadata/lines and terminal unpaid inspection                             | Passed, three Sessions expired                                                                                          |
| Hosted schema                           | Eight approved migration versions independently matched; private grants/RLS and unchanged baseline checked                               | Passed; 30 private tables empty and protected                                                                           |
| Deployed baseline                       | Owner-deployed Sprint-11 SHA/version, disabled modes and scoped temporary configuration                                                  | Owner confirmed; transport configuration restored                                                                       |
| Authenticated client/staff              | Disposable own-client sealed session; assigned staff AAL2 plus independent financial grant; wrong tenant/role/assignment/session denials | Sealed session, real AAL2, scope and independent financial-grant denials/success passed                                 |
| Captured deposit and paid review bridge | Test Checkout completion, actual event delivery, one authoritative deposit; no clinical/safety/dispatch advancement                      | Actual R999 capture, signed funding and readiness passed; no supply advancement                                         |
| Credited product and zero-balance order | Current release/acceptance, exact capped credit, separate delivery, no double allocation or inferred supply                              | R800 capped credit/R100 capture and genuine R0/no-PaymentIntent credit-once completion passed                           |
| Webhook integrity                       | Invalid signature, modified raw body, replay, conflicts, orphan and out-of-order evidence with durable acknowledgement                   | Genuine expiry/orphan and invalid signature passed; SDK-signed hosted tamper/replay/conflict/out-of-order packet passed |
| Failure and replacement                 | Decline, cancellation/expiry, fresh bounded replacement approval/acceptance, late original capture                                       | Local proof exists; provider/hosted proof pending                                                                       |
| Original-method refunds                 | Full/partial/unused-credit and separate duplicate capture; immutable jobs; actual settlement, uncertainty and bounded retry              | R199/R800/R100 operational refunds and signed confirmation passed; duplicate/uncertainty paths pending                  |
| Disputes                                | Current provider-correlated open and terminal outcomes, attributed ownership, won/lost/conflict holds                                    | Local proof exists; provider/hosted proof pending                                                                       |
| Operational independence                | Clinical rejection, dependency failure, owned exception/alert delivery, reconciliation without altering clinical/supply state            | Hosted rehearsal pending                                                                                                |
| Restoration                             | Revoke disposable sessions, scope cleanup to exact fixtures, restore disabled modes, inspect private/public baseline                     | Authenticated fixtures/captures cleaned; disabled/private/public baseline restored                                      |

## Operator Command

Only after approval, with the ignored restricted sandbox configuration:

```bash
PILOT_STRIPE_EXERCISE_CONFIRM=uncompleted-test-checkouts-only \
STRIPE_CHECKOUT_ACCOUNT_ID=acct_REPLACE_WITH_APPROVED_TEST_ACCOUNT \
bun --env-file=.env.production.local run test:payments:pilot-provider
```

This command does not reset local/hosted data, generate identities, send emails, publish legal
instruments, confirm payments, issue refunds, submit dispute evidence or enable a Worker. It prints
only coarse results, not keys, URLs, identifiers or raw SDK errors. It does not run in ordinary CI.

Stripe's [Session expiration API](https://docs.stripe.com/api/checkout/sessions/expire) governs
abandonment cleanup; its [line-item API](https://docs.stripe.com/api/checkout/sessions/line_items)
supports independent exact-line inspection. Stripe best-practices guidance influenced restricted
test credentials, hosted Checkout, opaque metadata and explicit evidence provenance.

## Validation and Closure

The new transport exercise passed against the hosted Worker and Stripe sandbox. Its setup and
cleanup were first validated together in a rollback-only hosted transaction. Strict TypeScript,
ESLint and **18 tests / three files** covering provider proof, Checkout and webhook verification
passed. Restoration independently returned the same service-readable baseline (one suspended
tenant, zero Auth users, only 12 provider gates) and the 30-table empty/private baseline.

`scripts/test-hosted-pilot-webhook.ts` requires `HOSTED_PILOT_WEBHOOK_CONFIRM=isolated-expiry-only`,
the exact `HOSTED_PILOT_BASELINE_VERSION`, Node 22's directory in `HOSTED_PILOT_NODE_DIRECTORY`
and an existing Supabase CLI credential in the macOS Keychain. Credentials stay in memory. Never
run it in ordinary CI. Unlike the uncompleted-Session preflight, it **does mutate** explicitly
approved disposable configuration/fixtures and removes them transactionally. Failed restoration
prevents success; unrelated deployments/evidence are not overwritten. The inactive test version
remains in Cloudflare's history. [Cloudflare's secret-version workflow](https://developers.cloudflare.com/workers/configuration/secrets/)
separates preparation from activation; no code or Git upload occurs.

The eight new harness tests and existing Checkout/refund adapter tests passed: **20 tests / three
files**. Strict TypeScript and ESLint passed. Independent hosted migration-history and service-readable
baseline checks passed. No complete CI/build/browser matrix is claimed for this preparatory checkpoint;
the production adapter was unchanged. Final formatting and Git whitespace checks also passed.
Task 11.9 is **not complete**; TD-010 remains In progress. No new debt ID is accrued by this packet.
Hosted authenticated/payment/exception proof and restoration still determine acceptance, followed
by Task 11.10's Sprint completion report.

## File Inventory

| Category                       | Files                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| New exercise                   | `scripts/test-pilot-stripe-provider.ts`                                                         |
| New proof library/tests        | `scripts/lib/pilot-stripe-provider-proof.ts`, `scripts/lib/pilot-stripe-provider-proof.test.ts` |
| New evidence packet            | This document                                                                                   |
| New read-only SQL packet       | `scripts/sql/sprint-11-hosted-baseline.sql`                                                     |
| Modified tooling/guidance      | `package.json`, `AGENTS.md`, Stripe operations runbook                                          |
| Modified derived/planning docs | Sprint 11 plan, technical-debt registry, RAG current state/limitations/index                    |

The transport exercise adds `scripts/test-hosted-pilot-webhook.ts`,
`scripts/sql/sprint-11-webhook-setup.sql` and `scripts/sql/sprint-11-webhook-cleanup.sql` to this
inventory. These are operator-only verification tools, not production migrations or CI activation.

The authenticated exercise additionally adds `scripts/test-hosted-pilot-journey.ts`,
`scripts/sql/sprint-11-journey-setup.sql` and `scripts/sql/sprint-11-journey-cleanup.sql`.
Modified implementation/regressions are `src/server.ts`,
`src/server/payments/refund-http.test.ts` and
`supabase/tests/database/pilot_refund_requests.test.sql`. Forward migrations are
`20261006013000_refund_after_confirmed_remainder.sql` (applied hosted) and
`20261006014500_restore_retired_refund_primitive_acl.sql` (applied hosted; ACL independently verified).

No application UI, marketing wording, dependency version, secret file, generated output or Git
index was changed. Hosted schema changes are owner-authorised migration application, not activation.

## Latest Deployment Checkpoint

The subsequent read-only inspection found active version `a7899e75-1d58-4cb6-abbf-d244465bac77`
(6 October 2026, 07:45 UTC), replacing the previously restored disabled owner version. Commerce
bindings are present: anonymous order-command returns 401, payment-read returns 403 and the
unsigned webhook returns 400, so commerce modes are no longer disabled. This is protected access,
not authenticated acceptance or real-pilot activation. The database baseline independently passes:
zero Auth users, 30 empty private commerce tables with forced RLS and original table-access denials,
enabled append-only triggers, one suspended pilot and 12 provider gates. No new fixtures or payment
objects were created during this checkpoint. Before altering this deployment, obtain owner
confirmation that it contains the bounded-request fix and approval to use it as the new rehearsal
baseline with commerce restored to disabled afterward. Do not restore the older source version over
an unrelated owner deployment or claim the newer source is verified from its version ID alone.
