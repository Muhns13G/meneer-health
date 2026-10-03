---
evidence_id: phase-02-sprint-09-9-security-hosted-proof
title: Identity Security and Hosted Synthetic Proof
status: completed-with-client-activation-gates
task: 9.9
observed: 2026-10-03
owner: "@Muhns13G"
related_debt: [TD-009, TD-037, TD-038]
---

# Sprint 09.9 — Security and Hosted Synthetic Proof

## Mission and checkpoint

Prove invitation, activation, session, profile, portal, rights, tenant/role and audit boundaries
without admitting real clients. Task 9.8 was committed at `d3e08cf`; the starting tree was clean on
`itws-I`. Hosted database, HTTP denial and positive Auth/session proof now pass. The owner has
accepted retention of tracking that does not harm authentication or production reliability.
Task 9.9 is completed at this bounded synthetic-proof boundary; no client activation approval
is implied.

## Implemented verification

- `test:identity:security` runs the five committed Sprint-9 pgTAP suites in separate rollback-only
  transactions. It rejects hosted environment selection, uses the named local Docker database,
  raises on test failure and emits only suite/assertion counts. CI now runs this focused packet.
- The shared packet builder permits only fixed suite names, checks transaction boundaries, sets
  statement/lock timeouts and uses `finish(true)` so failed pgTAP assertions cannot be hidden by a
  multi-statement tool that returns only the last result. No commercial/provider seed is copied.
- Hosted SQL packets check an empty-identity baseline and the single suspended pilot tenant before
  inserting temporary synthetic tenants/actors. Synthetic Auth/session rows and document fixtures
  exist only inside a transaction; they are not real Auth API users, delivered emails, signed JWTs,
  approved legal publications or browser sessions. Every packet ends with rollback.
- The separately guarded `test:identity:hosted-denials` checks seven anonymous HTTP denials at the
  canonical origin without sending emails, provider tokens or personal data. It requires exact
  statuses, no-store, no CORS or redirects, no authorising cookie and no private payload. A 404 is
  not accepted as proof that a required portal endpoint is correctly deployed.
- Vitest now discovers the colocated `scripts/lib` verification tests. Runtime routes, public
  messaging, clinical gates, dependencies and secrets are unchanged.

## Hosted changes and evidence

The owner approved applying the five committed migrations and rollback-only SQL tests. Hosted
Supabase `gibfpolrdjotwvewgfsz` was `ACTIVE_HEALTHY`, with zero identities and one suspended pilot
tenant before work. The following exact repository migrations were applied:

| Committed version | Migration                          |
| ----------------- | ---------------------------------- |
| `20261002201514`  | `pilot_client_profile_instruments` |
| `20261002205048`  | `governed_patient_invitations`     |
| `20261003000011`  | `pilot_account_activation`         |
| `20261003103425`  | `patient_portal_projection`        |
| `20261003111144`  | `patient_account_rights`           |

The MCP assigned new application-time versions. Metadata repair was initially rejected as outside
the first approval; after the owner's separate explicit approval, only those five history versions
were aligned to the committed filenames. An independent migration listing verified all 21 versions.
No migration content, other history row or application data was changed by this repair.

| Suite run locally and hosted   | Hosted assertions | Failures |
| ------------------------------ | ----------------: | -------: |
| Profile/instrument persistence |                31 |        0 |
| Governed invitations           |                22 |        0 |
| Atomic activation              |                35 |        0 |
| Own-client portal projection   |                35 |        0 |
| Profile correction/rights      |                34 |        0 |
| Total                          |               157 |        0 |

Coverage includes cross-tenant/subject/provider/purpose and workforce denials, assigned AAL2 staff
reservation, expiry/revocation, stale or changed replay, exact document receipts, least-privilege
table/RPC grants, value-free audit, and forced late-failure rollback. Hosted evidence is database
proof, not HTTP/Auth-provider end-to-end proof.

Independent post-rollback inventory showed one tenant, exactly the suspended `meneer-pilot`, and
zero Auth users/provider sessions, subjects, memberships, invitations, application sessions,
profiles/history, publications/receipts/lifecycle events, activation command receipts, account
command receipts, rights requests and audit events. The hidden `identity_private` tables were
counted directly rather than inferred from the service-role Data API.

Security advisors returned only informational deny-default RLS-without-policy findings (46 tables).
No permissive policy was added to silence them. See the
[Supabase advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

After the owner reconciled deployment, all seven anonymous hosted HTTP checks passed. The
Cloudflare dashboard showed preview-branch build commit `a5c3d57` and active version prefix
`431303f6` at 100% traffic. This resolves the initial 404 checkpoint below, not the positive Auth gate.

With approval, the repository's code-only invitation, sign-in and recovery templates were saved
to hosted Supabase and independently verified after reload. They use `{{ .Token }}` without
confirmation links. The separately approved email OTP policy was changed from eight digits/one
hour to six digits/900 seconds and independently verified. Public signup, anonymous signin and
manual identity linking remain disabled; email confirmation remains enabled. The site URL and
sole redirect allowlist entry are `https://meneerhealth.co.za`. Custom Brevo SMTP is enabled on
port 587; stored credentials were neither displayed nor changed. The subsequent delivered-message
and Auth/session evidence is recorded below.

The owner's delegated recipient selection is `support@meneerhealth.co.za`, previously confirmed
as owner-controlled. The owner separately approved disposable hosted Auth/tenant fixtures,
nonbinding test documents, email exercises and scoped transactional cleanup. Those exercises
have now completed; independent final inventory again confirms the empty identity baseline.

Initial read-only Worker inspection found only the journey-intent secret. Under the owner's
subsequent explicit instruction, exactly `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
`IDENTITY_PREACTIVATION_KEY_BASE64` and `IDENTITY_SESSION_KEY_BASE64` were added as encrypted
runtime secrets to `meneer-health`. The existing local Supabase values targeted the approved
project; the two missing identity keys were independently generated as distinct 32-byte base64
keys, checked against journey/recovery key reuse and saved in ignored `.env.production.local`.
No values were printed. Independent secret-name listing verified all four additions and retention
of the journey-intent secret. Cloudflare created secret-change version
`9ca14b09-3fe2-40bb-970d-26d678c9168a` at 100% traffic on 3 October 2026 at 14:30 SAST;
no application build or branch change was performed. All seven anonymous HTTP checks passed
again afterwards. The positive exercise below subsequently verified credential/key consumption.

## Positive hosted Auth proof and cleanup — 3 October 2026

The interactive `scripts/test-sprint09-hosted-auth.ts` harness targets only the approved project,
canonical HTTPS origin and controlled support mailbox. It is not an ordinary CI test. Provider
tokens, OTPs and encrypted cookies remain in memory; output reports action/status only, except
the disposable provider subject needed for separately approved SQL fixtures. Run only with renewed
owner approval, the ignored environment file and
`SPRINT09_HOSTED_AUTH_CONFIRM=disposable-support-mailbox-only`. Input is newline-delimited JSON
actions; do not echo or store OTP input. Fixture creation, application-only revocation and cleanup
require a privileged, separately governed SQL connection; this harness alone is not a complete
fixture lifecycle runner. Its finalizer deletes its own Auth user, not application evidence.

The successful exercise used a separate synthetic tenant and documents explicitly marked
`SYNTHETIC TEST ONLY`, nonbinding and not approved client terms. The real `meneer-pilot` tenant
stayed suspended throughout. No clinical, payment or partner workflow was enabled.

| Hosted action / boundary                   | Observed result                                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Delivered invitation, sign-in and recovery | Six-digit code-only messages received in the controlled mailbox; template states 15 minutes              |
| Invitation verification and replay         | 204 with secure preactivation cookie; replay 422 without authorising cookie                              |
| Exact-document preparation and activation  | 200 with both nonbinding fixtures; atomic activation 204                                                 |
| Sign-in and own-account projection         | 204 with session cookie; own verified-email projection 200                                               |
| Replayed code and wrong contact            | Both 422 without authorising cookie                                                                      |
| Tampered and expired cookie                | Both 401; expiry used an authenticated synthetic cookie with a past absolute deadline                    |
| Renewal and continued projection           | 204 with rotated cookie, then own-account 200                                                            |
| Logout                                     | 204 with cookie clearing; old cookie denied 401                                                          |
| Recovery                                   | Delivered code verified 204; previous session denied 401; fresh sign-in succeeded                        |
| Provider-only global revocation            | Previously valid portal cookie denied 401                                                                |
| Application-only revocation                | Provider session independently remained live, application active sessions became zero, portal denied 401 |
| Runtime key consumption                    | Both hosted cookies decrypted using their distinct approved server keys; session AAD verified            |

Every harness HTTP check also enforces no-store, no CORS and no redirect except activation's
separately checked response. This is real hosted API/provider proof and mailbox inspection, not
a positive browser-portal or assistive-technology walkthrough. Elapsed live OTP expiry was not
waited out; configured expiry, SQL expiry assertions and synthetic cookie expiry are distinct proof.

After provider deletion, the approved cleanup transaction locked the affected tables, disabled
only seven named append-only/immutable triggers, deleted exact exercise rows in FK order,
re-enabled those triggers and committed. Independent direct SQL inventory confirmed zero Auth
users/provider sessions, subjects/memberships/invitations/application sessions, profiles/history,
publications/receipts/events, hidden activation/account/rights commands, audit events and chain
heads. All seven named triggers were enabled. The one suspended pilot tenant and 12 pre-existing
provider-gate records were preserved. A separate service-readable baseline command passed:
39 table resources, nine deliberately unreadable resources, only those two expected nonempty
tables, and anonymous tenant reads denied. All seven anonymous hosted HTTP denials passed again.

### Delivered-message finding

Invitation, sign-in and recovery messages carry manually entered codes, not token-bearing
confirmation links. Mailbox inspection found an image consistent with tracking in the invitation.
The generic first-party address was auto-linked by Gmail; it contained no credential. This does
not establish that Brevo tracking is disabled or anonymous. Sender observed was
`Meneer Health <sales@meneerhealth.co.za>`, recipient the controlled support mailbox.

The owner subsequently chose to retain useful tracking, disabling only mechanisms that harm
authentication or production reliability. The invitation image alone is not evidence of such
harm. No tracking setting was changed, and no new marketing collection was enabled. Code-only
credentials remain mandatory; tracking must never receive OTPs, session tokens, clinical content
or credential-bearing URLs. If token-link flows are introduced or rewriting/prefetching breaks
authentication, remove or bypass the harmful tracking mechanism and repeat provider tests.
FC-001 records this accepted decision; it is no longer an unresolved Task 9.9 gate.

## Validation, deviations and lessons

- Full local pgTAP passed: 16 files / 495 assertions, after resetting the disposable local database
  to its committed migrations and seed. The restored local backup initially contained residual
  synthetic identity fixtures, so seed-count tests failed; this was not treated as a code fix or
  a reason to weaken expectations. The hosted database was never reset.
- The dedicated local packet passed 157 assertions with rollback-only output.
- Hosted HTTP proof failed its first check: `/portal/account` returned 404 instead of 401 at
  `https://meneerhealth.co.za/`. The remaining six checks were not run after this failure. Do not
  describe this as a passing deployed security matrix or infer the deployed commit from CI alone.
- The browser CLI was unavailable. Repository-managed Playwright/axe is the verification fallback;
  sandbox port binding initially failed and was retried with local execution permission.
- Supabase guidance informed private grants, live provider/session verification and independent
  inventory. No new Supabase feature or package was introduced; current changelog/session guidance
  was reviewed. Local test helpers resolve SQL from the repository working directory because Vite's
  asset-URL transformation is unsuitable for filesystem fixture loading.

| Additional local validation                                                   | Result                     |
| ----------------------------------------------------------------------------- | -------------------------- |
| Identity application/server and verification-helper Vitest selection          | 16 files / 94 tests passed |
| Local Auth and authorisation provider exercises                               | Both passed                |
| Portal, rights and identity-session desktop/mobile Playwright checks          | 26 passed                  |
| Invitation/activation desktop/mobile Playwright checks                        | 8 passed on serial rerun   |
| Strict TypeScript, ESLint and Prettier                                        | Passed                     |
| Portability catalogue and public discovery checks                             | Passed                     |
| Production build, client-bundle canary, MCP absence and generated route check | Passed                     |

The first invitation/activation run passed seven cases but timed out while the desktop activation
page was still loading its documents during cold development-module loading. The same eight cases
passed on a serial rerun without competing unit validation. No assertion, timeout or application
code was changed. This is recorded as a transient local-browser validation failure, not hidden as
an uninterrupted first-run pass. These are targeted checks, not a claim that the entire browser or
Vitest matrix was rerun in this task.

After the final hosted cleanup, the selected identity/server/adapter and verification-helper
Vitest packet passed again: 16 files / 100 tests. TypeScript and ESLint for the interactive harness
passed; touched-file Prettier and `git diff --check` passed. This repeat does not replace the
separately recorded earlier local database/browser/build evidence.

## Completion and retained client-activation gates

The tracking-policy decision is resolved without disabling working tracking. All bounded hosted
Auth/session and cleanup checks in this packet have passed; Task 9.10 may proceed with Sprint-9
closeout and its required final validation. Real legal publication, client
invitation/activation, clinical intake, payments and partner operations stay closed. Live keyboard/
screen-reader approval remains TD-037/TD-038; reviewed rights fulfilment remains a separate
operational requirement. This packet does not close all of TD-009.

Additional lessons: an early run failed because the harness looked for the portal profile at the
wrong JSON level; correcting the harness required no application change. The first cleanup
transaction omitted the audit-chain-head FK dependency and rolled back. Editor replacement then
produced SQL syntax failures; a fresh editor and complete FK-ordered transaction restored the
baseline. The final successful run and independent inventory, not these failed attempts, establish
the proof. An initial recovery request returned generic 202 without observed mail; a later retry
delivered successfully. Generic request acceptance alone was not treated as delivery proof.

## File inventory

| Existing files modified                                           | Purpose                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `package.json`                                                    | Named local packet and explicit hosted-negative command      |
| `.github/workflows/ci.yml`                                        | Dedicated rollback security packet in local CI               |
| `vitest.config.ts`                                                | Discover verification-helper unit tests                      |
| `AGENTS.md`                                                       | Document the verification commands and hosted boundary       |
| Sprint-9 plan, debt registry, RAG current state/limitations/index | Record partial completion and actual hosted state            |
| FC-001 provider strategy                                          | Record observed tracking image and accepted retention policy |

| New files                                                  | Purpose                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `scripts/lib/sprint09-security-proof.ts` and `.test.ts`    | Fixed rollback packets, direct inventory and packet validation   |
| `scripts/test-sprint09-security.ts`                        | Local-only, redacted SQL runner                                  |
| `scripts/lib/sprint09-hosted-http-proof.ts` and `.test.ts` | Strict, anonymous hosted HTTP denial proof                       |
| `scripts/test-sprint09-hosted-http.ts`                     | Explicit hosted-negative guard                                   |
| `scripts/test-sprint09-hosted-auth.ts`                     | Interactive owner-approved positive Auth/session exercise        |
| This annexure                                              | Scope, approval, evidence, deviations and outstanding acceptance |

The local Supabase test stack was stopped with its backup/volumes preserved. No files were staged,
committed or pushed, and no branch was changed. The only Cloudflare mutation was the explicitly
approved four-binding secret upload and its provider-created secret-change deployment above.
