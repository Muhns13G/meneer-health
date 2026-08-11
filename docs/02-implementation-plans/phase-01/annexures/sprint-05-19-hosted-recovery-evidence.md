---
task: 5.19
status: hosted-proof-pending
date: 2026-08-11
related_debt: [TD-020]
---

# Sprint 05.19 — Hosted Recovery Export Evidence

## Outcome

The hosted recovery boundary is provisioned but not yet activated. Cloudflare R2 bucket
`meneer-health-recovery-production` is private, uses EU jurisdiction and Standard storage, exposes
no public URL, custom domain or CORS policy, and deletes objects after 35 days. Credential
`meneer-health-recovery-writer` has Object Read & Write access to this bucket only; existing broad
Cloudflare credentials are not reused and the public Worker has no recovery-bucket binding.

Better Stack heartbeat `481481` expects one payload-free success every hour, allows 15 minutes of
grace, alerts the company-controlled email channel, and escalates to the team after three minutes.
It remains Pending until the first valid export completes; no application log or private payload is
connected.

## Repository Boundary

`.github/workflows/recovery-export.yml` provides a guarded GitHub Actions runner because the
Cloudflare Worker cannot execute `pg_dump`. It supports an explicit synthetic dispatch and an
hourly production schedule. Scheduled execution requires the exact repository variable
`RECOVERY_EXPORT_ENABLED=true`; it is currently `false`.

The runner:

1. validates every runner-only value without echoing it;
2. creates a PostgreSQL 17 custom-format export of the six governed schemas, or a fixed synthetic
   payload for controlled proof;
3. encrypts the archive with the existing AES-256-GCM recovery contract;
4. writes only the encrypted envelope to the private EU R2 bucket; and
5. sends the payload-free heartbeat only after the durable write succeeds.

The R2 credential pair and heartbeat URL are stored as encrypted GitHub Actions secrets. The
bucket, account identifier, and disabled activation flag are repository variables. The encryption
key and production database URL are intentionally absent pending owner-controlled secret custody
and hosted-schema activation.

## Acceptance Status

| Control                         | Evidence                                                           | Status                |
| ------------------------------- | ------------------------------------------------------------------ | --------------------- |
| Private EU off-site bucket      | Private EU R2 bucket; no public access; scoped writer              | Pass                  |
| Retention                       | Delete-after-35-days lifecycle rule                                | Pass                  |
| Success ordering                | Unit coverage requires upload before heartbeat                     | Pass                  |
| Secret minimisation             | No secret in Git, Worker variables, command arguments or logs      | Pass                  |
| Schedule safety                 | Hourly cron is fail-closed behind `RECOVERY_EXPORT_ENABLED=false`  | Pass                  |
| Hosted synthetic export         | Requires committed workflow plus owner-custodied encryption key    | Pending               |
| Failed-write/no-heartbeat proof | Requires controlled hosted dispatch with invalid bucket scope      | Pending               |
| Missed-heartbeat alert/recovery | Requires the first successful heartbeat, then a controlled miss    | Pending               |
| Production export               | Hosted Supabase has no application migrations and no runner DB URL | Blocked by activation |

Task 5.19 remains open until the committed workflow completes one synthetic encrypted upload, the
stored object is verified as private and expiring, a failed durable write emits no heartbeat, and
the Better Stack missed-heartbeat alert/recovery path is evidenced. Production scheduling must not
be enabled until hosted migrations, the IPv4-compatible session-pooler URL, secret custody, and a
successful isolated restore are approved.
