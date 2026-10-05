---
evidence_id: phase-02-sprint-10-intake-implementation
status: completed-with-external-dependency-exception
last_updated: 2026-10-05
tasks: [2.10.I2, 2.10.I3, 2.10.I4, 2.10.I5, 2.10.I6, 2.10.I7, 2.10.I8]
---

# Intake Implementation Progress and Verification

The owner requested I2–I8 as one continuous implementation run, retaining owner-only Git staging,
commit, branch and release control. I2–I8 are accepted for the owner-approved engineering scope.
On 5 October the owner explicitly excepted the unavailable protocol-generator walkthrough from I8
closeout; current provider compatibility remains a pre-launch dependency, not a claim of completion.
I1 is committed; the original questionnaire and separately attributed sex extension remain fixed.

## Current Checkpoints

- I2 local schema adds a separate deny-default `intake_private` boundary, encrypted draft records,
  immutable submitted snapshots, distinct publication notice receipts, private medical grants,
  safety/transfer/reconciliation/lifecycle evidence and payload-free central audit. Generated local
  migrations cover foundation, governance, rights/recovery, safety restriction, restricted safety
  grants and exact-record audit attribution. On 5 October, the owner-approved CLI push applied all
  six intake migrations plus `20261005074014_patient_case_status_projection.sql` to hosted Supabase.
  Migration history now matches all 35 committed versions; no seed or activation was applied.
- Portable `medical-intake.record@1`, strict answer/disposition/envelope schemas, source catalogue,
  dedicated AES-GCM scope binding and candidate-key HMAC replay handling are implemented.
- The three rollback-only intake packets pass **95 SQL assertions**. Published notice immutability,
  own scope, replay/stale-version denial, submitted amendment history, independent grants,
  provider-copy disposition, restriction/hold precedence and offline restore quarantine are covered.
- I3 patient RPC/service/HTTP commands implement resume, immediate restriction, separately authorised
  retained-data export and submitted-version history, with fresh authority checks.
  Collection remains explicitly disabled by default; source publication, existing account authority,
  exact notice acknowledgement and fresh session checks precede collection.
- I4 private `/portal/intake` and `/staff/intake` interfaces are implemented. Controlled Playwright
  desktop/mobile checks pass through all eight sections, branching, review, submission, accessibility
  scans and hidden-state clearing. These intercept transport and do not prove provider-backed Auth.
- I5 implements generic safety notifications, retry/uncertain-delivery handling and clinical response
  receipts. Restriction does not silently cancel an unresolved hold or its existing independently
  approved safety grant; ordinary review/transfer remain denied.
- I6 implements snapshot/field/purpose grants, independent security activation, manual-transfer
  receipts and independent reconciliation. The real deposit dependency remains closed.
- I7 implements held retention/disposition boundaries, independent provider-copy disposition evidence,
  own retained export and offline restore quarantine/current-ledger reconciliation. The actual local
  encrypted backup/restore exercise reconciles **54 records**, including private intake tables.
- Strict TypeScript, ESLint, formatting, generated Cloudflare types and local security/performance
  advisors pass. The final Vitest run passes **651 tests across 106 files**. All **35 migrations**
  replay and the full database suite passes **1,003 assertions across 25 packets**. Production build,
  client-bundle/MCP-absence scans and portability/discovery checks pass. SQL lint found an implicit
  JSON cast and unused variable in the unreleased audit migration; both were corrected and replayed.
  A pre-existing implicit `text`-to-`text[]` initialisation warning in
  `public.execute_patient_account_command` is separate from intake and is not silently waived as
  warning-free schema evidence. An earlier full browser matrix was **not accepted**: 42 checks passed before
  an existing account-activation case exceeded its 30-second test deadline while awaiting the
  intercepted retry response. The run was stopped (one later case interrupted, 136 not run).
  A separate account rerun could not start because local SSR requests timed out and the managed
  server exceeded its 120-second readiness deadline. No production defect or resource root cause
  is asserted, and no application safeguard or timeout was weakened. Intake-specific desktop/mobile
  proof remains passed; broader regression acceptance remains open pending a clean rerun.
  After stopping the completed local database services, a final isolated desktop rerun passed the
  original retry/durable-success case, but the denial case was still showing “Loading account
  documents…” at its five-second assertion deadline (the server logged the expected denial).
  Those attempts were not successful full regression runs. Local database volumes were retained on
  shutdown. The subsequent clean rerun on 5 October passes **180/180 desktop/mobile checks in 6.9
  minutes**; a separate focused account/intake rerun passes all six checks. No application safeguard,
  assertion or timeout was weakened. The current full local browser regression is accepted.
- I8 is **completed with the owner-approved external-generator exception**. The initial baseline confirmed
  one suspended tenant, zero subjects/external identities/Auth
  users and zero rows in all 18 intake tables. All 18 tables have forced RLS; none is readable by
  `anon` or `authenticated`. The later bounded rehearsal below temporarily added disposable fixtures;
  the initial empty counts must not be represented as the current post-rehearsal baseline.
  No live patient intake is activated.

## Hosted Rehearsal — 5 October 2026

The owner explicitly authorised temporary configuration/promotion for the isolated tenant only.
Worker version `ec082f51-e422-4919-9f43-78f5b942e431` served the rehearsal at 100%; the real
`meneer-pilot` tenant remained suspended. Five disposable Auth identities and synthetic account and
medical publications were created; account activation used its governed RPC. No real client, payment,
clinical approval, generator subscription or paid-review bypass was introduced.

Real routed HTTP checks passed patient sign-in, secure cookie attributes, four workforce TOTP/AAL2
sign-ins and email-only denial; encrypted draft save, submission, amendment, owned read/history
export and retained export after restriction; independent grant approval/activation, permitted
clinician reads and wrong-role/purpose/stale-snapshot denials. The deployed scheduled Worker claimed
the generic safety notification and Brevo accepted it. A subsequent read-only Brevo event check
records `requests` at 15:41:03.567 SAST and `delivered` at 15:41:05 SAST on 5 October. The owner
initially reported that the email did not arrive visibly. Subsequent direct browser inspection found
the exact alert in Gmail's Updates category, addressed to `support@meneerhealth.co.za` at 15:41
SAST. Expanded details show Brevo transport, domain signing and TLS; the rendered body contains
only the approved generic review notice. Mailbox visibility is now directly verified, without
claiming that the owner personally acknowledged it or that email resolves the clinical hold.
Clinical acknowledgement passed, including preserved safety access during restriction. Explicit
application-session revocation then denied patient export and clinician reads with 401; all disposable
provider sessions were removed. This is provider-backed HTTP evidence, **not** a hosted browser or
assistive-technology walkthrough.

The rehearsal found a real defect: clearing a restricted record's safety hold before the final grant
check invalidated that same narrowly allowed grant and rolled back clinician review. New migration
`20261005134411_restricted_medical_safety_review_completion.sql` moves the final authority check
before its authorised hold transition, preserving restriction, snapshot, acknowledgement and audit
checks. Four regression assertions prove review completion, retained restriction and subsequent
ordinary/safety access denial. Local targeted proof passes 28 assertions; the full database suite
passes **1,007 assertions across 25 packets**. The owner subsequently approved the additional
migration and scoped cleanup. CLI dry-run identified only this file; hosted application completed
without seeds/role changes, bringing history to **36 matching migrations**. Fresh real routed
TOTP/AAL2 sign-ins, independent approval/activation of a new time-limited grant and exact one-field
projection (`mental_safety` only) passed. Clinical review returned 200; subsequent safety and ordinary
review reads returned 403. The synthetic central audit chain verified before deletion. TD-058 is
Verified at this local-and-hosted boundary; repository commit/CI remain owner-controlled.

The interactive rehearsal helper initially omitted idempotency headers for reads, expected the wrong
denial code for rejected transfer authorisation, and omitted the staff sign-out action. Those are
helper errors, not grounds to weaken handlers; request/sign-out construction has been corrected.
Completed revocation evidence uses exact disposable application/provider session IDs.

Final restoration is verified: Worker `b8949f06-f3ff-45bc-95e5-52993ba0cc32` is at 100%, intake mode is
disabled, the synthetic tenant binding is removed and the dedicated medical key remains server-only.
Both command endpoints return payload-free, no-store 412 responses. All synthetic sessions are
revoked/removed. The approved locked transaction deleted only the identified fixture rows and restored
every named append-only/immutable trigger before commit. Its first attempt rolled back completely on
a notification-receipt column mismatch; the corrected transaction committed. All five disposable Auth
users were then deleted. Independent counts confirm one suspended pilot tenant, zero subjects/Auth
users/provider sessions and zero disabled user triggers. Inventory across all governed schemas shows
only that tenant and the original 12 fulfilment-provider gate records; all 18 intake tables are empty.
Cloudflare rejected restoration of an older secret version, so a fresh disabled version was created
and promoted instead; no secret rollback override was used.
At this earlier checkpoint, hosted browser acceptance and current generator compatibility remained
outstanding. The subsequent browser proof and owner-approved generator exception below supersede
that task-open status. Mailbox visibility is directly verified.

## Final Hosted Browser Acceptance and I8 Closeout — 5 October 2026

A fresh approved disposable fixture set exercised the actual deployed patient interface, without
transport interception or injected application cookies. Version
`50925204-522c-4cb3-a8c1-aa3f55100df9` temporarily enabled only the isolated synthetic tenant.
Real OTP sign-in, separate privacy acknowledgement, all eight sections, peptide-only conditional
questions, required-field error summary, keyboard progression, review and submission passed.
Saved name, measurements and native date-of-birth input survived reload; database evidence confirms
one submitted snapshot at version 6. The receipt explicitly distinguishes submission from clinical
approval, payment and delivery. Amendment opens the persisted answers. At a 412×915 mobile viewport,
the received state has no horizontal overflow; the override was reset. Captured console warnings
and errors were empty. Accessibility-tree semantics and keyboard checks supplement the existing
180-case desktop/mobile axe matrix; this is not a certified assistive-technology audit.

Expiry was tested using the actual server-provided deadline: only the disposable patient's session
was shortened, then allowed to expire against wall-clock time. The interface hid questionnaire
information and removed all text inputs without a mocked clock. Browser sign-out and subsequent
application/provider revocation completed. The verification skill's UI-to-persisted-state approach
was used; native date-control automation was corrected, not the working product input.

The approved locked cleanup removed only this second fixture set and restored every named trigger
before commit. All five disposable Auth users were deleted. Independent counts again show one
suspended real-pilot tenant, zero subjects/Auth users/provider sessions/intakes and no disabled
user triggers; the cleanup transaction also checked the other scoped tables were empty.
Final active Worker version `ac94b09c-efa8-453a-a8db-c171d1755acf` restores disabled intake and removes
the temporary tenant binding. Both canonical patient/staff command endpoints return 412, zero body
bytes, no-store and no cookie. The dedicated medical key remains server-only. No real client,
charge, paid-review bypass, clinical approval or protocol subscription was introduced.

I8 is closed for all non-generator acceptance. Its sole deviation is the owner's explicit exception
for the lapsed external subscription/current generator walkthrough. Restore entitlement and verify
current input mapping before real manual transfer; historical Task 8.8 evidence is not substituted.
Sprint 11's authoritative deposit gate and private publication/roster activation remain separate
planned launch requirements. These do not reopen I8 or prevent proceeding to Task 10.9.

Lessons: verify mailbox visibility separately from provider delivery; verify the real expiry/render
boundary separately from HTTP proofs; preserve restricted-safety authority until its final check.
The discovered TD-058 defect is fixed and Verified. Informational index candidates below remain
recorded performance considerations; no additional undisclosed defect is asserted.

### Closeout File Inventory

| Change             | Files                                                                                                                                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing, modified | This progress record; `sprint-10-medical-intake-amendment.md`; main Sprint-10 implementation plan; technical-debt registry; medical-intake release/recovery runbook; RAG current-state, decision-register, known-limitations and JSON index; `supabase/tests/database/medical_intake_workforce.test.sql` |
| Newly created      | `scripts/test-hosted-medical-intake.ts`; `supabase/migrations/20261005134411_restricted_medical_safety_review_completion.sql`                                                                                                                                                                            |

The inventory covers this I8 correction/closure batch, not previously committed I1–I7 work.
Temporary OTP bridges and SQL fixtures are not repository artifacts. Git staging, commit and code
release remain owner-only; this evidence does not claim a later GitHub CI result.

Final closeout recheck: strict TypeScript and repository ESLint pass; the five focused medical
contract/service/envelope/HTTP/dispatch suites pass all 34 tests. The previously accepted full
651-unit/180-browser/1,007-SQL matrix remains recorded above, not falsely represented as rerun
after this documentation-only closure. Changed-file formatting and Git whitespace checks pass.

## Hosted Advisor and Provider Access Findings

Hosted advisors report informational notices, not a warning-free result: 83 deny-default tables have
RLS without browser policies (including all 18 private intake tables), 51 foreign keys lack covering
indexes (eight intake findings), and 50 indexes are unused (28 intake findings). Missing browser
policies are intentional for the server-command boundary. Unused indexes are expected in this empty
baseline and are not candidates for blind removal. The eight intake foreign-key index candidates
remain a recorded performance-review item before volume grows; they are not evidence of disclosure.
See Supabase's [foreign-key index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

A fresh provider login on 5 October succeeds but redirects to `/subscribe`, displaying the
R1,500/month White-Label Starter subscription. The visible Dashboard link returns to that same gate.
No subscription was purchased, no payment submitted and no new protocol generated. Historical Task
8.8 generator evidence does not substitute for current I8 access/compatibility proof. The owner must
resolve the provider entitlement or supply an already entitled account before this walkthrough.

## Explicit Authorisations

The owner authorised, in this chat on 5 October 2026, application of the reviewed new intake migrations
after local checks; isolated synthetic tenant/Auth/instrument/questionnaire fixtures; session revocation
and removal of only those fixtures; and generation of a separate 32-byte medical key, ignored local
storage and transmission to the Worker secret for the rehearsal. Temporary intake configuration must
return to disabled; the real pilot stays suspended. Existing keys are not reused or rotated.
The separate 32-byte medical key was subsequently generated and saved in ignored
`.env.production.local`; only its valid shape/decoded length was reported, never the key. The
initial approved secret transmission created **undeployed** Worker version
`18cd3b9b-9b85-4bd3-9191-93537e1d9abd`. The later explicitly authorised promotions, hosted writes,
corrective migration and final restoration/cleanup are recorded above; this initial version is historical.
The owner chose to deploy the committed code personally. Approval for the seven pending migrations
was separately confirmed and completed; it is not approval for agent deployment or Git changes.

## Historical Deployed Disabled Preflight — Before the Rehearsal

Cloudflare reports active Worker version `a81dace3-f220-4e29-aeb4-265db3f708ce`, created at
14:58 SAST. Binding inspection shows no medical mode/tenant/key binding in that active version.
Four real canonical-origin checks pass: patient/staff command POSTs return 412; query-bearing
variants return 404. All four have no-store responses, no payload, no cookie and no CORS grant.
This confirms the disabled routed boundary, not authenticated intake, medical encryption or email
delivery. The hosted baseline remains one suspended tenant, zero subjects/Auth users and 35
migrations. No synthetic fixture has been created while runtime configuration remains disabled.

Owner-only release control requires either owner promotion/configuration or explicit bounded
delegation for the synthetic rehearsal's temporary configuration and final restoration. The key-only
version does not enable intake by itself. Do not enable the real pilot tenant or infer generator
entitlement from code deployment.

The owner explicitly selected **keep the production gate closed; synthetic proof only** for the
paid-review/manual-transfer dependency. Sprint 11 is not brought forward. Positive payment-dependent
rehearsal evidence must be explicitly synthetic/rollback-only or controlled local injection; no
production paid flag, runtime bypass or clinical/payment approval is inferred from submission.

## Next Task and External Dependency

Local full-suite and migration-replay gates are accepted. Continue with the
[release/recovery runbook](../../../06-operations/medical-intake-release-recovery-runbook.md).
Hosted code release still requires the owner's deployment or explicit bounded deployment authority;
migration/key/fixture approval is not permission to push or promote code. The approved real hosted
HTTP/Auth/AAL2, medical-command, browser/expiry, correction and cleanup evidence is recorded above.
Proceed to Task 10.9 after the owner's commit. Current generator compatibility is explicitly excepted
from I8 and remains a pre-launch dependency after entitlement is restored.
Any future authenticated browser rehearsal needs newly bounded disposable fixtures;
the deleted fixture IDs cannot be reused as existing accounts. Preserve final disabled restoration.
Manual protocol-generator access must follow the owner-controlled boundary. Final reports distinguish
local controlled tests, hosted real Auth/transport proof and unactivated clinical gates.
