# Private Unconverted Identity Maintenance

This exact-ID administrative command implements TD-066's retirement/copy/reissue machinery.
It is not a public route, unattended sweep, general account deletion tool or pilot activation.
Both hosted migrations are applied with matching filename history and the isolated
[hosted acceptance](../02-implementation-plans/phase-02/annexures/td-066-hosted-retirement-acceptance.md)
passes. No emails, SMS or spend reservations are made by this command. Real maintenance still
requires the exact individual authority and preservation checks below.

## Authority and command

Use an individual, active, assigned operations session with genuine TOTP refreshed within five
minutes. Save its sealed `__Host-meneer-workforce` cookie and an exact command in an ignored
dot-prefixed `*.local` file with mode 0600. Do not paste it into chat or Git. The command contains
only `tenantId`, `emailInvitationId` and `requestKey` UUIDs. Reuse the same request key when
reconciling an uncertain result. Never select a target by email alone.

Run with the ignored environment containing the managed Supabase administrative credentials,
identity-session cookie key, separate recovery-encryption key and EU R2 credentials:

```sh
MOBILE_ORPHAN_MAINTENANCE_CONFIRM=exact-id-fresh-operations-totp \
MOBILE_ORPHAN_MAINTENANCE_FILE=.orphan-maintenance.local \
bun --env-file=.env.production.local run scripts/run-mobile-orphan-maintenance.ts
```

Alternatively, explicitly set `MOBILE_ORPHAN_R2_AUTH=wrangler-oauth` to use the existing interactive
Cloudflare login in memory, rather than adding S3 credentials. Supply `CLOUDFLARE_ACCOUNT_ID` and
`RECOVERY_R2_BUCKET` in the ignored environment in either mode. This path creates no token, prints
no token and persists no token; it pins the EU jurisdiction. Inventory pages without final-page
metadata are followed by an advancing `start_after` request until exhaustion is proved.

The native reservation rechecks creation provenance, terminal age, sessions, contact verification,
holds, memberships, other invitations and domain associations under shared locks. Confirmation,
session creation and new associations are quarantined while retirement is uncertain. Exactly one
reservation owns provider deletion. A failed/uncertain response is reconciled by exact provider ID;
it never authorises another delete, resend or deletion of a pre-existing/converted identity.

## Copies and recovery

Independent provider absence permits contact-only tombstoning, not full erasure completion.
The runner encrypts a current disposition with the separately secured recovery key, uploads it to
private EU R2, downloads/decrypts it and verifies its payload checksum before any completion claim.
It exhausts all inventory continuation tokens. Missing/repeated pagination, unknown object prefixes,
older object dates, missing just-written evidence or corrupt downloads all fail closed.

State stays `copies_pending` for at least 36 days after provider absence: the approved 35-day
backup expiry plus one conservative day for in-flight exports. Re-run with fresh individual TOTP
after that boundary. Completion additionally needs a complete inventory showing no objects from
the older boundary and fresh matching operation evidence. No existing backup is deleted by this
command. The SQL evidence journal is immutable and no browser role may call it.

Refresh disposition evidence while pending, and include the retirement journal in normal encrypted
application exports. Do not assume a single R2 disposition object is retained forever: its bucket
expiry still applies. Before restoring an older application archive, obtain the current disposition
manifest independently of that archive. If current evidence or its key is unavailable, keep the
restored system quarantined—never reopen it using the old archive alone. The private
`identity_private.reconcile_restored_mobile_orphans(jsonb)` function runs only in an offline
database without Auth, with restored tenants/sessions/grants inactive; it reconciles exact receipt/
digest identity and preserves holds/verified/domain-linked contacts. It is not a hosted deletion RPC.

## Reviewed reissue

Optional `reviewReference` and `reissue` fields in the private input allow the existing validated
mobile create command only after provider absence. It creates a new draft with a new unique link
when later issued; it never revives the old link or sends anything. Staff must verify the participant
and contact authority before approving the draft through normal invitation controls. Converted,
held, uncertain or unrelated accounts require staff investigation, not this automated path.

Mansoer Gallie is primary; Mikhail Robertson is alternate. Check due unconverted exceptions daily
during the pilot; record investigations and refresh pending disposition evidence. Full hosted proof,
operator access and monitored execution are separate from local unit/SQL evidence.
