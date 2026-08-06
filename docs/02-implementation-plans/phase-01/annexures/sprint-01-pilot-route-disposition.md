---
artifact_id: phase-01-sprint-01-route-disposition
title: Sprint 01 Pilot Route Disposition
status: approved-for-implementation
authority: product-release-owner-approved
last_updated: 2026-08-06
source_baseline: aaab9d1b31bf31f062a0b2d336cbcbde13e46911
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Sprint 01 Pilot Route Disposition

## Purpose

This matrix defines what each current route, call to action, form, and implied hand-off may do during
the controlled v1 pilot. It combines the dated runtime baseline with confirmed owner direction.
Approval covers route containment and replacement sequencing; it is not clinical, legal, privacy,
partner, or full pilot-release approval.

Public marketing remains accessible. Customer transactions are limited to the enrolled cohort and
must be real, durable, monitored, and operational. Until those controls exist, the affected capability
remains gated. No customer-facing demonstration or false-success state is permitted.

## Classification

- **Functional:** available for its stated, evidenced purpose.
- **Manually operated:** creates a durable, traceable record that an assigned operator processes.
- **Waitlist:** captures only approved minimal interest data or displays a no-data notification.
- **Restricted:** available only to the enrolled cohort after access and operational gates pass.
- **Disabled:** unavailable to users while the current implementation is preserved pending an
  approved, verified replacement.

`Disabled` is a runtime and release disposition, not source deletion. Replacement follows the order
preserve, disable, implement, verify, cut over, observe, and only then retire with repository-owner
approval. Git history is additional recovery evidence, not the sole preservation mechanism during
active replacement work.

No current route qualifies as manually operated: the repository contains no durable form destination,
operator queue, notification, or case identifier.

## Route Matrix

| Route or endpoint                       | Observed state                                                                                                         | Pilot disposition                      | Required containment or activation evidence                                                                                                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                     | Public responsive marketing page; transactional CTAs lead to simulated flows and several claims lack evidence.         | **Functional** public acquisition      | Retain public; redirect transactional CTAs only to the gated cohort entry; qualify unsupported claims under TD-006.                                                                                                                         |
| `/start`                                | Local-only condition, placeholder consent, simulated account, empty questionnaire, and false confirmation.             | **Restricted**                         | Until real cohort access, identity, consent, intake, durable submission, support, and incident controls exist, expose no form fields or success state. Hair, ED, weight, and TRT remain activation decisions, not implied live services.    |
| `/peptides`                             | Local profile/password form, placeholder acknowledgement, missing media, and `.example.com` questionnaire destination. | **Waitlist**                           | Replace with an approved minimal no-data notification by default. Do not collect profile or health data or link to Precise Wellness until product-level, partner, questionnaire, transfer, escalation, and dispensing evidence is approved. |
| `/poster`                               | Printable concept with a non-scannable `QR` box and unverified claims.                                                 | **Disabled**                           | Preserve the route but keep it out of pilot distribution and public access until an attributed destination, QR asset, print test, owned logo, and claim approval exist.                                                                     |
| `/poster-thanks`                        | Printable concept with a non-scannable `QR` box and unverified claims.                                                 | **Disabled**                           | Preserve the route and apply the same campaign, QR, asset, print, and claim gate as `/poster`.                                                                                                                                              |
| `/privacy`                              | Public placeholder that describes a future policy.                                                                     | **Functional** public information only | Retain as a truthful interim notice, but never use it as a consent basis. Health-data collection stays disabled until an approved, versioned policy is published.                                                                           |
| `/terms`                                | Public placeholder that describes future terms.                                                                        | **Functional** public information only | Retain as a truthful interim notice; do not enable transactions until approved, versioned terms cover the enabled scope.                                                                                                                    |
| `/contact`                              | Placeholder channel, unlinked `hello@` address, and unsupported doctor-WhatsApp instruction.                           | **Functional** support information     | Publish `support@meneerhealth.co.za` only after monitoring, ownership, privacy handling, response expectations, and escalation are verified. Hide unsupported channel instructions until a substitute is approved.                          |
| Unknown route                           | Working branded 404 body with stale Lovable document metadata.                                                         | **Functional** recovery                | Retain the home recovery action; metadata correction remains required under TD-041.                                                                                                                                                         |
| Error boundary                          | Offers local retry and home recovery.                                                                                  | **Functional** recovery                | Retain; verify retry does not duplicate a future transaction and production does not expose sensitive errors.                                                                                                                               |
| `GET /.mcp/list-tools`                  | Public read-only tool listing responds successfully.                                                                   | **Functional** public information      | Retain only public, non-personal tools; sanitize claims and preserve the no-patient-data boundary.                                                                                                                                          |
| `POST /.mcp/invoke-tool/$tool`          | Public read-only invocation works for three tools.                                                                     | **Functional** public information      | Retain after claim review; it must not accept patient data or imply unavailable services.                                                                                                                                                   |
| `/mcp`                                  | Public MCP protocol transport initializes successfully.                                                                | **Functional** public information      | Same public-information boundary; platform ownership changes in Sprint 02 and final MCP governance remains Sprint 07 scope.                                                                                                                 |
| `/.well-known/oauth-protected-resource` | Returns `404`; MCP authentication is not configured.                                                                   | **Disabled**                           | Preserve the generated route while keeping authentication claims and protected workflows disabled until an approved architecture requires and implements them.                                                                              |

## CTA and Form Matrix

| Surface                                                        | Current action                                                                           | Pilot disposition                                                                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header logo and recovery `Go home` actions                     | Navigate to `/`.                                                                         | **Functional**; retain.                                                                                                                                 |
| Header condition links                                         | Use page-relative `#treatments`; fail from non-home routes.                              | **Functional** informational navigation only after targeting the homepage section reliably; TD-035 owns the broader navigation fix.                     |
| `How it works` links                                           | Use page-relative `#how`; fail from non-home routes.                                     | **Functional** under the same homepage-target correction.                                                                                               |
| Mobile menu toggle and menu links                              | Open and close through local UI state; Escape and expanded/control semantics are absent. | **Functional** navigation with known accessibility remediation assigned to Sprint 06; transaction links retain their stricter dispositions below.       |
| `Start privately`, `See if you qualify`, and `Find your match` | Navigate to `/start`.                                                                    | **Restricted**; must not expose simulated fields or confirmation. During development, route only to an explicit unavailable/access-gated state.         |
| Hair loss, ED, weight, and TRT treatment cards                 | Navigate to the same undifferentiated `/start` simulation.                               | **Restricted**; each condition requires an approved pilot disposition and real condition-specific pathway before activation.                            |
| Peptide navigation and treatment card                          | Navigate to `/peptides`.                                                                 | **Waitlist**; route may show only approved minimal wording with no profile, password, acknowledgement, or health-data capture.                          |
| Footer policy and contact links                                | Navigate to `/privacy`, `/terms`, and `/contact`.                                        | **Functional** public information subject to the route controls above.                                                                                  |
| `/start` condition buttons                                     | Store one condition in browser state.                                                    | **Restricted**; unavailable until the selected condition maps to an approved durable journey.                                                           |
| `/start` `Back` and step `Continue` controls                   | Move between local simulated states.                                                     | **Restricted** with the route; they may return only inside an approved journey and must never imply persistence.                                        |
| `/start` consent checkbox                                      | Accepts placeholder POPIA and telehealth wording.                                        | **Disabled** until approved, versioned consent and withdrawal recording exist; preserve for replacement comparison.                                     |
| `/start` account fields and `Create account`                   | Store name, email, WhatsApp, and plaintext password in React state only.                 | **Disabled** until approved identity exists; never present this as account creation.                                                                    |
| `/start` questionnaire and `Submit`                            | Contains no questions and immediately advances locally.                                  | **Disabled** until an approved questionnaire, safety routing, server validation, durable destination, failure handling, and traceable identifier exist. |
| `/start` confirmation                                          | Promises contact, consultation, prescription, and delivery without a transaction.        | **Disabled** until rendered from verified durable success and an owned operational hand-off.                                                            |
| `/peptides` `Create your profile` and profile form             | Store contact details and a password in local state.                                     | **Disabled**; preserve the implementation, but the gated peptide page must not expose these fields.                                                     |
| `/peptides` step `Back` controls                               | Move between the local profile and acknowledgement states.                               | **Disabled** with the simulated stepped flow; expose only ordinary home/navigation actions on the waitlist page.                                        |
| Peptide acknowledgement                                        | Accepts wording marked as placeholder.                                                   | **Disabled** until approved for the exact products and pathway.                                                                                         |
| `Continue to questionnaire`                                    | Navigates to a Precise Wellness `.example.com` placeholder.                              | **Disabled** until the real destination and the full partner/data/regulatory gate pass.                                                                 |
| Poster `Scan to start` boxes                                   | Display `QR` text and no link.                                                           | **Disabled** from distribution until real attributed QR assets pass device and print testing.                                                           |
| Contact email/channel instruction                              | Displays an unlinked, unapproved address and doctor WhatsApp instruction.                | **Functional** only after replacement with the monitored support channel and approved escalation wording.                                               |
| MCP listing and invocation                                     | Exposes public service descriptions to machine clients.                                  | **Functional** after retained claims are evidenced or qualified; no write, account, payment, or patient tool is allowed.                                |

## Operational Hand-offs

| Implied hand-off                                                              | Current evidence                                                                                    | Pilot rule                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account, consent, and intake receipt                                          | No request, storage, identifier, or operator queue.                                                 | Prohibited until durable and monitored; local success is never sufficient.                                                                                                         |
| Clinician review, WhatsApp contact, bloodwork, consultation, and prescription | Copy only; no approved operator or integration is implemented.                                      | Hide timing and completion promises until the exact condition pathway, owner, support, and escalation are approved; preserve source copy for replacement review.                   |
| Stripe payment and order creation                                             | No payment code, webhook, order store, or reconciliation exists.                                    | Not available in this task; later activation requires the approved standalone account and separate durable payment/order states.                                                   |
| Precise Wellness questionnaire and dispensing decision                        | Owner-confirmed intended model; repository URL and wording are placeholders.                        | Keep gated until the exact products, partner authority, questionnaire governance, data transfer, decision record, exclusions, escalation, and adverse-event process are evidenced. |
| Precise Wellness supply, Meneer hub receipt, and courier delivery             | Owner-confirmed target only; no repository workflow exists.                                         | Do not promise fulfilment until custody, stock, dispatch, exception, reconciliation, tracking, and 3–5-business-day start event are approved.                                      |
| General support                                                               | `support@meneerhealth.co.za` is owner-confirmed; monitoring is not verified in repository evidence. | Publish after naming the operator, service expectations, privacy handling, and clinical/urgent/incident escalation route.                                                          |
| Poster/campaign attribution                                                   | No real QR destination or analytics contract.                                                       | No distribution until the destination, campaign parameters, privacy treatment, print evidence, and rollback owner are approved.                                                    |

## Decisions Still Required Before Activation

1. Name the product/release, clinical, legal/privacy, support, and operations approvers.
2. Choose and document the cohort enrolment and transactional access mechanism.
3. Approve which of hair loss, ED, weight management, and TRT participate in the pilot.
4. Approve the safety entry, urgent-care, exclusion, consent, policy, and support wording for each enabled journey.
5. Decide the durable identity, submission, data, notification, payment, and order destinations through the owning later sprints.
6. Supply and approve the logo, campaign destinations, and any retained media.
7. Complete the product-level Precise Wellness evidence before changing peptides from waitlist status.

## Implementation Order

1. Gate `/start` and replace all false transaction states with an explicit restricted-unavailable state.
2. Present `/peptides` as the approved minimal no-data waitlist notification and disable its external hand-off while preserving the current implementation.
3. Preserve the poster routes but keep them disabled and undistributed until their asset and campaign gates pass.
4. Correct public CTA destinations, support information, and unsafe or unsupported claims.
5. Re-run the route, submission, network, responsive, log, and MCP baseline before approving this
   artefact and proceeding to the next commit boundary.

## Approval Record

Product/release approval authorises implementation of this route disposition. Clinical,
legal/privacy, and support/operations approvals remain mandatory before activating capabilities in
their respective domains.

| Role                     | Name       | Status  | Date |
| ------------------------ | ---------- | ------- | ---- |
| Product/release owner    | @Muhns13G  | Approved | 2026-08-06 |
| Clinical owner           | Unassigned | Pending | —    |
| Legal/privacy owner      | Unassigned | Pending | —    |
| Support/operations owner | Unassigned | Pending | —    |
