---
decision_id: DR-007
title: Identity and Authorisation Architecture
status: approved
accountable_owner: Octothorp ZA security owner
implementation_owner: Octothorp ZA technology owner
required_approvers:
  [security_owner, privacy_owner, clinical_owner, pharmacy_owner, operations_owner, release_owner]
effective_date: 2026-08-08
supersedes: null
related_debt: [TD-004, TD-013, TD-014, TD-015, TD-017, TD-019, TD-020]
last_updated: 2026-08-08
---

# DR-007 — Identity and Authorisation Architecture

## Context and Scope

The current v1 application has no authentication, sessions, roles, permissions, privileged access,
or service identities. Its former local password/account prototype is inaccessible behind a
non-transactional gate. DR-003 defines module/state ownership, DR-004 defines contracts, DR-005
defines tenant/data boundaries, and DR-006 governs provider selection.

This record approves identity, authentication, session, recovery, authorisation, privileged-access,
and service-identity requirements. It does not select or provision an identity provider and does not
make any current route authenticated.

### Explicit Unknowns and Gates

- `[TBC — owner: SECURITY/DATA OWNERS — gate: DR-006 provider selection]`: identity provider,
  approved region, data roles, assurance, export/deletion, incident, recovery, and exit evidence.
- `[TBC — owner: PRIVACY/OPERATIONS OWNERS — gate: Task 3.8]`: exact workforce identities,
  employment/partner relationships, role approvers, support verification procedure, and access-review cadence.
- `[TBC — owner: CLINICAL/PHARMACY OWNERS — gate: Task 3.8]`: named clinical/pharmacy role holders,
  assignment rules, professional scope, break-glass authority, and emergency review owner.
- `[TBC — owner: SECURITY OWNER — gate: Sprint 05]`: concrete cookie/domain settings, token format,
  key custody, rate limits, session durations if the provider cannot enforce these approved maxima,
  and implementation evidence.

## Options Considered

| Option                                                       | Benefits                                                                   | Costs and risks                                                                         | Disposition |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------- |
| Application-managed plaintext/password fields                | Simple prototype                                                           | Credential exposure, weak recovery/session controls, duplicated security responsibility | Rejected    |
| Authentication alone with UI-hidden actions                  | Fast implementation                                                        | IDOR, vertical/horizontal privilege escalation, tenant leakage, no purpose enforcement  | Rejected    |
| Managed identity plus server-side RBAC and contextual policy | Strong authentication with portable internal authority and least privilege | Requires mapping, policy tests, access review, and provider exit design                 | Approved    |

## Decision

Meneer will use an approved managed identity provider for authentication while retaining stable,
opaque internal subject identifiers and server-side authorisation in the application/domain layer.
Provider accounts, groups, roles, claims, and metadata are evidence inputs; they do not become the
sole source of domain permission or clinical/professional authority.

Access is **deny by default** and requires all applicable dimensions:

1. authenticated human or service identity;
2. active internal subject/account and tenant membership;
3. approved role and action;
4. resource relationship or assignment;
5. current purpose and workflow state;
6. required authentication assurance/step-up; and
7. no suspension, expiry, hold, or separation restriction.

Every command and query enforces these rules server-side. UI visibility improves usability but is
never security enforcement.

## Identity Model

| Identity kind            | Internal treatment                                                              | Prohibited assumption                                                    |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Patient                  | Internal subject linked to verified contact/account and tenant scope            | Email/phone/provider ID is immutable identity or grants record access    |
| Clinician                | Workforce/partner subject plus verified professional role, scope and assignment | Authentication proves clinical authority or access to every patient      |
| Pharmacist/pharmacy user | Partner subject plus verified pharmacy role and order/prescription scope        | Pharmacy affiliation grants clinical or general database access          |
| Operations/support       | Workforce subject with narrow operational/support assignments                   | Employment grants clinical access or bulk patient visibility             |
| Auditor/privacy reviewer | Read-only, purpose-bound evidence access                                        | Audit role permits business-data mutation or routine clinical browsing   |
| Administrator            | Platform/security configuration role separated from ordinary business roles     | Technical administration permits routine patient/clinical access         |
| Service identity         | One non-human identity per integration, environment and purpose                 | Shared secrets, human login, wildcard tenant access, or transitive trust |

A person may hold multiple approved roles, but the session uses the minimum active role/context
needed for the action. Conflicting or high-risk role combinations require explicit approval and
separation-of-duties review.

## Authentication Requirements

### Patients

- Entry is invite/cohort-gated for the controlled pilot and binds an approved invitation to a
  verified contact before account activation.
- Passwordless single-use link/code or another provider-supported secure method is preferred for v1;
  any password option must be provider-managed, breached-password screened, rate limited, and never
  visible to Meneer application code.
- One-time authentication material expires within 15 minutes, is single use, is bound to the
  intended environment/action, and is invalidated after success or replacement.
- Step-up/reverification is required for contact/recovery changes, data export, account closure,
  sensitive consent changes, and other high-risk actions defined in Task 3.8.
- Responses, recovery, and invitation flows resist account enumeration and do not reveal whether a
  patient or sensitive record exists.

### Workforce and privileged users

- Clinician, pharmacy, operations, support, auditor, administrator, release, and other workforce
  access requires individual accounts and MFA from first use.
- Phishing-resistant MFA such as a passkey/security key is preferred. TOTP may be an approved
  fallback. SMS/email alone is not sufficient for privileged access.
- Shared accounts are prohibited. Privileged elevation requires recent MFA and is separated from
  ordinary patient/customer sessions.
- Workforce access requires an approved role owner, scope, start/expiry or review date, and timely
  suspension on separation or partner change.

## Session Contract

| Session class                                | Maximum idle / absolute duration      | Additional rules                                                                               |
| -------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Patient                                      | 30 minutes idle / 12 hours absolute   | Reverify high-risk actions; no indefinite “remember me” during pilot                           |
| Clinical/pharmacy/operations/support/auditor | 15 minutes idle / 8 hours absolute    | MFA, managed context where available, step-up for export/break glass                           |
| Administrator/release privilege              | 10 minutes idle / 4 hours absolute    | Separate elevation, recent MFA, narrow action scope, immediate audit                           |
| Service identity token                       | 60 minutes or shorter where supported | Audience/purpose/environment bound; rotate without downtime; no refresh token unless justified |

Implementation may use shorter durations. Extending a maximum requires a superseding security
decision and risk evidence.

- Browser sessions use host-only, `Secure`, `HttpOnly` cookies with an approved `SameSite` policy;
  sensitive tokens never enter local storage, URLs, analytics, or client logs.
- Protect state-changing browser requests against CSRF and origin confusion. Rotate session
  identifiers after authentication, step-up, recovery, role/context change, and suspected compromise.
- Server-side revocation covers logout, password/authenticator change, recovery, contact change,
  suspension, privilege removal, separation, breach, and administrator action.
- Concurrent-session limits and device/session views are implemented proportionately; privileged
  users can be globally revoked without waiting for token expiry.
- Public and authenticated responses/caches are separated; sensitive responses use no-store/private
  controls appropriate to the selected framework and host.

## Recovery and Account Change

- Patient recovery begins through a previously verified channel or a documented manual identity
  proofing path. It sends generic notifications, rate limits attempts, records risk, revokes existing
  sessions when control changes, and alerts the prior channel where safe.
- Contact changes require current authentication plus step-up and confirmation of the new channel;
  high-risk changes notify the old channel and have an auditable recovery path.
- Workforce authenticator reset or recovery is never email-only or self-approved. A separate
  authorised administrator verifies the person and role, records evidence/reason, issues temporary
  recovery with forced re-enrolment, and triggers review.
- Recovery codes, if used, are one-time, strongly generated, hashed/encrypted as appropriate, never
  exposed to support staff, and regenerating them invalidates prior codes.

## Role and Permission Matrix

`Own` means the authenticated patient subject. `Assigned` means an approved, current relationship
record. `Minimum projection` excludes unrelated clinical detail. Final named role holders and
assignments remain Task 3.8 activation gates.

| Resource/action                | Patient                                   | Clinician                                    | Pharmacy                               | Operations                               | Support                     | Auditor/privacy                     | Administrator                                                | Service identity               |
| ------------------------------ | ----------------------------------------- | -------------------------------------------- | -------------------------------------- | ---------------------------------------- | --------------------------- | ----------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| Own identity/contact           | Read/update with step-up                  | No                                           | No                                     | Minimum verification status              | Minimum verification status | Reviewed evidence only              | Suspend/recover through governed action                      | Identity adapter only          |
| Consent/privacy choices        | Own read/record/withdraw                  | Permitted current fact                       | Permitted fulfilment fact only         | Status only where required               | Status only where required  | Authorised evidence/rights workflow | No content mutation                                          | Consent workflow only          |
| Intake/questionnaire           | Own draft/submit/correct through workflow | Assigned read/review                         | No                                     | Status only                              | Status only                 | Approved rights/audit projection    | No routine access                                            | Intake/triage service only     |
| Triage/clinical decision       | Own safe projection                       | Assigned author/review within scope          | Minimum decision/prescription validity | Status only                              | Status/escalation only      | Approved evidence projection        | No clinical authority                                        | Approved clinical adapter only |
| Prescription                   | Own safe view where approved              | Assigned issue/amend/revoke within authority | Assigned validation/dispensing need    | Status/reference only                    | Status only                 | Approved evidence projection        | No                                                           | Clinical/pharmacy adapter only |
| Price/payment/refund           | Own line items/status/actions             | No payment mutation                          | No                                     | Assigned exception/refund workflow       | Status/escalation only      | Approved evidence projection        | Configuration only with separation                           | Payment adapter only           |
| Order/fulfilment/delivery      | Own status/permitted changes              | Clinical prerequisite only                   | Assigned release/rejection             | Assigned coordination/custody/exceptions | Status/escalation only      | Approved evidence projection        | No routine mutation                                          | Pharmacy/courier adapters only |
| Support case/message           | Own cases/messages                        | Assigned clinical escalation                 | Assigned pharmacy escalation           | Assigned operational case                | Assigned support case       | Approved evidence projection        | Configuration only                                           | Messaging adapter only         |
| Audit/access evidence          | Own rights outcome where approved         | Own/assigned activity view if required       | Own activity if required               | No broad access                          | No broad access             | Purpose-bound read/export           | Security administration without silent mutation              | Append only for own actions    |
| Role/permission administration | No                                        | No                                           | No                                     | No                                       | No                          | Review only                         | Governed grant/revoke; cannot self-approve                   | No                             |
| Bulk export/config/secrets     | Own export only                           | No bulk by default                           | No bulk by default                     | No clinical bulk                         | No                          | Approved scoped export              | Separate privileged action; secrets never readable after set | Purpose-scoped only            |

Permissions distinguish at least `create`, `read`, `update`, `transition`, `assign`, `export`,
`approve`, and `administer`. A broad “staff” or “admin” role is not a substitute for resource/action
policy.

## Privileged and Break-Glass Access

Break glass is exceptional access for immediate patient safety or a declared incident when normal
assignment cannot meet the need. It is not a support shortcut.

1. Only approved clinical/security roles may invoke the separately implemented action.
2. Require recent MFA, explicit subject/resource, permitted purpose, reason, duration no longer than
   30 minutes, and minimum read-only projection unless a separately authorised action is necessary.
3. Notify the security/privacy owner immediately and the clinical owner for clinical access.
4. Record actor, usual/elevated role, subject/resource, reason, fields/actions, start/end, correlation,
   outcome, and any export. No raw clinical payload is copied into the audit event.
5. Revoke automatically at expiry and review by the next business day. Unjustified use triggers
   incident and access-suspension procedures.
6. Break glass cannot grant bulk export, role administration, secret access, payment mutation, or
   erase/alter audit history.

## Service Identity and Integration Boundaries

- Create one identity per service, environment, integration, and purpose; never reuse a human or
  shared “backend” credential across providers.
- Grant only named contract actions, tenant/client scope, resource scope, audience, network/origin
  context where supported, and a short expiry. Deny interactive login.
- Store credentials in the approved secret boundary, rotate regularly and on incident/personnel
  change, support overlapping rotation, and audit issuance/use/revocation without logging secrets.
- Verify inbound callback signature/key, origin where meaningful, environment, timestamp, schema,
  replay/idempotency key, and provider reference before accepting source evidence.
- Downstream tokens cannot be forwarded to another provider or exposed to browsers. Provider
  compromise is contained through independent identities and revocation.

## Authorisation Decision and Audit Contract

Every sensitive decision records a safe audit fact containing actor/service, active role, tenant,
action, resource type/opaque ID, purpose, policy/version, allow/deny outcome, reason code,
authentication assurance, correlation, and timestamp. Denied attempts, exports, break glass,
recovery, role changes, and privileged reads receive elevated monitoring.

Policy changes are version-controlled and reviewed through DR-008. Existing sessions are
re-evaluated or revoked when a change removes access. Cached permission decisions are short-lived,
tenant/resource scoped, and invalidated on assignment, role, subject, or policy change.

## Threat Model and Required Controls

| Threat                                 | Required controls/evidence                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Enumeration and credential stuffing    | Generic responses, rate limits, bot/abuse signals, breached-password controls if passwords exist, alerting   |
| Invitation/link interception or replay | Short-lived single-use material, environment/action binding, TLS, replay record, safe redirect validation    |
| Session theft/fixation/CSRF            | Secure host-only cookies, rotation, CSRF/origin controls, expiry, revocation, sensitive cache controls       |
| Recovery/contact takeover              | Step-up, prior/new-channel notice, risk/rate controls, session revocation, manual governed fallback          |
| IDOR/horizontal tenant access          | Server-derived subject/tenant, resource relationship checks, opaque IDs, negative cross-subject/tenant tests |
| Vertical privilege escalation          | Deny-default action matrix, immutable server role source, separation of duties, role-change audit/tests      |
| Insider or excessive support access    | Minimum projections, assignments, purpose, masked fields, access review, alerts, no shared accounts          |
| Service credential/callback compromise | Per-service scopes, secret isolation/rotation, signature/origin/time/replay checks, rapid revocation         |
| Break-glass abuse                      | Narrow eligibility, recent MFA, reason/time bounds, notification, automatic expiry, next-day review          |
| Provider outage/lock-in                | Internal subject mapping, export/exit test, bounded sessions, recovery procedure, DR-006 evaluation          |

## Implementation and Test Gate

Sprint 05 must implement and prove with synthetic identities:

- patient invitation, verification, login, logout, expiry, step-up, contact change, recovery, and revocation;
- workforce MFA, role grant/removal, separation, session limits, and governed recovery;
- every allow/deny cell required by the matrix, including horizontal subject/tenant and vertical role tests;
- clinical/pharmacy assignment boundaries, operations/support minimum projections, and audit/privacy review;
- break-glass initiation, notification, expiry, review, forbidden actions, and incident handling;
- service identity scope, callback verification, replay rejection, rotation, revocation, and cross-environment denial;
- privacy-safe audit/alert correlation and provider export/exit; and
- browser/API cache, CSRF, enumeration, rate-limit, error, and sensitive-data leakage checks.

TD-013 remains open until this server-side implementation and horizontal/vertical evidence pass.

## Consequences and Risks

- The identity vendor remains open; a convenient provider role model cannot replace these policies.
- Short sessions and step-up add friction but reduce exposure for health and privileged workflows.
- Multi-role users and partner assignments require careful policy and negative testing.
- Exact rate limits, named role holders, access-review cadence, and provider mechanics remain later
  gates; absence of those particulars keeps transactional activation blocked.

## Implementation and Verification

- Implementation owner: Octothorp ZA technology owner under security/privacy/domain approvals.
- Acceptance evidence: identity model, authentication/session/recovery requirements, permission
  matrix, break-glass, service identity, audit, threats, implementation tests, and Task 3.7 evidence.
- Rollback: disable affected access, revoke sessions/credentials, preserve audit facts, and use the
  approved provider exit/recovery path; never re-enable the local password prototype.

## Affected Documents

- `docs/00-blueprints/master-blueprint-v1.md`
- `docs/02-implementation-plans/phase-01/sprint-03-operating-model-architecture.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/05-future-considerations/postgres-auth-email-vendor-strategy.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/03-platform-evolution.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`

## Approval

| Approver role                                       | Evidence/reference                                                                       | Decision                                         | Date       |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------- |
| Security/architecture/repository owner              | Owner-approved Sprint 03 architecture and requested Task 3.7 implementation              | Approved identity and authorisation architecture | 2026-08-08 |
| Privacy/clinical/pharmacy/operations/release owners | DR-008 review boundary; named holders, provider and implementation evidence remain gated | Principles approved; activation evidence pending | 2026-08-08 |

## Review Trigger

Review before selecting/provisioning identity, enabling any authenticated route, adding a role,
tenant, provider or privileged action, changing session/recovery/MFA policy, after access or identity
incident, during access review, and before each framework or identity-provider migration.
