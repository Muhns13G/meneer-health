# US mobile invitation extension — 10 October 2026

The owner approved extending pilot invitation SMS to US recipients and explicitly required
**no cohort sends until the updated application is deployed**. Recipient names, phone numbers,
invitation bearers and provider payloads must remain outside committed documentation.

## Implemented locally

- Retain existing ZA delivery; add US geographic mobile/fixed-line destinations, not every `+1`
  destination. Canada, Caribbean territories, non-geographic toll-free numbers and malformed
  numbers remain excluded. Numbering classification is not proof of ownership or SMS capability.
- Shared runtime classification uses a snapshot of Google's US libphonenumber metadata; the
  private SQL helper uses the identical pattern. Source:
  [Google metadata](https://github.com/google/libphonenumber/blob/master/resources/PhoneNumberMetadata.xml).
  Its Apache-2.0 license is retained under `third-party/google-libphonenumber-LICENSE.txt`.
- Runtime `MOBILE_INVITATIONS_US_DELIVERY_READY` defaults to `false`; database policy
  `us_delivery_ready` also defaults to false. Both must be explicitly ready before US delivery.
- The new migration changes only the native destination guard, asserts its exact source anchor
  and preserves function owner, ACL, security-definer, volatility and search-path metadata.
  Existing AAL2/assignment checks, one-shot dispatch, 48-hour expiry, two-segment reservation,
  shared daily US$5 budget, uncertainty holds and no-blind-retry behaviour remain unchanged.
- Signed US delivery receipts are supported without requiring sending readiness to remain on.
  US sender attribution requires the configured numeric sender, not the ZA alpha rewrite.

## Provider and release gates

Read-only Telnyx inspection confirms the configured profile permits US and ZA destinations,
and the configured US local sender belongs to that profile with A2P messaging. This does **not**
prove an approved campaign is assigned or establish current US pricing. The documented individual
10DLC phone-number campaign lookup returned HTTP 404; registration is therefore **not verified**,
not evidence of a successfully assigned campaign. Telnyx states that
unregistered US long-code business traffic is blocked; verify an approved, appropriate brand,
campaign and number assignment plus its opt-out handling before arming US readiness.
[Telnyx 10DLC requirements](https://support.telnyx.com/en/articles/3679260-frequently-asked-questions-about-10dlc).
Do not register a paid campaign, change the shared profile, purchase a number or send a trial SMS
without the appropriate separate approval.

Release order:

1. Review and apply `20261010122842_mobile_invitation_us_destinations.sql` to hosted Supabase
   only with explicit hosted-migration approval; independently verify metadata and history.
2. Owner commits and deploys the updated code; verify the active source and preserved bindings.
3. Verify provider US registration/routing and conservative two-segment pricing within the
   existing budget. Explicitly arm both US readiness gates only after those checks pass.
4. Sign in as the approved individual operations operator with fresh MFA and invitation scope.
5. Review the authorised roster, create unique links and send one-shot invitations. Record actual
   provider delivery outcomes separately from opening, consent, registration and payment.

The owner subsequently approved the hosted migration. It applied successfully on 10 October;
independent readback confirms US acceptance, Canada/toll-free denial, the native gate and unchanged
owner/ACL/search path/security-definer/volatility. The private helper remains inaccessible to
anon, authenticated and service-role callers. The single hosted policy remains US-disabled.
Supabase initially recorded history version `20261010130639`; with separate owner approval,
only that entry was corrected to committed filename version `20261010122842`. Independent
readback confirms the corrected entry, no old entry and US readiness still false.
No readiness change, invitation or SMS was sent.

## Owner-authorised US transport probe

On 10 October, after deployment and hosted migration verification, the owner authorised a US
message-delivery test. One harmless, single-segment reference message was sent directly through
the configured Telnyx account to a publicly advertised US test inbox. It contained no invitation,
OTP, personal information or usable account link. Telnyx accepted it with HTTP 200 and subsequently
reported `delivered`, no errors, and completion at `2026-10-10T13:11:27.318Z`. The initial acceptance
listed US$0.0040; final cost was not returned in the status readback. The receiver webpage was
reachable but its fetched HTML did not show the reference, so visible inbox receipt is not claimed.

This proves one provider-reported US transport delivery using the existing sender. It does not
prove campaign registration, every recipient/carrier, or the governed production invitation flow.
No production gates were changed and no pilot invitations were sent. The earlier registration
lookup remains inconclusive; do not describe US delivery as categorically blocked.

## Approved readiness preparation

After the transport probe, the owner explicitly approved US invitation readiness and the bounded
seven-recipient cohort send. A guarded update enabled only `us_delivery_ready` on the real pilot
policy; independent readback confirms the existing US$5 daily budget, nine-attempt ceiling and
US$0.50 per-message reservation are unchanged. The ignored production environment now records
`MOBILE_INVITATIONS_US_DELIVERY_READY=true`; the committed template remains default-off.

Cloudflare candidate `1de1729e-e6bb-43ec-9e15-ec313f29b68a` adds only the approved runtime gate,
preserving the source etag and all existing binding names/types from active version
`cc79c72a-3ce1-44d6-bdf7-2fa6a4d8bc04`. The owner subsequently promoted it to 100% traffic.
No invitation or SMS was sent during readiness preparation. Recipient details remain outside Git.

## Governed cohort dispatch checkpoint

Following owner promotion and genuine individual operations MFA, all seven approved
recipients received one dispatch attempt each through the staff invitation register. Each link
has a 48-hour lifetime. The independently approved invitation-only staff assignment lasts
24 hours; it grants no clinical or unassigned-case access.

Hosted immutable signed receipts confirm four ZA deliveries, two ZA attempts at `sent` without
a final receipt, and one US failure. Read-only Telnyx inspection independently confirms the
two pending attempts remain `sent`, and the US recipient's carrier rejected the attempt with
code `40010`, `Not 10DLC registered`. The earlier public-inbox transport success did not establish
deliverability to this carrier. No blind retry, replacement send or paid registration was made.

Seven attempts hold US$3.50 of conservative reservations against the unchanged US$5 cap. Reported
receipt costs are not a release of those reservations. After the initial session expired, the owner
verified email and authenticator again; the existing approved operations context was selected.
Only the seventh invitation was then created and dispatched, with signed `delivered` evidence and
expiry `2026-10-12T15:09:00.824Z`. No earlier recipient was resent. Reported per-attempt receipt
costs total US$0.512, counting each message once, not adding sent and finalized receipts together;
two messages still lack a final receipt, so this is not a claim of final invoiced cost.
Delivery is not proof of reading, registration, questionnaire completion or payment.

The owner separately confirmed receipt of their own invitation at 16:01. This is recipient
confirmation, not a new provider `delivered` receipt. The other non-final attempt must not be
assumed delivered merely because the owner's message arrived. These are the last recorded
outcomes, not a fresh provider-status poll during Task 15.7.

## Local verification

The focused destination/sender/signed-receipt suite passes 75 tests; the expanded configuration,
HTTP and delivery-service packet passes 130 tests. The rollback-only native
delivery packet passes 63 assertions, including default-off US denial, no spend on denial,
explicit readiness, unchanged shared spend, one-shot replay denial and 48-hour expiry.
All 52 local SQL suites pass 2,529 assertions. The no-send eight-request dispatch race proves
one transport call/reservation, uncertainty held and exact baseline restoration. All 34 controlled
desktop/mobile invitation browser checks and the production build pass. Typecheck, lint,
portability, generated-route and diff checks supplement these behavioural proofs.
The complete unit suite passes all 1,478 tests across 182 files. The local database stack was
stopped after verification. The repository-wide formatting check also inspects an unrelated
ignored `.projects/cache/catalog.json` file and reports that cache's formatting; it was not changed.
Deployment and actual US delivery are not inferred from local tests.

## Change accounting

Runtime changes are limited to the new `mobile-invitation-destination.ts` classifier, the existing
Telnyx sender, delivery configuration and signed receipt projection. Tests cover that classifier,
sender, receipt handler, environment catalogue and native SQL packet; the local dispatch-race
fixture explicitly retains US readiness false. The environment catalogue, `.env.example` and
ignored `.env.production.local` add only the default-off US readiness entry. The migration and
metadata license are new. Sprint-14, the release runbook and RAG/index link this packet.
Pre-existing live-pricing/cleanup and Sprint-15 changes are retained, not staged or committed here.
