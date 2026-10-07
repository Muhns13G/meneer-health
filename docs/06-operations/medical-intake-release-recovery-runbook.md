# Protected Medical Intake — Release and Recovery

Status: I2–I8 engineering verification accepted, with the owner's external-generator exception;
approved hosted migrations applied. Live clinical publication and current provider compatibility
remain separate launch gates. This runbook does not activate collection or approve clinical care.

## Isolated Rehearsal

5 October checkpoint: 36 hosted migration versions are applied. The owner authorised a bounded
synthetic runtime rehearsal; real HTTP Auth/AAL2, intake commands, independent grants, restriction,
retained export and revocation checks pass. Brevo records `delivered` at 15:41:05 SAST on 5 October.
After the owner's initial non-receipt report, direct browser inspection found the exact generic
alert in Gmail's Updates category, addressed to `support@meneerhealth.co.za` at 15:41 SAST.
Mailbox visibility is verified separately from provider acceptance; it is not clinical acknowledgement.
The restricted-safety review correction now passes its approved hosted replay and exact
field-projection check; TD-058 is Verified. The local suite passes 1,007 assertions.
Final Worker `ac94b09c-efa8-453a-a8db-c171d1755acf` restores disabled intake, removes the temporary
tenant binding and retains the dedicated server-only key; disabled endpoints again return 412.
Synthetic sessions, fixture rows and all five Auth users were removed through the approved scoped
cleanup. Every named trigger was restored before commit; independent inventory confirms the original
one suspended tenant/12-provider-gate baseline and zero disabled user triggers. A separate real hosted
patient browser rehearsal passes OTP sign-in, privacy acknowledgement, branching, validation,
draft/resume, persisted submission, amendment access, mobile layout and wall-clock expiry hiding.
Keyboard/accessibility-tree review supplements the controlled desktop/mobile axe checks; no certified
assistive-technology audit is claimed. Its fresh fixtures and five Auth users were also removed.
Fresh provider login reaches `/subscribe`; the owner explicitly excepted this unavailable walkthrough
from I8 closeout. Obtain restored
entitlement before claiming current generator compatibility. Never purchase a subscription as part
of this rehearsal without separate owner action.

After entitlement is restored, complete the
[generator reactivation and compatibility checklist](../05-future-considerations/protocol-generator-reactivation-and-compatibility.md)
before real manual transfer. It covers the deferred I8 provider proof, field mapping, historical
output/PDF findings and governed transfer/failure evidence; subscription renewal alone is not activation.

1. Confirm the hosted baseline using counts only: one suspended pilot tenant, no real identities or
   client records. Preserve owner approval for migrations, synthetic fixtures, emails and cleanup.
2. Review/replay the intake migrations and run the local SQL, application, browser and recovery
   checks. Never copy `supabase/seed.sql` to hosted Supabase.
3. Use a separate randomly generated 32-byte medical key in `MEDICAL_INTAKE_KEYRING_JSON`, shaped as
   `{"current":"approved-key-id","keys":{"approved-key-id":"<32-byte-base64>"}}`. Keep it server-only
   in ignored local records and Worker secrets. Do not reuse session, journey or recovery keys.
4. The owner releases the reviewed code, unless a bounded deployment is expressly authorised.
   Temporarily enable `MEDICAL_INTAKE_MODE=enabled` and bind `MEDICAL_INTAKE_TENANT_ID` only to the
   isolated synthetic tenant. No other tenant is permitted through these handlers.
5. Exercise real patient/workforce Auth, expiry/revocation, AAL2, notice acknowledgement, draft,
   submission/amendment, safety holds, purpose/field/snapshot grants, own export/restriction and
   denial paths. Private publications/rosters are explicitly synthetic, not legal or clinical approval.
6. Verify generic safety-alert receipt separately from transport acceptance. No questionnaire text,
   clinical identifiers, client names, evidence references or protocol data belongs in an email.
7. Keep the production deposit gate closed. Positive transfer proof uses only the approved
   rollback-only local synthetic payment substitution; it is not a deployable paid flag.
8. Revoke test sessions first, then remove only identified fixtures using the reviewed scoped
   cleanup transaction. Restore intake to disabled and remove the synthetic tenant binding.
   Recheck the original baseline. Record evidence without secrets or medical payloads.

The guarded interactive `scripts/test-hosted-medical-intake.ts` is a dated rehearsal helper, not a
deployment, fixture-setup or cleanup authority. It keeps Auth codes, TOTP secrets and cookies in
memory and logs only coded status/opaque fixture receipts. Its `resume` action is pinned to this
exercise's five disposable identities and resets only their MFA factors; it is not a general Auth
reset tool. SQL setup and locked cleanup are independently reviewed. Read commands still require
idempotency headers; staff sign-out requires the explicit `action=sign-out` form field.

## Medical Rights and Provider Copies

### First-Party Preparation — Synthetic Hosted Proof, Real Use Gated

Task 13.5 adds `prepare_transfer` on the protected staff intake command endpoint. Before manual
external work, the assigned current claimant needs an independently approved medical-transfer
grant for the exact submitted snapshot, current client recipient/notice authorisation and verified
deposit. Account/instruments, safety/restriction/holds, AAL2, assignment and case version are live
guards, not checkboxes or supplied paid flags. Preparation sends nothing and approves no protocol.
It records a bounded immutable intent and advances ready atomically with audit; refresh the queue
for the incremented case version before `record_transfer`. Recording/replay rechecks authority and
binds that intent; a different assigned operator independently reconciles opaque evidence without
medical answers. Expiry or an uncertain external action is not permission to automatically resend.

The separately approved migration `20261007204237` is now hosted; the owner deployed the reviewed
handler/control. [Task 13.5](../02-implementation-plans/phase-02/annexures/sprint-13-5-protocol-bridge-rehearsal.md)
proves actual submitted intake/case linkage, genuine signed sandbox deposit, protected transition/
record binding/replay/denials and independent nonclinical reconciliation, then exact refund and
independent restoration of 127-table baseline/Auth/triggers/disabled settings. Keep intake/commerce
disabled outside a freshly approved bounded rehearsal or formal release decision. The temporary
medical tenant binding was removed; the existing keyring was not rotated. A controlled browser
response or synthetic Meneer provider reference is not actual generator delivery/acknowledgement.

Own exports include retained submitted-version history. Restriction prevents ordinary display,
review and transfer; retained-data export is separately authorised. An unresolved safety hold is
not silently cancelled: only its independently approved medical-safety grant can remain usable.
This safety/rights precedence requires privacy/clinical publication review before real collection.

Ordinary drafts expire after 30 days unless held. Submitted snapshots retain the six-year engineering
baseline or a longer reviewed deadline; the clinical/privacy custodian must confirm the applicable
trigger. Clinical disposition approval and independent rights execution are distinct commands.
Transferred copies require an independent assigned operations verifier to record an opaque
provider-disposition evidence reference for every transfer against the exact disposition approval.
An entry is evidence of a verified external action, not an API deletion. Future deadlines and holds
still deny deletion. Ciphertext can be erased while immutable receipt metadata remains.

## Offline Restore

Never restore an old backup into an active application database. Disable application credentials,
network access, intake mode and notification dispatch before importing into an isolated destination.
Include `intake_private` in encrypted recovery exports and count/checksum reconciliation.

As the database custodian, invoke `intake_private.quarantine_restored_medical_intakes()` before any
application access. It quarantines every intake and revokes old medical grants. Obtain an independently
verified **current** disposition ledger, not the ledger bundled with the older backup. Each row is
`intakeId`, `tenantId`, `subjectId`, `version`, `state`, `safetyHold`, `lifecycleHold`; no answer payload.
Record a separate opaque evidence reference, then invoke
`intake_private.reconcile_restored_medical_intakes(exercise_id, evidence_reference, ledger)`.

Missing/mismatched/older rows fail reconciliation; restored deletions erase current and historic
ciphertext without deleting receipts. Reconciliation deliberately leaves quarantine in place.
These functions are unavailable to application/service credentials and have no HTTP release switch.
The owner and clinical/privacy custodians must independently verify current restrictions, holds,
provider-copy evidence, keys and fresh grants before a separately reviewed release procedure.
No automatic restore activation or unverified bulk clearing is permitted.
