# Protected Medical Intake — Release and Recovery

Status: I2–I7 local implementation/verification accepted; approved hosted migrations applied.
Hosted I8 rehearsal and live clinical
publication are separate gates. This runbook does not activate collection or approve clinical care.

## Isolated Rehearsal

5 October checkpoint: all 35 hosted migration versions match the committed files; all 18 intake
tables are empty with forced RLS. The owner will deploy the code. No medical key or synthetic runtime
fixtures have yet been provisioned. Fresh provider login reaches `/subscribe`; obtain restored
entitlement before claiming current generator compatibility. Never purchase a subscription as part
of this rehearsal without separate owner action.

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

## Medical Rights and Provider Copies

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
