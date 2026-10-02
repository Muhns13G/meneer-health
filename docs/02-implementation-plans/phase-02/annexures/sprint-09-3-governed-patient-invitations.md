---
evidence_id: phase-02-sprint-09-3-governed-patient-invitations
title: Governed Patient Invitation Boundary
status: completed-locally
task: 9.3
observed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-009]
---

# Sprint 09.3 — Governed Patient Invitations

## Implemented boundary

`20261002205048_governed_patient_invitations.sql` makes a staff reservation the only server-role
insertion path. A reservation requires a current AAL2 workforce session, active subject, active
operations membership, active tenant, and a time-bounded `identity_contact` assignment for that
tenant with `operations` purpose. It binds one patient-only invitation to a SHA-256 normalized email
digest, staff subject, request key, and expiry between 10 minutes and seven days. The database
serializes reservations per tenant, permits at most ten staff attempts per hour and three attempts
per contact digest per day, and rejects an existing pending contact or repeated request key. Expired
pending rows become terminal. A trigger rejects reopening a terminal invitation and rejects
acceptance before provider delivery or after expiry.

The server-only invitation service verifies the staff provider token and AAL2 before deriving the
session ID; a caller cannot supply that ID directly. It reserves before provider delivery, uses a fixed first-party
`/account/verify` redirect under `meneerhealth.co.za`, binds the provider subject only after
success, and marks failed provider calls revoked. Failed binding never reports success or retries
delivery automatically. Reservation and delivery transitions append safe, contact-free audit
facts. The old direct-insert application path was removed.

## Evidence and activation limits

Local reset applied all migrations; 391 pgTAP assertions pass, including direct-browser denial,
cross-tenant, purpose, session, expiry, replay, terminal-state and rate tests. The synthetic Auth integration,
330 Vitest assertions, TypeScript, ESLint, formatting, portability, database lint, and production
build pass. The invitation helper has **no route or staff UI caller**. No real
email was sent, hosted Supabase was not changed, and the hosted pilot tenant remains suspended.
Task 9.4 must approve the code-entry template and verification route before invitation delivery is
exposed; current provider invitation delivery may use a link, so this service must remain dormant.
Task 9.9 must repeat provider and hostile-path evidence in a hosted synthetic environment.

Sources: the [9.1 contract](sprint-09-1-identity-profile-consent-contract.md), current Supabase
[admin invitation](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail),
[rate limits](https://supabase.com/docs/guides/auth/rate-limits), and
[RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).
