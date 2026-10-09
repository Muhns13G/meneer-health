---
plan_id: phase-02-pilot-owner-approvals
title: Questionnaire-Only Initial Pilot Scope and Owner Approval Packet
status: scope-and-sms-budget-approved-activation-gated
last_updated: 2026-10-09
owner: "@Muhns13G"
authority: owner-approved-scope-and-budget-not-runtime-activation
---

# Pilot Activation — Scope and Approval Packet

## Approved Amendment — 9 October

The owner defers private uploads until needed. Initial intake uses the protected questionnaire;
blood-result files are not collected or required for initial peptide questionnaire submission.
This supersedes the earlier upload-before-launch requirement. It does not establish that a clinician
can never request tests or that submission authorises treatment. No ordinary-email attachment or
alternate file collection is introduced. Future uploads require separate access, scan, retention
and metadata/object-byte recovery acceptance. The PDF/JPEG/PNG, 10 MB/file, five/client design remains
future scope, not implemented functionality.

TD-065 remains In progress: **upload/object recovery is deferred until upload activation**, while
**identity/session/MFA, current restrictions and domain-authority recovery remain applicable to
real accounts/questionnaire intake**. No debt is falsely Verified; no new ID is created.
This amendment does not enable SMS, accounts, live payments, products or generator transfer.

## Additional Owner Decisions — 9 October

The owner approves invitations, verified accounts/profile and questionnaire onboarding, and requests
**live payments and post-onboarding product display at launch**, even without product images.
Product display is not approval of automatic product purchase, clinical eligibility, dispensing or
fulfilment. Existing R999 deposit, credit/refund and review gates remain; actual live merchant
readiness and final transaction terms must pass before real money is accepted. Generator transfer
remains separately gated.

The owner explicitly selects payment arrangement A: **OCTOTHORP ZA remains the seller; Octothorp
LLC collects its payments under the owner-confirmed arrangement**, retaining Meneer Health
branding. This resolves the contracting-entity choice, not independent agreement/provider review
or runtime activation. Final seller/payment-collector disclosures must reflect this arrangement;
do not substitute Octothorp LLC as seller.

The owner approves a **US$5 SMS cap**, recorded against the proposed rolling-24-hour budget.
Existing attempt/segment controls and no-blind-retry requirements remain. The owner subsequently
sets the initial cohort to **fewer than ten participants (maximum nine)**; no exact roster or staged
one-then-ten expansion is approved here. These decisions do not change hosted
settings or authorise a send to a real cohort.

Existing owner-confirmed operator facts are recorded in `src/lib/compliance/pilot-profile.ts`:
**OCTOTHORP ZA**, enterprise number **K2024185008**, VAT number **9279262266**. These facts are
retained, not newly independently verified. Do not ask the owner to repeat them. A contact/service
address was not found in the repository records checked; obtain only that missing fact or a
reference to its existing record. Operational appointments and the 24-hour target remain approved;
this reply does not separately establish actual coverage or staff access readiness.

## Prior Owner Decisions Retained

- Unique 48-hour SMS link plus verified email; six-digit/900-second OTP, no phone-only login.
- Mansoer operational/support/privacy administration primary, Mikhail alternate; Tasneem and
  Dr Ziyaad Noor nominated clinical lead/alternate. Ordinary response within 24 hours where possible,
  not emergency coverage or proof of professional/Information Officer registration.
- Free account/intake, not membership. R999 review deposit, capped first-product credit/refunded
  remainder, schedule RRP, separate delivery and staff review of unresolved monetary exceptions.
- DR-013 selects OCTOTHORP ZA as current operator/seller/invoice counterparty and Meneer merchant
  brand. Existing name/enterprise/VAT facts are retained; contact/service address and actual
  payment-account eligibility remain to be established.
- Generator renewal waits until actual manual generation is needed. Provider/clinical/access
  acceptance is required before real transfer, not before preparing this document.
- Owner-reported reviewer approval of draft direction is recorded. Complete factual instruments,
  exact hashes/versions and approval references still need governed publication.

## Owner-Only Decisions/Facts to Settle Now

| Item                            | Proposed direction or required factual input                                                                                                                                               | Current state                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| First enabled scope             | Invitations, verified account/profile, questionnaire, live payments and post-onboarding product display without images.                                                                    | Owner approved direction; live-payment/catalogue acceptance pending |
| First cohort/budget             | Fewer than ten participants (maximum nine), US$5 rolling-24-hour SMS cap, existing attempt/segment controls and no automatic resend.                                                       | Cohort ceiling/budget approved; runtime activation pending          |
| Real operational coverage       | Confirm nominated primary/alternate availability, staff identities, fallback and stop/escalation handling for this cohort.                                                                 | Appointments/24-hour target approved; real coverage pending         |
| Contracting/contact facts       | OCTOTHORP ZA, K2024185008 and VAT 9279262266 already owner-confirmed; locate/supply contact/service address and remaining applicable disclosures. Retain verified support/privacy aliases. | Known identity facts retained; address and remaining facts pending  |
| Final instruments               | Approve completed account/privacy/intake wording and exact versions/hashes once factual placeholders and applicable reviewer inputs are resolved.                                          | Final copy not yet issued                                           |
| Commercial enablement at launch | Final deposit terms and actual live merchant readiness; delivery/product transaction particulars before their applicable transactions.                                                     | Live-payment direction approved; operational acceptance pending     |

Scope, SMS budget and initial cohort ceiling are approved at decision level. Do not ask again for
recorded operator identity facts, R999/RRP/refund direction or owner-reported reviewer approval.
Private references suffice for confidential evidence; no contracts, registration credentials or
participant list need to be pasted into chat.

## Items Approval Alone Cannot Verify

### Live Payment Readiness — Current Code Inspection

The [live activation packet](live-payment-activation.md) records locally implemented explicit-mode
HTTP/providers and a forward account/environment isolation migration. Legacy sandbox entrypoints
remain sandbox-only; live/test credentials, Sessions and funding cannot cross modes. The new
migration is locally verified but not approved/applied to hosted Supabase. No live database release
or payment configuration is activated; actual deployed live settlement/refund acceptance is pending.
Recorded Sprint-11 and Sprint-13 exercises prove sandbox capture, settlement and refund behaviour,
not live account eligibility. A separate read-only live-account check reports active card payments
and payouts, a US account owned by Octothorp LLC, Meneer Health display name and one pending
verification item. The owner confirms branding, reports acceptance and selects OCTOTHORP ZA as
seller with Octothorp LLC collecting its payments. The arrangement is owner-confirmed;
independently referenced agreement/business acceptance remains unverified. Capability flags do not
prove these facts or the live application journey.

Live launch requires hosted acceptance of that isolated implementation plus verification of the actual merchant's
charge/payout readiness, appropriate business eligibility, live webhook/configuration and final
transaction terms. Do not remove the sandbox guards or exchange keys as a shortcut. See
[Stripe's go-live checklist](https://docs.stripe.com/get-started/checklist/go-live).

TD-006/009 require complete truthful instruments and applicable party/operator/transfer evidence.
TD-007/010 require actual clinical/product/provider/commercial/live-money readiness before those
capabilities. TD-037/038 need released individual-flow AT/device/transition evidence. TD-043 needs
current assignments, real coverage, unattended callbacks/capacity and response acceptance. TD-064
needs remaining authenticated hosted conflict/unchanged-state proof. TD-065 identity needs remaining
domain-grant/current-disposition and recovery acceptance. TD-066 needs implemented safe unconverted
identity retention/retirement/reissue/copy handling, or a specifically documented approved
time-bounded operating control; generic launch approval is not that control.

The release stays no-go until the applicable account/questionnaire gates and exact release checks
pass, including live-payment/catalogue acceptance for the selected launch scope. Keep product
transactions and generator gates separate from catalogue display. No hosted mutation, message,
charge or activation occurs here.
