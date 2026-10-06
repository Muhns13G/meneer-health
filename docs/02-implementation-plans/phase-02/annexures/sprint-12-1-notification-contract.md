---
plan_id: phase-02-sprint-12-1
title: Pilot Notification Contract and Sprint 12 Readiness
status: completed-contract
last_updated: 2026-10-06
owner: "@Muhns13G"
depends_on: [phase-02-sprint-09, phase-02-sprint-10, phase-02-sprint-11, DR-016]
---

# Task 2.12.1 — Notification Contract

## Readiness and scope

The clean `itws-I` checkout at `e1ed794` contains Sprint 11's closure report. The owner
confirms passing CI. Sprints 9–11 supply managed identity, private client/staff projections,
intake safety routing and authoritative payment facts. They do not supply a unified client
notification service or prove real support coverage. Sprint 12 may proceed without enabling the
real pilot. This task freezes the engineering contract; Tasks 12.2–12.8 implement and exercise it.

Preserve approved website wording. No new marketing consent, clinical assessment, operating hours,
response guarantee, payment authority or public channel publication is authorised by this packet.
The [support decision](../../../07-decisions/DR-016-pilot-support-escalation-channels.md) remains
authoritative. TD-037, TD-038 and TD-043 remain open until their actual acceptance evidence exists.

## Existing implementation, not new delivery proof

| Boundary         | Observed source                                                | Reuse and gap                                                                                      |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Invitation       | `src/application/identity/staff-patient-invitation-service.ts` | Reserves before sending, records delivery binding, denies replay; preserve managed Auth ownership. |
| Sign-in/recovery | `src/application/identity/patient-session-service.ts`          | Managed code verification and revocation; do not create a second OTP sender.                       |
| Operations alert | `src/server/operations/alert-dispatch.ts`                      | Generic Brevo email, private lease/receipt, bounded dispatch, ambiguous-send containment.          |
| Safety review    | `src/server/intake/safety-dispatch.ts`                         | Generic private-review notice to claimed recipient; no answers or client identifiers.              |
| Public support   | `src/lib/support-channels.ts`                                  | Approved central content, not a routed support ticket or ownership proof.                          |

Existing operations persistence bounds attempts at three, leases at two minutes, retry delays
at 60/300 seconds and operations attempts at 50 per UTC day. These are observed existing limits,
not proof of a shared cross-sender budget. New dispatch must coordinate budgets rather than add
independent allowances that exhaust Auth capacity. Existing safety routing/clinical holds must
not be weakened while the transport is consolidated.

## Event and template catalogue

Templates are plain transactional messages, not marketing. Every new template uses a stable
version and generic subject; the only destination is the relevant fixed first-party sign-in page.
No client/case/order identifier, query parameter, signed link or provider token enters that link.
The proposed text below is the implementation baseline, not amended public marketing copy.

| Event family           | Authoritative trigger                                                    | Recipient                                                                                  | Subject / message baseline                                                                               |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Invitation             | Authorised reserved invitation                                           | Exact invited mailbox through managed Auth                                                 | Existing approved code-only invitation template; keep code out of application logs.                      |
| Sign-in/recovery       | Existing managed identity command                                        | Requested mailbox under existing non-enumerating controls                                  | Existing approved Auth template; expiry and verification stay provider-owned.                            |
| Account action         | Committed profile/rights/account outcome                                 | Current verified own-client contact                                                        | `Meneer Health — account update` / An account update is available. Sign in to review it securely.        |
| Payment action         | Committed attributed payment/refund fact or actionable private exception | Current verified own-client contact                                                        | `Meneer Health — payment update` / A payment update is available. Sign in to review its status securely. |
| Hand-off/status        | Committed client-visible workflow projection                             | Current verified own-client contact                                                        | `Meneer Health — service update` / A service update is available. Sign in to review it securely.         |
| Operations exception   | Governed operations alert                                                | Approved operations roster; existing support destination until replaced through governance | Retain existing internal operations-review template.                                                     |
| Safety review          | Existing private safety notification                                     | Verified assigned clinical owner/fallback, never generic non-clinical support              | Retain existing private-review template and its acknowledgement disclaimer.                              |
| Support receipt/update | Persisted purpose-routed support request/outcome                         | Verified requester and approved purpose owner, separate messages                           | `Meneer Health — support update` / A support update is available. Sign in to review it securely.         |

A checkout redirect, button click, intake submission or provider HTTP acceptance is not payment,
clinical approval, completed hand-off or human acknowledgement. Only committed authoritative facts
may generate the relevant event. Exceptions must not send a misleading success template.
Account/contact changes resolve recipients from current governed state, not a browser payload.
Staff recipients require current role, purpose and coverage authority before sending.

## Privacy and channels

- Ordinary messages contain no health answers, protocol, dose, compound, blood result, financial
  amount, attachments, case identifiers, names, card data or free-text support submissions.
- Email addresses are necessary transport routing data, not permission to export the profile.
  Internal opaque transport idempotency keys are not user-facing identifiers.
- The Auth code is the narrow existing authentication exception: never reuse it in generic
  notifications, tracking, audit bodies or analytics.
- Authentication/transactional messages must not depend on marketing opt-in. Marketing tracking
  remains separately governed; no blanket provider-account tracking change occurs in this task.
  Do not wrap Auth codes/links or private transactional destinations with marketing tracking.
- Privacy/complaint/clinical aliases remain governed by DR-016. Email is not an emergency service,
  verified identity proof, clinical acknowledgement or completed refund command.
- Preserve the qualified 24-hour response target; do not convert it into guaranteed clinical
  response. Clinical escalation thresholds and after-hours coverage need clinical-owner approval.

## Durable delivery and resend contract

Persist a tenant-scoped notification intent atomically with its authoritative event, or through a
reconciled durable outbox. Dedupe by event, recipient role/destination version and template version.
Store a private minimal transport projection: opaque event reference, template version, recipient
reference, attempts/lease, timestamps, outcome and bounded provider receipt—not provider bodies.
Follow current tenancy, lifecycle, restricted access and audit conventions.

Separate `pending`, `leased`, `accepted`, `delivered`, `retryable`, `failed`, `uncertain` and
`suppressed` evidence. Provider acceptance alone never becomes delivered/read/acknowledged.
Authenticated, attributed provider delivery evidence may establish delivery; absence of such
evidence leaves acceptance unconfirmed. Human acknowledgement and resolution are separate facts.

Retry only explicit retryable non-acceptance, with a stable idempotency key and bounded backoff.
Timeout, redirect, expired lease or failed receipt persistence goes to uncertain review, not a
blind resend. Definite failure, suppression, exhausted budget and missing recipient create owned
follow-up. Never silently drop them or claim success. Respect provider retry guidance without
unbounded waits, quota upgrades or automatic spend.

New non-Auth dispatch uses at most three attempts and the existing two-minute lease and
60/300-second backoff baseline. A shared daily budget must preserve the existing 50-attempt
operations ceiling and reserve Auth capacity; verify the actual free allocation before activation.
Auth retains its provider expiry and current request-rate controls, independently of job retries.
Rate-limit requesters, principals and purpose routes server-side; client cooldown alone is not
enforcement. AAL2-authorised manual resend requires an audited reason, fresh recipient authority,
budget availability and reconciliation of any uncertain send; it cannot bypass suppression or
create a fresh send automatically on browser retry.

## Acceptance packet and outstanding inputs

Task 12.2 must prove strict templates, recipient authority, transactional event/outbox atomicity,
duplicate/replay denial, cross-tenant denial, rollback, lease expiry, rate/budget contention,
redirect/timeout/429/5xx/4xx, suppression and receipt-write failure. Task 12.4 adds private owned
follow-up with acknowledgement distinct from delivery. Task 12.8 requires synthetic actual inbox
receipt plus failed delivery/fallback/acknowledgement evidence, restored disabled configuration
and fixture cleanup. Provider/hosted writes and emails need scoped owner authorisation.

Before real activation obtain the private primary/alternate roster, mailbox delegation/security
and absence coverage, approved clinical escalation/deadlines, sender/domain authentication,
actual quota and suppression handling, and verified delivery-event authentication where used.
Do not infer those from old test receipts or software-provider contacts. These are TD-043/release
inputs, not blockers to implementing conservative fail-closed notification machinery.

No runtime code, dependency, migration, hosted setting, email, Git operation or deployment changes
in Task 12.1. Contract review and documentation consistency are its validation scope; it does not
substitute for Sprint 12's implementation, delivery or live accessibility tests.
