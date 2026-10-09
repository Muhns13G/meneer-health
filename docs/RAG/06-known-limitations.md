---
rag_id: meneer-known-limitations
title: Meneer Known Limitations and Answer Guardrails
status: current
authority: derived-from-audit-and-debt
last_updated: 2026-10-09
audience: internal
sensitivity: internal
sources:
  - docs/03-completion-reports/phase-02/sprint-14-mobile-pilot-invitations.md
  - docs/06-operations/mobile-invitations-release-runbook.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-14-9-hosted-mobile-rehearsal.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-14-8-security-accessibility.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-14-7-email-conversion.md
  - docs/03-completion-reports/phase-02/sprint-13-pilot-rehearsal-release.md
  - docs/03-completion-reports/phase-02/phase-02-minimum-pilot-enablement.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-13-7-evidence-reconciliation.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-13-8-quality-accessibility.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-13-5-protocol-bridge-rehearsal.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-13-1-rehearsal-contract.md
  - docs/03-completion-reports/phase-02/sprint-12-support-accessibility-readiness.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-12-9-debt-reconciliation.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-12-8-hosted-support-rehearsal.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-12-5-client-form-accessibility.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-12-6-journey-announcements.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-12-7-staff-accessibility.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-12-4-staff-support-followup.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-12-3-purpose-support-routing.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-12-2-durable-notifications.md
  - docs/03-completion-reports/phase-02/sprint-11-stripe-commercial-operations.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-11-9-sandbox-journey-evidence.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-11-8-payment-reconciliation.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-11-7-cancellation-refund-commands.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-11-6-payment-status-projections.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-11-5-signed-receipts-settlement.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-11-4-guarded-sandbox-checkout.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-11-3-order-review-acceptance.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-11-2-private-commerce-preparation.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-11-1-commercial-payment-contract.md
  - docs/03-completion-reports/phase-02/sprint-10-staff-queue-protocol-handoff.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-10-9-cross-boundary-rehearsal.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-10-7-operations-audit-alerts.md
  - docs/07-decisions/DR-018-meneer-hosted-medical-intake.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-10-medical-intake-amendment.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-10-6-manual-handoff-commands.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-10-5-claimed-queue-commands.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-10-4-assigned-queue-projection.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-10-3-workforce-security.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-10-2-staff-queue-persistence.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-10-1-staff-queue-handoff-contract.md
  - docs/03-completion-reports/phase-02/sprint-09-identity-profile-consent.md
  - docs/03-completion-reports/phase-02/sprint-08-pilot-activation-contract.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-09-2-profile-instrument-persistence.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-09-3-governed-patient-invitations.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-09-4-first-party-invitation-otp.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-09-6-atomic-profile-acknowledgement.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-09-7-authenticated-client-portal.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-09-8-profile-correction-rights-entry.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-09-9-security-hosted-proof.md
  - docs/01-audits/project-codebase-audit-2026-08-05.md
  - docs/04-technical-debt/technical-debt-registry-v1.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-2-incomplete-journey-gate-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-8-safety-campaign-continuation-evidence.md
  - docs/03-completion-reports/phase-01/sprint-01-pilot-risk-containment.md
  - docs/03-completion-reports/phase-01/sprint-07-content-measurement-mcp.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-6-meneer-metadata-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-2-contract-foundation-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-3-environment-security-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-7-managed-identity-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-10-audit-integration-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-11-request-security-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-14-stripe-checkout-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-18-better-stack-uptime-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-19-hosted-recovery-evidence.md
  - docs/06-operations/audit-integration-evidence-runbook.md
  - docs/06-operations/request-security-abuse-runbook.md
  - docs/06-operations/environment-secrets-runbook.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-4-http-security-cache-evidence.md
  - docs/06-operations/http-security-cache-policy.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-7-cloudflare-release-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-8-verification-and-closure-evidence.md
  - docs/03-completion-reports/phase-01/sprint-02-lovable-exit-cloudflare-runtime.md
  - docs/06-operations/cloudflare-environments-release-runbook.md
  - docs/07-decisions/DR-001-operating-model-responsibility.md
  - docs/07-decisions/DR-008-governance-ownership-approval.md
  - docs/07-decisions/DR-002-commercial-fulfilment-model.md
  - docs/07-decisions/DR-003-platform-boundaries-authoritative-state.md
  - docs/07-decisions/DR-004-framework-neutral-contracts-migration.md
  - docs/07-decisions/DR-005-data-tenancy-lifecycle-migration.md
  - docs/07-decisions/DR-006-vendor-evaluation-criteria.md
  - docs/07-decisions/DR-007-identity-authorisation-architecture.md
  - docs/07-decisions/DR-009-free-tier-pilot-provider-stack.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-05-5-provider-selection-data-map-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-03-8-architecture-validation-evidence.md
  - docs/03-completion-reports/phase-01/sprint-03-operating-model-architecture.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-1-repository-health-baseline-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-2-bun-package-contract-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-3-ui-surface-reduction-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md
  - docs/03-completion-reports/phase-01/sprint-04-repository-delivery-health.md
  - docs/03-completion-reports/phase-01/sprint-06-journey-ux-accessibility.md
  - docs/07-decisions/DR-010-phase-01-closure-minimum-pilot-boundary.md
  - docs/03-completion-reports/phase-01/phase-01-technical-debt-stabilisation.md
  - docs/02-implementation-plans/phase-02/README.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-08-1-pilot-activation-baseline.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-08-2-product-pathway-decision.md
  - docs/07-decisions/DR-011-minimum-pilot-product-pathway.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-08-3-responsibility-allocation.md
  - docs/07-decisions/DR-012-minimum-pilot-responsibility-allocation.md
  - docs/07-decisions/DR-013-pilot-product-commercial-fulfilment-amendment.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-08-4-commercial-pricing-benchmark.md
  - docs/07-decisions/DR-014-minimum-client-profile-data-rights.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-08-5-minimum-client-profile.md
  - docs/07-decisions/DR-015-pilot-transactional-instruments.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-08-6-transactional-instrument-set.md
  - docs/07-decisions/DR-016-pilot-support-escalation-channels.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-08-7-support-channel-activation-contract.md
  - docs/07-decisions/DR-017-protocol-portal-manual-handoff-boundary.md
  - docs/02-implementation-plans/phase-02/annexures/sprint-08-8-protocol-portal-capability-evidence.md
---

# Meneer Known Limitations and Answer Guardrails

## Sprint 14.7 — Local Conversion, Not Mobile Channel Activation

Sprint 14 is now [completed with activation gates](../03-completion-reports/phase-02/sprint-14-mobile-pilot-invitations.md).
14.9 subsequently proves actual controlled handset/mailbox conversion and signed delivery; 14.10
reports the engineering closure without waiving TD-065/066 or other launch criteria. Phase 02 stays
open for required uploads and ten non-Verified debts (66 total / 56 Verified). No real participant
send is authorized. Earlier local-only descriptions below retain their dated evidence boundary.

[14.7](../02-implementation-plans/phase-02/annexures/sprint-14-7-email-conversion.md) implements
managed email verification and existing atomic profile/document activation from a live mobile claim.
Actual local Auth and controlled desktop/mobile proofs pass; they do not prove hosted mail/handset
receipt or independently identify the intended roster participant. All real channel modes stay disabled.
The 30-/90-day sweeper covers private invitation-register contacts and minimal mobile journal only.
Provider/application identities created before an abandoned conversion are not silently erased;
TD-066 requires scoped orphan retention, staff recovery and backup reconciliation before real email
delivery. Existing-account and uncertain sends fail closed, without blind resend or automatic merge.
The owner's fresh mobile VoiceOver/keyboard/400% zoom checks pass in 14.8; local acceptance records
a 312-pass broad scan and 38 passing affected checks after public media environment isolation.
It does not claim one final all-green full local run. Exact-commit full CI and separately authorised
hosted proof were prerequisites for 14.9 and have now passed at its approved isolated boundary.
The [14.9 evidence](../02-implementation-plans/phase-02/annexures/sprint-14-9-hosted-mobile-rehearsal.md)
records actual SMS/email conversion and signed delivery, exact fixture/session cleanup and an
explicitly disabled same-code restoration. It does not activate the cohort or claim elapsed hosted
expiry testing; 14.10 completes release/debt reconciliation with no-go retained. TD-066's design is prepared,
not an implemented retirement job or approval to delete hosted identities.

## Latest Sprint 13 Checkpoint — 8 October

Task 13.10 closes Sprint 13 with activation gates and an explicit **NO-GO for real clients**,
not final Phase 02 closure. Adopted Sprint 14 and required uploads remain; nine debts are
non-Verified. Subsequent reviewer approval is owner-reported, not independently observed; factual
placeholders remain and no completed exact client instrument is published by closure. Do not
describe this documentation task as a new full regression, hosted rehearsal or release approval.

The owner requests remediation before 13.10, including newly scoped optional private blood-result
uploads, not an onboarding-only launch. Uploads are now deferred to a separate task, not waived
before launch. TD-064/065 are In progress. The conflict migration is hosted with matching history
`20261008100000`, but routed acceptance awaits isolated configuration. Local identity restore/
re-verification, fresh membership approval/revocation and newer contact-only erasure pass locally;
hosted recovery, domain-specific grant/full erasure reconciliation and object-byte restore
are not proven. Automated accessibility packets pass 114/114, without inferring exhaustive released
spoken-output acceptance. Draft notices remain internal/unapproved.
Exact temporary hosted settings are prepared for owner release, not applied. The owner confirms
approved notices and private agreement/commercial references are unavailable; record them as launch
blockers rather than inferred approval.
Nominated owners, the ordinary 24-hour response target and upload limits are recorded in the
[active gap packet](../02-implementation-plans/phase-02/annexures/sprint-13-pre-release-gap-remediation.md);
they do not establish professional authority, approved instruments, scan/retention policy or live
commercial/product eligibility. Counts remain 65 debts, 56 Verified and nine non-Verified.

Task [13.9](../02-implementation-plans/phase-02/annexures/sprint-13-9-debt-reconciliation.md)
is completed as debt reconciliation, not release approval. Nine debts remain non-Verified:
TD-006/007/009/010/037/038/043 plus newly registered TD-064 (remaining permanent-conflict
SQLSTATE paths) and TD-065 (Auth/private Storage recovery). Individual private-flow AT observations
remain unrecorded; owner acceptance of 13.8 is not exhaustive verification of TD-037/038.
Before real intake, 13.10 must resolve the applicable recovery, publication, appointment and support
gates and issue an explicit scoped go/no-go. No generator reactivation is required by this review.

Task 13.7 is closed at the owner's agreed initial scheduled-chain threshold: the corrected
Cloudflare 05:17 event, successful GitHub production restore and fresh Better Stack heartbeat
are independently observed. Historical pending statements below predate that closure. Continuing
hourly success, alert response and token management remain operational obligations; Auth/private
Storage recovery coverage remains a separate pre-intake gate, not part of the application export.
Task 13.8's automated packet is verified, and the owner freshly confirms desktop VoiceOver,
actual 200%/400% browser zoom and phone screen-reader checks on both local development and the latest
canonical deployment, plus passing committed-branch CI. Task 13.8 is completed on that owner-attested
basis. Exact device/Worker versions and individual private-flow observations remain unrecorded and
are retained for the 13.9 evidence review, not claimed as independently observed. No prior local
confirmation or emulated Pixel 7 result substitutes for that review. Sprint 13, the debt
review and the owner go/no-go decision remain open; no pilot or generator activation is inferred.

Task [13.6](../02-implementation-plans/phase-02/annexures/sprint-13-6-recovery-rehearsal.md)
is completed at its bounded synthetic scope. Its local 334-assertion rollback-only packet and four controlled
desktop/mobile recovery checks pass. A genuine hosted declined-then-paid Session correctly held
funding for reconciliation; that attempt stopped and its exact capture was refunded, with
independent empty-baseline/disabled-runtime restoration. The separately authorised clean capture
passed routed cancellation and signed refund confirmation; no-payment continuation passed hosted
fault journals, suppression/alternate escalation and session/role denials. Final independent
127-table/13-row, zero-Auth, original-trigger and disabled same-source restoration passes. Injected
notification errors are not actual Brevo outages. Task 13.7 onward, full released AT/matrix and
pilot activation remain outstanding; generator entitlement is not implied.

Task [13.5](../02-implementation-plans/phase-02/annexures/sprint-13-5-protocol-bridge-rehearsal.md)
is completed at its expressly authorised Meneer-only synthetic boundary. Both migrations received
separate approval/application. Fresh real intake-created case, AAL2/grants/consent, actual R999
sandbox capture/signed funding, preparation-bound recording, replay/409/fault denials and different-
actor nonclinical reconciliation pass; exact successful refund and independent baseline/trigger/
Auth/settings restoration pass. TD-062/TD-063 are Verified in their stated scopes. No seeded ready
state or synthetic paid flag substitutes for that proof. The transfer/acknowledgement references
remain synthetic Meneer-only: no generator was accessed and no external health data was sent.
Generator entitlement, current input/output compatibility, actual provider acknowledgement and
clinical approval remain separate gates. Released browser/AT acceptance remains Task 13.8.

Task [13.4](../02-implementation-plans/phase-02/annexures/sprint-13-4-assignment-payment-rehearsal.md)
is completed for isolated workforce/claim and R999 sandbox-deposit proof, including genuine signed
funding, confirmed projections, exact successful refund and independently verified cleanup.
TD-061 is Verified only for queue conflicts. This is not live-payment activation, application
product/refund/failure acceptance, current generator compatibility or full released accessibility.
Saved Stripe values and the suspended-pilot tenant pointer form the approved disabled baseline;
they do not prove recovery of unreadable original secrets. Stripe retains refunded test records;
the first unpaid Session is expired, not capture proof. The real pilot remains suspended and all
commerce modes disabled. Task 13.6 is complete; Tasks 13.7 onward remain outstanding.

Task [13.3](../02-implementation-plans/phase-02/annexures/sprint-13-3-onboarding-rehearsal.md) is
completed for the approved isolated synthetic onboarding/intake rehearsal, not real pilot readiness.
Actual email Auth/profile/receipt/session/recovery proof passes. The owner-approved migration
`20261007180000` and owner-deployed adapter were followed by a passing fresh hosted draft/replay/
409/submission/own-client/foreign-denial packet, closing TD-060 at its one-RPC scope. Independent
encrypted-record checks and exact cleanup restored all 125 table fingerprints and trigger states;
Auth users/sessions are zero, intake is disabled and the real pilot remains suspended. Controlled
local presentation and document mismatch regressions are not additional hosted browser/AT proof;
Task 13.8 still owns the released walkthrough. Other RPC conflict codes require Task 13.9 review,
and historical backup artefact disposition is now verified in Task 13.7. No payment or generator exercise
was performed. Do not reuse old fixture IDs/settings as standing authority for later tasks.

Task [13.2](../02-implementation-plans/phase-02/annexures/sprint-13-2-platform-readiness.md) is
completed for suspended-pilot readiness: exact deployment provenance, all three CI runs, hosted
volatility correction, primary/alternate responders, offline key custody and production R2 restore
proof passed. The current verified immutable Worker is accepted as a fallback after subsequent
releases, subject to schema/binding compatibility re-review. Cloudflare remains on `itws-I-preview`;
hourly recovery runs separately on `main`. First unattended scheduled success is not yet observed.
Auth/private-Storage recovery coverage and later rehearsal/release gates remain explicit pre-intake
requirements. No real-pilot activation, actual rollback or Phase 02 closure is authorised by this task.

## Sprint 12.2 — Local Notifications, Not Activated Delivery

Sprint 13.1's [rehearsal contract](../02-implementation-plans/phase-02/annexures/sprint-13-1-rehearsal-contract.md)
is completed planning, not execution proof. Latest inspected preview CI failed the already locally
patched sharp advisory; exact deployed-code CI, baseline/platform proof and fresh bounded hosted
authorisations remain prerequisites. No current generator access, real support appointment,
released accessibility acceptance or pilot go decision is inferred. Earlier Sprint 13-planned
statements are historical; the seven retained release debts remain unchanged.

Task 12.10's [completion report](../03-completion-reports/phase-02/sprint-12-support-accessibility-readiness.md)
supersedes earlier pending task statements, not the release/activation limitations. Its final
audit found TD-059 in development-only Cloudflare tooling; the narrow patched resolution has
clean full/production audits, build and browser regression; TD-059 is Verified. No hosted configuration is
changed by closure. Previously recorded registry totals predate TD-059.
Sprint 12 is completed with activation gates. The browser run's two absent preview-media failures
were retested successfully with permanent-branch media disabled; this is not a single clean full
run. Owner commit/exact-commit CI remain. Registry: 59 items, 52 Verified and seven non-Verified;
TD-037/TD-038/TD-043 release criteria are not waived.

[Task 12.2](../02-implementation-plans/phase-02/annexures/sprint-12-2-durable-notifications.md)
adds private atomic notification intents, shared non-Auth budget, bounded retries and attributed
delivery facts. Default configuration remains disabled. No hosted migration, real email or provider
callback configuration was performed. Provider acceptance is not delivered/read/acknowledged.
Purpose routing/coverage controls are locally implemented in
[Task 12.3](../02-implementation-plans/phase-02/annexures/sprint-12-3-purpose-support-routing.md),
but no actual roster or hosted route is activated. Private evidence references require independent
review; they are not domain approval. A support receipt is not human acknowledgement, clinical
review or financial completion. General support cannot replace clinical/emergency care.
Staff follow-up/resend is implemented locally in
[Task 12.4](../02-implementation-plans/phase-02/annexures/sprint-12-4-staff-support-followup.md).
Queue viewing is not acknowledgement; review resolution is not transport or treatment success.
Uncertain resend needs independent current non-acceptance evidence; no such hosted evidence was
created. Suppression is not overridable, attempts/budget are not reset, and later delivery facts
reopen review. No hosted migration, real email or roster activation occurred. Hosted inbox/failure/
acknowledgement/fallback proof Task 12.8. Actual free-tier quota must be verified before activation.
The statements above describe the earlier local task boundaries. Task
[12.8](../02-implementation-plans/phase-02/annexures/sprint-12-8-hosted-support-rehearsal.md)
now passes isolated hosted generic inbox delivery, exact provider-reference matching and callback
replay, fault/retry/uncertainty/suppression, real AAL2 response and alternate handling. All fixtures
and temporary configuration were removed; the real pilot remains suspended. No automatic Brevo
webhook was installed, actual roster/clinical authority remains unapproved and quota/headroom must
be verified before activation. TD-037, TD-038 and TD-043 stay Open for Task 12.9 reconciliation;
there is no new pilot permission or blanket tracking change.

Task [12.9](../02-implementation-plans/phase-02/annexures/sprint-12-9-debt-reconciliation.md)
has now completed the criterion-by-criterion reconciliation. TD-037/TD-038 remain Open for
released-form/transition review; TD-043 remains Open for actual approved coverage, unattended
authenticated provider callback, quota/headroom and released acceptance. This is a named
activation packet, not unimplemented local engineering or an inferred production pass.
Task [12.5](../02-implementation-plans/phase-02/annexures/sprint-12-5-client-form-accessibility.md)
adds local routed-form keyboard/display tests and the synthetic VoiceOver harness. Axe, semantic
names, emulated forced colours and root-text scaling do not prove actual screen-reader speech,
browser-menu zoom or released-flow acceptance. Assisted VoiceOver review has owner-confirmed
email/code and profile/contact-preference labels plus privacy-checkbox state. The owner's later
VoiceOver and browser-zoom pass confirmations close local Task 12.5 acceptance. Released-flow
and wider Sprint 12 accessibility acceptance remain; TD-037 stays Open for that scope.

Task [12.6](../02-implementation-plans/phase-02/annexures/sprint-12-6-journey-announcements.md)
is locally complete with passing automated checks and representative owner-confirmed VoiceOver
pending/result acceptance. Controlled browser
responses prove presentation, focus and uncertainty handling, not provider execution or released
acceptance. Hosted/released reconciliation remains Tasks 12.8–12.9; TD-038 stays Open.

Task [12.7](../02-implementation-plans/phase-02/annexures/sprint-12-7-staff-accessibility.md)
adds local staff presentation and expiry/recovery verification. Intercepted synthetic responses
cannot prove hosted authority or provider execution. Automated checks and owner-confirmed
representative staff VoiceOver/browser zoom close local Task 12.7; client acceptance is not
substituted. Wider released
acceptance and TD-037/TD-038 reconciliation remain open. No new debt ID is introduced.

## Current Sprint 11 Closure Boundary

The [Sprint 11 report](../03-completion-reports/phase-02/sprint-11-stripe-commercial-operations.md)
closes Tasks 11.1–11.10 at implementation/evidence checkpoint `7db0e0c`. Complete bounded
local and hosted sandbox commercial/exception proof exists; older proof-pending notes below are
historical. Actual real catalogue/rates, supplier/tax/provider acceptance, reviewed publications,
professional/pharmacy/custody rights and financial authority are not approved by synthetic tests.
Modes remain disabled and the real pilot suspended. TD-006/007/009/010 remain In progress;
TD-037/038/043 remain Open. Sprint 12 owns operational/assistive-technology acceptance; Sprint 13
owns go/no-go. Neither live payments, generator compatibility nor Phase 02 closure is claimed.
Task 11.10 is documentation-only; no new hosted inventory or exact-commit CI is implied.

## Sprint 11.8 Is Locally Complete, Not Hosted Provider Proof

Current Task 11.9 acceptance supersedes the historical incomplete checkpoints below: the synthetic
sandbox/hosted matrix now passes, including genuine pending-refund retry denial and terminal
duplicate-refund settlement, fixed uncertainty/retry/late-original/independence rollback packets,
and exact disabled/empty restoration. Fault-injected normalized facts are not genuine provider
deliveries or real clinical approval. Task 11.10's report, owner commit/remote CI for the final packet,
and TD-010's real commercial/publication/live-release prerequisites remain separate. No live payment
or pilot activation is authorised by these tests.

Task [11.9](../02-implementation-plans/phase-02/annexures/sprint-11-9-sandbox-journey-evidence.md)
is in progress. Actual provider Session creation/retry/line-item/metadata/expiration checks passed,
but none completed a payment. The eight approved Sprint-11 migrations have now been applied hosted
without seeds; independent history, service-readable and private SQL baseline checks passed.
The owner deployed Sprint-11 code. A temporary transport-only configuration and isolated tenant/service
fixture proved genuine signed expiry delivery, invalid-signature rejection and unmatched/pending
handling with no settlement. Both configuration and fixtures were restored/removed. Disposable
Auth identities and captured payments were subsequently exercised in isolation: sealed patient sessions,
staff TOTP/AAL2, assignment/role/case denials, R999 genuine signed funding, paid-review readiness,
R800 capped product credit and separately captured R100 delivery passed. Cleanup refunded the test
captures, removed the disposable identities and restored the disabled configuration/empty baseline.
Hosted refund-read hit a 503 from passing the transferred original Request at Worker dispatch.
The owner deployed the bounded-request fix; the repeat hosted operational refund commands and
genuine signed R199/R800/R100 original-method confirmations passed. An earlier 503 despite provider
success remains undiagnosed; response failure is not permission to resubmit money. The approved confirmed-remainder
SQL fix and its approved ACL follow-up are applied hosted. Independent history and privilege checks
confirm the retired primitive is not service-role executable. Forward configuration-only restoration
to `c6af1c24-958d-4e35-865e-baf541d4f99e` preserved the source checksum and restored disabled modes
with the full empty private/public baseline. The real pilot remains suspended.
Duplicate/uncertain refund and remaining failure/dispute/exception proof are not
accepted. No live money is authorised. This supersedes historical local-only schema
notes below, not independent commercial, clinical or activation gates.
Actual R0 Checkout returned completed/paid with no PaymentIntent and exposed the current hosted
reconciler's zero-status mismatch. The owner-approved narrow migration is now hosted, independently
verified and successfully retested: exact zero-total/no-PaymentIntent classification, R999 credit
once and no supply advancement. The SDK-signed synthetic hosted tamper/replay/conflict/out-of-order
packet passed too. Current disabled restoration version is `b88bb4fc-7fc3-491f-bc83-cf193cc740b7`.
Genuine decline/expiry/fresh replacement capture and ensuing refunds passed afterward. Genuine
Dispute delivery exposed the former `dp_`-only assumption: Stripe issued `du_`. The owner deployed
the narrow corrections, and genuine open/terminal won/lost, attributed current-provider reconciliation
and synthetic contradictory-terminal holds now pass without supply advancement. Full Task 11.9
exception acceptance remains open. Exact interruption recovery restored the complete empty
application/Auth baseline; see the evidence packet for current disabled restoration checkpoints.
The duplicate aggregate `charge.refunded` hold is fixed by approved hosted migration
`20261006105250_reconcile_duplicate_aggregate_refund.sql`; the provider repeat passed refund once,
retained original funding and denied retry. All 1,355 database assertions pass. Owned alert receipt
and AAL2 response are evidenced. An immediate restoration assertion failed; independent follow-up
verified unchanged source, disabled endpoints and the empty protected baseline. The updated bounded
observation harness is not yet rerun. Uncertainty/retry, late-original capture and clinical/dependency
independence still prevent Task 11.9 closure.

The [local reconciliation completion](../02-implementation-plans/phase-02/annexures/sprint-11-8-payment-reconciliation.md)
confirms exact signed refund jobs and permits one replacement after independently verified failure.
Pending, uncertain or contradictory evidence cannot be retried blindly. Provider-checked unpaid
terminal evidence can release an unconsumed product credit; webhook expiry alone cannot.
The native deposit bridge is implemented but does not activate clinical/manual transfer by itself.

Separate duplicate captures now have their own full original-method refund ledger. Terminal disputes
require exact signed lineage, current provider corroboration and attributed resolution; lost or
contradictory money cannot authorise progression. Replacement deposits preserve original attempts,
require a current unpaid inspection, bounded approval and new client acceptance, and reject late-money
replay. Dispute ownership is not provider evidence submission; staff respond in Stripe's Dashboard.
No new debt ID or business-policy deviation is introduced; TD-010 retains provider/release obligations.
Local mocked/browser/SQL proof is not hosted provider proof. The eight original Sprint 11 migrations
and approved confirmed-remainder fix are applied hosted; dispatch remains disabled by default and
Task 11.9 is not accepted.
Earlier task-specific checkpoints below are historical and must be read with this current boundary.

## Sprint 11.7 Refund Commands Are Local, Not Activated or Settled

Own-client requests do not cancel treatment, supply or confirm a refund. Staff decisions require
current assigned AAL2 scope plus a separate financial grant and independently verified eligibility
record. Grant/evidence publication is a governed database-owner release input, not a patient-supplied
outcome, arbitrary UUID or permission inherited from a broad operations role.
No real grant, eligibility record, provider refund or customer communication was created here.

`COMMERCE_REFUND_MODE` defaults to `disabled`. Sandbox dispatch also requires existing Checkout/
callback modes and database release/account authority. Six Sprint 11 migrations remain unapplied
hosted in this task's evidence. Pending/failed/uncertain jobs retain their reserved amounts until
11.8 reconciles independent provider evidence; no blind fresh-key retry or confirmed-refund promise.
Refund alerts are locally verified records, not an asserted delivered email. Clinical/dispensing/
delivery cancellation remains independent; both downstream payment-readiness adapters stay closed
until 11.8's authoritative integration. TD-010 remains In progress, with hosted/provider proof in 11.9.
This checkpoint supersedes earlier task-specific implementation gaps below.

## Sprint 11.6 Views Are Implemented Locally, Not Operationally Activated

The [payment projections](../02-implementation-plans/phase-02/annexures/sprint-11-6-payment-status-projections.md)
are complete locally, backed by the private signed-evidence ledger and separately verified SQL,
HTTP/component and controlled desktop/mobile boundaries. Browser responses are synthetic mocks,
not a hosted card/payment exercise. Only own-client and assigned AAL2 operations access exists;
this is not a tenant-wide finance browser. Pending/unmatched provider exceptions remain owned
reconciliation work, not guessed client matches. Refund evidence is not a new refund command.
Funding/credit/refund execution and downstream paid-review/transfer remain 11.7–11.8 work.
Five Sprint 11 migrations are not claimed applied hosted; no binding/release/credential changes
or real payment occurred. TD-010 stays In progress. Earlier four-migration notes are historical.

## Sprint 11.5 Is Local Money Evidence, Not Pilot Release

The [signed-receipt boundary](../02-implementation-plans/phase-02/annexures/sprint-11-5-signed-receipts-settlement.md)
is complete locally. SDK signatures are genuine synthetic cryptographic tests; SQL normalized
fixtures are rollback-only. No actual provider/network or hosted payment flow was exercised.
Mode remains disabled; four Sprint 11 migrations are not claimed applied hosted. Paid/refund/
dispute/expiry evidence is retained independently with owned pending exceptions. Funding bridge,
credit consumption/release, refund execution and downstream paid-review/transfer commands remain
later work; both adapters remain closed. TD-010 stays In progress and no customer/card/medical
raw event body is stored. Earlier webhook-unmapped statements are historical local checkpoints.

## Sprint 11.4 Creates Sessions, Not Settled Payments

The [guarded creation packet](../02-implementation-plans/phase-02/annexures/sprint-11-4-guarded-sandbox-checkout.md)
is complete locally. Committed mode remains disabled; no hosted migration/release or provider
resource was created. SDK mocks, SQL fixtures and intercepted Checkout navigation are distinct
engineering evidence, not an actual sandbox charge. The new private ledger records `preparing`
or `open`, never paid. The legacy webhook does not yet map these creation identities; 11.5 must
provide signed settlement proof before an operational journey can progress. One-hour provider
expiry is separate from short-lived offer/session authority; late/uncertain outcomes, minimum
amount rejection and abandoned sessions remain 11.5/11.8 reconciliation inputs. TD-010 stays
In progress; real catalogue, terms, authority and release remain gates.

## Sprint 11.3 Acceptance Is Not a Payment

The [order-review boundary](../02-implementation-plans/phase-02/annexures/sprint-11-3-order-review-acceptance.md)
is complete locally, with exact supplier/price/quote/terms disclosure and durable hash-bound receipt.
Review defaults disabled; no real offer or instrument is manufactured or published. Hosted has
neither new commerce migration. Checkout, provider settlement, credit consumption/release and
refund execution remain later tasks. Terms approval and real catalogue/rates/authority remain
release inputs. Browser fixture acceptance is UI evidence, not hosted Auth/SQL or Stripe proof.
TD-010/037/038 remain non-Verified. Do not describe an accepted order as paid, clinically approved,
dispensed or delivered.

## Sprint 11.2 Is Private Preparation, Not an Enabled Payment Journey

The [local commerce packet](../02-implementation-plans/phase-02/annexures/sprint-11-2-private-commerce-preparation.md)
implements synthetic catalogue, quotes, immutable offers and credit reservation without granting a
service/browser API. No actual confidential RRP import, approved live delivery tariff, provider
Price mapping or rendered order acceptance is claimed. Local positive funding/release rows are
rollback-only synthetic evidence, not clinical/payment authority. Receipt/session entry, Checkout,
signed event credit consumption/release and refund execution remain 11.3–11.8. Hosted has not
received the new migration; both payment-readiness adapters remain false. TD-010 stays In progress.

## Sprint 11.1 Does Not Implement Checkout

The [commercial contract](../02-implementation-plans/phase-02/annexures/sprint-11-1-commercial-payment-contract.md)
is complete at contract level, including owner-approved credit and exception dispositions.
At that historical checkpoint, private catalogue/rates, exact reviewed transactional publication/acceptance, current patient
Checkout, authoritative deposit/credit adapters, provider-backed refunds and hosted exception proof
remain Tasks 11.2–11.9. Legacy payment runtime remains localhost-only and production readiness
adapters remain false. Zero-total Session completion must not be described as a new charge.
TD-010 is still In progress; neither these decisions nor synthetic prices approve a real sale.

## Sprint 10 Closure Is Not Pilot Release

Sprint 10 and I1–I8 are [completed with activation gates](../03-completion-reports/phase-02/sprint-10-staff-queue-protocol-handoff.md).
The generator exception is explicit: no current generation/compatibility acceptance is claimed.
TD-006/TD-007/TD-009/TD-010/TD-037/TD-038/TD-043 remain non-Verified; TD-058 accrued and was resolved.
Sprint 11 authoritative deposit/catalogue/refund proof, Sprint 12 support/accessibility and Sprint 13
release rehearsal remain. Private appointments, reviewed publications and safety configuration must
precede real intake. Old task/migration-pending sections below are historical checkpoints, superseded
by the report and I8 evidence, not current engineering blockers. Closure-batch CI is owner-pending.

## Task 10.9 Rehearsal Is Not Pilot Activation

The [reliability packet](../02-implementation-plans/phase-02/annexures/sprint-10-9-cross-boundary-rehearsal.md)
reuses nine rollback-only local SQL suites plus actual local Auth/concurrency and controlled browser
checks. It neither contacts the protocol generator nor proves external clinical compatibility.
Payment-ready positive fixtures exist only inside rolled-back synthetic tests; production adapters
remain closed pending Sprint 11. Current-generator access remains an owner-excepted I8 pre-launch
dependency with a committed reactivation checklist. Task 10.10 now closes the sprint; activation gates remain.
The evidence packet discloses a non-reproduced initial SQL interruption; do not describe it as a
diagnosed production defect or claim every validation attempt passed.

## Task I1 Frozen; Clinical Publication and Appointment Gates Remain

The [I1 packet](../02-implementation-plans/phase-02/annexures/sprint-10-i1-medical-intake-contract.md)
and JSON catalogue preserve the approved original questionnaire. The owner approved remaining
engineering recommendations and an explicit sex field on 5 October; collection 1.1.0 has no default
male or gender-identity inference. This new field is not covered by Dr Zee's original approval.
Technical controls/grants are implemented locally under the
[I2–I8 progress packet](../02-implementation-plans/phase-02/annexures/sprint-10-intake-implementation-progress.md),
not accepted as hosted or activated. `/portal/intake` and `/staff/intake` fail closed without explicit
mode, bound tenant, current identity and reviewed publication/grant authority. The production
review-deposit/manual-transfer gate stays closed until Sprint 11. Private clinical primary/fallback appointments,
safety deadlines/guidance, recipient agreements and domain publication approval remain pre-launch
gates. Missing configuration fails closed; no invented appointments, clinical scores, mandatory
bloods/deposit prerequisite, provider-code modification or live collection is claimed.

## Task 10.8 Local Completion and Hosted Release Gate

The [own-client progress packet](../02-implementation-plans/phase-02/annexures/sprint-10-8-client-case-progress.md)
is implemented and verified locally. `/portal` now displays own administrative cases through the
audited `read_patient_portal_with_operations` RPC: reference, coarse status and timestamp only.
No provider outcome, clinical state, internal reason or staff identity is disclosed. Completed means
administrative processing closed, not consultation/treatment/payment/delivery success. Action-required
vocabulary is reserved for explicit later intake facts, not invented from internal readiness failures.
Hosted migration application and synthetic own-client release proof need separate approval before
deployment of the new consumer. Missing RPC fails closed; real pilot stays suspended. Intake I1–I8
still precedes 10.9/10.10. Historical incomplete-projection statements below are superseded locally.

## Task 10.7 Closed; Real-Pilot Activation Remains Separate

The [audit/alert foundation](../02-implementation-plans/phase-02/annexures/sprint-10-7-operations-audit-alerts.md)
is complete locally, including generic Brevo dispatch, durable bounded retries/uncertainty and explicit
administrator acknowledgement/resolution. Mansoer is the initial responder at the monitored support
mailbox; five-minute invocation and 24-hour overdue review do not establish a clinical SLA.
`OPERATIONS_ALERTS_MODE` remains disabled. All seven Sprint 10 migrations were applied hosted with
explicit approval on 4 October 2026, without seeds or role changes. The validated Brevo API key is
saved in the ignored local environment and, under explicit one-time approval, as a Worker secret.
The approved hosted database/provider rehearsal passed
real TOTP/AAL2, generic email acceptance, owner-confirmed mailbox receipt and scripted administrator
response/replay/revocation. All disposable fixtures were removed and the empty suspended baseline
restored. The subsequent deployed rehearsal passed real Cron invocation and routed administrator
MFA/response/revocation. Its send was uncertain because Workers rejects `redirect: "error"`; the
local fix uses `manual` without redirect credential forwarding. Owner deployment and successful
scheduled email acceptance/mailbox receipt remain outstanding. Disabled mode and the empty baseline
were restored; the temporary tenant binding was removed. Task 10.7 is not fully closed yet.
The corrected deployed Cron retest subsequently passed one accepted attempt and provider-reported
delivery at 14:41 SAST on 4 October 2026. The owner confirmed receipt on 5 October 2026,
closing Task 2.10.7. The transport defect is resolved. Mode is restored to disabled; the real pilot
remains suspended. Earlier pending statements above describe superseded rehearsal checkpoints.

## Current Intake Scope Overrides Historical External Only Limits

[DR-018](../07-decisions/DR-018-meneer-hosted-medical-intake.md) plans medical questionnaire collection
inside Meneer with purpose-bound manual transfer. Local collection/access code now exists, but
hosted intake schema is now applied; code release and end-to-end acceptance remain outstanding. General
profile/queue permissions do not authorise medical answers. The external intake URL is no longer a
required input for this path; leave that implementation inactive. Clinician question approval is
owner-attested, not a signed publication or proof of provider compatibility. Blood results are not
an initial submission gate. I1 now freezes engineering fields/access/retention/hold semantics plus
the separately attributed sex extension. Clinical publication, private safety appointments and
response configuration remain release gates. I2–I8 implementation/verification still precedes
Sprint 10 closure. Do not claim operational readiness or change original wording to resolve these gates.

The final local intake SQL replay passes 1,003 assertions, including 95 intake checks; the application
suite passes 651 tests. The local SQL linter still reports a pre-existing implicit `text`-to-`text[]`
initialisation warning in `public.execute_patient_account_command`. Account-rights regression checks
pass, but that warning is not intake completion evidence or a claim of warning-free schema health.
See the intake progress record for the separate controlled browser and hosted-rehearsal boundaries.
The refreshed full browser matrix now passes all 180 desktop/mobile checks without weakening tests;
earlier account/readiness deadline failures remain historical, not current regression blockers.
I8 non-generator acceptance is complete: real hosted Auth/AAL2, medical commands, independent grants,
restriction/retained export, revocation and scheduled Brevo delivery pass. A fresh actual hosted
patient browser rehearsal proves sign-in, privacy acknowledgement, eight sections/branching,
validation, saved draft/resume, submission/amendment access, mobile layout and real expiry hiding.
Keyboard/accessibility-tree checks supplement the controlled axe matrix, not a certified
assistive-technology audit. Brevo records receiving-server delivery at 15:41:05 SAST on 5 October;
subsequent direct browser inspection found the exact support-addressed generic alert in Gmail's
Updates category. This closes mailbox visibility proof, not owner or clinical acknowledgement.
Exact field projection and scoped cleanup now pass. The
restricted-safety review ordering defect is Verified through four local regressions, approved hosted
migration, fresh AAL2 review/success/subsequent denial and audit-chain proof. Hosted history contains
36 versions; local SQL passes 1,007 assertions. The real pilot remains suspended. All disposable
fixture rows/five Auth users and sessions are removed; the original one-tenant/12-provider-gate
baseline is independently verified, with all triggers enabled. Hosted advisors
record eight intake foreign-key covering-index candidates for performance review, plus intentional
deny-default RLS and unused-index notices. Fresh protocol-generator login reaches a subscription
gate; restored provider entitlement is required before current manual-transfer compatibility proof.
The owner explicitly excepted this unavailable external walkthrough from I8 closeout; it remains a
pre-launch dependency, not an engineering task-open claim. Task 10.9 may proceed.
The authorised temporary rehearsal was restored to disabled in Worker version
`ac94b09c-efa8-453a-a8db-c171d1755acf`; its synthetic tenant binding is removed and both command
endpoints again return no-store, payload-free 412. The dedicated medical key remains server-only.
No real collection, charge or current generator compatibility is claimed.

The following sections retain historical checkpoint limitations where later amendments supersede them.

## Resolved Dependency Finding: TD-057

Task 9.10's initial 36 full/26 production-filtered findings are historical. The dedicated
[remediation](../01-audits/td-057-dependency-remediation-2026-10-03.md) now passes both audits,
types/lint, unit/browser/database checks, production build and upload dry-run. TD-057 is Verified
locally and in exact-commit CI `37138262125` at `1b41ed49`, not an accepted security exception.
Post-deploy verification remains separate release evidence. No deployed exploit or hosted configuration change
is claimed. TD-058 subsequently records the I8 restricted-safety review defect, now Verified locally
and hosted; current total: 51 Verified, seven non-Verified. Clinical, commercial, operational and
live-accessibility acceptance gates remain unchanged.

## Sprint 10.4 Queue Is Read-Only and Local

The assigned operations queue/list/detail is implemented locally, not activated hosted. Only
current case-assigned operations staff may read it after live AAL2/session/context verification.
There is no unassigned queue, raw-contact reveal/export, routine admin/support browsing, invitation
dispatch, claim, transition or provider-delivery button. Payment and hand-off readiness remain
`not_evaluated`; profile/email facts are not substitutes. Claims/transitions, hand-off, append-only
access audit/alerts, client projection and full rehearsals remain Tasks 10.5–10.10. Browser synthetic
projection fixtures prove UI behaviour, not an authenticated hosted staff session.
All three Sprint 10 migrations need separate hosted approval/proof. TD-009 remains In progress and
TD-043 Open; real-client activation and live assistive-technology gates remain unchanged.

### Task 10.5 Supersedes the Read-Only Command Limitation

Task 10.6 subsequently implements the local reference-only attempt/acknowledgement/reconciliation
boundary, including independent evidence, safe retry and cancellation preserving delivery history.
See its [acceptance evidence](../02-implementation-plans/phase-02/annexures/sprint-10-6-manual-handoff-commands.md).
The approved authenticated portal and independent assigned reviewer are now implemented locally,
including guarded issuance, tenant-bound destination approval and opaque evidence ingestion.
Local Task 10.6 is complete, not live: supply the actual intake URL/server bindings, review the
recipient/instruments and exercise the separately approved hosted path. Issuance never proves
receipt or acknowledgement; no recipient is seeded. External reusable-link access cannot be revoked
by a Meneer case cancellation alone. The Sprint 11 deposit adapter defaults false.
All six Sprint 10 migrations need separately
approved hosted proof. The prior four-migration statement below is a historical checkpoint.

Local claim/release, expected-version commands, immutable replay/audit, coded pause and pre-delivery
cancellation now exist. Current-assignment/AAL2 is rechecked for every command, including replay.
Account/profile/contact/receipt/authorisation facts are derived server-side; payment and verified
recipient fact adapters are still explicitly pending. There is no staff payment override or delivery
assertion. Task 10.6 owns attempt delivery, acknowledgement, resumption and external reconciliation;
Sprint 11 owns the deposit gate. All four migrations need separately approved hosted proof.
The older read-only checkpoint above is historical. No pilot/provider/payment activation is implied.

## Sprint 10.3 Staff Authentication Is Not an Activated Queue

Individual staff entry, TOTP/AAL2 and live server context now exist locally. A pending email/MFA
cookie cannot read a staff session; an authenticated session cannot browse unassigned cases.
Invitation does not create or approve roles; first-admin bootstrap and independent target review
are required. Uncertain invitations stay unresolved and cannot be blindly resent; operator
reconciliation/alerts remain Task 10.7. Email cannot reset an existing verified authenticator.
No Sprint 10 migration is applied hosted; hosted workforce invitation delivery, Auth redirect/
OTP configuration, Worker session proof and owner-approved provisioning remain activation gates.
Task 10.4 now supplies the read-only local queue; Tasks 10.5–10.10 own commands, hand-off and final rehearsals.
TD-009 remains In progress and TD-043 Open. No new debt ID or pilot permission is introduced.

## Sprint 10.2 Records Are Not an Operational Staff Queue

Eight local tables and strict portable records now exist, but every application role still has
direct access denied. A claim is not permission; stored versions are not yet optimistic-concurrency
commands. Tasks 10.3/10.4 now verify workforce membership/AAL2 and current case-specific read
assignments locally; governed transitions, recipient verification, audit/alerts and client projection
remain Tasks 10.5–10.9. Hosted has not received the three new migrations. Do not interpret local persistence
completion as staff, provider or pilot activation.

## Sprint 10.1 Is a Contract, Not Staff Activation

The frozen staff queue/hand-off contract precedes migrations and staff UI. Existing case-specific
assignments do not permit unassigned tenant-wide browsing; provider acknowledgement is not inferred
from link delivery, and operational outcome is not treatment approval. Break glass remains disabled.
Tasks 10.2–10.10 and external party/contract/escalation verification are still required. No new
debt ID or pilot permission results from completing the contract task.

## Phase 01 Closure Boundary

Phase 01 is completed at the secure inactive-foundation boundary under DR-010. Do not translate
that status into pilot readiness. Task 8.2 and DR-011 temporarily verified TD-007 through scope
removal; Task 8.4 and DR-013 later reopened it by approving a gated candidate catalogue. TD-006,
TD-007, TD-009, TD-010, TD-037, TD-038 and TD-043 remain non-Verified activation gates.

The approved minimum v1 target is invite-only onboarding, a minimal non-clinical client profile,
versioned acknowledgement/consent, one-time Stripe payment, a least-privilege staff queue and a
manual auditable protocol hand-off. These are target capabilities, not current ones. Hosted payment
is disabled; local profile and assigned read-only queue implementations are not real-client activation;
and no protocol API/webhook or authenticated
Meneer integration has been verified.

Treat the protocol portal as a separate professional system. Do not copy health data into Meneer,
payment metadata, URLs or ordinary email merely to bridge the systems. A manual pilot hand-off must
use minimum data, opaque references, ownership, timestamps, acknowledgement, exception handling
and audit evidence.

Next.js is not a committed next generation. Continued TanStack, Next.js and direct Laravel/React
remain candidates until a separate architecture and migration decision passes DR-004/TD-055.

Phase 02 Sprints 08–13 are planning authority for minimum pilot enablement. Task 8.1 records the
read-only repository/hosted baseline and freezes the Sprint 08 sequence. Task 8.2's product-neutral
boundary is superseded by DR-013; no product transaction is implemented or enabled.
Continue to answer from observed code, hosted state and completed task evidence until each planned
task is implemented and verified.

Task 8.3 assigns OCTOTHORP ZA's non-clinical counterparty/operator and Meneer data-purpose
responsibilities. DR-013 adds an intended Precise-Wellness-to-Meneer dispensing/custody direction,
but does not verify the external entities, activate a hand-off or appoint a professional/pharmacy.
Do not interpret the direction as proof of authority or an operational agreement.

Task 8.4 and DR-013 approve the commercial policy, not runtime activation. The R999 review deposit,
Precise Wellness schedule RRP, VAT-inclusive planning, separate delivery, merchant/legal-entity
allocation and refund rules are approved inputs. Do not expose the confidential practitioner
schedule, seed Stripe directly from the PDF, accept browser-supplied totals, promise availability
or imply a product transaction is lawful or active. TD-007, TD-009 and TD-010 retain their
authority, pathway, agreement, implementation and release gates.

Task 8.5 and DR-014 approved the minimum profile contract; Task 9.6 now implements local atomic
activation/profile writes and exact account/privacy receipts. It does not enable public registration
or hosted client use. Task 9.7 supplies a locally verified own-client portal; Task 9.8 adds local
name/preference correction and private rights/support request entry. Actual export delivery,
contact change, restriction/deletion execution and staff case views remain separately reviewed
operational work—not implied by a received request.
Do not add health, product, address, identity-document, credential or free-text fields
to the profile; delivery address belongs to a later approved order record. Verified email comes
from managed identity, and WhatsApp preference is operational contact permission—not marketing
consent or authority to send sensitive content.

Task 9.2 adds local-only profile, publication, receipt and lifecycle tables with deny-default RLS;
it does not enable writes through a governed command, publish an instrument, create client data or
apply the migration to hosted Supabase. Do not describe the schema as an operational account flow.

Task 9.3 adds a local-only staff invitation command and rate/replay controls. Task 9.4 adds a
code-only local invite template and a first-party email/code page; synthetic local Auth/Mailpit
proves `type: "invite"` verification without a token URL. The page's proof cookie is short-lived
and non-authorising. Do not treat this as a working client account: hosted invite template,
tracking policy, migration, secret and delivery are unverified; staff sending remains unrouted;
Task 9.5 implements the session lifecycle locally and Task 9.6 supplies the atomic activation
command. The setup page still fails closed without exact approved published documents; no real
publications were created. Hosted code-only
email templates, the separate session-encryption secret and synthetic hosted verification remain
unproven under Task 9.9. Do not treat the local flow as an active client account.

Task 9.7's `/portal` and `/portal/profile` are data-free shells unless the authenticated projection
passes fresh provider/session, own-patient, tenant/contact/profile/lifecycle and exact current
receipt checks. UI interception proves presentation only; pgTAP independently proves database
scope/denials. The status projection contains opaque references and literal dispatch/delivery/
cancellation state only—not clinical approval, protocol, product or payment content. No workflow
row means no workflow, not a fabricated milestone. No hosted portal, real document publication or
live assistive-technology approval is claimed. Task 9.8's rights commands recheck this same authority
and add strict fields, expected versions, idempotency and atomic audit/rollback. Only names and
operational preference can change directly. Request categories persist privately without sending
ordinary email; receipt is not secure export, restriction, closure or contact-change completion.
Before pilot, reviewed staff processing, step-up and confirmation for high-risk actions, safe
delivery, case/command retention and downstream reconciliation must be verified. The two new
`identity_private` command/request tables require direct database inventory in Task 9.9 because
the service-readable hosted baseline cannot enumerate them. Task 9.9 has now directly inventoried
them after 157 passing hosted rollback-only SQL assertions and approved migration application.
All synthetic records rolled back; the pilot tenant remains suspended. Seven hosted anonymous
HTTP denials now pass after deployment reconciliation. Code-only Auth templates and the approved
six-digit/900-second OTP policy are verified. Supabase runtime credentials and both distinct
identity-cookie encryption keys were subsequently provisioned under explicit owner instruction;
secret-name verification and repeated anonymous checks passed. Delivered invitation/sign-in/
recovery and positive hosted API/session checks now pass, including independent provider and
application revocation. The approved disposable tenant/profile/nonbinding-document evidence was
removed; independent inventory verified the original baseline and all seven triggers enabled.
This is not a positive browser-portal or live assistive-technology review. The invitation contained
a tracking image; no token-bearing link was observed. The owner accepts retaining useful tracking
unless it harms authentication or production reliability. Code-only credentials stay protected;
FC-001 requires harm-triggered remediation/retesting, not blanket tracking removal. Task 9.9 is
completed at its synthetic boundary. Do not equate synthetic proof with permission to activate clients.
Do not use the portal as a back door to the gated intake/payment paths.

Task 8.6 and DR-015 approve instrument semantics, not published transactional terms or functioning
acceptance/consent. Do not display internal baselines, unresolved schedules or bracketed hand-off
values to clients. Do not treat website-only `/terms` or `/privacy` as transactional acceptance,
infer consent from an invitation/account/payment, bundle marketing, or represent Meneer as having
collected the external provider's clinical informed consent.

Task 8.7 and DR-016 approve the `privacy@`, `complaints@` and `clinical@` Meneer aliases and their
activation contract. Brevo accepted payload-free synthetic mail and the owner confirmed all three
arrived. There are no fixed hours; answering within 24 hours where possible is a qualified target,
not a guarantee or emergency service. Do not expose the aliases publicly or claim functioning case
handling before Sprint 12. TD-043 remains Open until the clinical owner and complete routed
acknowledgement/failure/escalation/fallback path are implemented and exercised.

Task 8.8/DR-017 verifies signed-out patient intake access and a synthetic provider-managed path
through intake, protocol generation, review/editor views and PDF-download controls. It does not
verify clinical correctness, notification delivery, PDF binary contents, permission isolation,
approval/send or billing. The dashboard pending count contradicted the protocol library, and one
generated dose was rounded inconsistently within the same protocol. No supported API/webhook or
machine export was visible. Keep the provider link and credentials outside Git; retain manual
hand-off until Sprint 10 proves its governed boundary. Require provider correction and clinician
verification before relying on generated dosing. The provider's exact legal identity, professional
authority and agreements remain unverified.

Task 8.9 replaces the previous synthetic/bootstrap hosted state with one suspended pilot tenant and
no Auth user or operational data. Treat this as a clean inactive database baseline, not a working
account or pilot journey. The current no-policy RLS notices are intentional deny-all controls.
Reassess the informational foreign-key and unused-index advisor findings after representative
Sprint 09–13 query traffic exists; do not optimise or remove indexes from an empty workload alone.

## Current Capability Limits

Sprint 09 is engineering-complete at the invite-only synthetic boundary; its
[completion report](../03-completion-reports/phase-02/sprint-09-identity-profile-consent.md) records
profile/receipt/portal/rights entry and real hosted Auth proof. Real client activation remains
unapproved: hosted tenant suspended, no real transactional publication, no staff invitation UI,
no rights processor/secure export delivery and no released-flow assistive-technology approval.
Seven debts remain non-Verified. This current checkpoint supersedes earlier local-only statements
below, without rewriting their historical evidence.

Sprint 08 completion is the approved decision/evidence boundary, including the clean hosted
baseline. It does not imply that every original external-input intention is satisfied. Seven debts
remain non-Verified; final appointments, supplier/recipient schedules, rendered approvals and
routed support exercises must be supplied before affected capabilities activate. The completion
report explicitly records these deviations and their Sprint 09–13 ownership.

Do not claim live registration, client consent capture, clinical questionnaires, prescribing,
payments, pharmacy fulfilment or reviewed support/rights fulfilment. Sprint 09 provides durable
invite-only account/profile/receipt and request-entry code with synthetic proof, not released
clinical, commercial or staff operations. A rights request marked received is not fulfilled.

Do not state that form submission succeeded. As of the verified Sprint 1.2 working-tree boundary,
`/start` and `/peptides` render non-transactional gates with no forms or inputs. Their previous
local-state prototypes remain preserved in source but are not active customer journeys.

TD-002 and TD-004 are verified only through disabled-capability outcomes at commit `3c1ff01`.
Meneer still has no implemented consent-record or identity system. Before either capability is
enabled, apply the full replacement requirements in the technical-debt registry; do not interpret
containment as production readiness.

TD-001 and TD-003 are likewise verified only through disabled-capability outcomes at commit
`3c1ff01`. Meneer still has no durable intake transaction or approved clinical questionnaire. Apply
the registry's full transaction, validation, questionnaire, exclusion, and emergency-routing
requirements before enabling submission; the preserved prototype is not suitable for reactivation.

## Clinical and Legal Limits

DR-001 approves the role boundary: Meneer is the working brand, OCTOTHORP ZA is the
technology/marketing/general-support/operations layer, and verified independent clinical/pharmacy
actors retain professional authority. It does not approve the remaining contracting and
information-responsibility allocations, registrations, partner evidence, treatment eligibility,
contraindications, clinical pathways, transactional consent/privacy/terms, pricing, refund rules,
delivery promises, or peptide authority. Versioned website-only privacy and terms notices are
implemented and owner-approved for publication as version 1.0; they are not authority for
health-data collection or transactions. Existing marketing claims require a governed claim
register and domain review.

DR-002 approves conservative v1 commercial and fulfilment principles, not universal industry norms.
No price, tax treatment, merchant-of-record allocation, transactional term, Stripe activation, or
delivery performance is live or approved merely because the policy exists. Retained cancellation
and no-charge-on-clinical-rejection wording is unchanged and must be reconciled against approved
gated particulars and implemented evidence before checkout is enabled.

The owner-confirmed provisional operator and development fixtures are centralized in the pilot
compliance profile. `Dr John Doe`, `Jane Doe`, `HPCSA-PLACEHOLDER`, and
`Y-NUMBER-PLACEHOLDER` are not verified identities or registrations and must never be presented as
such. Their presence deliberately keeps activation blocked. `/start` provides universal emergency
containment only; it is not a substitute for condition-specific clinical rules or server enforcement.

Peptides are owner-confirmed as the first intended v1 rollout product, not a "coming soon" category.
The current transaction is nevertheless gated until its product-level, partner, questionnaire,
data-transfer, dispensing, exclusion, escalation, and operational evidence is approved. Preserve
established customer-facing messaging while keeping that implementation boundary explicit.

BPC-157 plus TB-500 (“Wolverine stack”) is the initial candidate pairing, not an approved offering.
SAHPRA's public warning names both among illegally marketed peptides; product-specific registration
or valid Section 21 authority is required before either can enter transactional scope.

Never generate patient-specific diagnosis, dosing, eligibility, or treatment advice from this corpus. Never treat the blueprint's intended journey as an approved clinical protocol.

## Platform Limits

The repository is hosted for contained review but is not ready for transactional pilot use.
DR-003 approves logical channel, application/API, domain, persistence, integration, audit, and
authoritative-state boundaries. It does not implement them. Do not describe the current site as
having a backend, durable modular core, system of record, clinical/operations workspace, or
transactional integration merely because the target architecture is approved.

DR-004 approves the framework-neutral contract, compatibility, migration, reconciliation, cutover,
and rollback rules. Task 5.2 now supplies strict common machine-readable envelopes, registry/error/
version schemas, portable synthetic fixtures, contract tests, and initial dependency enforcement.
Task 5.9 supplies the first strict business command and Supabase transaction adapter. Task 5.10
adds portable audit/domain-event/inbox contracts and durable local evidence. Tasks 5.14–5.15
complete the inactive payment/fulfilment payload and provider evidence required to Verify TD-014.
Task 5.16 adds the retained-capability suite, schema/version registry, portable fixtures, drift
check, and migration rehearsal template, verifying TD-055's repository preparation. There is still
no Next.js candidate or completed cross-generation rehearsal; TD-014/TD-055 verification must not
be described as an enabled transaction or completed framework migration.

DR-005 approves PostgreSQL, object-storage, logical schema, tenancy, lifecycle, migration, backup,
and restore architecture; DR-006 approves vendor evaluation and exit criteria. DR-009 selects the
free-tier-first pilot providers, and the owner has provisioned the empty London Supabase project.
Local/CI contains versioned tenancy, identity, authorisation, workflow-command, lifecycle, audit,
and payment migrations plus synthetic provider integration; the hosted project remains unmigrated
and credential-free. Task 5.13 now implements and locally proves the lifecycle/recovery boundary, but no hosted schema,
recovery object, heartbeat, real request, or automated retention job exists in pilot runtime.
Do not describe repository proof as hosted activation or named-domain approval.

The selected Supabase Free model has one hosted pilot project, so local/CI use local Supabase and
Cloudflare branch previews must keep real providers disabled or synthetic. Free-tier limits,
inactivity pausing, short log retention, and lack of automatic backups/PITR are operational limits,
not accepted recovery controls. Intake must pause or a reviewed upgrade must occur before a stop
trigger is crossed; automatic spend is prohibited.

Task 5.7 implements stable subject/contact mapping, bound invitation/recovery governance, TOTP AAL2,
immutable absolute session origins, atomic idle expiry, revocation and scoped service identities.
The corrected database/Auth lifecycle proof passed on 2026-08-10, closing Task 5.7. Task 5.8 then
implements and locally verifies the ordinary deny-default contextual matrix, horizontal/vertical
isolation, minimum projections and exact service scope. This remains an inactive server foundation,
not an account journey. Tasks 5.10–5.11 now add successful-command audit/review and shared
request-abuse foundations. Tasks 5.12 and 5.20–5.21 subsequently verify denial evidence, the
monitored disabled-break-glass disposition, hosted synthetic Auth, and final cleanup. TD-013 is
Verified for the inactive identity foundation.

Task 5.11 adds a locally verified inactive request-security foundation. It protects current reads,
denies and rate-checks unregistered mutations, and defines reusable protected-JSON controls, but it
does not provision Turnstile, configure a hosted WAF rule, or publish a command/callback because no
public mutation exists. Task 5.20–5.21 hosted checks prove the inactive boundary, so TD-017 is
Verified for current routes. Every enabled form, identity action, future form, or provider callback
still needs its own policy, monitoring, WAF/rate decision, and local/preview/hosted bypass evidence.

Task 5.12 adds strict custom Worker telemetry, local alert thresholds, a passing controlled incident
exercise and append-only identified denial evidence. Task 5.18 adds hosted Better Stack public
monitor activation, email delivery, acknowledgement and recovery evidence without connecting an
application-log source. Automatic invocation logs remain disabled. Task 5.19 verifies private EU
R2 encrypted upload, 35-day expiry, durable-write failure without a false heartbeat, and a
missed-heartbeat acknowledgement/automatic-recovery exercise. Provider-backed download, decryption,
reconciliation/restore and synthetic-object deletion pass hosted run `31551448469`; the zero-field
heartbeat was emitted only afterward. Its hourly production runner
remains disabled because no real intake exists and scheduled production export has not passed its
activation gate. Task 5.20 completes hosted schema, RLS/RPC hardening, inactive-route denials,
conservative Auth, custom SMTP, and synthetic provider-lifecycle proof. Task 5.21's final matrix and
advisor review pass. Sprint 05 and TD-013, TD-017, and TD-020 are therefore closed/Verified for the
implemented inactive boundary. First-route WAF/rate, callback, monitoring, and recovery proof remain
mandatory activation gates for any future capability.

Task 5.9 implements the shared inactive workflow command boundary. Tasks 5.14–5.15 extend it through
Stripe test-mode payment and minimum-data partner fulfilment. The latter verifies Precise hand-off,
pharmacy release, hub custody, courier dispatch/delivery, cancellation, refund, replay and
out-of-order reconciliation in local synthetic Supabase. TD-014 is repository-Verified, but no
registration, consent, booking, prescription, patient order, real partner API, customer-facing
entry point, hosted endpoint, production price, live credential, parcel, or completed charge exists.
TD-007, TD-009 and TD-010 still gate provider activation. DR-013 approves a candidate catalogue and
commercial policy, but product transactions remain inaccessible until the complete gate passes.

Do not describe the Task 5.14 Stripe proof as a functioning payment journey. It proves server-owned
sandbox prices, real no-charge Checkout creation, signed-event truth, replay/refund/dispute handling,
browser denial, and local reconciliation. It does not complete a payment. Hosted endpoint,
signature-delivery/alert exercises and commercial approval remain open under TD-010 and TD-020.

Tasks 5.10–5.15 prove inactive command, denial, lifecycle, payment, and fulfilment audit/outbox
evidence plus replay-safe fingerprint-only inbox records, append blocking, hash-chain tamper
detection, and assigned AAL2 review. TD-015 is repository-Verified. Do not describe this as
immutable/WORM storage, active provider messaging, hosted monitoring, or production operation;
those remain release and TD-020 considerations.

Task 3.8 validates the design and approves a conservative lifecycle/recovery baseline; it does not
prove operation. Final legal/privacy/clinical application to named entities/providers remains an
activation gate. Task 5.13 demonstrates the required isolated restore and complete synthetic rights
request with processor/backup reconciliation, so TD-016 is Verified at repository level. Do not describe the nine scenario
walkthroughs as executed customer transactions or runtime tests.

Sprint 03 is complete, but only as an architecture-and-decision boundary. Do not convert that
status into claims that vendors are selected, accountable particulars are verified, controls are
implemented, transactions are enabled, or the pilot is approved. Its residual debts remain TD-009,
TD-010, TD-013, and TD-016.

The Lovable Vite wrapper and MCP surface have been removed. The associated telemetry implementation
and environment references are absent from local source, configuration, built output, hosted
browser network, and persisted logs. Root and fallback metadata now use approved Meneer values; the
broader TD-042 discovery package remains open. The `itws-I-preview` build is served at `meneerhealth.co.za`;
canonical checks verify the local placeholder logo and campaign routes. Cloudflare remains the
approved TanStack v1 host; selection of any successor host or framework is deferred under DR-010.
Cloudflare environment roles and rollback procedure and pinned build paths are documented and
verified. Cloudflare Fonts and automatic Web
Analytics are disabled for the pilot. TD-052 is Verified. Final brand work remains open.

Do not request or recommend `LOVABLE_API_KEY`. Do not state that removing Lovable will disconnect a functioning patient backend; none was found.

The Task 2.2 isolated baseline recorded a generic `bun run preview` 500 failure. Task 2.3 repaired
that path: explicit Cloudflare output now passes Vite preview and Wrangler dry-run. Lint still fails
on 30 formatting errors plus 7 warnings, and the baseline dependency audit reported 41 findings.
One upstream `punycode` deprecation remains in current Cloudflare tooling. Task 2.5 bounded it to
build/development commands and completed package normalization; final upstream remediation belongs
to routine dependency maintenance.

Task 2.4 removed MCP: its SDK, plugin, definitions, routes, OAuth metadata, manifest, and built
output are absent, and every former endpoint returns the ordinary HTML 404 locally and on both
hosted origins.

Task 2.5 removes active Lovable environment and package-install behaviour locally; Task 2.6 removes
three historical Lovable package-cache URLs that its narrower search initially overlooked. The
dependency graph remains 456 installs across 566 packages. `bun audit` reports 31 findings
(15 high, 12 moderate, 4 low), while `bun audit --prod` reports 24 (9 high, 11 moderate, 4 low).
These are unresolved dependency advisories assigned to Sprint 04, not evidence that a specific
deployed Worker path is exploitable. Hosted no-telemetry verification passed in Task 2.8.

Task 2.6 removes the remaining Lovable application, author, and social identity from root metadata
and historical Lovable package-cache URLs from the lockfile. Existing route metadata and page copy
remain intact. TD-041 is Verified locally and on the canonical deployment; favicon, absolute
canonical, social-image, robots, and sitemap work remains TD-042.

The canonical Worker serves production version `ee3a151d-e25b-47b8-a036-c041a9225d13`; aliased
non-production version `641f728e-b460-4cd9-bbea-4448f98f7fba` remains available. Public metadata,
retired-route 404s, browser hydration, assets, logs, rollback availability, and both pinned build
paths pass, closing TD-049, TD-052, and TD-053.

## Engineering Limits

- TypeScript, the production build, generic preview, and Wrangler dry-run pass. Tasks 4.4–4.5 clear
  the tracked formatting, Fast Refresh, and unused-code baseline: format, lint, and typecheck pass
  locally with zero lint findings.
- The Task 4.10 CI workflow declares the clean format/lint baseline, and Task 4.12 proves the full
  sequence from an isolated clone plus hosted passing and controlled-failure runs. Protected
  `develop` rejects the failed required check on closed unmerged PR #10.
- Tasks 4.8–4.9 clear both full and production-filtered Bun audits without an exception. Task 4.10
  declares both gates in CI; Task 4.12 verifies hosted enforcement.
- The unused shadcn/Radix surface and its direct dependencies are removed. New primitives must be
  added with their first approved product use, not as speculative scaffolding.
- The inactive `StartFlow` and `PeptidesPage` prototypes remain deliberate unused-code exceptions.
  They are not rendered, exported, or suitable for activation without their replacement gates.
- Vitest/jsdom unit, component, and redirect-integration coverage exists. Controlled desktop/mobile
  Playwright/axe coverage passes locally and in hosted Task 4.10 CI. Automated axe checks do not
  replace manual keyboard or assistive-technology review.
- The former adapter warnings are resolved; one bounded upstream Cloudflare-tooling deprecation
  remains for routine dependency maintenance.
- The environment/release/rollback contract exists. Broader monitoring, alerting, incident response,
  and stateful recovery remain future work.
- Task 5.3 established the environment boundary; Task 5.6 extends it with an optional all-or-none
  server-only Supabase URL/secret pair. Preview excludes the pair, partial or non-HTTPS configuration
  fails closed, and the bundle canary prevents the names from entering browser output. No hosted
  value is recorded in Git and the adapter remains unsafe to activate until later proof gates pass.
- Task 5.6 provides a local read-side persistence scaffold only. Forced RLS and revoked browser
  privileges deliberately leave no user policy; Supabase service access bypasses RLS and therefore
  remains server-only. Do not describe this as authentication, authorisation, durable workflow,
  hosted schema, backup, restore, patient-data readiness or pilot activation.
- Task 5.4 and TD-018 are Verified locally and on Cloudflare for Worker/static-asset security headers,
  cache classes, HSTS, matching nonce CSP, hydration, and clean browser operation. The CSP
  intentionally permits inline styles for current UI implementation, but not inline scripts; new
  origins or sensitive routes require an explicit policy review and renewed regression evidence.
- Task 4.11 adds root onboarding, contribution/security routing, test/CI guidance, and GitHub change
  templates. Task 4.12 verifies clean-checkout usability and hosted rendering from protected
  production/default `main`; canonical engineering documentation remains on `develop`.
- Accessibility, navigation, SEO, content consistency, final media, and campaign print-production
  QA remain open.

Build and audit counts are dated evidence. Re-run checks before using them in a current-status report.

## Release Limits

The codebase is not approved for public launch or health-information collection. The controlled-
pilot charter is owner-approved, but activation still requires its
operating model, consent/data handling, monitored destination for every enabled submission, support
and incident procedures, accountable approvers, and passing gate evidence.

Technical debt is authoritative for outstanding obligations. An item is not resolved because a recommendation exists or code was edited; it must be marked `Verified` with acceptance evidence.

Sprint 01 is closed as an engineering containment boundary, not as pilot activation approval.
TD-008 is Verified only through the current disabled-capability outcome; enabling any condition
transaction requires its approved clinical rules, verified accountable parties, server enforcement,
and renewed evidence. TD-005 is Verified after external inbox and final Supabase/Brevo delivery
proof, TD-033 is Verified through isolated-preview containment, and TD-056 is Verified through
the approved charter. TD-032 and TD-034 are Verified through canonical hosted asset, redirect,
destination, and owner-confirmed QR-scan evidence. TD-006–TD-007 are the only original Sprint 01
debts still in progress, with an exact external close-out pack.

## Sprint 05 Closure Boundary

Sprint 05 repository implementation and Task 5.17 exact-commit hosted CI pass. Tasks 5.18–5.20 add
the hosted public monitor, incident, R2 recovery, Supabase identity/request-security, and custom-SMTP
evidence. Task 5.21 completes the final matrix, advisor review, and exact synthetic cleanup.

TD-013, TD-017, and TD-020 are Verified for the implemented inactive boundary. Hosted synthetic Auth, contextual authorisation,
disabled break-glass, inactive request-security, public uptime, backup heartbeat, and private R2
recovery exercises pass. Brevo custom SMTP is configured with a verified sender and authenticated
domain. Recovery delivery passes. The support invitation initially hard-bounced and was then blocked
by stale suppression; external inbox proof, suppression removal, and a final Delivered invitation
close that transport gap. Task 5.21 found and safely removed five unreferenced synthetic internal
identity remnants; hosted Auth users, provider identities, and contacts are now zero.
Brevo link rewriting means direct token-bearing links remain
activation-gated behind the future Meneer-owned confirmation/OTP boundary recorded in FC-001.
Route-specific WAF/rate evidence, Stripe
webhooks, partner callbacks, and any governed
break-glass grant remain activation gates for the first enabled route; Sprint closure does not
activate those capabilities.

## Sprint 06 Closure Boundary

Sprint 06 verifies route-aware navigation, encrypted opaque treatment intent, mobile disclosure,
public discovery/metadata, the approved external-font policy, and the active desktop/mobile
accessibility baseline. Do not infer that the preserved profile or stepped-flow prototypes are
live. TD-037 and TD-038 remain activation gates until an approved routed asynchronous flow receives
live keyboard and assistive-technology verification.

General support at `support@meneerhealth.co.za` and mobile `112`/ambulance `10177` are the verified
published routes. DR-016 records the active-but-unpublished privacy, complaint and clinical aliases,
synthetic delivery/receipt and qualified response target. Do not imply functioning case or
adverse-event handling; TD-043 remains open until the external clinical owner and routed failure,
escalation and fallback paths are implemented and tested. The general mailbox is not an urgent
clinical service.

The treatment-intent cookie is a 30-minute navigation aid only. It is not identity, consent,
eligibility, diagnosis, intake, prescription, or a durable health record. It must never enter URLs,
analytics, referrers, logs, payment metadata, or third-party systems. Sprint 06 adds no analytics;
TD-045 remains Sprint 07 scope.

Tasks 7.8–7.9 implement and prove the measurement contracts, private persistence, governed
aggregation/export/deletion and inactive server boundary locally and on hosted Supabase. Collection
remains absent and default-off; no public consent control or event caller exists. Do not describe
analytics, a measurable pilot funnel or longitudinal-outcome collection as active until an approved
consent interface and explicit privacy/security release approval are recorded.
The approved first-party plan does not authorise health data, treatment intent, identity joins,
free text, full URLs/referrers, fingerprints, advertising pixels or session replay in analytics.

## Sprint 07 Journey Decision Boundary

Task 7.2 approves five canonical public phases and the rules for shorter channel projections. Task
7.5 migrates 22 website, metadata, campaign, support and preserved-prototype consumers to the
framework-neutral runtime source. Task 7.6 maps 34 retained representations and proves unique IDs,
canonical phase ordering, source/claim attachment, expiry, emergency withdrawal and eligible
rollback. TD-040 and TD-046 are Verified at this repository content-model boundary.

Do not interpret five minutes as total service time, 48 hours as guaranteed dosing/delivery, or the
provisional three-to-five-business-day delivery target as starting at the first website visit. The
former stronger 48-hour, weekend-treatment and two-to-three-day variants remain rejected historical
records. Task 7.5 replaces only those three runtime representations with owner-approved qualified
wording. The replacements remain pending evidence; no transaction or analytics capability was
activated.

Task 7.3 adds the portable public-content catalogue and fail-closed lifecycle resolver. Task 7.5
adds the framework-neutral runtime source and migrates the identified consumers, but do not describe
the website as exhaustively drift-proof until Task 7.6 completes cross-channel, withdrawal, version
and rollback evidence. The catalogue/source is version-controlled code, not a live CMS or database,
and contains no patient/private workflow state.

Task 7.4 completes the portable claim register and fail-closed claim publication validator; Task 7.5
binds the runtime source and three replacements. Of 31 variants, 28 remain pending evidence and three
are rejected history. Do not describe retained wording as domain-approved: all 28 retained active
variants remain pending evidence even though the source is now drift-tested. TD-006 and TD-007
remain In progress; TD-040, TD-046 and TD-047 are Verified at their repository boundaries.

## Sprint 07 MCP Boundary

Task 7.10 re-proves that MCP remains absent from deployable files, dependencies, generated routes,
production output and local/hosted protocol paths. The retained `/.mcp` security prefix is only a
defensive denial rule, and `future-public-mcp` is only an inactive content-governance channel.
Neither is an MCP implementation.

Do not describe an MCP server, AI assistant, public tool, private tool or clinical agent as present
or approved. A future public proposal is limited initially to separately approved read-only
canonical public content. Account, intake, support, clinical, payment, order, fulfilment and
workforce tools require a distinct threat model and scoped identity/authorisation, consent or other
authority, audit, monitoring, data-lifecycle, human-review, domain-approval and release evidence
before any implementation begins. TD-047 and TD-048 remain Verified absence decisions.

## Sprint 07 Validation and Approval Boundary

Task 7.11 passes the complete local CI-equivalent, database, browser, audit, build, dry-run,
measurement, request-security, and MCP-absence matrix. This proves the implemented inactive
boundaries; it does not convert repository-owner decisions into clinical, legal, pharmacy,
privacy/security, or production-release approval.

Twenty-eight retained claim variants still require their named domain evidence and approvals.
Measurement remains disabled until an approved public consent interface and explicit
privacy/security release approval exist. The owner pushed the Task 7.11 state, confirmed GitHub CI,
deployed the required Worker runtime secret and clock-skew correction, and passed the guarded hosted
intent proof. The decoder permits a bounded 60-second future `issuedAt` tolerance for
distributed-runtime drift while retaining the 30-minute expiry and fail-closed tamper and
malformed-state checks. Never record the key or cookie value in source, documentation, logs, or
workflow output.

## Retrieval Response Pattern

When answering a question that touches an unresolved area:

1. State what is observed now.
2. State the owner-confirmed target separately.
3. Identify the open decision or debt ID.
4. Avoid filling gaps with assumptions.
5. Point to the authoritative source and date.

For example: “The interface currently simulates consent in browser state (observed). Versioned durable consent is required for the intended platform (target). Its wording, owner, storage, and withdrawal workflow remain unresolved under TD-002, TD-009, TD-012, and TD-016.”
