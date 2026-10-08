---
plan_id: phase-02-sprint-14-6
title: Mobile Invitation Redemption and Email Capture
status: completed-local-redemption-boundary
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Task 2.14.6 — Mobile Redemption

## Scope and Release Boundary

Builds on committed 14.5 at `0e44fea`. Adds deliberate redemption, immutable email binding and
decline, not account creation. All work is local. No hosted migrations, credential provisioning,
settings, real SMS/email, Git staging, commit, branch switch or deployment occurred. Defaults
remain disabled. The real pilot and Sprint 13 launch blockers are unchanged.

14.7 still owns governed email invitation delivery, six-digit/900-second verification, verified
conversion and operational retention sweeping. 14.8 owns the full security/manual acceptance
packet; 14.9 owns separately approved hosted/provider proof. Saving email is not verified contact,
marketing/clinical consent or an authenticated account.

## Participant and HTTP Boundary

`/mobile-invitation` is a standalone server document outside the marketing React/router shell.
Its nonce-authorised head script strips the fragment synchronously before form parsing. GET/HEAD
never consume, exchange or decline a bearer. No server-provided bearer, contact or roster is
embedded in HTML. Its restrictive CSP allows only nonce script/style and same-origin connections;
there are no third-party fonts, assets, analytics or persistent browser storage. Responses are
no-store/no-referrer/noindex. JavaScript-disabled visitors get support guidance, not an insecure
fallback. No generated route tree is necessary for this server-intercepted document.

Explicit Continue POSTs the bearer and one opaque request UUID. Only its SHA-256 digest reaches
SQL. A successful exchange returns a sealed `__Host-meneer-mobile-claim` cookie: Secure,
HttpOnly, SameSite=Strict, Path=/, bounded to 15 minutes or remaining invitation lifetime.
The browser gets disposition, original deadline and email-bound boolean only, no record IDs or
contact values. This is not an Auth/session cookie. Subsequent read/bind/cookie decline recheck
authoritative token, version, invitation and claim state; cookie expiry alone is not authority.

`MOBILE_INVITATIONS_REDEMPTION_MODE=disabled` and optional
`MOBILE_INVITATION_CLAIM_KEY_BASE64` are catalogue/example entries. Enabling requires the exact
tenant and a separate random 32-byte server key; no existing keys are reused or generated here.
HKDF purpose separation derives independent AES-GCM sealing and HMAC resume keys. The resume
secret is bound to tenant, bearer digest and request UUID; only its digest is stored in SQL.
An exact explicit interrupted retry can recover the same claim and cookie without persisting raw
secrets or extending expiry. Different requests/tenants/keys cannot recover it. Reload with a
cookie resumes through explicit read; losing both cookie and transient request leaves the active
claim protected until expiry, then the original valid link can be reopened.

All mutations require canonical host, exact origin, bounded POST form encoding, strict fields,
duplicate-field rejection and IP plus bearer-digest rate controls. No client tenant, record ID,
deadline or version is accepted. Bad/expired/revoked/superseded paths expose generic unavailable;
dependencies return 503 without raw error disclosure. No email or provider adapter is called.

The labelled mobile email input, focused live status, pending-disabled controls, explicit decline
confirmation and expiry clearing are covered by desktop/mobile browser checks. The script clears
bearer, request and input on page hide/expiry and stops back-forward-cache restoration. Network
uncertainty does not claim success or auto-retry. Binding success explicitly says verification and
registration are not enabled and no account exists. Decline remains available after redemption.

## Database Authority

`exchange_mobile_invitation` is VOLATILE, pins an empty search path and is executable only by
service_role; no direct table grants are added. It acquires the same tenant advisory lock as
staff revoke/resend/dispatch and reads the clock afterward. Only one active claim may win. Exact
request/secret replay returns its original deadline. Expired claims are expired before replacement;
a fresh claim may bind only the invitation's previously bound normalised email. Correction needs
staff revoke/reissue. Redemption does not consume the token; verified conversion remains 14.7.

Claim/email/invitation/contact changes and minimal event/central audit commit atomically; audit
failure rolls back reservation. System attribution retains the original register actor for lineage,
not a claim that an unauthenticated participant is staff. Decline is terminal and revokes claims/
tokens, releases phone reservation and starts existing contact retention. Exact decline retry is
idempotent and cannot reactivate an invitation.

Supabase/Postgres skill review checked least privilege, pinned search path and consistent locks
against [Supabase function guidance](https://supabase.com/docs/guides/database/functions). Email
capture review preserves format validation versus ownership verification and no silent marketing
subscription. The React and flow-verification reviews informed the minimal first-party shell and
browser→HTTP→local RPC→response evidence. No framework/provider/dependency changes were made.

## Validation

The local race runner rejects inherited hosted/provider variables, targets fixed local Supabase,
creates one disposable synthetic tenant/subject/invitation and drives the real HTTP handler/RPC
with eight contenders. Exactly one wins. It verifies exact retry, immutable email, cookie resume
and immediate revoke denial, then uses locked manifested cleanup with only named guards restored
before commit. Full row fingerprints and enabled triggers match baseline. Audit sequence gaps are
permitted; sequences are not rewound. CI includes this local-only packet after rollback SQL tests.

Verified locally on 8 October 2026:

- Complete Vitest: 148 files and 1,084 tests passed, including 21 new transport/crypto tests.
- Complete SQL matrix: 41 files and 1,952 assertions passed; the new redemption packet contains
  46 assertions covering ACLs, audit rollback, binding/replay, expiry, revoke and supersession.
- Real local HTTP→Supabase eight-contender race: exactly one claim; unchanged retry deadline,
  immutable email, cookie resume, revoke denial and exact row/guard baseline restoration passed.
- Desktop/mobile Chromium: 14 checks passed for inert GET/scanners, early fragment stripping,
  first-party network/CSP, axe, keyboard focus, 320px reflow, explicit decline, interrupted retry,
  contact clearing on expiry, storage absence and actual disabled/cross-origin endpoint denials.
  Positive browser responses are mocked; actual local RPC evidence comes from the race packet.
- Six fixed recovery suites: 334 assertions with row/security/function restoration passed.
- Full migration/seed replay and database lint passed (empty error list).
- Strict typecheck, ESLint, Prettier, discovery, portability and generated-route checks passed.
- Production build, client-secret canary and MCP-absence checks passed. Generated routes unchanged.
- Local test services were stopped after manifested cleanup. No hosted/provider checks are claimed.

Local tooling is Bun 1.3.14 and Node 24.21.0; declared Node 22 CI remains unchanged and must pass
after the owner's commit. The build's existing journey-key warning is expected with ignored
hosted environment loading disabled; no production key was loaded to suppress it. The first
reset emitted a pg-delta catalogue-cache timeout warning, but replay completed; the final reset
completed cleanly, with SQL/lint/recovery validation afterward. A sandbox listener restriction
required permitting local browser ports, not changing application behaviour.

During validation, the new email-bound audit action was corrected to the existing dotted action
format, and historical expiry fixtures were changed to one consistent statement timestamp.
Two hidden-input browser selectors were corrected without relaxing timeouts or application
controls. The environment catalogue test now includes the two deliberate optional entries.
No known local acceptance failure remains; manual assistive-technology and hosted/provider
verification stay in their planned later packets rather than being claimed from automation.

## File Accounting

Created:

- This annexure.
- `src/server/identity/mobile-invitation-claim.ts` and `mobile-invitation-page.ts`.
- `src/server/identity/mobile-invitation-redemption-http.ts` and its colocated test.
- `supabase/migrations/20261008200000_mobile_invitation_redemption.sql`.
- `supabase/tests/database/mobile_invitation_redemption.test.sql`.
- `scripts/test-mobile-invitation-redemption.ts`.
- `e2e/mobile-invitation-redemption.spec.ts`.

Modified:

- `.env.example`, `config/environment-catalogue.ts`, `src/config/environment.test.ts`, `package.json`, `.github/workflows/ci.yml`, `AGENTS.md`.
- `src/server.ts`, `src/server/security/request-security.ts`, `src/server/security/response-policy.ts`.
- `src/lib/public-route-policy.ts`, `public/robots.txt`.
- Sprint 14 plan, RAG current-state summary and RAG index.

No deleted/generated/dependency/lockfile/branch-only files. Remaining task gates are explicit
handoffs, not new debt or release permission. Hosted proof must confirm this document CSP is
preserved and automatic analytics/third-party injection remains off on this sensitive route.
