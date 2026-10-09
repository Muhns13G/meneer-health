# TD-066 — Hosted Retirement Acceptance, 9 October 2026

Status: **Verified** for the implemented provenance-scoped retirement, reconciliation, private
copy-maintenance and reviewed reissue workflow. This is not pilot activation or a claim that
production backups have already aged out.

The owner expressly approved both migrations and an isolated no-send provider/R2 exercise.
`20261009114715_mobile_orphan_retirement.sql` and
`20261009132624_mobile_orphan_copy_completion.sql` are hosted with exactly matching filename
history. Private orphan tables retain forced RLS and deny direct browser/service-role reads;
maintenance is through authority-checked service-only functions.

## Acceptance

`scripts/test-hosted-mobile-orphan-retirement.ts` uses actual managed Auth insertion/provenance,
genuine TOTP/AAL2, native repositories and an isolated tenant. Twelve checks pass:

- Email-only and wrong-tenant authority denied.
- Actual managed insertion captures the attributable creation receipt.
- Eight competing reservations yield one operation and exactly one deletion owner.
- Managed contact confirmation is quarantined during retirement.
- A different request key is denied; an uncertain outcome never permits a blind repeat deletion.
- Exact provider deletion is independently reconciled to absence and contact-only tombstoning.
- A current disposition is encrypted, uploaded to private EU R2, downloaded, decrypted and checked.
- Copy maintenance refuses premature completion; a reviewed reissue creates a new draft, not a send.

The synthetic invitation/receipt timestamps model elapsed retention; no real waiting-period expiry
is claimed. The incomplete/live-claim fixtures were refused, corrected and fully cleaned before
the successful run. No production preservation guard was weakened for retirement calls.

The R2 adapter uses existing Wrangler OAuth in memory, pins EU jurisdiction and proves complete
inventory exhaustion. Missing final-page metadata triggers an advancing lexicographic request;
ignored/repeated continuation and duplicate objects fail closed. It creates no credential and
never logs/persists a token. Existing recovery objects are inventoried, not downloaded or deleted.

## Cleanup and validation

The successful run reports four real staff preserved, six real grants preserved, exact application
and real-Auth fingerprint restoration, zero messages and no pilot activation. Only its one newly
created synthetic encrypted R2 object is removed. Existing R2 inventory entries remain unchanged.
Scoped locked cleanup restores each named guard before commit. Independent hosted readback
confirms one suspended pilot tenant, four Auth users, six memberships, no retirement/copy/mobile
fixture residue and enabled guards.

Focused unit tests: **110/110**, including eight R2 adapter tests and eight copy-maintenance tests.
Typecheck, scoped ESLint, formatting, portability and diff checks pass. The preceding local matrix
passed 2,182 SQL assertions across 45 packets plus the managed-provider/concurrency/encrypted
older-snapshot exercise. Hosted testing does not replace the full owner-run commit CI matrix.

## Ongoing operating control

Mansoer is primary; Mikhail is alternate. Follow the
[private maintenance runbook](../../../06-operations/mobile-orphan-maintenance-runbook.md).
Actual retirements remain `copies_pending` until at least 36 days after independently observed
provider absence **and** a fresh complete inventory proves no older objects remain. Refresh current
dispositions while pending. Recoveries must obtain current disposition evidence independently of
an older archive; otherwise keep the restored system quarantined. No cron, public deletion route,
automatic resend, existing-backup deletion or real staff MFA enrolment is introduced.
