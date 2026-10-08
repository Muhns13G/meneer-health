# Recovery schedule dispatcher

Owner-deployed for Task 13.7; **scheduled backup success is not yet verified**. The initial
02:17 SAST execution on 8 October failed before a GitHub recovery run was created. The safe
diagnostic patch below requires a new owner deployment; do not infer it is already hosted.

This separate Worker requests the pinned `Muhns13G/meneer-health` recovery workflow on `main`
hourly. It does not access the database, R2, encryption key or backup heartbeat. HTTP requests
return 404. A GitHub 204 means accepted dispatch, not a completed or recoverable backup.

## Owner-controlled activation

1. Create a fine-grained GitHub token restricted to this repository, with Actions read/write and
   a short explicit expiry. This permission can control other Actions in the repository: GitHub
   does not scope it to a single workflow. Do not reuse a broad personal token. Provisioning this
   security-sensitive access requires explicit owner approval.
2. The owner deploys with `bunx wrangler deploy --config operations/recovery-dispatcher/wrangler.jsonc`.
   Add `GITHUB_RECOVERY_DISPATCH_TOKEN` using Wrangler secret input, never a command-line value or Git.
   The short initial deployment window before the secret is present fails closed.
3. Avoid duplicate routine exports: after the external trigger is proven, the owner can remove the
   original GitHub schedule in a separately reviewed commit. Until then both triggers may export;
   the existing concurrency group prevents simultaneous execution, not duplicate queued exports.
4. The owner reduced initial acceptance to one successful scheduled dispatch, encrypted export and
   isolated restore reconciliation, with Better Stack Up. Additional consecutive hourly checks
   remain follow-up evidence, not already proven sustained cadence. Record actual run start/completion
   intervals. Runner queue delays remain possible; external dispatch is not an hourly RPO guarantee.
5. Keep the existing one-hour/15-minute heartbeat policy. Missing success must alert. Never send a
   heartbeat from this dispatcher or resolve an incident before successful recovery verification.
6. Document token expiry/renewal and monitor dispatch failures. Disable/remove the separate Worker
   if the owner rejects activation; do not change the public application's Worker configuration.

Validation: `bun run test -- scripts/lib/recovery-dispatcher.test.ts`; upload-only validation:
`bunx wrangler deploy --config operations/recovery-dispatcher/wrangler.jsonc --dry-run`.

## Safe failure diagnostics

The 03:17 SAST execution on 8 October reported `network` without an HTTP response. The exact
source was then reproduced in local workerd with mocked outbound networking: `redirect: "error"`
is rejected by that runtime before network access. The patch uses `manual` and still accepts only
204, so redirects cannot forward credentials. Exact-source runtime checks cover mocked 204, 302
and 403 responses. Owner redeployment and a successful scheduled dispatch remain required.

Failure logs contain only the fixed job/acceptance fields, a category (`configuration`,
`http-rejected`, `timeout`, `network` or `unknown`) and an HTTP status when available. No token,
Authorization header, response body or original exception is logged. Missing/blank credentials
fail before network access. A non-204 response still fails closed; diagnostics do not add retries,
an HTTP trigger or a success heartbeat. HTTP status narrows investigation but does not by itself
prove the precise provider-side cause.

GitHub's native scheduled events may be delayed or dropped:
[official troubleshooting guidance](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows).
