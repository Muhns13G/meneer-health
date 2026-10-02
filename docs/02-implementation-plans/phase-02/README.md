---
plan_id: phase-02-minimum-pilot-enablement
title: Phase 02 Minimum Pilot Enablement
status: planned
last_updated: 2026-10-02
owner: "@Muhns13G"
depends_on: [phase-01-technical-debt-stabilisation, DR-010]
---

# Phase 02 — Minimum Pilot Enablement

## Mission

Turn the completed secure inactive foundation into the smallest complete, invite-only pilot system.
The pilot must onboard a client, preserve a minimal non-clinical profile and versioned consent,
accept an approved one-time payment, place the case in a least-privilege staff queue, and record a
manual auditable hand-off to the separate protocol portal.

Phase 02 does not select or begin a framework migration. The TanStack/Cloudflare v1 remains the
delivery shell while pilot behaviour is proven. Health intake, protocol content, diagnosis,
prescribing and dispensing remain outside Meneer unless a later approved integration explicitly
changes that boundary.

## Reconciled Starting Point

- Phase 01 is closed under DR-010 with 49 of 56 debt items Verified.
- TD-006, TD-007, TD-009, TD-010, TD-037, TD-038 and TD-043 transfer unchanged as activation gates.
- Hosted Supabase contains the expected 33-table foundation, no Auth users or operational records,
  and only synthetic/bootstrap state requiring a controlled reset before pilot use.
- Public sign-up is disabled and the public site remains non-transactional.
- Stripe Checkout, signed webhooks, payment reconciliation and fulfilment contracts exist only as
  inactive/test-mode foundations; the hosted payment routes are disabled.
- The protocol portal is a separate professional system. No authenticated API, webhook or governed
  Meneer integration has been verified, so the pilot uses a manual minimum-data bridge.
- The local unit, browser, accessibility, portability, discovery and configured opaque-intent checks
  pass. This is implementation evidence, not pilot release approval.

## Sprint Sequence

| Sprint | Mission                                                                                                                | Primary gates                          | Depends on    |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------- |
| 08     | Freeze the pilot operating, product, commercial, data and support contract and prepare a clean hosted baseline.        | TD-006, TD-007, TD-009, TD-010, TD-043 | DR-010        |
| 09     | Implement invite-only identity, a minimal client profile, durable acknowledgement/consent and the client portal.       | TD-009, TD-037, TD-038                 | Sprint 08     |
| 10     | Implement the least-privilege staff queue and manual audited protocol hand-off.                                        | TD-007, TD-009, TD-043                 | Sprint 09     |
| 11     | Activate approved Stripe sandbox Checkout, payment/refund exceptions and reconciliation within the real pilot journey. | TD-010                                 | Sprints 08–10 |
| 12     | Complete notifications, support routing and live accessibility verification for the enabled journeys.                  | TD-037, TD-038, TD-043                 | Sprints 09–11 |
| 13     | Rehearse the complete synthetic pilot, reconcile evidence and make an explicit pilot go/no-go decision.                | All Phase 02 gates                     | Sprints 08–12 |

## Delivery Rules

1. Commit after each numbered task; keep implementation, tests and directly related evidence in the
   same commit.
2. Preserve deny-by-default preview and production gates until the relevant sprint acceptance
   evidence passes and the repository owner explicitly activates the capability.
3. Use synthetic identities and transactions until Sprint 13 authorises a controlled pilot.
4. Store no questionnaire answer, diagnosis, protocol, prescription or other health information in
   URLs, payment metadata, ordinary email or the Meneer pilot database.
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
