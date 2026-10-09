---
plan_id: phase-02-pilot-final-acceptance-20261009
title: Remaining Pilot Acceptance Execution Packet
status: in-progress-no-activation
authority: observed-read-only-checks-owner-coverage-and-proposed-control
last_updated: 2026-10-09
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Final Pilot Acceptance — 9 October

This packet tracks TD-066 → TD-064 → TD-037/038 → TD-043. It does not stage Git changes,
release configurations, activate the suspended pilot, waive TD-006/009/010 or authorise charges.
Private uploads, product transactions and generator transfer remain separately gated.

## Current Observations

### TD-043 Staff-Only Setup Enabled

On the owner's explicit “enable” instruction, the narrowly scoped
`scripts/sql/enable-initial-staff-setup.sql` passed a hosted rollback-only rehearsal and was then
committed as a database transaction. Only tenant `meneer-pilot` changed from suspended to active;
no users, memberships, MFA factors, invitations or client records were created. This is manual
operational DML, not a schema migration, Git commit or pilot release.

Before and after the change, deployment `c060982e-2592-4b9f-9cf4-dbb27c639920` remains the restored
Worker version `fe911ea7-0260-48fb-bf44-721b9bbe1f72`. Staff sign-in returns 200 and the anonymous
staff-session endpoint returns 401. Empty same-origin intake/order/refund checks remain 412;
Stripe, Telnyx and notification callback checks remain 404. No Cloudflare setting or release is
changed. Hosted readback preserves four staff, six operator memberships and zero clinical/dispensing
grants, client profiles, mobile invitations or enabled non-local fulfilment gates.

Both operators still have unconfirmed email and no verified TOTP at this checkpoint. Mansoer and
Mikhail must complete their own email verification and authenticator enrolment at
`https://meneerhealth.co.za/staff/sign-in`, then prove their actual role/queue/inbox coverage.
No email is sent by this tenant change. **TD-043 remains Open** until actual operational acceptance;
the active tenant status must not be described as activated client onboarding or payments.
This supersedes earlier “one suspended tenant” current-baseline statements for staff setup only.

### TD-066 Hosted Acceptance Completed

Both expressly approved migrations are hosted with matching filename history. Twelve isolated
managed-Auth/TOTP/provider/R2 checks pass; four real staff and six memberships survive exact
cleanup, all guards are restored and only the new synthetic encrypted R2 object is removed.
TD-066 is Verified alongside TD-064; this supersedes their earlier pending checkpoints in this
packet. See the [acceptance record](td-066-hosted-retirement-acceptance.md) and
[maintenance runbook](../../../06-operations/mobile-orphan-maintenance-runbook.md). Real retirement
copies require the 36-day boundary and fresh inventory; no production backup expiry is claimed.
No messages, Worker release or pilot activation occurred. Real operator contact/TOTP acceptance
and the other explicitly retained release gates remain separate.

### Operator Approval Clarification and Scoped Bootstrap

The owner clarifies that the earlier “leave grants inactive” selection was unintended, then
explicitly confirms enabling the proposed roles and Mikhail's independent approval of Mansoer's
access, with Mansoer approving Mikhail's. This supersedes the earlier inactive-roster direction.
Approval evidence is the owner's report of out-of-band mutual approval, not an observed native
AAL2 approval action; no such action or professional authority is fabricated.

Before insertion, the primary database is re-inventoried: exactly the four authorised staff
accounts and linked subjects, one suspended tenant and twelve provider gates, with no sessions,
memberships, profiles, intake, payments or test residue. The exact two operator identities map
to distinct subjects; neither operator email is confirmed yet. No user is deleted or recreated.

`scripts/sql/initial-operator-memberships.sql` is a manually authorised DML bootstrap, **not** a
migration, seed or CI command. It locks the narrow identity/tenant/membership tables, checks the
baseline and exact operator mapping, requires distinct approvers and inserts only six native
memberships. It passes a rollback-only rehearsal before application. Reapplication does not
extend expiry or change existing grants; unexpected memberships fail closed.

Independent readback confirms `operations`, `auditor` and `admin` for each of Mansoer/Mikhail,
all active with the other operator as approver, valid 9 October through 8 November 2026 at
13:38:07 SAST. No clinician/pharmacy role or resource/case/medical assignment is created.
Tasneem/Ziyaad remain invitation-only. The tenant stays suspended and no application/provider
session is created. The old pre-provisioning zero-membership baseline is now historical; preserve
these six real grants and all four real identities during subsequent synthetic cleanup.

Working staff access is still denied while the tenant is suspended; this is granted membership,
not proof that either person has independently verified contact, enrolled TOTP or used a live
operational queue. Do not mark TD-043 fully Verified or activate the pilot from this bootstrap.

### Primary Database Pre-Provisioning Check and Deployed Workforce Acceptance

The owner requests a clean primary database before staff permission seeding. Supabase project
`gibfpolrdjotwvewgfsz` is `ACTIVE_HEALTHY`; its branch listing has no separate development branch.
This check targets the primary hosted database, not a Git checkout or local seeded database.
Count-only inventory of application, Auth and Storage tables finds only:

- Four authorised Auth users/identities and invitation tokens, four application subjects and
  Supabase identity links; independent attribution finds no other account, subject or contact.
- One suspended `meneer-pilot` tenant and twelve configured fulfilment-provider gates.
- Provider-owned Auth/Storage migration metadata. No client profile, questionnaire, payment,
  application/provider session, membership, mobile invitation, notification, clinical grant,
  uploaded object or leftover synthetic record is present.

No cleanup or reseeding is needed. The four permanent staff invitations must be preserved.
The owner explicitly chooses **prepare the roster, leave grants inactive**: Mansoer/Mikhail are
the only proposed operators (operations/privacy-review/security-administration), while
Tasneem/Ziyaad remain invitation-only. No independent grant approval is fabricated and no membership
row is seeded: the native constraint requires an independent approver even for inactive rows.
`scripts/lib/pilot-staff-baseline.ts` preserves this staff-only baseline with 16 passing tests;
its predicate checks supplied count/attribution evidence, not the completeness of a database scan.

The owner separately approves isolated hosted fixtures and scoped cleanup preserving real staff.
`scripts/test-hosted-workforce-context.ts` executes against the canonical deployed origin with a
disposable `.invalid` identity and isolated synthetic tenant, genuine generated email-code
verification (no send), real TOTP enrollment/verification, post-MFA three-context selection,
wrong-tenant denial, selected operations session, renewal, rebinding denial, sign-out and stale-cookie
denial. All pass. No clinician role/grant, real grant, email, payment or pilot activation occurs.

Exact full application-table row fingerprints before/after match. The immutable selection guard
is restored before commit; provider sessions are revoked and only manifested fixtures removed.
Independent MCP readback confirms four authorised real accounts, zero provider/application
sessions, zero memberships/selections, one suspended tenant and enabled immutable guard.
The ignored `.td043-workforce-rehearsal.local` journal records the cleaned fixture manifest;
an unresolved earlier exercise would block another run. This is hosted engineering acceptance,
not active operator access or wider TD-043 closure.

Fresh empty anonymous intake client/staff and order probes return no-store HTTP 412. TD-064
therefore still needs the owner-controlled isolated configuration release documented in the
pre-release remediation packet. Source deployment is not binding activation. TD-066's native
retirement/reissue/copy workflow is still incomplete; this exercise does not close it.

### Subsequent Owner Direction — Operator Scope and Acceptance

- The owner reports commit `b20236e1cef90302ca9a976e841a017a1cb4bb95` deployed. Local Git
  readback confirms that commit and a clean tree before this amendment; the canonical staff page
  returns HTTP 200. This is not exact Worker-source attestation or authenticated acceptance.
- Only Mansoer and Mikhail manage the system initially. The owner authorises one initial account
  invitation each to the four previously specified named addresses. Tasneem/Ziyaad receive no
  active clinical membership, medical grant or clinical responsibility through these invitations.
  Account creation/contact confirmation is separate from independently approved system access.
- The owner accepts the remaining VoiceOver items and requests no further manual review. Record
  this as owner acceptance based on earlier checks and confidence in the platform; do not invent
  per-flow spoken observations, phone versions or independently executed tests. Automated and
  technical transition acceptance remain separately evidenced.
- The owner directs professional/provider/legal evidence to be deferred until after the pilot.
  This is a recorded deferral, not verification of the evidence or an assertion of compliance.
  It does not publish draft instruments, alter clinical grants, enable external transfer or remove
  runtime collection/publication controls. Provider/product/generator capabilities remain gated.

Initial invitations use an explicitly guarded, operator-run bootstrap script, not the ordinary
privileged staff invitation route. The script grants no permissions or tenant activation. Its
ignored local journal is persisted before each provider call; existing/prepared/uncertain entries
never auto-resend. These permanent staff accounts must not be removed by synthetic fixture cleanup.
The ordinary staff invitation route still requires an existing AAL2 administrator and a reviewed
assigned target, so usable operator access remains a separate provisioning/acceptance step.

Execution: `scripts/invite-initial-staff.ts` was run once under the exact confirmation guard.
Supabase accepted each of the four requests. Independent count-only readback shows four Auth users,
all matching the authorised named addresses, zero active memberships, zero active application
sessions and zero active tenants. This intentionally supersedes the earlier empty-Auth baseline;
these permanent accounts are not disposable rehearsal fixtures. Inbox delivery and individual
contact/TOTP completion are unverified. No automatic repeat is authorised by an uncertain result.
TypeScript, scoped ESLint, formatting and whitespace checks pass for this bootstrap batch.

- At initial inspection the local branch was `itws-I` at `c4ac54e`, with an owner-staged batch.
  During the checks the owner committed that batch at
  `dec545b9673c04f9600f015decea456069206be1` (`Add recovery and provenance guards`). No agent Git
  mutation occurred. The refreshed browser packet uses that source, before the manual-pause
  harness amendment described below.
- GitHub's exact origin repository reports preview `aae036cb0c5c8618af1d5e47e0c0dc0f53f63505`
  CI run `37910538858` and `itws-I` `dec545b9673c04f9600f015decea456069206be1`
  CI run `37910489260` both completed successfully on refresh. Main
  `7abb3c1d7e4d672a3d77ced3a1fadb0eaee05157` has passing completed runs. These are snapshots,
  not a claim that all branches or deployed Worker source are identical.
- The retirement coordinator blob matches the preview branch exactly:
  `9da29c01b6d4f13b186e723bcf8e3be9952e0ff1`. One matching file is not whole-release equivalence.
- Canonical anonymous first-party empty-command probes: intake client/staff and order each return
  412 (configuration disabled); rights returns 401. No fixture or action is created by these probes.
- Guarded read-only hosted baseline passes: one suspended pilot tenant, zero Auth users and only
  twelve configured fulfilment-provider gates besides that tenant in service-readable data.
  Eighteen resources are deliberately service-unreadable; do not infer their contents from the API.
- Independent SQL counts confirm zero Auth users/sessions, mobile creation receipts/invitations,
  active tenants and proposed isolated rehearsal tenant. No row content is printed.

## TD-066 — Implementation Versus a Temporary Operating Control

The candidate policy, coordinator and provider adapter have 79 passing focused tests. They are
unwired. The native locked repository, confirmation/session-race prevention, contact tombstones,
backup-copy reconciliation and reviewed reissue remain unimplemented. Hosted deployment cannot
turn those interfaces into an operational workflow. TD-066 stays Open.

Full resolution requires the native implementation, local concurrent preservation/uncertainty
tests, separately approved migration, isolated hosted acceptance and exact cleanup. Provider
calls must remain outside database locks; operational deletion must never disable append-only
guards. Do not substitute ad hoc administrator deletion or synthetic fixture cleanup.

### Optional Deadline Control — Proposed, Not Approved or Implemented

The existing debt permits a specifically approved time-bounded operating control as an interim
release disposition, not Verified completion. If selected, it must include all of:

1. Maximum nine approved participants; no batch import, automatic reissue, contact change,
   identity merge or provider deletion. Existing US$5 rolling-day SMS limit remains.
2. Mansoer reviews unconverted invitations and exact creation-receipt manifests daily; Mikhail
   covers absence. Record only opaque references, terminal/due dates and state, not contacts/codes.
3. Converted, pre-existing, held, active-session and domain-associated identities are never treated
   as orphan cleanup candidates. Uncertain creation/delivery stays held without blind resend.
4. Wrong email, existing-account association or failed conversion is a staff-reviewed exception.
   Do not delete/recreate an identity to bypass it. Pause that participant's conversion/reissue.
5. No new invitation/email dispatch after **7 November 2026, 00:00 SAST**, or earlier if any
   unconverted identity reaches 29 days after its terminal event, daily review is missed, a
   preservation invariant fails, or an unresolved rights/retention request arises. A revised
   release decision, not automatic extension, is required before resumption.
6. Before approving this control, implement and test the deadline/stop enforcement and scheduled
   reminder/coverage checks, including containment without preventing existing-account support
   or rights handling. A document alone is not an enforced stop.
7. Finish native retirement and copy/backup reconciliation before the first 30-day retirement
   deadline. Backup retention is not shortened implicitly; retain current disposition evidence so
   erased contacts cannot be resurrected on restore. If the deadline cannot be met, escalate
   before launch rather than promise compliant erasure from register-only sweeps.
8. Record explicit system/security and applicable privacy-owner acceptance, expiry, accountable
   responders and compensating-control test evidence. Generic pilot approval is not this approval.

No exception has been accepted; no runtime deadline or scheduled reminder has been provisioned.
The full-workflow path remains the default unless the owner explicitly selects this narrower path.

### Subsequent Native Local Checkpoint

The earlier unwired-only checkpoint is now superseded for native reservation, quarantine,
contact tombstoning, reviewed new-draft reissue and offline old-copy reconciliation. The
[retirement design](sprint-14-unconverted-identity-recovery.md#native-local-implementation-and-managed-provider-checkpoint--9-october)
records 94 focused tests, 2,169 SQL assertions and actual local managed-provider/concurrency/
encrypted-restore proof with exact cleanup. This is not full operational/R2/hosted completion;
TD-066 remains Open and the migration is unhosted.

Fresh hosted readback still shows four real Auth users, six active operator memberships,
zero confirmed operators and zero verified TOTP factors; `meneer-pilot` remains suspended.
The owner approves staff-only tenant setup with real client modes disabled and intends to release
the isolated TD-064 settings. The current Worker version is still
`fe911ea7-0260-48fb-bf44-721b9bbe1f72`; no replacement release has yet been supplied/observed.
Do not infer encrypted binding values from version metadata or readiness-only 412 responses.
Record the owner's explicit disabled-mode release before the conditional tenant change, then
require each operator's own contact verification and TOTP enrolment. Preserve the four identities
and six grants throughout synthetic cleanup; no invitation resend or real MFA enrolment occurs here.

## TD-064 — Authenticated Hosted Acceptance Completed

The later explicitly authorised configuration release and hosted packet supersede the pending
instructions below. Twelve authenticated conflict/retry/unchanged-state and role-denial checks
pass in `scripts/test-hosted-business-conflicts.ts`. Exact cleanup restores application and real
Auth fingerprints, preserving four staff accounts/six grants. Original Worker version
`fe911ea7-0260-48fb-bf44-721b9bbe1f72` is restored at 13:30 UTC under deployment
`c060982e-2592-4b9f-9cf4-dbb27c639920`; a fresh intake command probe returns disabled HTTP 412.
TD-064 is Verified. No real email, payment or clinical grant is created. The following preparation
instructions are retained as historical provenance, not remaining owner actions.

The guarded SQL correction is already hosted. Reuse the exact isolated configuration packet in
[pre-release gap remediation](sprint-13-pre-release-gap-remediation.md#owner-controlled-hosted-conflict-settings).
The proposed tenant `6d951368-281e-4519-8361-7b5f63efe245` is absent at the fresh count check.

Privately capture prior values/absence; the owner releases that rehearsal-only configuration
with checkout/webhook/refund dispatch and outbound messages disabled. Record its Worker version.
Then use approved isolated fixtures with genuine operations/clinical AAL2 to prove positive,
permanent 409, stale-version, exact replay, denial and unchanged-state outcomes for the applicable
intake/rights/order/alert commands. Fixture prerequisites must not fabricate production funding.
Fingerprint affected data/security metadata before and after rejected commands. Drain requests,
restore disabled settings, revoke sessions and remove only manifested fixtures under the approved
locked cleanup procedure, then independently check the baseline. Never test the real pilot tenant.

No new fixture has been created here; a 412 readiness result is not authenticated conflict proof.

## TD-037/038 — Finite Human Review

**Subsequent disposition:** the owner accepts the manual VoiceOver component without requesting
additional tests. The table below retains the actual observed evidence at the earlier checkpoint;
its pending observations are not newly performed. Do not continue prompting for the same manual
review or misrepresent this risk acceptance as fresh measured evidence.

Retain earlier owner-confirmed local/hosted VoiceOver, actual zoom and phone checks. The owner
agrees to a targeted review now. Capture reviewer, date, actual macOS/browser/VoiceOver and
phone/OS/browser/AT versions, exact reviewed source/Worker version and environment for each row.
Synthetic intercepted local data prove UI behaviour, not hosted persistence or actual delivery.

On 9 October, the owner confirmed the paused local sign-in fixture was visible and VoiceOver
clearly announced Email address, Send code, Six-digit code, request-result and failed-code
feedback, with usable keyboard focus. This is a specific **sign-in** observation on the managed
Chromium/macOS versions below; verification, recovery, sign-out, phone AT and the other rows
are not covered by this confirmation. The grouped account row therefore remains partially open.

| Surface                                 | Specific remaining observations                                                                          | Result                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Account verify/sign-in/recover/sign-out | Email/code labels; pending/result; invalid/expired code; retry and settled focus                         | Sign-in confirmed; other account states pending |
| Account activation                      | Separate receipt checkboxes, profile/contact preference, failure/retry, durable completion               | Pending                                         |
| Portal/dashboard                        | Read/refresh, failure, expiry/revocation clearing and literal payment/refund distinctions                | Pending                                         |
| Rights/support                          | Correction, uncertain same-key retry, receipt versus human action, urgent guidance                       | Pending                                         |
| Questionnaire                           | Eight sections, conditional labels, validation, save failure/retry, review/submit, expiry clearing       | Pending                                         |
| Order review                            | Exact disclosure, unchecked acceptance, expiry/conflict clearing, Checkout versus settlement             | Pending                                         |
| Staff sign-in                           | Email versus MFA, denial, resume/expiry                                                                  | Pending                                         |
| Staff queue                             | Filters/pagination, claim conflict, masked detail, evidence/destination controls, financial read, expiry | Pending                                         |
| Staff intake                            | Purpose/grant denials, protected fields, transfer preparation, stale/expired work                        | Pending                                         |
| Staff alerts/support                    | Load/pending/results, response controls, uncertainty/follow-up, expiry focus                             | Pending                                         |
| Desktop/mobile                          | Keyboard reachability, actual 200%/400% zoom, phone AT names/states/results and readable controls        | Pending                                         |

Do not perform payments, clinical approval, sending, uploads or generator actions during this UI
review. Record defects and exact retests rather than marking every row from a generic “works”.
Provider-owned Checkout accessibility is a separate payment acceptance surface.

## TD-043 — Owner-Confirmed Coverage, Remaining Operational Acceptance

On 9 October the owner confirms all parties agree: Mansoer primary/Mikhail alternate monitor
support/privacy and cover absence; Tasneem/Dr Ziyaad Noor accept clinical escalation roles.
Retain the ordinary 24-hour response target where possible and immediate emergency-care guidance.
This is owner-confirmed actual coverage, not proof of professional registration or agreements.

The owner directs first-name `@meneerhealth.co.za` staff addresses. Preparation mapping:

| Person            | Proposed mailbox           | Intended operational scope                                                                                    |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Mansoer Gallie    | mansoer@meneerhealth.co.za | Primary support/privacy operations; separately governed system/security administration                        |
| Mikhail Robertson | mikhail@meneerhealth.co.za | Alternate support/privacy operations and product-owner responsibilities                                       |
| Tasneem           | tasneem@meneerhealth.co.za | Qualified clinical lead; clinical-purpose/assignment grants only after applicable authority is evidenced      |
| Dr Ziyaad Noor    | ziyaad@meneerhealth.co.za  | Qualified clinical alternate; clinical-purpose/assignment grants only after applicable authority is evidenced |

These are named staff work-address proposals, not patient contacts. Mailbox existence/receipt and
exact recipient confirmation are unverified; no invitation, identity or assignment has been
created. Do not grant clinical authority to administrators or convert these descriptive scopes
into broad native role grants. Resolve the exact supported role/purpose/assignment combination,
independent grant separation and fresh TOTP/AAL2 in the controlled provisioning packet first.
Send approval remains separate from this preparation instruction.

### Approved Staff Access Direction — Individual Identity, Explicit Context

On 9 October the owner accepts shared functional inboxes with individual staff logins and
explicitly authorised role switching. `support@` / `privacy@` are correspondence destinations;
`admin@`, if used, is administrative correspondence, not a shared privileged system identity.
Access to shared inboxes should be delegated to named mailbox accounts, not achieved by sharing
passwords or TOTP. This records the direction only: no mailbox delegation, staff provisioning,
role grant or runtime switch is performed by this approval.

Retain one named system identity each for Mansoer, Mikhail, Tasneem and Ziyaad. The earlier
per-person `.privacy@` account proposal is **superseded**, not another account-creation task.
Each named identity has its own MFA; permitted roles and assignments must be approved individually.
Shared mailbox possession is not authority to perform privacy, clinical or security actions.

#### Pre-Implementation Native Constraint

Source inspection of `20261003205329_workforce_security_context.sql` confirms that context
resolution requires exactly one active non-patient membership per subject. The support HTTP
handler permits `operations:operations`, `support:support`, `auditor:privacy_review` and
`clinician:care_delivery`, but the native support functions further restrict privacy requests
to auditors and clinical requests to clinicians. An operations appointment alone does not grant
privacy or clinical access. Adding a second workforce membership to the same subject is not a
supported context switch and would deny resolution; do not provision conflicting grants.

That baseline could not implement the accepted direction by inserting extra memberships or
trusting a browser-supplied role. The local change recorded below adds a native binding rather
than relaxing that predicate. It still requires hosted acceptance before multi-role provisioning.
Nothing here marks TD-043 Verified.

#### Bounded Implementation and Acceptance

1. Resolve the authenticated named subject and current, independently approved memberships on
   the server. Expose only their available role/tenant contexts after MFA; never accept arbitrary
   subject, permission, purpose or tenant claims as authority. No automatic clinical/admin grant.
2. Bind exactly one selected membership/role/purpose/tenant to a native application session and
   its verified provider session. Recheck validity, assignment and assurance on every protected
   operation. Removing the old single-membership predicate without this binding is insufficient.
3. Switching ends the old application context, issues a new bound context and clears old private
   UI/cache state. Replayed old cookies and in-flight old-context mutations must be rejected at
   the authoritative commit boundary. Existing provider-session revocation/expired-session vetoes
   must be reconciled explicitly, not removed to make switching work. Privileged work retains
   its privileged session class and fresh step-up requirements.
4. Record actor subject, source/destination context, time and outcome without codes, contacts or
   health payloads. A role change does not make the same person an independent approver: existing
   distinct-subject approval/activation separation remains mandatory across contexts.
5. Test one-role compatibility, multi-role selection, ungranted/wrong-tenant/wrong-purpose denial,
   expired/revoked membership/session, stale cookie replay, concurrent switch/command races,
   privilege step-up, independent-approver separation, UI clearing and accessible role controls.
   Verify native SQL, application service, HTTP/cookie and browser layers; then request the exact
   migration approval and owner-controlled release for bounded hosted acceptance.

Intended responsibilities, not provisioned grants:

- Mansoer/Mikhail named identities: separately selected `operations` / `operations` for general
  support, assigned queues and invitations; `auditor` / `privacy_review` for privacy assignments.
- Tasneem/Ziyaad first-name identities: `clinician` / `care_delivery`, only after the separate
  professional-authority gates and assigned medical-grant approval/activation are satisfied.
- Security/grant activation is a separate `admin` / `security_administration` authority. Neither
  an operations account nor a privacy account receives it automatically. Resolve its actual
  independent operator, mailbox and approval before attempting grant activation.

This direction creates no mailbox, Auth user, membership, session, assignment or send. Do not share
accounts or reuse another person's TOTP. Real provisioning requires its own approved manifest,
delivery verification and fresh MFA/denial checks; it must not use disposable fixture cleanup.

Remaining: actual current assigned staff access/AAL2, private roster/purpose/recipient mapping,
unattended authenticated provider callback delivery, failure/suppression/alternate escalation,
quota/headroom and applicable released support acceptance. Prior successful provider receipts
and manually replayed callbacks remain dated evidence, not proof of automatic production push.
Any new delivered-email rehearsal requires an explicitly bounded recipient/send approval; this
packet creates no email or callback configuration. Mark Verified only after applicable proof.

### Local Context-Selection Implementation — Not Hosted Acceptance

The new `20261009101500_workforce_session_context_selection.sql` migration was replayed against
fixed synthetic local Supabase, then applied to hosted Supabase under the owner's specific
approval after the complete local unit matrix passed. After email verification, a multi-role identity must
complete genuine fresh TOTP before receiving its reviewed role choices. Selecting a context
atomically binds one membership to that provider session; an immutable record holds only opaque
identifiers, role, purpose and time. Every selected-context resolution rechecks the current
membership, tenant and provider/application session. Single-role login remains compatible.

The bounded switching design requires sign-out and a new email/TOTP login. It does not mutate a
live role, automatically grant permissions, remove distinct-subject approval requirements or
permit clinical authority through an operations role. The browser clears its choice and session
view on successful sign-out. Other tabs and in-flight commands require additional transition
acceptance; this checkpoint is not proof of that broader property.

- Full local SQL matrix: 44 files, 2,116 assertions passed, including 37 new selection assertions.
- Genuine local Auth/TOTP: single-role session/renewal/revocation and queue claim/replay/release
  passed; competing multi-role selections produce exactly one successful session, stale cookies
  remain denied, and only generated `.invalid` fixtures are removed with guards restored.
- Workforce browser packet: 4/4 desktop/Pixel-7 checks passed, including post-MFA choice focus,
  no premature session controls, axe checks and sign-out clearing. Responses are intercepted
  synthetic fixtures, not hosted persistence or manual VoiceOver evidence.

The full unit matrix passes 158 files / 1,243 tests with the thread pool and verbose reporter;
the default runner stalled without results and was interrupted, not recorded as a pass.
TypeScript, ESLint, formatting, production build/client-bundle checks, portability, generated-route
and diff checks pass. Local Supabase is stopped with volumes retained after fixture cleanup.

Hosted readback confirms exact migration history `20261009101500`, forced RLS, no direct read
privileges for anonymous/authenticated/service roles, active immutable guard, service-only new
functions and inaccessible retired resolver. The journal remains empty, Auth users remain zero
and no tenant is active. Security advisors report informational deny-all-RLS/no-policy findings;
no access policy was added to silence these. This is schema readback, not hosted Auth acceptance.

TD-043 stays Open. Next require an owner-controlled source release and bounded hosted acceptance.
Real staff identities, independently
approved grants and inbox delegation have not been provisioned. Existing target-invitation policy
still denies ambiguous multi-membership targets; provisioning must address that deliberately,
not bypass it. TD-066 native retirement and TD-064 hosted conflict acceptance are unaffected.

## Validation Record

The refreshed nine-file desktop/mobile browser packet passes **88/88 in 7.8 minutes** with
Node 22.23.2 / Playwright 1.62.1 / managed Chromium 151.0.7922.34. Its first sandboxed attempt
failed before testing on Cloudflare inspector port 9229 (`listen EPERM`); the same source/packet
was rerun with permitted local port access, not a runtime workaround. This is local intercepted
UI evidence, not authenticated hosted acceptance or spoken-output proof.

The workstation reports macOS 26.6.2 build 25G83 and installed Google Chrome 154.0.8037.100;
installed Chrome is not the managed browser used above and is not an AT review observation.
The manual review mode in `client-form-accessibility.spec.ts` now pauses the selected fixture
before automatic interactions and labels the run `manual-review-only`. Resuming closes that
manual scenario; it must not be counted as automated or hosted acceptance. Ordinary CI remains
on the existing non-paused path. No runtime application or provider configuration is changed.
After that harness-only amendment, the ordinary desktop sign-in regression passes **1/1 in
45.7 seconds**, strict TypeScript and ESLint pass, and formatting/whitespace checks pass.

Two initial headed review attempts failed the five-second Send code readiness assertion before
reaching the manual checkpoint. The explicit manual-review mode now allows thirty seconds for
that hydration assertion; ordinary CI retains five seconds. The retry reached human review and
the owner confirmed the observations above. The paused runner was deliberately interrupted
afterwards (exit 130), so it is **not** recorded as a passing automated test. No production
runtime workaround, provider request or VoiceOver setting change was made by the agent.
After the final manual-only timeout adjustment, the ordinary desktop sign-in regression again
passes **1/1 in 25.5 seconds**; strict TypeScript, focused ESLint and whitespace checks pass.

First safe headed fixture (all unexpected POSTs intercepted; no emails/accounts created):

```sh
CLIENT_FORM_MANUAL_REVIEW=voiceover-local-synthetic bun --no-env-file run test:e2e:headed -- e2e/client-form-accessibility.spec.ts --project=desktop-chromium --grep '/account/sign-in client'
```

With VoiceOver, review the email label, Send code, synthetic pending transition, six-digit code,
failed-verification feedback and return/retry focus. Use only `accessibility@example.invalid` and a dummy
code. Do not infer email delivery: the transport is intercepted. Record actual observations before
resuming the Inspector. Other surfaces retain the table's Pending state until actually reviewed.
