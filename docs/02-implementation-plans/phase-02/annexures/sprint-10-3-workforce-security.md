---
annexure_id: phase-02-sprint-10-3-workforce-security
title: Sprint 10.3 — Individual Workforce Authentication and Context
status: verified-local
last_updated: 2026-10-03
owner: "@Muhns13G"
---

# Sprint 10.3 — Individual Workforce Authentication and Context

## Mission and Implemented Scope

Build the individual workforce entry boundary agreed in Task 10.1 on the Task 10.2
persistence baseline committed at `c93d6d0`. `/staff/sign-in` now supports invitation-code or
existing-account email-code verification, authenticator enrollment/challenge, session resumption,
bounded renewal, sign-out and narrowly authorised staff invitations. Public website messaging
is unchanged. The read-only assigned queue remains Task 10.4 work. Patient invitations retain
the governed Sprint 9 service/helper; a new dispatch UI is not part of Task 10.4's read-only scope.

Email verification creates only a ten-minute encrypted MFA-setup cookie. It grants **no**
application session or case access. An existing verified TOTP factor is reused, never reset by
email. Successful TOTP must produce provider AAL2 before an application session is issued.
Lost-factor recovery remains a separately governed administrator process; this screen cannot
unenroll factors or reset MFA. Abandoned enrollments cannot silently replace verified factors.

Live provider identity, Auth session, stable subject/contact, active tenant and independently
approved, time-limited membership determine tenant, role and purpose on the server. Ambiguous
multiple workforce memberships fail closed. Browser role/tenant/purpose/assurance fields are
rejected. Every protected read/action rechecks these records and the exact AAL2 application
session; membership suspension, provider revocation, role/class changes or expiry deny access.
Ordinary workforce sessions retain 15-minute idle/eight-hour absolute limits; admin/release
sessions retain ten-minute/four-hour limits. Renewal never resets absolute expiry.

The separate `__Host-meneer-workforce` cookie is encrypted with distinct authenticated data,
Secure, HttpOnly, SameSite=Strict and host-only. Tokens stay out of response JSON, browser storage
and URLs. Enrollment material appears only in the private setup response/screen and is removed
after verification. Staff responses are no-store/no-referrer/noindex; robots excludes `/staff/`.

## Invitation Governance and Bootstrap

Inviting does not create a role or approve membership. Before an initial staff invitation, an
independent authorised administrator must provision/review the stable subject, verified contact
and bounded workforce membership. The inviter requires an active privileged admin session,
TOTP within five minutes, and a target-specific `identity_contact` assignment for
`security_administration`. Self-invitation and ordinary operations-user invitation are denied.
The first administrator must be independently provisioned, not self-registered through this UI.
For an existing provider account, use sign-in rather than attempting a new provider invitation.

Migration `20261003205329_workforce_security_context.sql` adds three server-only RPCs and
deny-default `workforce_invitation_dispatches`. No application role has direct table access.
The immutable journal stores opaque actor/target/tenant IDs, request key, contact digest,
timestamps and `prepared`/`accepted`/`uncertain` status, not email bodies or health information.
Reservation precedes provider submission; replay, parallel/unresolved work and immediate resend
are rejected. `accepted` means provider acceptance, **not** delivery or staff activation. An
ambiguous failure remains `uncertain`; do not blindly retry or delete its evidence. Alerting and
operator reconciliation are owned by Task 10.7. No real staff invitation has been sent here.

## Validation

- Clean local replay of all 23 migrations; 685 pgTAP assertions across 18 files pass, including
  44 workforce scope, AAL2, recent-MFA, expiry, replay and immutable-dispatch assertions.
- `test:workforce` exercises disposable local Auth identities: email-only denial, real TOTP/AAL2,
  real-size encrypted cookie round-trip, server-derived operations role, bounded renewal,
  operations invitation denial, membership revocation and sign-out. Exact fixture cleanup passes.
- Existing `test:auth`, `test:authz` and the 157-assertion `test:identity:security` packet pass;
  database lint reports no errors. The new local-only command is included in CI.
- All 498 unit/component/HTTP/repository checks across 82 files, strict TypeScript, lint/format, production build,
  client-bundle/MCP checks, discovery/portability and generated Worker binding checks pass.
  Both dependency audits report no advisories; Cloudflare upload dry-run passes without deploying.
- Visible managed Chromium verifies rendering, keyboard focus, absent runtime errors and home
  navigation. All 160 desktop/mobile Playwright checks pass, including staff axe checks, indexing and anonymous denial.
  These checks do not constitute a hosted workforce session or mailbox-delivery exercise.

## Changed Files

| Kind      | Files / boundary                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| New       | Workforce session service and tests; Supabase workforce-context repository and tests; staff HTTP handler/tests and encrypted cookie module. |
| New       | `WorkforceSignInPage.tsx` and tests; `staff.sign-in.tsx`; `e2e/workforce.spec.ts`; local workforce integration script.                      |
| New       | Workforce security migration, rollback-only SQL test packet and this evidence annexure.                                                     |
| Modified  | Managed identity provider/port, server routing, request/response security, discovery policy/robots and discovery browser test.              |
| Modified  | `package.json`, CI, `AGENTS.md`, Sprint/phase plans, debt registry and derived RAG/index.                                                   |
| Generated | `src/routeTree.gen.ts` through the framework build, not manual editing.                                                                     |

## Decisions, Lessons and Remaining Gates

No mission deviation or new debt ID. Existing identity/session/provider infrastructure was reused;
Supabase/Postgres guidance informed narrow RPCs, explicit ACLs, immutable dispatch and clean replay.
React/browser guidance informed focus, live status and private-screen checks. The generated SQL
diff needed explicit revokes to preserve deny-default Supabase defaults. Tests retain session-cap
constraints rather than weakening them to manufacture an expired fixture.

This is **local implementation completion**, not hosted staff activation. Hosted still has the
previously verified 21-migration checkpoint; both Sprint 10 migrations need separate owner approval
and hosted proof. No hosted configuration, identity, email, clinical/payment workflow or deployment
was changed. Before staff use, independently approve memberships/assignments, confirm hosted Auth
OTP templates and redirect allowlisting for the staff entry, apply/rehearse the migrations, and
verify disposable invitation delivery, TOTP, bounded session and revocation against the actual
Worker. Existing server bindings are reused; no new public environment variable or client SDK
credential is introduced. Tasks 10.4–10.10, TD-009/TD-043 and existing activation gates remain.
Break glass stays unavailable; authentication grants no unassigned case or clinical authority.
