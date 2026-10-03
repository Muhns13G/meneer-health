---
plan_id: phase-02-sprint-09
title: Invite-Only Identity, Client Profile, Consent, and Portal
status: in-progress
primary_debt: [TD-009, TD-037, TD-038]
depends_on: [phase-02-sprint-08, DR-005, DR-007, DR-012, DR-014, DR-015]
last_updated: 2026-10-03
owner: "@Muhns13G"
---

# Sprint 09 — Invite-Only Identity, Client Profile, Consent, and Portal

## Mission

Implement the minimum authenticated client boundary without opening public registration or
collecting clinical intake. A verified invitee must be able to establish identity, maintain the
approved non-clinical profile, accept the exact approved legal versions and view a trustworthy
pilot status.

## Commit-Sized Task Plan

| Task | Commit-sized outcome                                                                                                                   | Gate                | Status                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------- |
| 9.1  | Freeze identity/profile/consent contracts, state transitions, route policy and threat model.                                           | TD-009              | Completed at contract level |
| 9.2  | Add portable migrations for approved profile fields, immutable acknowledgement/consent evidence and lifecycle history with RLS.        | TD-009              | Completed locally           |
| 9.3  | Implement staff-created, expiring, single-use invitations with rate, replay, tenant and purpose controls.                              | Identity activation | Completed locally           |
| 9.4  | Implement the Meneer-owned confirmation/OTP boundary; never expose provider tokens to tracking or unsafe redirects.                    | FC-001              | Completed locally           |
| 9.5  | Implement authenticated session establishment, renewal, sign-out, expiry, revocation and recovery using existing identity ports.       | Identity activation | Completed locally           |
| 9.6  | Implement the accessible client profile and versioned acknowledgement/consent flow with durable false-success prevention.              | TD-037, TD-038      | Completed locally           |
| 9.7  | Add an authenticated client portal showing only approved profile, consent and non-clinical workflow status.                            | Portal boundary     | Planned                     |
| 9.8  | Implement correction, export and account-support request entry points without ordinary-email sensitive payloads.                       | Data rights         | Planned                     |
| 9.9  | Prove cross-tenant, wrong-role, stale/replayed invite, session, direct-endpoint and audit boundaries locally and hosted-synthetically. | Security            | Planned                     |
| 9.10 | Reconcile evidence and issue the Sprint 09 completion report.                                                                          | All                 | Planned                     |

## Acceptance Gate

Task 9.1's [contract and threat-model annexure](annexures/sprint-09-1-identity-profile-consent-contract.md)
is the implementation baseline for Tasks 9.2–9.9. It does not activate any route or instrument.
Task 9.2's [persistence evidence](annexures/sprint-09-2-profile-instrument-persistence.md)
records the local migration and deny-default tests. Hosted migration and client activation are
separate later gates.
Task 9.3's [invitation evidence](annexures/sprint-09-3-governed-patient-invitations.md) records
the staff-only reservation and local replay/rate proofs. Invitation delivery remains dormant
until hosted configuration and synthetic delivery are separately verified. Task 9.4's
[local OTP evidence](annexures/sprint-09-4-first-party-invitation-otp.md) proves a code-only
Mailpit delivery and the first-party route. It does not install the hosted template or open
staff invitation delivery, account activation, or an authorising session.
Task 9.5's [local session evidence](annexures/sprint-09-5-patient-session-lifecycle.md)
records code-only sign-in/recovery delivery, application-session expiry and revocation, and
noindex first-party pages. The hosted configuration and activated-account proof remain later gates.
Task 9.6's [local activation evidence](annexures/sprint-09-6-atomic-profile-acknowledgement.md)
records accessible exact-document rendering and an atomic profile/receipt/membership transaction.
No real publication or hosted activation was introduced. Tasks 9.7–9.9 retain portal, rights and
hosted synthetic proof; live assistive-technology review remains an activation requirement.

- Public sign-up remains disabled; only authorised invitations create a pilot identity.
- Browser code never receives a service-role credential or controls tenant/role authority.
- Profile and consent records are durable, versioned, auditable and idempotent.
- No clinical questionnaire, diagnosis, prescription or protocol content enters Meneer.
- The user never sees success before the committed server transaction succeeds.

## Validation

Run unit/component tests, local Supabase identity and RLS suites, hosted synthetic invitation and
recovery exercises, session-revocation checks, accessibility automation, keyboard/screen-reader
review, malicious redirect/replay tests, full Playwright and CI validation.
