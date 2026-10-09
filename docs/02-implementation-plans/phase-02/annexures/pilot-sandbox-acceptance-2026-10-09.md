---
title: Isolated Hosted Pilot Sandbox Acceptance
status: sandbox-payment-confirmed-usability-release-and-cleanup-pending
last_updated: 2026-10-09
authority: owner-approved-bounded-exercise-not-completed-launch
---

# Isolated Hosted Sandbox Acceptance — 9 October

## Temporary owner staff walkthrough access

The owner authorised operations-only sandbox access and confirmed Mikhail's independent
approval. A guarded hosted transaction added one 24-hour operations membership for the
existing Mansoer staff subject in sandbox tenant `4a0fc120-933c-4a1e-98d1-8aab7fdfeaa0`,
and assigned only test case `1382eb45-c024-4b1e-84c7-067b1ab4e7c8`. Both expire at
23:13:46 SAST on 10 October 2026. Independent readback confirmed the current scoped
assignment, its automatic assignment audit, and all three existing real-pilot roles unchanged.
No clinical, dispensing or additional administrator authority was granted. No schema,
Auth identity/factor, release switch, message or payment was changed.

The owner must sign out, verify email and authenticator again, select **operations — operations**
for this sandbox tenant, then open the assigned queue. An existing real-pilot session remains
bound to its original tenant. This is database-scope verification, not proof of the owner's
completed browser walkthrough. The temporary membership/assignment and resulting audit/alert
evidence must be included in the exact sandbox cleanup manifest; expiry denies access but
does not delete those rows. Pending exact refund, cleanup and disabled restoration remain open.

## Latest promoted checkpoint

The owner promoted `50601252-4f4a-48c7-9be9-dbdfa341b638` to 100%. Independent readback
confirms deployment `7558810c-034f-4047-b4be-f7e3601ed6c1` at 20:54:20 SAST. The intervening
`STRIPE_LIVE_ACCOUNT_ID` update was included in the recorded baseline
`9e30968f-2358-483b-8182-224013092bf6`; its approved live account ID is preserved in the
promoted sandbox version. No agent promotion or source deployment occurred.

A fresh disposable operator passed actual hosted email-code session verification and genuine
TOTP/AAL2. Email-only invitation access was denied. The extended prerequisite/operator cleanup
packet passed a hosted rollback-only test before sending. Exactly one SMS dispatch returned 200 /
accepted; Telnyx then reported delivered, and the owner confirmed handset receipt and page load.
Provider cost was not yet populated in the message readback; do not invent a fresh charge amount.

Before the agent's controlled-mailbox claim, the invitation was already claimed, bound and
converted through the participant flow. Its history records conversion at 21:03:21 SAST;
one client profile and two document receipts exist. A second redemption correctly returned
unavailable. The bound email is not the approved support mailbox. The agent sent no additional
SMS or email at that checkpoint. The owner subsequently confirmed that this is a disposable
test account, all questionnaire details are synthetic, and they completed both questionnaire
and sandbox payment on their phone. Read-only checks independently confirmed submitted intake
without a safety hold, a completed paid Stripe test Session for R999/ZAR, one signed provider
receipt and a paid settlement without reconciliation, failure or expiry flags. No additional
capture is required. This is a consumed invitation, not evidence of a broken OTP flow.

The owner reported that the successful flow was difficult to navigate. The immediate follow-up
is a local onboarding presentation correction: prominent dashboard actions, ordered steps,
an explicit questionnaire-to-deposit link and automatically checked payment confirmation.
This is not yet a hosted usability acceptance. Exact sandbox refund, fixture cleanup and
owner-controlled configuration restoration remain outstanding; do not describe this exercise
or pilot activation as fully closed.

The preparation-only observations below are historical checkpoints, not the latest deployed state.

## Scope and correction

The owner approved a fresh disposable hosted tenant, client/workforce fixtures, invitation/OTP
emails only to the controlled support mailbox, at most one SMS to the approved test phone,
one R999 sandbox capture and its exact original-method refund, followed by exact cleanup.
Real staff/pilot records must remain untouched. No personal real-money test is required; the
earlier owner-paid R999 proposal is withdrawn. Official test cards are sandbox-only.

The real tenant's live Checkout release is paused (`enabled=false`). Its account binding,
credentials, existing live webhook and callback/refund settings are preserved. Do not replace
`STRIPE_LIVE_*` with test values or rebind the real tenant to the sandbox account.

## Observed preparation

- Read-only preflight: four Auth users, one real tenant, zero clients, intakes, Checkout intents,
  provider receipts, refunds and SMS delivery intents. Live Checkout is paused.
- The test restricted key independently resolves to sandbox account `acct_1U32UbFfj16Nnr1i`.
  The blank ignored local `STRIPE_CHECKOUT_ACCOUNT_ID` was filled with that verified account.
- A dedicated test webhook was created for the canonical payment callback and twelve existing
  event types, API `2026-07-29.dahlia`. Its test mode, exercise metadata, URL and enabled status
  passed readback. Its identifier/signing secret are retained only in the ignored private manifest.
- Worker version `50601252-4f4a-48c7-9be9-dbdfa341b638` selects sandbox Checkout/webhook/refund
  modes and the same isolated tenant for commerce, medical intake and mobile invitations. It
  preserves existing identity/medical keys and live credentials. It is **not promoted**.
  Its script fingerprint matches the prior active source exactly:
  `971774ac6ee990b4acfbb9018a34971d51407b97719d98ababeb48513a980281`.
- The first final readback command failed after upload. No creation retry occurred. The explicit
  `--verify` recovery passed against the recorded version and exact existing test webhook.
- Isolated prerequisites passed hosted rollback-only creation plus scoped deletion, with the
  original application inventory restored exactly. Historical Sprint-13/14 scripts/guards were
  not edited. The new packet expects four preserved real staff and an active real pilot.
- The prerequisites contain only a synthetic tenant, two synthetic authority subjects, collection
  and deposit publications, synthetic deposit price, finite sandbox release/service and single-send
  daily reservation policy. They create **no client, completed questionnaire, funded deposit,
  receipt, refund, Auth session, email or SMS**. Existing global account/privacy publications
  are not replaced. No real clinical authority or product release is fabricated.
- The prerequisite transaction was then applied. Independent readback confirms four preserved
  Auth users, two tenants (real plus isolated), zero clients/intakes/Checkouts/receipts/SMS intents,
  one enabled sandbox release and the real live release still disabled.

The resumable identifiers and original inventory are in ignored `.pilot-sandbox-rehearsal.local`
with mode `0600`. Do not commit, paste or blindly regenerate it. A previous manifest prevents
duplicate preparation. Preparation failure is not authority to delete real rows or disable guards.

## Owner promotion and acceptance still to perform

The owner retains promotion control. After confirming prerequisite preparation succeeded:

```sh
bunx wrangler versions deploy 50601252-4f4a-48c7-9be9-dbdfa341b638@100% --yes
```

This changes runtime configuration; it does not send or charge automatically. Check for an
intervening source/configuration release before promotion. Do not promote after the finite
four-hour test authority expires; prepare a fresh bounded validity decision instead.

After owner promotion, the remaining acceptance is actual disposable workforce TOTP/context,
one staff-issued SMS invitation, controlled email verification, profile/document activation,
synthetic questionnaire submission, app-owned deposit offer/acceptance/Checkout, official
test-card payment, genuine signed durable settlement and exact test refund reconciliation.
Record denial/replay checks and all created IDs. Extend and validate the manifested cleanup
packet for the actual Auth/mobile/financial rows before creating them; the prerequisite-only
rollback proof is not completed journey cleanup proof.

Afterwards remove only manifested test fixtures, revoke disposable sessions, remove only the
dedicated test webhook, and independently verify preserved real data and original security guards.
Prepare matching restoration settings for owner promotion. Do not automatically reopen real
Checkouts, reuse consumed links, send a second SMS or describe test settlement as live settlement.

## Separate live release issue found

The current `commerce_private.prices.environment` constraint accepts only `local-synthetic`.
That classification is honest for this sandbox fixture but is not production price approval.
No real deposit price was created by the release preparation. Resolve production price provenance
and catalogue authority before reopening live purchases; do not label a real price synthetic to
bypass the restriction. Catalogue visibility alone does not authorise product ordering/dispensing.

## Local evidence

The earlier focused payment/intake/mobile packet passed 20 files / 144 tests. The new preparation
guard packet passed eight tests, including no-network defaults, CI/wrong-project/live-key/wrong-account
denials, absence of deployment/charge/send commands and preserved live-key binding names.
Together with the unchanged historical payment packet, the final run passed two files / fourteen
tests. Formatting and whitespace checks pass. These checks do not substitute for the pending
authenticated hosted journey. No Git staging, commit, push or promotion was performed.
