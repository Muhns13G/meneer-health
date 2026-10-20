# Restricted Sprint-15 rehearsal Worker

This is a separate owner-deployed target, not a replacement production configuration. Initial
deployment intentionally responds `503` because no approved fixture lease/credentials are installed.
Do not copy `.env.production.local` wholesale, use live Stripe keys, or attach production crons.

Build with Node 22 selected and Bun, then deploy **only the explicit generated rehearsal config**:

```sh
bun --no-env-file run build:products:rehearsal
bunx wrangler deploy --config dist-product-rehearsal/server/wrangler.json
```

The owner performs the second command. Return its URL/version so the assistant can prepare the
approved isolated fixtures and a short-lived configuration version. Source/deployment approval
does not itself create fixtures, send codes, capture money or enable product sales. Do not deploy
the root `wrangler.jsonc` or promote an old rehearsal version on the main Worker.

The build verifies the separate name, no crons/preview URLs, worker-first assets and absence of
server-only markers from the client. It restores the previous `.wrangler/deploy/config.json`
pointer in `finally`; it does not stage, commit, upload or deploy. Serialize builds.

## 20 October — closed rehearsal

The owner promoted shutdown version `4c9b441d-272d-4de7-8b49-5c8a421837b3` to 100%.
Independent readback at `2026-10-20T21:51:15.011Z` confirms it is the sole active version.
`/__rehearsal`, `/portal/order` and `/portal/products` each return `503`/no-store both anonymously
and with the old access cookie. Main Worker version `c4be0ea5-2e9f-45b5-9022-a331d5b30d69`
is unchanged and its homepage returns `200`. Task 15.9's acceptance and shutdown boundary is
complete. All preparation/promotion instructions below are historical: do not rerun captures,
recreate deleted fixtures or reactivate the lease. Future rehearsals need fresh scoped authority.

### Historical final acceptance checkpoint — before shutdown promotion

The owner-approved replacement journey passed actual deposit and credited-product test captures,
signed settlement, independent evidence/issued quote, seven custody/replay/outbox events and client
progress. All three cumulative captures are fully refunded, exact application/Auth baseline is
restored and the one webhook is deleted. The 94-test focused packet and scoped encrypted record
roundtrip pass; the latter is not a full PostgreSQL restore. No further captures are authorised.

Shutdown candidate `4c9b441d-272d-4de7-8b49-5c8a421837b3` retains the exact source/assets/bindings
except for an expired lease. The owner must promote **only on this separate Worker**:

```sh
bunx wrangler versions deploy 4c9b441d-272d-4de7-8b49-5c8a421837b3@100% --yes \
  --name meneer-product-rehearsal \
  --config dist-product-rehearsal/server/wrangler.json
```

Then independently verify that it is the sole active version and both `/__rehearsal` and
`/portal/order` return `503`/no-store, even with the old access cookie. Main Worker must remain
`c4be0ea5-2e9f-45b5-9022-a331d5b30d69`. No source build/commit is needed for this configuration
shutdown. The historical preparation and partial-checkpoint text below is not a request to
reactivate the old version, recreate deleted fixtures or rerun captures.

The owner has now promoted `ba30037f-a440-4075-b8a4-5d8d196a2380`. Outer/native denial checks,
genuine synthetic account/intake/MFA, mobile catalogue rendering, one signed/captured/refunded
R999 sandbox deposit, a no-payment quote preflight and exact fixture cleanup pass. The product
path remains unaccepted after a post-deposit quote failure. All temporary Auth/application rows
are removed, the original 12 Auth IDs and application baseline are restored, and the one test
webhook is disabled. A replacement deposit requires additional capture authority; do not blindly
rerun the driver or reset its private manifests. The snippets below describe the completed
preparation/promotion, not a request to deploy again. Main pilot settings remain untouched.

The initial separate deployment is verified as `b779e6fb-5a23-4c9f-b3fc-77d464da3bad` and remains
fail-closed at `https://meneer-product-rehearsal.itws-dns-cdn-hq.workers.dev`.
`scripts/prepare-hosted-product-rehearsal.ts` uses explicit hosted/test-only confirmation, validates
the fixed Worker/account/source, and resumes an ignored mode-0600 manifest. It prepares keys and
only allowlisted bindings, creates one idempotent test webhook and keeps it disabled until testing.
It uploads a **version only**, never promotes, deploys source, sends messages, creates Auth users
or captures money. Readback must confirm unchanged source and both active deployments.

Prepared version: `ba30037f-a440-4075-b8a4-5d8d196a2380`. Lease expiry: 21 October 17:40 SAST.
The owner may promote this exact configuration **only on the separate Worker**:

```sh
bunx wrangler versions deploy ba30037f-a440-4075-b8a4-5d8d196a2380@100% --yes \
  --name meneer-product-rehearsal \
  --config dist-product-rehearsal/server/wrangler.json
```

Do not promote it on `meneer-health`, reuse it after lease expiry, rebuild/redeploy over it during
acceptance, or infer product-sales GO. The current main version `c4be0ea5-2e9f-45b5-9022-a331d5b30d69`
is preserved. Next, the approved driver must create exact synthetic native prerequisites and fresh
provider/TOTP sessions, perform the actual journey and then remove only manifested test resources.

## Configuration for the later approved acceptance window

Provision these only after the exact synthetic tenant is manifested; leave initial deployment
unavailable meanwhile. Never place credential values in committed files, chat or command arguments.

- Exact `PRODUCT_REHEARSAL_ORIGIN`: this Worker's HTTPS `workers.dev` origin, no path.
- `PRODUCT_REHEARSAL_TENANT_ID`: disposable synthetic tenant, never the real pilot.
- `PRODUCT_REHEARSAL_EXPIRES_AT`: absolute UTC expiry no more than 24 hours ahead.
- `PRODUCT_REHEARSAL_ACCESS_KEY`: separate random 32-byte key encoded as 64 hex characters.
- Dedicated `IDENTITY_SESSION_KEY_BASE64`, independent shipping keyring and synthetic identities;
  never reuse live patient/workforce cookies or the production session-sealing key.
- The four product/payment tenant bindings must equal the synthetic tenant; all three product
  modes must be `synthetic`. `COMMERCE_REVIEW_MODE=enabled`; checkout/webhook/refund modes `sandbox`.
- Exact approved test account, restricted **test** key, isolated webhook signing secret and scoped
  webhook service identity. `STRIPE_SANDBOX_RETURN_ORIGIN` must equal the rehearsal origin.
- Approved hosted Supabase URL/service credential, kept server-only. This is a privileged shared
  database credential: outer access controls supplement, never replace, native tenant/role/RLS gates.
- All seven disabled messaging/signup flags in the committed Wrangler configuration remain disabled.
  Do not provision Brevo/Telnyx/live Stripe/R2/recovery credentials on this Worker.

Unlock at `/__rehearsal` by POSTing the access secret through its form. It issues a Secure,
HttpOnly, SameSite=Strict, host-only session cookie. No secret belongs in query strings. Real
workforce/patient authentication remains required separately; unlock does not grant an app role.
The no-send acceptance driver will obtain actual disposable Auth verification/TOTP and set dedicated
sealed proof cookies. Outbound invitation/sign-in routes are deliberately unavailable here.

Only the exact Stripe webhook endpoint bypasses the outer cookie; its existing signature, test
mode, account and native service-identity checks remain mandatory. A missing/invalid signature
must fail. The target permits product/queue operations, not signup, messaging or generator transfer.
No scheduled handler runs. Lease expiry locks out all requests; it does not refund or clean up
database/provider fixtures, so the scoped cleanup packet remains mandatory.

Do not report full 15.9 completion until its
[acceptance checklist](../../docs/02-implementation-plans/phase-02/annexures/sprint-15-9-hosted-product-rehearsal.md)
has actual deployed evidence and independent cleanup verification.

That checklist is now satisfied at the recorded isolated boundary. The
[15.10 completion report](../../docs/03-completion-reports/phase-02/sprint-15-product-orders-manual-fulfilment.md)
owns final regression and the owner commit/CI handoff. The shared native-price cleanup discovery
is now wired into the primary driver as well as the recovery tool, with exact synthetic scope
tests; this is not authority to rerun the completed hosted journey or reactivate the expired lease.
