---
evidence_id: phase-02-sprint-09-5-patient-session-lifecycle
title: Patient Session and Recovery Lifecycle
status: completed-locally
task: 9.5
observed: 2026-10-03
owner: "@Muhns13G"
related_debt: [TD-009]
---

# Sprint 09.5 — Patient Session and Recovery Lifecycle

## Implemented

First-party `/account/sign-in`, `/account/recover` and `/account/sign-out` pages and same-origin,
bounded POST handlers use Supabase email OTP behind the existing managed-identity port. Session
proof is encrypted with a distinct server-only 32-byte key in a host-only, Secure, HttpOnly,
SameSite=Strict cookie. No access or refresh token is returned in a URL or response body.

Sign-in requires a verified provider identity mapped to one active patient membership and tenant,
an active client profile, a latest `activated` lifecycle event, and current version-matched
account/privacy receipts. Without those committed records, no application session is issued.
Renewal checks the server-side session
before provider token rotation, then rechecks subject, membership, tenant and account evidence;
the existing 30-minute idle and 12-hour absolute limits still apply. Sign-out revokes the local
session before provider sign-out. Recovery uses a bounded governance case, verifies a code-only
recovery OTP, revokes all application/provider sessions and never signs the browser in implicitly.

## Local evidence and activation gates

Synthetic local Supabase/Mailpit delivery verifies both code-only email templates and rejects
public self-sign-up. Unit tests cover missing account evidence, suspended tenants, revoked or
expired sessions, renewal, sign-out, recovery and cookie tampering/expiry. Browser checks cover
desktop/mobile accessibility, noindex/no-store headers, meaningful rendering, error overlays,
console errors and forged-origin POST denial. The test filters only the known external-font CSP
message produced by its font-isolation helper.

The hosted Supabase email templates and `IDENTITY_SESSION_KEY_BASE64` Worker secret are not
installed by this task. The local email-provider setting allows invited users to receive OTP
while the global Auth sign-up gate remains disabled; hosted configuration needs separate review.
The hosted tenant remains suspended, the 9.2–9.3 migrations are not applied there, and no
profile/receipt activation or portal exists yet. Task 9.6 must implement the atomic account
activation; Task 9.9 must prove hosted synthetic session and denial paths before pilot use.
