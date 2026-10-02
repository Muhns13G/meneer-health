---
decision_id: DR-014
title: Minimum Client Profile, Data Rights and Staff Visibility
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA data and technology owner
required_approvers: [business_owner, repository_owner]
effective_date: 2026-10-02
supersedes: null
related_debt: [TD-009, TD-016, TD-037, TD-038]
last_updated: 2026-10-02
---

# DR-014 — Minimum Client Profile, Data Rights and Staff Visibility

## Context and Scope

The minimum pilot needs enough durable client information to establish an invite-only identity,
provide account and operational support, associate Stripe and workflow records through opaque
identifiers, and prepare a minimum-data manual protocol hand-off. It does not require Meneer to
duplicate the external provider's questionnaire, clinical record or protocol.

This decision refines DR-005, DR-007, DR-009 and DR-012 for Task 8.5. It approves the data contract
for Sprint 9; it does not create a profile, enable registration, approve transactional notices or
consent, or authorise a provider hand-off.

## Approved Minimum Profile

| Field or fact                    | Collection/source                       | Purpose                                                        | Classification  |
| -------------------------------- | --------------------------------------- | -------------------------------------------------------------- | --------------- |
| Internal opaque subject ID       | Server generated                        | Stable internal identity and cross-record reconciliation       | Account/contact |
| Tenant ID                        | Server-derived invitation context       | Isolation and authorisation                                    | Internal        |
| Given name                       | Client                                  | Account display, support and customer identification           | Account/contact |
| Family name                      | Client                                  | Account display, support and invoice identification            | Account/contact |
| Verified email                   | Supabase Auth confirmation              | Invitation, authentication, recovery and service notifications | Account/contact |
| Mobile/WhatsApp number           | Client; stored in normalised E.164 form | Approved operational contact and delivery coordination         | Account/contact |
| Mobile verification status       | Trusted verification workflow           | Prevent unverified-channel reliance                            | Account/contact |
| Operational contact preference   | Client: `email` or `whatsapp`           | Route permitted non-clinical service notifications             | Account/contact |
| Account/profile lifecycle status | Server-owned workflow                   | Activation, restriction, closure and rights processing         | Account/contact |
| Profile version and timestamps   | Server generated                        | Concurrency, correction history and audit                      | Account/contact |

Email remains the required verified identity and recovery channel for the pilot. A mobile number
may be recorded before verification but cannot be treated as verified or used for account recovery
until the approved verification workflow succeeds. Selecting WhatsApp permits operational contact;
it is not marketing consent and does not permit health information in a message.

## Explicitly Excluded from the Profile

The minimum profile must not contain a password, identity-document number, date of birth, age,
gender/sex, condition, symptom, medication, blood result, questionnaire answer, diagnosis,
prescription, protocol, product selection, payment-card detail, delivery address or free-text note.

- Supabase Auth owns credentials; application code never reads or stores a password.
- Eligibility and age/clinical evidence belong to the approved external clinical pathway, not the
  Meneer profile.
- A delivery address is collected only after an approved order requires fulfilment. It belongs to a
  purpose-bound order/delivery record with its own retention and visibility rules.
- Product, payment, provider and hand-off records use opaque references rather than profile fields.
- Marketing, research, analytics and enrichment are separate purposes requiring their own approved
  data and consent decisions; profile creation does not opt a client into them.

## Purpose and Processing Boundaries

OCTOTHORP ZA is accountable for the profile under DR-012. Permitted purposes are invite-only account
administration, identity/contact verification, service and security notifications, non-clinical
support, workflow coordination, invoice/customer identification where required, rights handling,
fraud/abuse control and audited minimum-data hand-off preparation.

The profile may not be used to infer health status, personalise treatment, score clinical risk,
advertise medicines, create behavioural dossiers, enrich third-party marketing profiles or give a
provider general access to the Meneer tenant.

## Staff and Partner Visibility

All access is server-authorised by tenant, role, assignment, purpose, workflow state and assurance.
UI hiding is not access control.

| Actor                        | Approved projection                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| Client                       | Own complete minimum profile, verification state and version; controlled correction and rights actions   |
| Assigned operations staff    | Name, masked contact, contact preference and verification/account status required for the case           |
| Assigned support staff       | Name, masked contact and verification/account status required for the support case                       |
| Payment/finance operations   | Name only where required for invoice/refund reconciliation plus opaque payment/customer references       |
| Privacy/auditor role         | Purpose-bound reviewed profile/history or scoped export required for a rights/audit case                 |
| Security/identity operations | Opaque IDs, contact digest/masked value, verification and lifecycle status; full value only if necessary |
| Administrator/release role   | No routine profile read; configuration or release authority does not imply client-data access            |
| External clinical/pharmacy   | No direct profile access; only a separately approved minimum hand-off projection                         |
| Courier                      | No profile access; only the approved order-delivery projection when fulfilment is authorised             |

Raw profile values must not enter analytics, ordinary logs, telemetry, payment metadata, URL/query
strings, unencrypted exports or general support email. Ordinary email/WhatsApp may carry a generic
notification and safe opaque reference, not a clinical or detailed commercial payload.

## Correction, Export and Deletion Treatment

1. **Correction:** the client may correct given/family name and contact preference through an
   authenticated, version-checked command. Email or mobile changes require step-up, confirmation of
   the new channel, safe notification to the previous channel and session/risk review. Changes
   preserve attributed history and reconcile downstream projections.
2. **Access/export:** a verified client may request an intelligible export of their profile,
   verification facts, lifecycle history and applicable provenance. Another subject's data,
   credentials and privileged security material are excluded. Delivery uses a secure expiring
   channel; ordinary email only announces availability.
3. **Restriction/objection:** processing for a disputed or objected purpose is restricted while the
   accountable owner reviews lawful purpose, obligations, open workflows and holds. Restriction
   must propagate to optional notifications and downstream projections.
4. **Closure/deletion:** after verified account closure, delete or irreversibly de-identify profile
   and contact values within 90 days unless a retained transaction, open case, security obligation
   or approved hold requires a narrower retained link. Preserve only the opaque subject reference
   and minimum closure/audit evidence where required.
5. **Downstream reconciliation:** approved correction or deletion propagates to caches, queues,
   notification destinations, processors and restorable data under DR-005/Task 5.13. The system
   must not claim completion while unexplained copies remain.

## Retention and Exit

- Active profile/contact data is retained while the pilot account is active.
- The 90-day post-closure rule above applies to profile/contact values.
- Expired invitations delete contact/token payload after 30 days; minimum abuse evidence may remain
  for 12 months under DR-005.
- Profile change, access and rights evidence follows DR-005's consent/privacy-rights and audit
  schedules; it is not stored indefinitely merely because it is convenient.
- Commerce, invoice, refund, order and fulfilment records follow their separate approved retention
  schedules and retain only the minimum necessary opaque profile link.
- At pilot exit, profile disposition begins within five business days and completes before data is
  reused for public launch. Reuse requires a compatible purpose and approved instrument.

## Implementation and Verification

- Sprint 9 must implement the profile as versioned server-owned records with tenant scope,
  deny-default browser roles, RLS, validated commands, durable idempotency and audit evidence.
- Verified email must reconcile with the managed identity record rather than duplicate an
  independently editable profile value.
- The existing preserved prototype's `password` field and broad `Full name` representation are not
  implementation authority; Sprint 9 must use this approved field catalogue.
- Tests must prove own-profile access, assigned minimum projections, wrong-tenant/role/purpose
  denials, masked staff responses, stale-version failure, contact-change controls, export scope,
  deletion propagation and false-success prevention.
- Task 8.6 still owns the exact notice, acknowledgement and consent versions. Task 8.8 still owns
  the external-provider hand-off capability. Neither may be inferred from this decision.

## Consequences and Residual Gates

This decision completes Task 8.5 and removes profile-field ambiguity from Sprint 9. TD-009 remains
In progress because the exact external provider/contract, transactional instruments, hand-off data
agreement and dedicated channels are unresolved. TD-037 and TD-038 remain In progress until the
approved profile and stepped flow are implemented and reviewed with live assistive technology.

## Review Triggers

Review before adding any field or purpose; collecting an address earlier than an approved order;
adding marketing, analytics, health or product data; changing retention; exposing a new staff or
partner projection; using phone-only identity/recovery; changing legal parties; or migrating the
profile to a successor framework.

## Affected Documents

- `docs/07-decisions/DR-005-data-tenancy-lifecycle-migration.md`
- `docs/07-decisions/DR-007-identity-authorisation-architecture.md`
- `docs/07-decisions/DR-009-free-tier-pilot-provider-stack.md`
- `docs/07-decisions/DR-012-minimum-pilot-responsibility-allocation.md`
- `docs/02-implementation-plans/phase-02/sprint-08-pilot-activation-contract.md`
- `docs/02-implementation-plans/phase-02/sprint-09-identity-profile-consent.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`

## Approval

| Approver role    | Evidence/reference                  | Decision | Date       |
| ---------------- | ----------------------------------- | -------- | ---------- |
| Business owner   | Instruction to implement Task 2.8.5 | Approved | 2026-10-02 |
| Repository owner | Instruction to implement Task 2.8.5 | Approved | 2026-10-02 |

Privacy and security implementation review remains mandatory before profile activation.
