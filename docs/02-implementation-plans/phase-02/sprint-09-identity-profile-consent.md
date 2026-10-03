---
plan_id: phase-02-sprint-09
title: Invite-Only Identity, Client Profile, Consent, and Portal
status: completed-with-activation-gates
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

| Task | Commit-sized outcome                                                                                                                   | Gate                | Status                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------- |
| 9.1  | Freeze identity/profile/consent contracts, state transitions, route policy and threat model.                                           | TD-009              | Completed at contract level      |
| 9.2  | Add portable migrations for approved profile fields, immutable acknowledgement/consent evidence and lifecycle history with RLS.        | TD-009              | Completed locally                |
| 9.3  | Implement staff-created, expiring, single-use invitations with rate, replay, tenant and purpose controls.                              | Identity activation | Completed locally                |
| 9.4  | Implement the Meneer-owned confirmation/OTP boundary; never expose provider tokens to tracking or unsafe redirects.                    | FC-001              | Completed locally                |
| 9.5  | Implement authenticated session establishment, renewal, sign-out, expiry, revocation and recovery using existing identity ports.       | Identity activation | Completed locally                |
| 9.6  | Implement the accessible client profile and versioned acknowledgement/consent flow with durable false-success prevention.              | TD-037, TD-038      | Completed locally                |
| 9.7  | Add an authenticated client portal showing only approved profile, consent and non-clinical workflow status.                            | Portal boundary     | Completed locally                |
| 9.8  | Implement correction, export and account-support request entry points without ordinary-email sensitive payloads.                       | Data rights         | Completed locally                |
| 9.9  | Prove cross-tenant, wrong-role, stale/replayed invite, session, direct-endpoint and audit boundaries locally and hosted-synthetically. | Security            | Completed — synthetic proof      |
| 9.10 | Reconcile evidence and issue the Sprint 09 completion report.                                                                          | All                 | Completed — owner commit pending |

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
No real publication or hosted activation was introduced. Task 9.7's
[local portal evidence](annexures/sprint-09-7-authenticated-client-portal.md) records the own-client
projection, fresh authority checks, exact receipts and private browser lifecycle. Task 9.9
retains hosted synthetic proof; live assistive-technology review remains an activation requirement.
Task 9.8's [local rights evidence](annexures/sprint-09-8-profile-correction-rights-entry.md)
records versioned name/preference correction and request-only data/account cases. Secure reviewed
fulfilment of export, restriction, closure and contact-change requests is not an automatic action
of these entry points; the operational channel/reconciliation release gates remain mandatory.
Task 9.9's [security evidence](annexures/sprint-09-9-security-hosted-proof.md) records applied hosted
migrations, 157 passing rollback-only database assertions and seven passing hosted HTTP denials
after deployment reconciliation. Code-only Auth templates and the approved six-digit/900-second
OTP policy are verified. The four Worker runtime bindings were provisioned under explicit owner
instruction and independently listed; anonymous denials passed again. Actual code-only invitation,
sign-in/recovery delivery, activation with nonbinding test documents, portal access, renewal,
logout, tamper/expiry denial and independent provider/application revocation now pass. Scoped
cleanup restored the empty identity baseline and all seven named audit/immutability triggers.
Task 9.9 is completed at the synthetic-proof boundary. The owner accepts retaining useful tracking
unless it harms authentication or production reliability. The observed invitation image does not
demonstrate such harm; code-only OTP consumption remains protected and FC-001 records the decision.
No real client, legal publication, clinical or payment workflow was activated.

Task 9.10 reconciles the [completion report](../../03-completion-reports/phase-02/sprint-09-identity-profile-consent.md),
complete Git-derived file inventory, residual debt and RAG routing. Sprint 09 closes at the verified
invite-only synthetic boundary, not a real-client release. TD-009, TD-037 and TD-038 retain their
external/operational and live-review acceptance gates. The owner commits this closeout and verifies
its GitHub CI; no remote run is inferred from local results.

Final closeout audit discovered TD-057: both dependency audit gates currently fail. Functional
implementation and evidence reconciliation are complete; a clean CI/security release is not.
Resolve the new advisory set in a dedicated, tested remediation task before normal Sprint 10
feature work or real-client activation. No dependency was upgraded during this closeout.

- Public sign-up remains disabled; only authorised invitations create a pilot identity.
- Browser code never receives a service-role credential or controls tenant/role authority.
- Profile and consent records are durable, versioned, auditable and idempotent.
- No clinical questionnaire, diagnosis, prescription or protocol content enters Meneer.
- The user never sees success before the committed server transaction succeeds.

## Validation

Run unit/component tests, local Supabase identity and RLS suites, hosted synthetic invitation and
recovery exercises, session-revocation checks, accessibility automation, keyboard/screen-reader
review, malicious redirect/replay tests, full Playwright and CI validation.
