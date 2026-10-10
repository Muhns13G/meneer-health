---
runbook_id: meneer-cloudflare-v1-release
title: Cloudflare v1 Environments and Release Runbook
status: active-owner-controlled
last_updated: 2026-10-10
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Cloudflare v1 Environments and Release Runbook

## Assigned staff draft preparation — Task 15.4

`PRODUCT_QUOTES_MODE=disabled` and `PRODUCT_QUOTES_TENANT_ID=` are the committed defaults.
Only an owner-promoted isolated release may use `synthetic` for a synthetic catalogue/tenant;
`pilot` selects genuine approved RRP provenance. The staff product command requires an existing
sealed workforce session, approved operations context, exact assigned case and recent TOTP.
Apply the separately approved 15.4 migration before hosted acceptance. No real grants, import,
outbound messages, payable offers or provider records are created by this engineering task.
Keep these switches disabled through code deployment until the separate acceptance/release gate.
Draft preparation does not enable clinical approval, Checkout, credit reservation or supply.

## Private product catalogue — Task 15.3

The [task packet](../02-implementation-plans/phase-02/annexures/sprint-15-3-client-catalogue.md)
records the private browsing/interest boundary. `PRODUCT_CATALOGUE_MODE` defaults `disabled`;
`PRODUCT_CATALOGUE_TENANT_ID` defaults empty. `synthetic` is isolated-proof provenance;
`pilot` is reviewed real-RRP provenance. Never expose either as `VITE_*`, enable all switches,
or equate catalogue access with Checkout/clinical/pharmacy/courier permission. Owner release
requires applied migrations, correct current catalogue, applicable privacy/lifecycle scope and
bounded acceptance; no such hosted release is performed by 15.3. Unknown/missing settings return
412 with no private data. Roll back feature configuration to disabled without deleting immutable
interest/audit history or mutating prices/financial records.

## Scope and Ownership

### Staff first-login code correction (2026-10-09)

The staff `Send code` path must resolve an existing active subject/provider identity with an
independently approved, unexpired workforce membership in an active tenant before contacting Auth.
`resolve_workforce_code_target(text)` is service-role-only; it returns no account data to the browser
and changes no users, grants or sessions. Apply `20261009151828_workforce_first_login_code.sql`
only with explicit hosted approval, before releasing the matching application code.

Hosted checkpoint: owner approved and applied this migration on 2026-10-09. Readback confirms
Mansoer/Mikhail resolve to their existing identities, anonymous/authenticated execute is denied,
service-role execute is allowed, and all four Auth users are preserved. The separately approved
history correction aligns the hosted version to `20261009151828`. No email or Worker deployment
was performed during this migration acceptance; production send/verification still requires the
matching owner-deployed application code and actual mailbox/TOTP checks.

Confirmed staff receive the existing no-signup email OTP. Unconfirmed staff receive a new invitation
code for the same provider identity. The generic response deliberately does not disclose eligibility;
if the email says invitation code, select the staff-invitation checkbox before verifying. An accepted
send is not mailbox delivery or completed staff access. Verify production delivery, email verification,
individual TOTP and current role selection after the owner release. Keep client/payment/transfer
modes disabled. No new environment switch, Brevo Worker SMTP binding or public registration is needed.

### Staff authenticator response correction (2026-10-09)

Production Auth logs showed successful email verification and TOTP enrolment while the browser
remained on email verification. The local no-send workforce exercise reproduced a 452,113-character
provider QR SVG, exceeding the browser's former 100,000-character response bound. The shared
enrolment response validator now permits at most 1,000,000 characters, retaining strict response
shape and the 128-character manual-key bound. The local workforce exercise validates the actual
provider response against this same browser schema before proving TOTP/session access and cleanup;
component coverage includes a provider-sized QR response. No hosted migration or settings change
is required for this correction.

The owner must release the matching application code before production acceptance. Reload the
staff page and request a fresh email code: previously accepted codes are consumed, even when the
old UI rejected the successful response. Email verification should advance to individual
authenticator enrolment, not directly grant staff access. Complete TOTP and approved context
selection afterward; TD-043 is not closed by these local checks alone.

Cloudflare Workers is the approved host for the TanStack v1 pilot. The Worker is `meneer-health`;
`https://meneerhealth.co.za` is its canonical custom domain. The repository owner controls pushes,
merges, deployments, promotions, rollbacks, and Cloudflare settings. A contributor or agent may act
only under the owner's explicit, bounded instruction; that permission does not become standing
authorization for later releases.

## Sprint 12 Closure and Staff Follow-up Release Boundary

Task 12.10's [completion report](../03-completion-reports/phase-02/sprint-12-support-accessibility-readiness.md)
records final regression and the owner-controlled commit/CI handoff. No new hosted configuration,
email, deployment or pilot activation is performed by closure. Before real use, complete TD-037/
TD-038 released accessibility and TD-043 actual coverage, unattended authenticated provider delivery
and quota/headroom acceptance. Preserve disabled settings until the approved release decision.

Current checkpoint: [Task 12.8](../02-implementation-plans/phase-02/annexures/sprint-12-8-hosted-support-rehearsal.md)
has passed the isolated hosted support/notification rehearsal. Earlier local-only statements below
describe their respective task checkpoints. Exact provider-verified delivery projections were
replayed through the authenticated hosted callback; automatic Brevo push was not installed.
Temporary bindings and the dedicated secret were removed, mode restored to disabled and all
test fixtures/sessions cleaned. Real coverage, provider webhook setup, quota/headroom and debt/
released-flow reconciliation remain activation gates. Publishing settings is not itself proof of
live readiness: probe the expected unauthenticated 401 before ingestion; disabled mode returns 404.
No owner source deployment was needed for the final verification-harness corrections.

[Task 12.4](../02-implementation-plans/phase-02/annexures/sprint-12-4-staff-support-followup.md)
adds `/staff/support` and `/staff/support/followup`. No new Worker binding/secret is required.
Its migration follows 12.2/12.3 and has not been applied to hosted services by this task. Only current
purpose owners can view/respond; administrators see coverage only. Manual requeue preserves the
existing sender, quota, attempt cap and suppression. Independently reviewed uncertain non-acceptance
proof must be exact-lease, time-limited and privately authorised; the UI cannot fabricate it.
Late callback or expired proof contains requeue before dispatch. Keep transport disabled until
the owner-authorised 12.8 exercise; no local queue review establishes live delivery or pilot approval.

## Sprint 12.3 Support Release Boundary

[Task 12.3](../02-implementation-plans/phase-02/annexures/sprint-12-3-purpose-support-routing.md)
adds `/portal/support` and private client/workforce support commands. No additional Worker secret
or binding is required. Apply its migration only after explicit approval and the notification
prerequisite; this task applied neither to hosted Supabase. No coverage policies are seeded.
Privately verify primary/alternate purpose authority, finite coverage, mailbox controls, absence/
failure evidence and clinical authority/deadline/after-hours guidance before configuring a policy.
Missing or ambiguous coverage remains unavailable. Keep transport disabled pending a separately
authorised 12.8 rehearsal; do not publish purpose aliases or claim clinical support from local
tests or a generic receipt. Staff follow-up UI is Task 12.4. Existing release approvals still apply.

## Sprint 12.2 Notification Release Boundary

[Task 12.2](../02-implementation-plans/phase-02/annexures/sprint-12-2-durable-notifications.md)
is implemented locally only. Keep `TRANSACTIONAL_NOTIFICATIONS_MODE=disabled`; the new migration
is not hosted-application evidence. Only an expressly approved isolated rehearsal may apply it
and configure `TRANSACTIONAL_NOTIFICATIONS_TENANT_ID`, the existing server-only Brevo/Supabase
credentials and a new dedicated `TRANSACTIONAL_NOTIFICATION_WEBHOOK_SECRET`.

The private receipt endpoint is `/api/notifications/brevo/webhook`, POST JSON only, with a matching
`x-meneer-notification-secret` custom header at Brevo. Use a dedicated random base64url credential
of at least 43 characters, never an existing API/encryption/Auth secret or query parameter. Keep
credentials in ignored/hosted secret stores; no provider payload or secret is release evidence.
The 50-attempt shared UTC-day budget covers all non-Auth sender claims; verify actual free-tier
allocation and Auth headroom before enabling. Task 12.8 must prove delivery/failure, callback
authentication and retry, owned acknowledgement/fallback, scoped cleanup and disabled restoration.
Acceptance alone is not delivery; this release does not publish clinical coverage or enable pilot.

## Runtime Contract

| Layer           | Supported boundary                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Package manager | Bun 1.3.x; `packageManager` currently pins 1.3.14 and `bun.lock` is authoritative.                                       |
| Build Node.js   | Node 22.x; `.node-version` pins Cloudflare Builds to 22.23.2.                                                            |
| Worker runtime  | Cloudflare `workerd`, compatibility date `2026-08-07`, with `nodejs_compat`; it is not a general Node.js process.        |
| Worker entry    | `src/server.ts` validates server configuration before delegating to TanStack Start.                                      |
| Build           | `bun install --frozen-lockfile`, then `bun run build`; the build includes the required client-bundle configuration scan. |
| Deploy target   | `dist/server/index.js` and `dist/client`, generated by the Cloudflare Vite plugin.                                       |

Cloudflare Build settings define the non-secret build variable `BUN_VERSION=1.3.14`, retain
`bun run build`, and use `bunx wrangler deploy` for production plus
`bunx wrangler versions upload` for non-production. Both successful build logs identify Bun 1.3.14,
Node 22.23.2, and Wrangler 4.120.0.

## Environment and Branch Model

| Environment                 | Source and behaviour                                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local                       | Working tree on `itws-I`; `bun run dev` for SSR/client work, `bun run preview` after a production build. No real patient data or hosted secrets.                                                                          |
| Review                      | Every non-production Cloudflare branch build uploads an immutable Worker version and branch alias without production traffic. Preview URLs are public unless Cloudflare Access is enabled; never use patient information. |
| Canonical review deployment | Temporarily, `itws-I-preview` is the Cloudflare production branch and serves `meneerhealth.co.za`. It alone carries the draft video.                                                                                      |
| Permanent source            | `itws-I` is the authoritative v1 source and must remain free of the preview-only video binary. It is not yet the Cloudflare production branch.                                                                            |

Named Wrangler environments are intentionally not introduced while the Worker has no database,
secret, or other environment-specific runtime binding. Git branch builds and immutable Worker
versions provide the current separation without creating duplicate `-preview` Workers.

## Environment Variables and Secrets

- The canonical variable catalogue and lifecycle procedure live in
  [`environment-secrets-runbook.md`](environment-secrets-runbook.md). Apply that procedure together
  with this Cloudflare release boundary.
- `VITE_*` is public build-time configuration. Never place credentials, patient information, or
  server secrets in it.
- `.env.example` contains names and safe examples only. Local secrets use ignored `.dev.vars*`
  files; choose `.dev.vars` rather than mixing it with `.env` for Worker secrets.
- Hosted secrets use Cloudflare Variables and Secrets and must be independently provisioned for
  each future environment. Never commit values or print them in build, request, or audit logs.
- `LOVABLE_API_KEY` is forbidden and must not be provisioned.
- `BUN_VERSION` and Cloudflare-provided `WORKERS_CI_*` values are build metadata, not application
  secrets. Do not copy build credentials into runtime variables.
- The repository currently consumes no server secret. Do not add placeholder hosted secrets before
  a reviewed server consumer and catalogue entry exist.

## Review and Promotion

1. Confirm `BUN_VERSION=1.3.14` and the two `bunx wrangler` commands under Cloudflare **Settings →
   Build**, then confirm the intended source SHA and a clean worktree with `git status --short`.
2. Run `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, and
   `bun run deploy:dry-run`. Record known baseline failures separately from new failures.
3. The owner pushes `itws-I`. Confirm its Cloudflare build succeeded and test the branch preview
   URL; do not treat an uploaded version as production.
4. For the temporary video boundary, the owner merges the reviewed `itws-I` change into
   `itws-I-preview`, resolves only the intentional preview-video difference, and pushes that branch.
5. Record the deployed Git SHA and active Worker version before testing the canonical domain.
6. Verify `/`, `/peptides`, `/start`, policy/contact routes, both `/go/...` redirects, a hashed
   asset, an unknown route, and the removed MCP/OAuth paths. Check SSR, direct loads, client
   navigation, metadata, response headers, responsive layout, console/network errors, and logs.
7. Promote only if the deployed SHA matches the reviewed SHA and every required check passes.

Moving the Cloudflare production branch from `itws-I-preview` to `itws-I` is a separate owner action.
First remove or replace the draft-video need, verify the permanent branch preview, record the active
version, change **Workers & Pages → meneer-health → Settings → Build → Branch control**, and repeat
the full post-deploy matrix. Do not delete `itws-I-preview` until the handoff is accepted.

## Logging and Post-Deploy Checks

Repository configuration enables persisted invocation logs. After deployment, use **Workers &
Pages → meneer-health → Logs** or `bunx wrangler tail meneer-health` while exercising the route
matrix. Confirm successful outcomes, no uncaught exceptions, no request to a Lovable domain, and no
secret or health payload. Preview URLs do not provide Workers Logs; production-equivalent log proof
must come from the deployed Worker.

Record the first independent request after deployment and repeat it from a second request to catch
initialization failures. This is a cold-start smoke test, not a latency guarantee.

Keep Cloudflare Fonts and automatic Web Analytics disabled for the pilot. Cloudflare Fonts rewrote
the SSR document head and caused a React hydration mismatch during Task 2.8. Automatic Web
Analytics injects a client beacon that is outside the current website-only privacy boundary. Any
future reintroduction requires an explicit privacy decision and canonical hydration/network checks.

## HTTP Security and Cache Policy

Apply [`http-security-cache-policy.md`](http-security-cache-policy.md) to every release. Worker-
generated responses are governed in `src/server.ts`; static assets that bypass the Worker are
governed by `public/_headers`. Verify public, sensitive, redirect, error, fingerprinted-asset, and
mutable-asset classes after deployment. Hosted closure requires the expected cache value, CSP,
framing, MIME, referrer, permissions, and HSTS headers plus successful hydration and no CSP
console/network violation. Dashboard Transform Rules or other header overrides are not approved by
this repository policy and must be reconciled before promotion.

## Rollback

Sprint 14's current mobile-disabled containment version is
`559d739a-1e61-4277-9ad0-3cbb076ea5d8`, owner-promoted after the successful isolated rehearsal.
See the [mobile runbook](mobile-invitations-release-runbook.md): verify actual disabled modes and
harmless redemption/email 503 and callback 404 responses, not a nominal baseline version label.
The earlier mobile baseline retained enabled mode secrets. This same-code correction does not
activate the pilot and is not automatically compatible with future schema/configuration changes.

Task 13.2's accepted known-good fallback baseline for subsequent releases is version
`3710baa2-8c24-48c2-b974-fef118d8a98b`, built from `itws-I-preview` commit `7543aadd` by build
`0d2b69a3-baec-4c35-ad52-2922fa8f546b`. See the
[final platform evidence](../02-implementation-plans/phase-02/annexures/sprint-13-2-platform-readiness.md)
for passing CI, exact version/source proof and hosted schema `20261007102500` compatibility.
Keep current bindings, disabled activation modes and key references compatible; re-review after
any future change. This currently healthy version is a return target after a later release, not
authorization to roll back now. Worker rollback does not reverse migrations or restore data.

1. Stop promotion and record the failing route, time, Ray ID, deployment/version ID, and symptoms.
2. The owner selects the last verified version under **Deployments → ... → Rollback**, or runs
   `bunx wrangler rollback VERSION_ID` after replacing `VERSION_ID` with the recorded target.
   Cloudflare immediately creates a deployment routing 100% of traffic to that version.
3. Re-run the critical route, asset, redirect, 404, and log checks against the canonical domain.
4. Reconcile Git with a reviewed forward fix or ordinary revert; do not rewrite shared history.
5. Record the incident and both version IDs. A code rollback does not restore changed or deleted
   bindings/data, so future stateful releases require separate migration rollback procedures.

Never test rollback by changing the canonical deployment merely to prove the command. Dry-run
validation plus confirmed version history proves availability; exercise an actual rollback only for
an approved release rehearsal or incident.

## Current Temporary State

As observed on 8 August 2026, production remains `itws-I-preview`. Manual build
`425bdc48-23f2-4c40-8f83-23c1a0f11f00` succeeded with the pinned toolchain and deployed Worker
version `ee3a151d-e25b-47b8-a036-c041a9225d13` at 100%. Non-production `itws-I` build
`69d0d711-ccc7-4135-a310-71826242fd24` succeeded and uploaded aliased Worker version
`641f728e-b460-4cd9-bbea-4448f98f7fba`. The canonical homepage, `/peptides`, `/start`, and
workers.dev origin returned HTTP 200 after deployment. TD-052 is Verified.

## Cloudflare References

- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Build image and version overrides](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
- [Build branch control](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/)
- [Real-time logs](https://developers.cloudflare.com/workers/observability/logs/real-time-logs/)
- [Worker rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Workers static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Workers Response API](https://developers.cloudflare.com/workers/runtime-apis/response/)
