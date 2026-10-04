---
plan_id: phase-02-sprint-10-task-06
status: completed-local-activation-gated
last_updated: 2026-10-04
primary_debt: [TD-009, TD-043]
source_commit: 8cd2734
---

# Task 2.10.6 — Manual Hand-off Commands and Reconciliation

## Mission and Scope

Implement DR-017's non-clinical manual bridge: persist an attempt before external work, reconcile
delivery, require independent acknowledgement, and safely retry, pause, cancel or record an
administrative provider outcome. Task 10.5 was committed at `8cd2734`; this work stays on `itws-I`.
This is local implementation evidence, **not full operational delivery acceptance**.

## Work and Decisions

- Protected `POST /staff/queue/handoff` accepts strict opaque-reference commands only. Live
  provider/application AAL2, current reviewed membership, case assignment, claimant and expected
  version are rechecked in SQL. No submitted role, paid flag, delivery checkbox or arbitrary state.
- Preparation persists intent; beginning delivery records the pending boundary but sends nothing.
  Timeout records an uncertain attempt and coded exception. No automatic resend exists. Independent
  evidence reconciles delivery/non-delivery; a definite failure requires immutable exception
  resolution before a linked retry with a new key and revalidated authorisation/readiness.
- Private recipient approvals bind identifier, digest, version, approved method and validity window.
  No destination is seeded. Exact current receipt/publication, account/profile/contact facts and
  recipient authorisation guard preparation and dispatch. The Sprint 11 payment adapter defaults
  to false and cannot be overridden through an HTTP command.
  A newer active recipient approval invalidates an older authorisation; approval changes and
  receipt withdrawals serialize against command checks rather than racing them.
- Private append-only evidence binds tenant, case, patient, attempt, recipient version, source and
  external opaque reference, time, expiry and independent reviewer. Neither browser nor service
  role can insert it. The delivering/current operator cannot verify their own acknowledgement.
  Wrong kind, unknown reference or mismatched external record fails closed.
- Confirmed delivery is distinct from provider acknowledgement, record-level review-pending evidence
  and bounded `completed`, `unable_to_complete` or `client_declined` administrative outcomes.
  No transition approves treatment, payment, products or dispensing.
- Cancellation of pending/uncertain work requires independent non-delivery/cancellation evidence.
  Administrative cancellation after delivery preserves the delivered attempt/time/reference and
  releases the reservation; it cannot retract externally received information. Terminal cases
  reject new mutations. Exception resolution appends history and revalidates forward guards.
- Case/attempt changes, minimal immutable events and payload-hashed replay receipts commit together.
  Queue and hand-off commands share the lock namespace/journal. Exact replay never creates another
  attempt; payload/action collisions, stale versions and failed audit roll back without partial state.
- Staff controls accept only UUID references. Current detail includes bounded attempt/authorisation/
  exception references; successful commands trigger a live read, private data clears on denial,
  expiry or uncertainty, and no case fields enter browser storage or URL query parameters.
- Readiness now correctly recognises an active patient membership without an expiry. Workforce
  expiry remains mandatory. Wall-clock checks after locks prevent transaction-fixed time from
  extending authority. Public messaging, dependencies, secrets and provider APIs are unchanged.

### Approved Private Delivery and Independent Verification

The owner approved the authenticated patient portal as the v1 delivery channel and a separate
assigned reviewer as the evidence verifier. This completes the previously missing local channel
and ingestion implementation; it does not supply the live intake URL or activate delivery.

- Server-only `HANDOFF_INTAKE_URL`, `HANDOFF_DESTINATION_ID` and `HANDOFF_DESTINATION_VERSION`
  must match a tenant-bound, exact-URL digest approval. An AAL2 administrator records a reviewed
  approval reference, valid for 30 days; no destination is seeded or accepted from a browser.
- Protected `POST /portal/handoff/open` verifies the current patient account/session, authorisation,
  instruments, assignment/claim, destination and authoritative payment readiness. It commits a
  payload-free issuance event before returning the URL privately. Opening the link **is not delivery
  confirmation or provider acknowledgement**. The URL is not included in the portal projection,
  ordinary email, logs or browser storage. The UI aborts navigation when its private view expires.
- Protected `POST /staff/queue/evidence` records only an inspected nonclinical state, opaque record
  and observation references, timestamp and request key. SQL rejects the delivering actor/current
  claimant as verifier, missing current assignment/AAL2, mismatched records and terminal attempts.
  Verified evidence expires after 24 hours; the claimant then reconciles it through existing commands.
- Private append-only audit and payload-bound replay are atomic. Link replay is limited to five
  minutes and rechecks live guards; a new key cannot blindly reissue the same attempt. Lock-wait
  expiry, recipient withdrawal/revocation, provider logout and failed audit all deny disclosure.
- [The operations runbook](../../../06-operations/private-portal-handoff-runbook.md) records setup,
  reviewer separation, uncertainty and external-access limitations without storing a provider link.

## Verification

All 27 migrations replay locally; the `public,identity_private` schema diff reports no drift. The rollback-only
database packet passes 831 assertions across 22 files, including 50 hand-off command checks and
36 private-channel/evidence checks. Its
positive workflow substitutes **only** the future payment function for the isolated test case;
the substitution and synthetic publications/evidence roll back. It is not Stripe/payment proof.
The real local Auth/TOTP exercise additionally proves denial of hand-off initiation from the
onboarding checkpoint and cleans up its disposable fixtures. The fixed identity packet passes
157 assertions. SQL lint and local security advisors report no issues/errors.

The final unit/component/repository/HTTP suite passes 577 tests across 95 files. The full
desktop/mobile Playwright matrix passes 170 checks, including
private-link denial, anonymous access, live refresh, opaque acknowledgements and axe checks.
Build/client-bundle/MCP
checks, strict TypeScript, ESLint, discovery, portability and generated route checks pass.
Cloudflare's upload dry run and repository formatting checks pass without deployment. The local
Supabase test stack is stopped with its backup volumes retained.
Browser inspection verifies local queue rendering and unchanged
home navigation; no hosted Auth or provider delivery is inferred from mocked browser success.

## Remaining Acceptance Gates and Sequencing

**Local Task 10.6 implementation is complete; operational activation remains gated.** Supply the
actual patient-intake URL (not the staff login), configure the three server-only bindings, approve
the exact destination/recipient version and verify the recipient instruments and responsibilities.
Then obtain separate approval for hosted migrations and an isolated synthetic portal/provider-record
exercise. Local fixtures do not prove external receipt or grant clinical authority. No provider API
or webhook is invented. These activation requirements remain TD-009, not hidden future work.

Sprint 11 supplies the authoritative deposit adapter and its positive commercial proof. All six
Sprint 10 migrations require separately approved hosted application/proof. Task 10.7 still owns
full access/assignment/denial alerts, Task 10.8 client status, and Task 10.9 cross-boundary rehearsals.
TD-009 remains In progress; TD-043 remains Open. No new debt ID is introduced.

## Deviations and Lessons

The approved portal/reviewer extension completes the local command/reconciliation slice. Actual
external delivery cannot be claimed from synthetic fixtures; this remains an activation gate.
Supabase/Postgres guidance informed private ACLs, short ordered locks, immutable facts and atomic
audit; React/browser guidance informed accessible controls and refreshed private projections.
Intent, confirmed delivery, acknowledgement and outcome need separate evidence. A cancelled case
does not undo delivery. Positive test adapters must be visibly local-only and rollback-bound.
Seed fixture dates/contact assumptions were corrected without relaxing production guards. The
initial browser run failed on sandbox port binding; elevated local execution passed, without
changing application code to accommodate the sandbox.

## File Inventory

| Kind     | Files / purpose                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New      | `src/application/operations/handoff-command.ts` and `.test.ts` — strict commands/results.                                                                                                 |
| New      | `src/components/StaffHandoffControls.tsx` and `.test.tsx` — private reference-only controls.                                                                                              |
| New      | `supabase/migrations/20261003225641_manual_handoff_commands.sql` — approvals/evidence, guards, atomic RPC and minimum detail.                                                             |
| New      | `supabase/tests/database/manual_handoff_commands.test.sql` — rollback-only success/denial/replay/cancellation proof.                                                                      |
| New      | This annexure.                                                                                                                                                                            |
| New      | `handoff-boundary.ts` and tests; server `handoff-channel.ts`, `portal-handoff-http.ts` and tests — strict private channel/evidence contracts.                                             |
| New      | `PortalHandoffPanel.tsx` and tests, `StaffHandoffEvidencePanel.tsx` and tests, `StaffDestinationApprovalPanel.tsx` — patient issuance, independent inspection and administrator approval. |
| New      | `20261003233901_private_portal_handoff_delivery.sql` and `private_portal_handoff_delivery.test.sql` — tenant-bound approval, durable issuance and rollback-only verification.             |
| New      | `docs/06-operations/private-portal-handoff-runbook.md` — activation and operational procedure.                                                                                            |
| Modified | Queue repository and tests; queue HTTP handler and tests; `queue-command.ts`, `queue-projection.ts`, `StaffQueuePage.tsx`.                                                                |
| Modified | `src/server.ts`, request-security registration, public route policy, `e2e/staff-queue.spec.ts`, workforce integration script.                                                             |
| Modified | Sprint 10 plan, Phase 02 README, debt registry, RAG current state/limitations/index.                                                                                                      |
| Modified | `.env.example`, environment catalogue/tests, patient-session binding type, patient portal/workforce components and `e2e/patient-portal.spec.ts`; DR-017 amendment.                        |

No branch switch, staging, commit, push, deployment, hosted migration, legal publication or real
notification. Repository owner retains those controls.
