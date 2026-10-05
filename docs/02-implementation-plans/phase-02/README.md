---
plan_id: phase-02-minimum-pilot-enablement
title: Phase 02 Minimum Pilot Enablement
status: in-progress
last_updated: 2026-10-04
owner: "@Muhns13G"
depends_on: [phase-01-technical-debt-stabilisation, DR-010]
---

# Phase 02 — Minimum Pilot Enablement

## Current Intake Amendment

[DR-018](../../07-decisions/DR-018-meneer-hosted-medical-intake.md) selects protected first-party
medical intake using Mikhail's questionnaire, approved unchanged by Dr Zee according to the owner.
Blood results are not mandatory for onboarding/submission, including peptides; clinicians may
request tests later. The questionnaire is separate from the minimal account profile. Protocol
generation/clinical decisions remain external, with purpose-bound manual staff transfer.

The [Sprint 10 intake packet](annexures/sprint-10-medical-intake-amendment.md) adds eight tasks
`2.10.I1`–`2.10.I8` after the existing 10.7/10.8 slices and before revised 10.9/10.10 closure.
External-only statements in historical checkpoints below are superseded for this selected path.
Existing external-link code stays inactive; the actual provider intake URL is no longer a required
activation input for first-party intake. No questionnaire code or hosted collection is yet enabled.

## Mission

Sprint 09 is committed with activation gates at `daf1927`. Newly discovered TD-057 is now
Verified through bounded updates, clean audits and regression; see the
[remediation evidence](../../01-audits/td-057-dependency-remediation-2026-10-03.md).
Owner commit `1b41ed49` and exact-commit CI run `37138262125` passed. Sprint 10.1's
[staff queue contract](annexures/sprint-10-1-staff-queue-handoff-contract.md) is complete at the
design boundary. Task 10.2's [persistence boundary](annexures/sprint-10-2-staff-queue-persistence.md)
adds eight locally verified deny-default tables and portable records. Task 10.3's
[workforce boundary](annexures/sprint-10-3-workforce-security.md) implements individual staff
entry, TOTP/AAL2, server-derived context and governed invitation dispatch locally. Task 10.4's
[assigned queue](annexures/sprint-10-4-assigned-queue-projection.md) adds the locally verified read-only
queue and masked detail. Task 10.5's [claimed commands](annexures/sprint-10-5-claimed-queue-commands.md)
add reservations, version/replay guards, atomic audit, coded pause and pre-delivery cancellation.
Task 10.6's [manual command boundary](annexures/sprint-10-6-manual-handoff-commands.md) adds
locally verified attempts, independent evidence reconciliation, acknowledgement and safe retry/
cancellation, owner-approved authenticated portal issuance, tenant-bound administrator destination
approval and separate assigned-reviewer evidence ingestion. Local Task 10.6 is complete; actual
intake URL/configuration, recipient approval and hosted proof remain activation gates, alongside
Sprint 11's deposit adapter. Task 10.7's [audit/alert packet](annexures/sprint-10-7-operations-audit-alerts.md)
adds locally verified central audit, generic Brevo dispatch with bounded retries, private alert review
and explicit AAL2 administrator acknowledgement/resolution. Task 10.7 is completed locally; hosted
scheduled email acceptance remains a release gate after a locally corrected Workers redirect defect.
The hosted RPC/provider rehearsal passed real MFA, owner-confirmed receipt and scripted synthetic
response/revocation with the baseline restored. Tasks 10.9–10.10
remain planned.
All seven Sprint 10 migrations were applied hosted with explicit owner approval on 4 October 2026;
no seeds or roles were imported and the suspended empty baseline remains. Alert delivery/response
was additionally exercised through deployed Cron and routed administrator endpoints. Cron retained
an uncertain send because Workers rejected `redirect: "error"`; the adapter now uses `manual`.
The owner must deploy this fix and repeat successful scheduled email/receipt proof. The approved
temporary configuration was restored to disabled mode and the empty suspended baseline was verified.
The subsequent authorised corrected Cron retest passed: one accepted send and Brevo-reported delivery
at 14:41 SAST on 4 October 2026. Owner-confirmed receipt on 5 October formally closes Task 2.10.7;
disabled mode and baseline were restored. Earlier release-pending statements are historical checkpoints.
Real-client activation is still subject to the seven
existing clinical, commercial and operational acceptance gates.

Task 10.8's [own-client progress packet](annexures/sprint-10-8-client-case-progress.md) is completed
locally: strict three-field coarse case status, central read audit and private portal display reuse
existing account authority and expiry/data-clearing controls. Full local SQL, Vitest and portal
desktop/mobile tests pass. The new migration and hosted own-client release proof remain separately
approved gates; do not deploy its RPC consumer before applying the migration. Next implement the
DR-018 intake stream I1–I8, then the expanded 10.9 rehearsal and 10.10 closure.

Turn the completed secure inactive foundation into the smallest complete, invite-only pilot system.
The pilot must onboard a client, preserve a minimal non-clinical profile and versioned consent,
accept an approved one-time payment, place the case in a least-privilege staff queue, and record a
manual auditable hand-off to the separate protocol portal.

Phase 02 does not select or begin a framework migration. The TanStack/Cloudflare v1 remains the
delivery shell while pilot behaviour is proven. DR-018 now plans first-party medical questionnaire
collection. Protocol content, diagnosis, prescribing and dispensing authority remain external;
medical answers belong only in the new protected module and approved manual transfer.

Task 8.1 began Phase 02 on 2 October 2026 by freezing the exact repository/hosted baseline, Sprint
08 sequence and non-goals. It introduced no runtime or hosted mutation.

Task 8.2 and DR-011 originally verified TD-007 through scope removal. DR-013 now supersedes that
product exclusion and permits the confidential Precise Wellness schedule to define a gated
candidate catalogue. TD-007 is therefore In progress again until product authority and the complete
clinical, pharmacy and fulfilment pathway are independently verified. Seven transferred items are
non-Verified.

Task 8.3 and DR-012 assign the product-neutral responsibility boundary without publishing private
role holders. DR-013 subsequently adds the intended Precise-Wellness-to-Meneer dispensing/custody
direction, which remains a verified-before-activation dependency. TD-007, TD-009 and TD-043 remain
open for the listed external evidence, agreements and channels.

## Reconciled Starting Point

Sprint 08 is completed with activation gates after Task 8.10 reconciles its decisions, hosted
baseline and evidence. The [completion report](../../03-completion-reports/phase-02/sprint-08-pilot-activation-contract.md)
records the superseded product exclusion, contract-level completion and seven remaining debts.
Sprint 09.1 has frozen the identity/profile/instrument state, route and threat-model contract in
its [annexure](annexures/sprint-09-1-identity-profile-consent-contract.md). Sprint 09.2 added
the [local portable persistence boundary](annexures/sprint-09-2-profile-instrument-persistence.md),
Sprint 09.3 added a [governed invitation reservation](annexures/sprint-09-3-governed-patient-invitations.md),
and Sprint 09.4 added a [local first-party code boundary](annexures/sprint-09-4-first-party-invitation-otp.md).
Those were local checkpoints; Task 9.9 subsequently applied all five Sprint-9 migrations, verified
code-only hosted delivery and provider/application sessions, then removed approved disposable
fixtures. Sprint 09 closes with the profile, exact-document activation, portal and correction/
rights entry implemented and synthetically verified. See the
[Sprint 09 completion report](../../03-completion-reports/phase-02/sprint-09-identity-profile-consent.md).
The hosted baseline now has 21 migrations, one suspended pilot tenant and no Auth/client records;
no real client account capability is active.
Final external schedules and rendered domain approvals remain required before activation.

- Phase 01 is closed under DR-010 with 49 of 56 debt items Verified.
- TD-006, TD-007, TD-009, TD-010, TD-037, TD-038 and TD-043 transfer unchanged as activation gates.

Task 8.4 is complete at the decision/evidence level. DR-013 approves free entry, a R999 review
deposit credited to the first approved order, Precise Wellness schedule RRP, VAT-inclusive
planning, separately charged delivery, Meneer as the Stripe merchant brand, OCTOTHORP ZA as the
current legal seller/invoice issuer, manual purchases and the exception/refund model. The
confidential schedule remains outside Git and is identified by hash. TD-010 remains In progress for
private catalogue/rate implementation, domain approvals, terms, Stripe sandbox and exception proof.

Task 8.5 and DR-014 approve the minimum non-clinical client profile, purposes, classifications,
retention, rights treatment and staff visibility. The profile is limited to given/family name,
managed verified email, mobile/WhatsApp, operational contact preference and server-owned identity/
lifecycle facts. Health, product, address, credential and free-text data are excluded. TD-009
remains In progress; TD-037 and TD-038 remain Open pending routed implementation and live review.

Task 8.6 and DR-015 approve distinct, versioned account terms, transactional privacy-notice
acknowledgement, order-specific terms and recipient-specific hand-off authorisation contracts.
Marketing and clinical consent are not bundled. The instrument set remains inactive until verified
supplier, channel and external-provider schedules, domain approvals and later-sprint implementation
exist. TD-009 and TD-010 remain In progress; TD-037 and TD-038 remain Open.

Task 8.7 and DR-016 approve the `privacy@`, `complaints@` and `clinical@` Meneer aliases, their
purpose boundaries and a fail-closed activation checklist. Brevo accepted one payload-free
synthetic message per alias and the owner confirmed all three arrived. No fixed operating hours are
promised; the approved target is to answer within 24 hours where possible. Task 8.7 is complete at
decision/delivery-evidence level. Sprint 12 must still prove routed handling, alternates, failure
detection, escalation and fallback before TD-043 can close or public unavailable wording can
change.

Task 8.8 and DR-017 complete the authorised synthetic protocol-portal investigation. A signed-out
provider-linked intake and authenticated three-step provider intake were verified, and the latter
generated a persistent pending protocol with review/editor and PDF-download controls. No supported
API, webhook or machine export was visible. A dashboard/library status mismatch and inconsistent
dose rounding require provider resolution and clinician verification. Sprint 10 therefore retains
a staff-mediated, auditable minimum-data hand-off; TD-009 remains In progress for the exact external
parties, agreements, authority and implemented reconciliation boundary.

Task 8.9 completes the authorised hosted synthetic reset and establishes the clean pilot database
baseline. All 16 committed migrations are in exact local/remote parity without hosted seed data.
The project contains one suspended `meneer-pilot` tenant, 12 migration-defined provider gates, zero
Auth users and zero operational/audit records. Anonymous access fails closed; inactive API,
measurement and retired-MCP probes pass. Advisor output contains informational deny-all RLS and
pre-traffic index notices only; no warning or error was reported.

- Hosted Supabase contains the clean 21-migration foundation, one suspended pilot tenant, no Auth
  users or operational records, and no local synthetic seed data.
- Public sign-up is disabled and the public site remains non-transactional.
- Stripe Checkout, signed webhooks, payment reconciliation and fulfilment contracts exist only as
  inactive/test-mode foundations; the hosted payment routes are disabled.
- The protocol portal is a separate professional system. Authenticated provider and patient-link
  capabilities are verified, but no supported API, webhook or governed Meneer integration exists;
  the pilot therefore uses a manual minimum-data bridge.
- The local unit, browser, accessibility, portability, discovery and configured opaque-intent checks
  pass. This is implementation evidence, not pilot release approval.

## Sprint Sequence

| Sprint | Mission                                                                                                                | Primary gates                          | Depends on    |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------- |
| 08     | Freeze the pilot operating, product, commercial, data and support contract and prepare a clean hosted baseline.        | TD-006, TD-007, TD-009, TD-010, TD-043 | DR-010        |
| 09     | Implement invite-only identity, a minimal client profile, durable acknowledgement/consent and the client portal.       | TD-009, TD-037, TD-038                 | Sprint 08     |
| 10     | Implement the least-privilege staff queue and manual audited protocol hand-off.                                        | TD-009, TD-043                         | Sprint 09     |
| 11     | Activate approved Stripe sandbox Checkout, payment/refund exceptions and reconciliation within the real pilot journey. | TD-010                                 | Sprints 08–10 |
| 12     | Complete notifications, support routing and live accessibility verification for the enabled journeys.                  | TD-037, TD-038, TD-043                 | Sprints 09–11 |
| 13     | Rehearse the complete synthetic pilot, reconcile evidence and make an explicit pilot go/no-go decision.                | All Phase 02 gates                     | Sprints 08–12 |

## Delivery Rules

1. Commit after each numbered task; keep implementation, tests and directly related evidence in the
   same commit.
2. Preserve deny-by-default preview and production gates until the relevant sprint acceptance
   evidence passes and the repository owner explicitly activates the capability.
3. Use synthetic identities and transactions until Sprint 13 authorises a controlled pilot.
4. Store no health information in URLs, logs, payment metadata, ordinary email or general queue/
   profile records. DR-018 permits planning a separate protected medical questionnaire module;
   enable it only after its field/access/processing contract and verification are complete.
5. Use opaque references across Stripe, the protocol portal and operational notifications.
6. Do not mark transferred debt Verified merely because enabling code exists. Apply the registry's
   original external evidence and live-review requirements.
7. Record every material operating, data, commercial or release decision before implementing the
   dependent capability.
8. The repository owner alone pushes, deploys, promotes, rolls back or changes hosted production
   configuration.

## Phase Completion Gate

Phase 02 completes only when one synthetic invited client can traverse the entire minimum pilot
journey with durable evidence and no false success; staff permissions and manual hand-off are
verified; Stripe test-mode payment and exception paths reconcile; support and accessibility gates
pass; and the owner records an explicit pilot go/no-go decision. Completion does not approve public
launch, live Stripe mode, unverified peptide products, unsupported claims or framework migration.

## Required Closure Artefacts

Each sprint must produce a completion report under `docs/03-completion-reports/phase-02/` covering
mission, delivered work and decisions, deviations, lessons, new or discovered debt, validation,
residual risk, and separate tables for existing files changed/deleted and files created. Update the
technical-debt registry and RAG corpus only when evidence changes their authoritative state.
