---
evidence_id: phase-02-sprint-11-5-signed-receipts-settlement
title: Signed Sandbox Receipts and Settlement Reconciliation
status: completed-local-settlement-boundary
task: 11.5
observed: 2026-10-05
completed: 2026-10-05
source_commit: 815cb01
owner: "@Muhns13G"
related_debt: [TD-010]
---

# Sprint 11.5 — Signed Receipts and Settlement

## Delivered Boundary

The canonical `/api/payments/stripe/webhook` now has a separately opt-in sandbox handler for
11.4's private Checkout identities. `COMMERCE_WEBHOOK_MODE=sandbox` selects it; otherwise the
legacy local-only handler remains unchanged. Committed configuration is disabled. No hosted
migration, endpoint registration, credentials, service scope, tenant or provider resource changed.

The handler bounds raw UTF-8 input at 256,000 bytes and verifies the unmodified body through the
installed Stripe SDK's asynchronous HMAC verification with its 300-second timestamp tolerance.
Unsigned, modified, stale, malformed, live and foreign-account events fail before persistence.
The restricted test credential's current standalone account is checked before storage; callbacks
do not use a patient's browser session or a Connect destination.

Only a strict minimum projection is retained: provider event/account and opaque intent/tenant/
Session/PaymentIntent/Charge/Dispute references, relevant amount/currency/status, occurrence time
and raw-body SHA-256 fingerprint. No raw body, card, billing contact, profile, diagnosis,
questionnaire or prescription is persisted. Unsupported signed event types retain an attributed
minimal receipt and ignored disposition, not their object content.

## Durable Processing and Reconciliation

Five private RLS tables hold append-only attributed receipts, immutable PaymentIntent bindings,
settlement facts, coded exceptions and receipt-processing dispositions. Direct browser/service
table access is revoked. The narrow service-only RPC requires an active, unexpired, same-tenant
operations service identity with both payment append/update scopes. Deployment tenant/account
authority is not taken from metadata. Subject/tenant suspension does not erase financial events;
it changes progression/readiness, while revoked service authority rejects processing.

Account-scoped transaction serialization precedes case/intent locks and audit. Event ID plus raw
fingerprint identifies exact replay. A conflicting payload retains the original receipt, creates
an owned exception and leaves reconciliation pending; it cannot overwrite confirmed money.
Receipt, processing disposition, settlement/exception updates and central audit commit before
HTTP acknowledgement. Unsupported and unmatched receipts also retain service/tenant provenance.
Storage/account failures return a safe retryable 503, not a false receipt acknowledgement.

| Evidence                                                                      | Effect                                                                                                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completed Session still unpaid                                                | Bind only verified correlation; no paid fact.                                                                                                        |
| Matching paid Session/async success                                           | Require attached test Session, exact opaque references, account, amount/currency and PaymentIntent binding before recording confirmed money.         |
| Valid zero-total no-payment-required Session                                  | Separate no-additional-payment fact; no fabricated new payment or PaymentIntent.                                                                     |
| Failure or expiry after paid evidence                                         | Preserve paid fact and retain contradictory evidence as an owned exception; no last-event-wins downgrade.                                            |
| Refund snapshot                                                               | Verify known PaymentIntent/amount/currency and retain cumulative evidence monotonically; older snapshots cannot reduce the recorded refunded amount. |
| Dispute created/closed                                                        | Retain Dispute ID/status and mark a money exception; a closure is not automatic authority to resume supply.                                          |
| Unknown or unattached correlation                                             | Durable pending receipt/exception; never guess an order or discard a monetary event.                                                                 |
| Newly bound PaymentIntent                                                     | Re-evaluate matching pending orphan/unattached receipts for that PaymentIntent and deployment tenant, not all account history.                       |
| Late success or changed release/tenant/subject/terms/intake/product readiness | Preserve actual money facts but require owned reconciliation; no automatic clinical progression.                                                     |

Processing is independent of arrival order. Paid, failure, expiry and dispute evidence is additive;
refund evidence never goes backwards. Pending exceptions are deliberately not silently cleared.
The later owned reconciliation task must resolve ambiguity with provider evidence and attributed
authority. Multiple/contradictory captures, refund/dispute outcomes and lifecycle consequences do
not become clinical decisions or refund API calls in this task.

## Checkout and Retained Gates

The Checkout boundary now also requires a configured sandbox callback, signing secret, explicit
service identity and current database service-scope readiness before preparation/payment action.
Missing/revoked callback authority cannot merely advertise an enabled Pay button. Existing patient,
receipt, account/release, case and price gates remain independent. No public wording or UI was
changed by 11.5.

Settlement here is verified money evidence, not an operational release. The legacy funding table
and both paid-review/manual-transfer adapters are unchanged and remain closed. Applying credit,
refunding, bridging authoritative funding into downstream commands and releasing owned exceptions
belongs to 11.7–11.8; 11.6 first supplies projections of these new facts. No old consultation is
reinterpreted as a new review deposit, and no synthetic paid bypass is installed.

## Accepted Verification

- Full Vitest: 704 tests / 112 files pass. Real SDK-generated synthetic signatures prove valid,
  changed-body, wrong-secret, stale, live and foreign-account paths. HTTP tests distinguish durable
  acknowledgement from storage failure and verify callback-dependent Checkout gating.
- Full SQL: 1,133 assertions / 26 rollback-only packets pass, including 32 new callback/ledger
  checks. These cover scoped/revoked service, unpaid/paid/replay/conflict, mismatch, late expiry,
  monotonic refund, dispute, immutable receipts, unmatched/unsupported input and refund-before-
  Session correlation. Positive financial fixtures are explicit synthetic normalized inputs, not
  a claim that SQL itself verifies a signature.
- TypeScript, lint, production client/server build, canary/MCP absence, portability
  (15 capabilities/20 contract majors/26 fixtures), discovery and unchanged generated route tree pass.
- Local database function lint/advisors report no errors/warnings. Encrypted recovery reconciles
  57 source/restored synthetic records, including private commerce; local Supabase is stopped.

No real provider was contacted, no CLI event/resource was generated, no card or charge was used,
and no hosted/browser payment journey is claimed. No frontend route/component changed, so a new
browser matrix was not needed; the HTTP, SDK and SQL boundaries are separately identified.

Initial SQL/lint found ambiguous local/column names and they were corrected. The deeper out-of-order
fixture initially re-entered stale Checkout preparation after inserting a newer offer; it was
changed to read the known creation identity, preserving the real stale-offer guard. Failed runs are
not accepted evidence. The Stripe docs CLI could not access its local configuration; official web
documentation supplied the verification/event-order references without account changes.

## Inventory and Next Task

New files: `src/server/payments/pilot-webhook.ts`, its test,
`supabase/migrations/20261005193242_pilot_signed_settlement.sql`, and this packet.
Existing implementation files: `src/server.ts`, order-review HTTP/tests, environment catalogue/
test/example and the medical-intake SQL packet. Plan/phase/registry/RAG/index accompany the change.
No dependency, generated-file, secret or public-copy edit. The branch stays `itws-I`; the agent ran
no staging/commit commands. Some files were observed staged during verification; final working-tree
edits and documentation need owner review/restaging, with the existing index left untouched.

TD-010 remains In progress; no new debt ID. Next is 11.6: own-client and permitted staff projections
from verified provider facts, with clear pending/exception distinctions. Actual provider and hosted
proof, domain approvals and activation remain 11.9/11.10/Sprint 13 gates, not implied here.

Final document verification passes repository-wide formatting, staged/working-tree whitespace,
243 local links and 176 indexed paths with unique identifiers. Existing staging remains unchanged.

Primary references: [Stripe webhook verification and delivery](https://docs.stripe.com/webhooks)
and [Supabase function execution privileges](https://supabase.com/docs/guides/database/functions).
Stripe/Supabase guidance shaped raw verification, durable-before-ack handling, explicit privileges,
consistent locking and non-ordered receipt reconciliation.
