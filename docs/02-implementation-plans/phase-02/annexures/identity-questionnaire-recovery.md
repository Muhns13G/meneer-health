# Identity and Questionnaire Recovery — 9 October Checkpoint

Status: Verified for the retained identity/questionnaire scope. Uploads remain deferred and unverified.
This evidence does not activate the pilot or authorise restoring into an active database.

## Defect and Correction

Offline quarantine revoked active medical grants but did not prevent a pending approval from an
older backup being activated afterward. `20261009074145_medical_restore_grant_epoch.sql` introduces
a non-decreasing intake restore cutoff. Both grant wrappers lock the intake and reject quarantined
or deleted records; activation additionally rejects approvals recorded at/before the cutoff.
Existing role, assignment, purpose, field, snapshot, expiry and independent-actor checks remain in
the inaccessible inner functions. A second quarantine invalidates earlier recovery approvals too.

The owner explicitly approved hosted application. Readback confirms the cutoff constraint/trigger,
empty function search paths, service-only public wrappers and inaccessible retired/private functions.
Hosted baseline remains zero intakes, medical grants and Auth users, with one suspended tenant.
Supabase assigned history `20261009074931`; the owner separately approved correcting that exact
entry to `20261009074145`, and readback confirms the matching local filename version. The migration
does not execute offline quarantine.

## Local Evidence

- Full SQL matrix: 43 packets / 2,079 assertions pass. The strengthened medical rights packet proves
  pending/active old authority denial, immutable cutoff, fresh clinical approval plus independent
  security activation, scoped rights access, second-restore denial and current/historic deletion
  reconciliation. SQL Auth fixtures are synthetic prerequisites, not provider-backed MFA proof.
- The actual local encrypted application dump/restore exercise passes, with checksum reconciliation,
  provider-loss rejection, stable-subject relink, fresh contact verification, genuine new workforce
  TOTP, restored session/membership/assignment revocation and contact-only erasure reconciliation.
  Its restored medical tables are empty: quarantine execution is checked, not populated medical
  ciphertext restoration. It explicitly reports medical-record/domain-grant/hosted recovery unproven.
- TypeScript validation passes. These checks send no emails and perform no provider payments.

## Populated Local and Bounded Hosted Acceptance — 9 October

- `bun --no-env-file run test:questionnaire:recovery` passes: two intakes/four encrypted snapshots,
  production-format archive encryption/decryption, matching counts/row fingerprints/checksum,
  snapshot decryption and wrong-key/scope denials. A newer source ledger deletes current/historic
  ciphertext for one intake and preserves restriction plus safety/lifecycle holds for the other.
  Missing/stale ledgers cannot mutate restored rows. Old grants are revoked; quarantine and the
  restore-authority cutoff remain. The local baseline is unchanged and both disposable databases
  are removed. Observed elapsed time: 43,579 ms.
- The expressly approved `test:questionnaire:recovery:hosted` passes in 184,573 ms. Four disposable
  hosted identities and an isolated synthetic tenant create two intakes/four snapshots. A real
  hosted logical export is encrypted before its in-memory handoff to the offline local restore.
  The newer disposition ledger is read back from hosted rows independently of that archive.
  The imported archive restores with matching fingerprints, decryptable snapshots and erasure/hold
  reconciliation. No archive is restored into hosted Supabase or the running local application.
- Hosted provider-loss checks revoke sessions, delete/recreate only the three synthetic staff
  identities, reverify contact without sending email, preserve stable application subjects and
  enrol different genuine TOTP factors. Old tokens, missing/revoked membership, old medical approval
  and absent/unactivated grants are denied. Fresh clinical approval plus independent security
  activation permits only the auditor's approved contact field; the deleted intake remains denied.
  This combines an actual offline archive restore with hosted provider/domain-authority checks;
  it is not a restored hosted environment or recovery of provider-managed Auth/MFA state.
- Exact all-row/security/trigger/function fingerprints match after cleanup. Independent hosted
  readback confirms zero Auth users/sessions/factors, subjects, intakes, snapshots, medical approvals,
  grants and restore dispositions; one suspended pilot tenant; zero disabled application triggers.
  Emails, payments, Worker-setting changes, uploads and generator actions: zero.
- Final regression: Node 22 Vitest passes 156 files / 1,194 tests; TypeScript, ESLint, full Prettier,
  portability and staged/unstaged whitespace checks pass. The local populated restore is added to
  serialized CI; the hosted fixture runner is never included in CI. Local Supabase services are
  stopped with their synthetic volumes preserved. New commit/deployment/CI acceptance remains the
  owner's workflow, not an action performed by this rehearsal.

## Custody, Isolation and Operational Boundary

Mansoer confirms independently secured off-device recovery custody of medical key ID
`medical-intake-i8-20261005`, recoverable by Mansoer/Mikhail alongside the archive key. Configuration
presence/key IDs were checked without printing keys. The exercises use separate ephemeral synthetic
keys; they do not claim an off-device retrieval drill of the production key or restore real records.
Recovery primary: Mansoer Gallie; alternate: Mikhail Robertson. Preserve both independent key copies
and historical medical key IDs while recoverable ciphertext exists.

The existing one-hour RPO, four-hour RTO and 35-day encrypted archive retention remain unchanged.
Both measured synthetic exercises fit the RTO; this is not a guarantee for production volume or a
new observation of hourly scheduler health. Before any real recovery, inspect backup age/heartbeat,
obtain a complete independently current disposition ledger, keep the destination offline, revoke
restored authority and separately approve release. Missing custody/ledger or stale backup is NO-GO.

Provider ACL grantors are not portable: disposable restores use `--no-owner --no-acl`, immediately
deny PUBLIC/anon/authenticated/service-role schema/table/function access, and remain custodian-only
with no API binding. Never promote that test database as a production recovery; reviewed ownership,
ACL/RLS, functions and fresh authority are separate release prerequisites. Auth/Storage are excluded.

TD-065 is Verified only under the owner's questionnaire-only/no-upload scope amendment. Upload
implementation, malware handling, retention and metadata/object-byte recovery must be independently
accepted before uploads are enabled; none is claimed here. Other launch debts remain. Git staging,
commits and releases remain owner controlled; this evidence does not activate the pilot.
