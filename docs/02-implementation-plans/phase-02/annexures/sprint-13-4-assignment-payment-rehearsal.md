---
plan_id: phase-02-sprint-13-4
title: Assignment and Sandbox Review-Deposit Rehearsal
status: in-progress
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
RPCs remain unchanged. Local validation is required; hosted application of this new migration
needs fresh approval, and source deployment remains owner-controlled. The hosted claim-conflict
packet must not run until both are ready.

Local correction validation passes: **33 tests across four suites**, strict TypeScript and focused
ESLint. The locally applied migration's metadata guards pass, and **103 SQL assertions** across
queue commands/projections pass, including all four conflict branches, exact replay, unchanged
audit/claim ownership and authority denials. This is not hosted 409 or payment proof.

The new `scripts/sql/sprint-13-payment-setup.sql` scopes prerequisites to `e134…` with five distinct
Auth identities, two operations actors and a separate administrator/negative-role clinician.
It deliberately seeds no assignment, claim, Checkout, provider receipt, settlement or deposit
funding; no product gate/order is included. Its static safety tests are preparation only; runtime
substitution, rollback-only SQL/setup/cleanup and the dedicated driver still require validation.

## Preparation Evidence and Status

Local targeted regression passed **47 tests across eight suites**: queue command/projection/HTTP,
order review/domain/HTTP, Checkout adapter, signed webhook and provider-proof guards. These are
controlled local tests, not hosted claims, capture or signed-delivery proof.

The three new SQL-packet safety tests also pass (50 targeted tests total), as do strict TypeScript,
focused ESLint, changed-document formatting and whitespace checks. No local SQL execution or
hosted rollback validation of the new setup is claimed yet.

Task remains **in progress**. The dedicated driver, complete disabled restoration configuration,
approved hosted queue correction and owner deployment, actual hosted payment/
claims packet and independently verified cleanup are required before closure. Source staging,
commits, pushes and deployment remain owner-controlled. Real pilot activation remains unavailable.
