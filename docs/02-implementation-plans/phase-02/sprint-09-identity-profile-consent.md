---
plan_id: phase-02-sprint-09
title: Invite-Only Identity, Client Profile, Consent, and Portal
status: planned
primary_debt: [TD-009, TD-037, TD-038]
depends_on: [phase-02-sprint-08, DR-005, DR-007, DR-012, DR-014]
last_updated: 2026-10-02
owner: "@Muhns13G"
---

# Sprint 09 — Invite-Only Identity, Client Profile, Consent, and Portal

## Mission

Implement the minimum authenticated client boundary without opening public registration or
collecting clinical intake. A verified invitee must be able to establish identity, maintain the
approved non-clinical profile, accept the exact approved legal versions and view a trustworthy
pilot status.

## Commit-Sized Task Plan

| Task | Commit-sized outcome                                                                                                                   | Gate                | Status  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------- |
| 9.1  | Freeze identity/profile/consent contracts, state transitions, route policy and threat model.                                           | TD-009              | Planned |
| 9.2  | Add portable migrations for approved profile fields, immutable acknowledgement/consent evidence and lifecycle history with RLS.        | TD-009              | Planned |
| 9.3  | Implement staff-created, expiring, single-use invitations with rate, replay, tenant and purpose controls.                              | Identity activation | Planned |
| 9.4  | Implement the Meneer-owned confirmation/OTP boundary; never expose provider tokens to tracking or unsafe redirects.                    | FC-001              | Planned |
| 9.5  | Implement authenticated session establishment, renewal, sign-out, expiry, revocation and recovery using existing identity ports.       | Identity activation | Planned |
| 9.6  | Implement the accessible client profile and versioned acknowledgement/consent flow with durable false-success prevention.              | TD-037, TD-038      | Planned |
| 9.7  | Add an authenticated client portal showing only approved profile, consent and non-clinical workflow status.                            | Portal boundary     | Planned |
| 9.8  | Implement correction, export and account-support request entry points without ordinary-email sensitive payloads.                       | Data rights         | Planned |
| 9.9  | Prove cross-tenant, wrong-role, stale/replayed invite, session, direct-endpoint and audit boundaries locally and hosted-synthetically. | Security            | Planned |
| 9.10 | Reconcile evidence and issue the Sprint 09 completion report.                                                                          | All                 | Planned |

## Acceptance Gate

- Public sign-up remains disabled; only authorised invitations create a pilot identity.
- Browser code never receives a service-role credential or controls tenant/role authority.
- Profile and consent records are durable, versioned, auditable and idempotent.
- No clinical questionnaire, diagnosis, prescription or protocol content enters Meneer.
- The user never sees success before the committed server transaction succeeds.

## Validation

Run unit/component tests, local Supabase identity and RLS suites, hosted synthetic invitation and
recovery exercises, session-revocation checks, accessibility automation, keyboard/screen-reader
review, malicious redirect/replay tests, full Playwright and CI validation.
