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

The repository owner must provision the private EU R2 bucket, lifecycle expiry, scoped binding,
encryption key, hourly runner, and Better Stack heartbeat; then fail-test storage and heartbeat
alerts. No hosted credential or endpoint belongs in Git. Record redacted IDs/timestamps and a real
synthetic restore result before pilot activation. Supabase Free has no automatic backup/PITR, so a
missed export pauses intake rather than silently weakening recovery controls.
