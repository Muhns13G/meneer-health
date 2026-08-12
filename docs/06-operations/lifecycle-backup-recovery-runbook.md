# Lifecycle, Backup, and Recovery Runbook

## Scope

This runbook governs data-subject requests, holds, recovery exports, restore exercises, and deletion
reconciliation for the v1 Supabase/Cloudflare stack. It does not approve real data, provision hosted
resources, or replace named privacy, clinical, security, and release approval.

## Data-Subject Workflow

1. Verify the requester and tenant/subject scope outside ordinary email, then open the request with
   an AAL2 auditor/admin acting for `privacy_review`.
2. Access exports store only an evidence digest and expire after 24 hours. Delivery must use a
   separately approved secure expiring channel.
3. Before erasure, check purpose-specific legal/clinical holds. Holds require an authority code,
   review within 90 days, and explicit release.
4. Erasure removes contact/provider mappings, revokes access/session state, and marks the opaque
   subject erased. It remains `pending_reconciliation` until database, identity, private storage,
   and recovery-backup destinations are evidenced.
5. Never report completion while any destination remains pending. Audit facts contain identifiers,
   outcome codes, and allowlisted metadata—not exported or deleted content.

## Recovery Export

- Run at least hourly for critical pilot state to support the approved one-hour RPO. Retain encrypted
  recovery objects for no more than 35 rolling days.
- Export governed application PostgreSQL schemas and an object checksum/deletion manifest. Supabase
  Auth and private Storage require their separately authorised export steps before hosted activation.
- Encrypt the complete archive with AES-256-GCM before durable write. Store only encrypted archives
  in the private EU-jurisdiction R2 recovery bucket with separate least-privilege credentials.
- Call the Better Stack heartbeat only after the durable write succeeds. The call carries no body,
  identifiers, object names, database names, counts, errors, or command output. A failed write must
  never emit success.

## Restore and Reconciliation

Run `bun run exercise:recovery` while the synthetic local Supabase stack is active. The exercise:

1. creates an application-schema logical archive;
2. encrypts and decrypts it through the production-format boundary;
3. restores into a new temporary PostgreSQL database;
4. compares per-table counts and deterministic checksums;
5. records actual RPO/RTO and payload-free heartbeat evidence; and
6. drops the temporary database and plaintext working file.

A mismatch, decryption failure, missed heartbeat, RPO over one hour, or RTO over four hours fails the
exercise. After any real restore, reapply current restrictions, holds, erasure tombstones, and
pending processor reconciliations before releasing the environment.

## Hosted Owner Activation

The private EU R2 bucket, 35-day lifecycle rule, bucket-only S3 credential, and Better Stack
heartbeat are provisioned. The public Worker deliberately has no recovery binding. GitHub Actions
owns the hourly runner because it can execute the PostgreSQL 17 dump image; the schedule remains
fail-closed while repository variable `RECOVERY_EXPORT_ENABLED` is not the exact string `true`.

The Task 5.19 controlled synthetic dispatch, private-object inspection, failed-write/no-heartbeat
exercise, missed-heartbeat acknowledgement, and automatic recovery passed on 12 August 2026. The
permanent bucket variable and one-hour/15-minute heartbeat policy were restored after the exercise.

Before production activation, the repository owner must:

1. generate a 32-byte encryption key, store its base64 form as GitHub secret
   `RECOVERY_ENCRYPTION_KEY_BASE64`, and retain an independently secured recovery copy;
2. retain the verified synthetic success/failure and alert/recovery evidence without exposing
   secret values or encrypted object contents;
3. retain an independently secured off-device copy of the encryption key and rehearse its recovery
   with authorised custodians; and
4. only after hosted migrations are approved, store an IPv4-compatible Supabase session-pooler
   connection as `SUPABASE_DB_URL`, prove an isolated production-format restore, then set
   `RECOVERY_EXPORT_ENABLED=true`.

No hosted credential or endpoint belongs in Git, Worker configuration, `VITE_*`, logs, command
arguments, or screenshots. A missed export pauses intake rather than silently weakening recovery
controls.
