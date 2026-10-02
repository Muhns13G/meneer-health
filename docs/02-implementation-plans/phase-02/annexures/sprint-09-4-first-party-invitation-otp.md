---
evidence_id: phase-02-sprint-09-4-first-party-invitation-otp
title: First-Party Invitation Code Boundary
status: completed-locally
task: 9.4
observed: 2026-10-03
owner: "@Muhns13G"
related_debt: [TD-009]
---

# Sprint 09.4 — First-Party Invitation Code Boundary

## Implemented

The local Supabase invite template sends a six-digit `{{ .Token }}` without an acceptance link,
token hash, redirect query or tracking pixel. The new noindex `/account/verify` page accepts only
email and code via same-origin POST. Its handler bounds the form, checks the origin and shared
request rate limiter, and fails closed without a separate 32-byte server key and Supabase server
configuration. It never returns the code, provider session or invitation details in a URL or body.

The server checks exactly one delivered, pending, unexpired patient invitation for a normalized
email digest before consuming the code. The installed Supabase Auth SDK's `type: "invite"` result is
then checked against a provider-verified email and the invitation's provider subject; a second
invitation read rejects revocation or supersession during verification. A mismatch revokes the
newly issued provider session. A successful proof is carried only in a ten-minute AES-GCM-encrypted,
host-only, Secure, HttpOnly, SameSite=Strict cookie. This is **not** an active membership or
authorising session; Tasks 9.5–9.6 must revalidate the provider session, invitation and tenant
before any account activation.

## Evidence and remaining gates

A synthetic local Auth invitation delivered the code-only template through Mailpit. Verifying that
code with `verifyOtp({ email, token, type: "invite" })` succeeded and returned a session; the
delivered body contained no usable token URL. The actual server adapter consumed a second
synthetic code and verified the matching provider subject/email; both synthetic Auth users were
removed afterward. Unit tests cover wrong contact/subject, absent and superseded invitation,
malformed and cross-origin requests, missing key, cookie tamper and expiry. The 345-test Vitest
suite, synthetic Auth integration, production build, TypeScript, ESLint, formatting, portability,
and public discovery checks pass. The existing desktop/mobile Playwright matrix passed 120/120;
the new desktop/mobile verification and forged-origin checks passed 4/4. No real email was sent.

The hosted invite template, Brevo tracking/rewrite policy, Task 9.3 hosted migration, new Worker
secret and synthetic hosted delivery have **not** been changed or verified. Staff invitation
delivery remains unrouted. The hosted tenant remains suspended. Account setup, session renewal,
sign-out, profile, transactional instruments and portal remain closed. Task 9.9 owns hosted proof;
no pilot activation follows from this local checkpoint.

Sources: [Sprint 09.1 contract](sprint-09-1-identity-profile-consent-contract.md), Supabase
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates) and
[OTP verification](https://supabase.com/docs/reference/javascript/auth-verifyotp).
