---
plan_id: phase-02-sprint-13-6
title: Cancellation, Failure and Support Recovery Rehearsal
status: verified-completion
last_updated: 2026-10-08
owner: "@Muhns13G"
depends_on: [phase-02-sprint-13-5]
primary_debt: [TD-010, TD-037, TD-038, TD-043]
---

# Task 2.13.6 — Recovery Rehearsal

## Boundary and Owner Direction

Task 13.5 is committed at `ebd453c`, with a clean starting tree on `itws-I`. Its authorised
Meneer-only bridge proof is complete; current generator entitlement, mapping and output checks
remain explicitly external. The owner confirms that generator reactivation is deferred until
manual protocol generation is actually needed. This task must not sign in to, subscribe to,
invoke or transfer answers to that generator. The immediate product focus is client onboarding.

The real pilot remains suspended. This rehearsal does not approve real invitations, clinical
review, product supply, live payment, public registration or pilot activation. Git staging,
commits, branch changes and source deployment remain owner-controlled.

## Evidence Matrix

| Failure boundary         | Repeatable evidence                                                                                         | Acceptance distinction                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Cancellation/refund      | Client request/replay, independent finance authority, eligible allocation, dispatch and signed confirmation | A request or provider submission is not a completed refund; original methods only.                           |
| Failed/uncertain payment | Decline/expiry, mismatch, duplicate, dispute and pending/uncertain reconciliation                           | No blind retry or clinical advancement from Checkout, failed payment or uncertain money.                     |
| Notification failure     | Failed/retryable/uncertain transport, suppressed recipient, bounded follow-up                               | Acceptance, delivery and human acknowledgement are separate; uncertainty/suppression cannot silently resend. |
| Portal unavailable       | Controlled 503 then successful refresh; private display cleared after 401                                   | Browser fault injection is not a real Supabase/Cloudflare outage.                                            |
| Revocation/expiry        | Application/provider/role revocation and idle expiry; private HTTP/browser denials                          | Old cookies do not preserve authority or cached client information.                                          |
| Support escalation       | Exact purpose owner, alternate ownership, emergency separation and non-sensitive fallback                   | General support is not a clinical substitute; urgent requests create no ordinary asynchronous case.          |

## Local Packet — Verified

Run `bun --no-env-file run test:recovery:rehearsal` after starting the local synthetic Supabase
stack. The script also disables Bun dotenv autoload; inherited hosted/provider environment
variables are rejected before execution. Never pass `.env.production.local`, change its fixed
container to a hosted target, or import the local seed into hosted services.

The six fixed rollback-only suites are `pilot_refund_requests`, `pilot_payment_reconciliation`,
`transactional_notifications`, `staff_support_followup`, `purpose_support_routes` and
`workforce_security_context`. All **334 SQL assertions pass**. Each suite has a 45-second
statement timeout/five-second lock timeout and must return complete passing TAP. Before/after
each suite the runner compares exact application/Auth row fingerprints, table RLS/ACL metadata,
original trigger definitions/states, and all recovery-schema function definitions/owners/ACLs/
configuration. The baseline matches after every suite. Fingerprints are consistency checks,
not cryptographic clinical signatures; no row values or raw database diagnostics are logged.

Focused application/helper checks pass (69 tests across eight suites at the first checkpoint).
New controlled browser tests verify 503 recovery/private-data clearing and same-key support
retry after an uncertain response, with fallback/emergency guidance and axe checks. All four
new desktop/mobile checks pass after correcting a test fixture to the required three-purpose
schema and waiting for dev-server hydration. The initial broader run passed 28 checks and failed
the two malformed-fixture checks; that attempt is not relabelled a full passing matrix.

Local payment fixtures and injected transport/browser faults are not hosted provider proof.
No production guard or schema change has been made by this task.

## Fresh Hosted Authority and Prepared Driver

The owner separately authorises a fresh isolated tenant, disposable client/workforce identities
with genuine TOTP/AAL2, temporary sandbox-only configuration, and exact scoped cleanup with
necessary named append-only triggers temporarily disabled inside locked transactions and restored
before commit. Any email would go only to `support@meneerhealth.co.za`; no email is required for
the injected failure packet. The generator and real pilot remain inactive.

Payment authority permits **one additional R999 sandbox capture and exact original-method refund**
on `acct_1U32UbFfj16Nnr1i`, and at most two unpaid test Checkouts. It is not an unlimited retry
or capture permission. Stripe retains test-account records. Earlier task funding was refunded/
cleaned and cannot be reused.

The shared hosted driver adds an explicit `recovery` scenario with
`SPRINT13_PAYMENT_CONFIRM=isolated-recovery-capture-refund-only`; existing deposit/bridge scenarios
keep their original guards. It requires the exact active immutable Worker version, canonical
origin/project/account, sandbox-only credentials, empty baseline, suspended real pilot and approved
saved-secret disabled restoration. It never deploys source. Synthetic intake/account/roster/
finance prerequisites remain declared fixtures, not fresh medical or clinical approval proof.

The prepared packet exercises a genuine official-card decline and signed receipt without funding,
then one valid capture/signed settlement; routed cancellation/replay/finance denial/allocation/
refund dispatch and independent signed refund facts; hosted notification journals with explicitly
injected transport errors (no real Brevo outage claim); suppression/uncertain resend denial;
revoked-primary alternate support escalation and client-session revocation/private denials.
Only after independent provider refund and baseline/configuration/session reconciliation may this
task be marked completed. No hosted success is claimed merely because the harness is implemented.

## Hosted Result and Closure

The first hosted attempt proved a genuine official-card decline and signed receipt with no funding.
Paying that same Session subsequently set `paid_confirmed`, but correctly retained reconciliation
hold (`SESSION_UNATTACHED`/money-exception evidence), with zero funding. The harness's expectation
of immediate clean funding was invalid; `GENUINE_SIGNED_FUNDING_MISSING` stopped the packet before
cancellation/support checks. No production hold was bypassed or reported as a runtime defect.
The exact R999 capture was refunded successfully to its original method; independent checks proved
127 application tables/13 baseline rows, zero Auth users/sessions, original trigger states, removal
of the temporary webhook and unchanged source ETag. Disabled runtime was restored at
`546e7bcd-248e-46b4-9200-c1d217edebf9`. The first attempt remains incomplete, not relabelled passing.

The owner separately authorised one additional clean R999 capture/refund. The clean path is kept
separate from the already verified failed-payment boundary; any failed-then-paid exercise must
expect reconciliation hold rather than claim review eligibility. The clean retry passed genuine
signed funding, confirmed client/staff projections, routed client cancellation/replay, finance
denial, approved allocation/replay, one dispatch and independent signed refund confirmation.
Its exact R999 original-method refund is independently confirmed succeeded.

Notification RPC then stopped the harness: Auth bootstrap had replaced the reused client's bearer.
An independent service-role client is now used. The original cleanup omitted the exact
`refund_jobs_guard` immutable-delete trigger; that named guard is now included only for manifested
jobs inside the existing locked/restored transaction. Scoped cleanup and independent baseline/
trigger/Auth/settings checks passed after the harness correction. No production function or schema
was changed. Restored disabled version: `6e1c8d2e-4592-465b-94df-d2a79e865442`.

A no-payment continuation (`SPRINT13_RECOVERY_SUPPORT_ONLY=no-payment`) passes hosted injected
failed/uncertain journals, suppression/uncertain resend denials, revoked-primary alternate
escalation/resolution, workforce denial and client sign-out/old-cookie private denial. It skips
Checkout creation, not any production paid-review guard. No additional Checkout or capture was
created. Its final `passed-and-restored` result has no failed cleanup boundaries.

Independent final verification confirms **127 application tables, 13 original baseline rows,
zero Auth users/sessions and all original trigger states**. The unchanged source ETag is
`1417a0bc963867d14a9a1cdcc88615d822f920a5a25bb756264856c87bd4d535`; restored immutable Worker version
`2d26803d-2c7b-4a9a-ac18-64c9bb2ad58d` is at 100%. Commerce/intake modes remain secret-backed;
restoration writes disabled values, and independent order/refund/intake probes return 412,
while Stripe webhook returns 404. No secret value is claimed readable from version metadata.
All temporary webhooks and fixtures are removed; the generator was never contacted.

Stripe retains two expressly authorised test captures, each fully refunded once to its original
method: initial hold refund `re_3UO3UNFfj16Nnr1i1UEyxk7z`, routed cancellation refund
`re_3UO3aQFfj16Nnr1i0ddHqGW2`, both `succeeded`, each 99900 ZAR minor units. The no-payment
continuation creates no Session. No real money or email was sent by this task.

Final focused checks pass: 83 application/helper assertions at the nine-file checkpoint, followed
by 40 passing tests across the three final helper packets (including the added no-payment,
independent service-client and exact cleanup-guard regressions); strict typecheck, targeted ESLint,
Prettier and `git diff --check` pass. The 334-assertion SQL packet was rerun successfully and the
local database stack stopped. Four new controlled desktop/mobile browser checks pass. This is not
the full release matrix or released screen-reader walkthrough reserved for Task 13.8.

**Task 2.13.6 is completed at the bounded synthetic recovery scope.** Earlier stopped attempts are
preserved above; combined independent evidence covers failure, routed refund, transport faults,
support and revocation without claiming one uninterrupted run. No production debt is newly
Verified, no generator gate is removed, and Sprint 13/pilot release is not closed. Next: Task 13.7
cross-record/audit/recovery and historical artefact reconciliation. No staging/commit/branch/source
deployment was performed; the owner retains those actions.
