---
title: Approved Pilot Release — Prepared Configuration and Owner Handoff
status: owner-promoted-live-checkout-paused-isolated-sandbox-acceptance-pending
last_updated: 2026-10-09
authority: observed-hosted-preparation-not-completed-launch
---

# Pilot Release Preparation — 9 October

## Owner promotion and production verification

The owner promoted `0b3fbcd9-94cb-4f55-acd5-65dbdd003ea3` to 100% on 9 October 2026.
Independent deployment readback confirms deployment `e1e76a78-7145-4014-89a5-b2ab1042aa09`,
created at 20:15:57 SAST. Production probes then confirmed staff sign-in 200, anonymous intake
and order commands 401, unsigned Stripe callback 400 and unsigned Telnyx callback 401.
These empty requests supplied no cookies, identities or provider signatures; no messages,
Checkout sessions or charges were created. This supersedes the unpromoted preparation state
below, but is not authenticated onboarding, delivery or real payment/refund acceptance.

## Completed

- The owner-approved account/privacy/deposit publications and collection-only medical publication
  are hosted. See [exact publication evidence](pilot-client-terms-v1.md). Clinical approval is
  owner-reported, not independent verification of the deferred professional agreements.
- Dedicated payment service `c7a04672-992e-44fe-918b-76209f974adb` is active with only the two
  existing payment scopes. The live Checkout release was enabled for the real pilot and
  `acct_1U32SWCBswMrhhx4`, expiring **10 October 2026 at 20:01:50 SAST**. Do not claim it remains
  usable after expiry or extend it without a fresh bounded decision.
- The real-tenant SMS policy is sending-ready, nine attempts per rolling 24 hours, US$5 reservation
  budget and conservative US$0.50 per two-segment message reservation. This is a reservation
  control, not a provider-side hard billing cap or a nine-person lifetime cohort limit. Previous
  verified two-segment billing was US$0.196; no new tariff quote or send was obtained this turn.
- Read-only Telnyx preflight confirms the exact existing profile, ZA destination permission and
  `Octothorp` sender rewrite. The missing local alpha-sender value was corrected. Shared profile
  settings and webhooks were not changed.
- Ignored `.env.production.local` now describes the prepared target, **not** currently active
  Worker settings. Identity/admin/medical/Telnyx credentials already hosted were preserved without
  retransmission after a broad refresh was rejected by security review. Only approved release
  metadata and separately authorised live Stripe credentials were uploaded.
- Prepared Worker **`0b3fbcd9-94cb-4f55-acd5-65dbdd003ea3`** has the required credential binding
  names. Its script fingerprint matches active **`f7e4597c-1c35-4868-85db-86d9c308ebdb`** exactly:
  `971774ac6ee990b4acfbb9018a34971d51407b97719d98ababeb48513a980281`.
  This is configuration preparation, not a new source deployment or a secret-value equality proof.
- All three preparation transactions passed rollback-only validation before commit. Independent
  readback confirms published collection version/hash, no transfer notice, zero medical grants,
  zero clients, zero Checkout intents and zero SMS attempts. The 51 focused HTTP/configuration
  tests and strict TypeScript check pass. No Git staging, commit, send or charge occurred.

## Owner promotion

Repository rules reserve promotion to the owner. This command releases the prepared onboarding,
questionnaire and live-payment settings; it does not send invitations or charge automatically:

```sh
bunx wrangler versions deploy 0b3fbcd9-94cb-4f55-acd5-65dbdd003ea3@100% --yes
```

Do not promote an older preparation version. Before releasing, ensure no intervening deployment
or bindings change superseded this packet and the finite database release has not expired.
After promotion, independently verify anonymous intake/commerce requests are denied with 401,
invalid Stripe/Telnyx callback signatures are denied, and real staff can open the invitation UI.
An uploaded version, database policy or binding name alone is not hosted end-to-end acceptance.

## Corrected sandbox acceptance and cohort boundary

The owner declined paying R999 personally for a test. The earlier owner-paid acceptance proposal
is withdrawn; a real-money test is not a prerequisite. Use official test cards only in Stripe
sandbox Checkout, never in live mode. The approved exercise uses a fresh isolated hosted tenant,
disposable client/workforce identities, email only to the controlled support mailbox, at most one
SMS to the approved test phone, one R999 sandbox capture and its exact original-method refund.
Verify actual onboarding, questionnaire submission, signed settlement, refund and scoped cleanup.
Do not seed financial evidence or describe reaching Checkout as completed acceptance.

New live Checkouts have been paused by setting only the real tenant's live database release to
`enabled=false`. Live credentials, callback/refund configuration, the existing live webhook and
real staff records are preserved. Do not swap sandbox credentials into `STRIPE_LIVE_*`, rebind
the real tenant, or automatically reopen live purchases after the test. Worker promotion and
restoration remain owner-controlled. First legitimate live-pilot payments require monitoring,
not a manufactured personal charge. Wider invitation sends remain outside this bounded test.

Uploads and generator transfer remain unavailable. No product-order publication or clinical
approval was fabricated; catalogue display does not enable product purchases/dispensing.
Tasneem/Dr Ziyaad have existing identities but still need individual verification/TOTP and current
purpose/assignment grants before medical access. Mikhail's alternate operator acceptance remains
deferred. Do not describe independent professional/legal verification, clinical review readiness,
cohort payment acceptance or all technical debt as completed by this preparation.
