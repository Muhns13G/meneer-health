---
task: 5.19
status: hosted-round-trip-pending
date: 2026-08-12
related_debt: [TD-020]
---

# Sprint 05.19 — Hosted Recovery Export Evidence

## Outcome

The hosted recovery boundary is provisioned and its upload, durable-write failure, and
alert/recovery paths are verified. The repository now implements the complete provider-backed
download/decrypt/restore/reconcile/delete round trip; a successful hosted workflow run remains the
final acceptance step. Cloudflare R2 bucket
`meneer-health-recovery-production` is private, uses EU jurisdiction and Standard storage, exposes
no public URL, custom domain or CORS policy, and deletes objects after 35 days. Credential
`meneer-health-recovery-writer` has Object Read & Write access to this bucket only; existing broad
Cloudflare credentials are not reused and the public Worker has no recovery-bucket binding.

Better Stack heartbeat `481481` expects one payload-free success every hour, allows 15 minutes of
grace, alerts the company-controlled email channel, and escalates to the team after three minutes.
It is Up after the controlled incident/recovery exercise; no application log or private payload is
connected.

## Repository Boundary

`.github/workflows/recovery-export.yml` provides a guarded GitHub Actions runner because the
Cloudflare Worker cannot execute `pg_dump`. It supports an explicit synthetic dispatch and an
hourly production schedule. Scheduled execution requires the exact repository variable
`RECOVERY_EXPORT_ENABLED=true`; it is currently `false`.

The runner:

1. validates every runner-only value without echoing it;
2. creates a PostgreSQL 17 custom-format export of the six governed schemas, or creates a real
   three-record synthetic PostgreSQL database and custom-format dump for controlled proof;
3. encrypts the archive with the existing AES-256-GCM recovery contract;
4. writes only the encrypted envelope to the private EU R2 bucket;
5. in synthetic mode, downloads the exact object, verifies the encrypted body, decrypts it,
   validates its manifest and payload checksum, restores it into a fresh PostgreSQL database, and
   reconciles its record count and fingerprint;
6. deletes the synthetic test object, including on verification failure; and
7. sends the payload-free heartbeat only after every applicable storage and verification step
   succeeds.

The R2 credential pair, heartbeat URL, and recovery encryption key are stored as encrypted GitHub
Actions secrets. The bucket, account identifier, and disabled activation flag are repository
variables. The ignored local recovery-key copy has owner-only permissions. The production database
URL is intentionally absent pending hosted-schema activation; independent off-device key custody
remains a production-activation control.

## Acceptance Status

| Control                         | Evidence                                                           | Status                |
| ------------------------------- | ------------------------------------------------------------------ | --------------------- |
| Private EU off-site bucket      | Private EU R2 bucket; no public access; scoped writer              | Pass                  |
| Retention                       | Delete-after-35-days lifecycle rule                                | Pass                  |
| Success ordering                | Unit coverage requires upload before heartbeat                     | Pass                  |
| Secret minimisation             | No secret in Git, Worker variables, command arguments or logs      | Pass                  |
| Schedule safety                 | Hourly cron is fail-closed behind `RECOVERY_EXPORT_ENABLED=false`  | Pass                  |
| Hosted synthetic export         | Runs `31545210677` and `31545772038`; private encrypted R2 objects | Pass                  |
| Failed-write/no-heartbeat proof | Run `31545509397`; durable-write failure and unchanged heartbeat   | Pass                  |
| Missed-heartbeat alert/recovery | Incident `1000419671`; acknowledged and automatically resolved     | Pass                  |
| Hosted download and decryption  | Implemented and unit tested; hosted workflow acceptance run needed | Awaiting hosted run   |
| Restore and reconciliation      | Real local PostgreSQL dump/restore passes; hosted run needed       | Awaiting hosted run   |
| Synthetic-object cleanup        | Explicit delete implemented in a `finally` boundary; run needed    | Awaiting hosted run   |
| Production export               | Hosted Supabase has no application migrations and no runner DB URL | Blocked by activation |

## Hosted Exercise Evidence

- Run `31545210677` completed on the corrected `main` implementation and wrote a 734-byte encrypted
  `application/octet-stream` object to the private Standard-storage bucket. Public access remained
  disabled and the enabled 35-day deletion rule covered the object.
- The repository bucket variable was changed temporarily to a nonexistent controlled target. Run
  `31545509397` failed with `RECOVERY_DURABLE_WRITE_FAILED`; the heartbeat timestamp did not move.
  The permanent bucket variable was restored immediately and reverified.
- The heartbeat window was temporarily reduced to one minute plus one minute of grace. Missed-
  heartbeat incident `1000419671` opened, was acknowledged by the owner, and resolved automatically
  when successful run `31545772038` stored the next encrypted object and emitted the payload-free
  heartbeat.
- The permanent heartbeat policy was restored and verified as Up with a one-hour interval,
  15-minute grace period, controlled email notification, and three-minute team escalation.
- The corrected local acceptance exercise created a 3,349-byte PostgreSQL 17.6 custom-format dump,
  restored all three synthetic records into a fresh isolated database, and matched the source and
  restored fingerprints. Unit coverage also proves read-after-write ordering, decryption and
  reconciliation failures suppress the success heartbeat, and synthetic object deletion is
  attempted through the verification cleanup boundary.

Task 5.19 remains open against its original acceptance criteria until a provider-backed exercise
successfully exercises the newly implemented upload/download/decrypt/restore/reconcile/delete path
and confirms the success heartbeat advances only afterward. Production scheduling remains disabled
and still requires hosted migrations, an IPv4-compatible
session-pooler URL, independent off-device key custody, and a successful isolated production-format
restore.
