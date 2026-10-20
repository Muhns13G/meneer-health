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
