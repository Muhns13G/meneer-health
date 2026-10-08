---
plan_id: phase-02-sprint-14-8
title: Mobile Invitation Local Security and Accessibility Acceptance
status: completed-local-security-accessibility-boundary
last_updated: 2026-10-08
owner: "@Muhns13G"
---

# Task 2.14.8 — Local Acceptance Packet

## Scope and Boundary

Baseline: committed 14.7 at `30164cf` on `itws-I`, clean before this task. Covers staff register,
delivery/callback authority, bearer claim, managed email verification and existing activation.
No Git staging, commit, branch switch, push, deployment, hosted mutation, real SMS/email, account
activation or provider configuration occurred. Local fixed synthetic Supabase fixtures only.
All real channel defaults and spend ceilings remain disabled/zero. Task 14.9 separately owns
approved hosted handset/mail proof; Task 14.10 owns exact-commit CI/release reconciliation.

Supabase security/locking guidance informed session/privilege review and exact baseline restoration.
The full-flow verification skill kept browser mocks distinct from actual local Auth/RPC evidence.
No new dependency, schema migration, generated output or secret is required for this task.

## Repeatable Security Evidence

`bun --no-env-file run test:mobile:security` executes eight fixed reviewed SQL packets in sequence:
mobile foundation, staff commands, delivery intents, delivery receipts, redemption, email conversion,
workforce context and existing account activation. It rejects hosted/provider environment variables,
pins the local Docker target, requires BEGIN/ROLLBACK, bounds lock/statement time and requires
complete successful TAP plans. After each rollback it compares exact application/Auth row,
RLS/ACL, trigger and function fingerprints. The packet passes **463 assertions**.

The packet covers tenant/role/purpose/assignment/AAL2/session denials, current-authority replay,
48-hour/15-minute boundaries, duplicate phone/email, supersession/revocation, false delivery,
signed callback attribution/conflict, stale and consumed claims, roster-phone mismatch, exact
documents and atomic activation/audit rollback. No SQL fixture is copied to hosted services.

Actual concurrent boundaries are separate from those rollback assertions:

- `test:mobile:redemption`: eight requests, one active claimant; exact retry preserves deadline,
  email is immutable and revoke invalidates the cookie; exact local baseline restored.
- `test:mobile:conversion`: eight sends produce one local Auth invitation; real local OTP/session
  verification issues only preactivation, then existing atomic profile/two-receipt activation;
  session revocation and cleanup restore the baseline. No email is sent.
- `test:mobile:dispatch-race`: eight delivery requests through the real service/local RPC and a
  no-send transport must produce one transport invocation and one held 80,000-micro-USD synthetic
  reservation. Uncertainty does not release spend or permit blind retry. This is not actual Telnyx
  pricing or delivery proof. The runner drains all concurrent requests before scoped locked cleanup.

Cleanup disables only enumerated immutable guards inside a locked transaction for manifested
synthetic rows and restores them before commit; fingerprint checks cover the whole baseline.
This is a test-only cleanup technique, not permission to disable guards in operational retention.

## Browser and Manual Acceptance

Final targeted browser packet: **34 desktop/mobile checks passed**. Added a keyboard-only
email/code journey at 400% CSS zoom, no horizontal overflow, axe, no browser-storage persistence,
no token/contact/code in request URLs and no page errors. Browser-controlled response mocks are
UI evidence only; actual local RPC/Auth proof is listed separately above. Staff paths additionally
cover masked phone, explicit review/dispatch, uncertainty and clearing records on denied authority.

The new script-disabled test found that the previous `<noscript>` fallback was not displayed by
the browser's disabled-script mode. The same support wording is now visible by default and hidden
only after the controller successfully installs its listeners. Script/CSP failure cannot remove
support guidance or create an insecure alternate registration path. No clinical/privacy meaning
changed. The script-disabled browser test now passes.

The owner reviewed the **new mobile invitation page** with VoiceOver and browser zoom, confirming
all requested labels, pending/result announcements, decline/expiry/error feedback, keyboard focus
and readability/no horizontal scrolling at **400% browser zoom**. This is fresh mobile-page
acceptance, not inferred from earlier client/staff reviews. The loopback-only review fixture uses
the actual standalone page and clearly labelled simulated transport/code, never Auth/Supabase/Telnyx.
It creates no account, sends nothing and has been stopped after confirmation. It is not hosted proof.

Reproducible manual review:

1. Run `bun --no-env-file run scripts/review-mobile-invitation.ts`.
2. Open the printed loopback link. Turn VoiceOver on using your usual controls; note the initial
   state so you can restore it afterward. Tab/Enter Continue, type `synthetic@example.invalid`,
   Save email, Send verification code, enter fixture code `123456`, then Verify email.
3. Confirm labels, focus and pending/result announcements. The destination explicitly says no
   real account/session was created. No actual OTP is needed.
4. Reopen `/mobile-invitation` with the printed synthetic fragment for decline/confirmation;
   `/review/expiry` expires after ten seconds; `/review/failed-code` returns a simulated rejection.
5. Use actual browser zoom to 400%; check readable content/controls and no horizontal scrolling.
6. Restore your VoiceOver/zoom preferences and stop the fixture with Ctrl-C. Never enter real
   email, phone, health answers or credentials. Do not confuse fixture transport with security proof.

## Regression and Findings

- Complete pre-fix unit regression: **150 files / 1,101 tests passed**; new packet/HTTP/email
  focused run: **3 files / 56 tests passed**, including the 21 new packet tests. These are distinct
  runs, not an inferred full final-suite count.
- Complete SQL regression: **42 files / 2,013 assertions passed**.
- Real local workforce TOTP/AAL2/session and concurrent queue proof passed with fixture cleanup.
- Six recovery packets: **334 assertions passed**; seven evidence packets: **418 assertions passed**
  after exact dispatch cleanup. No provider or protocol-generator action.
- Initial broad browser attempt stopped after loading timeouts (64 passed, two failed, one
  interrupted). The timed-out activation/invitation paths pass unchanged in isolation. Final broad
  scan completed with **312 passes and two `/peptides` media failures**: Vite independently loaded
  a local public media URL whose file is absent on this non-preview checkout. The controlled server
  now explicitly overrides the two public media variables to empty, while preserving code-level
  preview fallbacks and the actual media-availability assertion. The final affected packet passes
  **38 desktop/mobile checks** (all active-route health and mobile redemption checks). This is
  broad-scan-plus-focused-fix evidence, not a claimed single 314-pass final run. Require exact-commit
  full GitHub CI before the hosted rehearsal; no missing configured media is silently accepted.
- An inherited `.env` was reloaded by the nested workforce Bun script; its hosted guard rejected
  it before execution. `test:workforce` now disables dotenv in its inner command as well.
- A foundation test's leading comment was moved after BEGIN to conform to the fixed packet's
  rollback guard. Assertions and transaction semantics are unchanged.
- The new dispatch harness initially used a non-RFC request UUID and a non-ZA synthetic phone.
  These fixtures were corrected; `Promise.allSettled` drains failed siblings before cleanup.
  Initial test extension persistence was removed from setup; no test-only TAP extension should
  leak from this committed fixture into later lint checks. Local resets removed failed fixtures.
- Evidence-runner diagnostics now expose only fixed suite/safe reason categories, not raw SQL.

Final database lint is clean after removing the fixture's test-extension side effect; all synthetic
database services and the manual fixture are stopped. Production build, client-secret/MCP checks,
TypeScript, ESLint/format, dependency audits (all/production: no vulnerabilities), portability,
discovery and generated Worker/route types passed. Cloudflare upload dry run is validated locally;
no deployment or GitHub CI completion is claimed for uncommitted work. Local tooling is Bun 1.3.14
and Node 24.21.0; the declared Node 22 build/CI policy is unchanged.

Task 14.8 is completed at this local security/manual/targeted-fix acceptance boundary. The exact
committed full CI matrix remains mandatory before 14.9; if it reports a failure, reopen the affected
boundary rather than treating this report as a waiver. This task does not close Sprint 14.

## TD-066 and Release Disposition

Prepared the [unconverted-identity retention/recovery design](sprint-14-unconverted-identity-recovery.md):
exact provenance manifest, current-state/session/domain/hold vetoes, revocation before provider
retirement, uncertain acknowledgement reconciliation, contact-copy/backup erasure and AAL2 staff
reissue without merging unrelated accounts. This is a proposal, not an implemented provider-retirement
job or privacy/owner approval. **TD-066 remains Open** and real mobile email remains gated. TD-065
and every applicable Sprint 13 release gate remain unchanged. No new debt ID is invented for
test-harness defects fixed here.

## File Accounting

New: `scripts/lib/sprint14-security.ts`, its `.test.ts`,
`scripts/test-mobile-invitation-security.ts`, `scripts/test-mobile-invitation-dispatch-race.ts`,
`scripts/review-mobile-invitation.ts`, this annexure and the TD-066 design annexure.

Modified: `src/server/identity/mobile-invitation-page.ts`,
`e2e/mobile-invitation-redemption.spec.ts`, `playwright.config.ts`, the foundation SQL test's comment placement,
`scripts/test-sprint13-evidence-rehearsal.ts`, `package.json`, `.github/workflows/ci.yml`, `AGENTS.md`,
the Sprint 14 plan, debt registry and RAG current-state/limitations/index.
No removals, dependency/lock changes, generated file edits or credential changes.
