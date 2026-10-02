---
evidence_id: phase-02-sprint-09-1-identity-profile-consent-contract
title: Invite-Only Identity, Profile and Instrument Contract
status: completed-at-contract-level
task: 9.1
observed: 2026-10-02
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-009, TD-037, TD-038]
---

# Sprint 09.1 — Identity, Profile, Instrument and Route Contract

## Scope and authority

This freezes the implementation boundary for Tasks 9.2–9.9; it does **not** publish transactional
documents, activate registration, create a client, or change hosted Supabase. DR-005, DR-007,
DR-014 and DR-015 govern data, identity, fields and instruments. DR-012 governs non-clinical party
roles. The existing `/start` and `/peptides` gates and website-only `/terms` and `/privacy` remain
unchanged. No client-facing wording is approved by this engineering contract.

## Actors and durable records

| Boundary          | Contract                                                                                                                                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth provider     | Supabase Auth owns credentials, verified email, OTP and provider sessions. No password or provider token is stored in a Meneer profile.                                                                                                                                                                           |
| Internal identity | `subjects.id` is stable and opaque; `external_identities` maps the provider subject; tenant and role derive from a server-verified invitation/membership, never browser claims or `user_metadata`.                                                                                                                |
| Invitation        | Staff-created, patient role only, one tenant, one intended verified email digest, explicit expiry, provider binding and terminal accepted/expired/revoked state. Secret/code is not stored in plaintext.                                                                                                          |
| Profile           | One tenant-scoped, versioned record per patient subject: given name, family name, E.164 mobile/WhatsApp, mobile-verification state and `email`/`whatsapp` operational preference. Verified email is read from managed identity, not independently editable. IDs, status, version and timestamps are server-owned. |
| Publications      | Immutable approved instrument text, ID, semantic version, locale, effective/publication time, SHA-256 hash and reproducible rendered locator. A replaced version remains retrievable for evidence.                                                                                                                |
| Receipts          | Append-only subject/tenant, publication ID/version/hash, action (`accepted` or `acknowledged`), server timestamp, assurance, idempotency and correlation references, plus supersession/withdrawal state where applicable. Never infer a receipt from a checkbox or Auth account alone.                            |
| Lifecycle         | Attributed invitation, account, profile and receipt transitions, with safe audit metadata. Profile corrections append history; withdrawal does not erase the original receipt.                                                                                                                                    |

The only client-entered profile values are those in DR-014. Health, product, address, card, identity
document, free-text, password and questionnaire fields are excluded. The order-specific terms and
recipient-specific hand-off authorisation are separate Sprint 11 and Sprint 10 records, not fields
in the account receipt. Operational WhatsApp preference is neither marketing nor clinical consent.

## State transitions and transaction boundary

| Aggregate          | Allowed progression                                                                                  | Rejection and invariant                                                                                                                                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invitation         | `pending → accepted`; `pending → expired/revoked`                                                    | Single-use and terminal thereafter. Expired, revoked, wrong tenant/contact/provider, duplicate or superseded codes cannot activate an account.                                                                                                                                                                 |
| Account/membership | Provider-created subject may exist with `invited` membership; `invited → active → suspended/revoked` | A provider user or active `subjects` row alone grants no pilot access. Tenant remains suspended until owner activation. Active membership requires verified identity, accepted account terms, acknowledged transactional privacy notice and committed profile in one governed activation operation.            |
| Profile            | `absent → active(version 1) → corrected(version n+1) → restricted/closure_pending → de-identified`   | Browser cannot set ID, tenant, version or verification. Stale version fails; mobile/email change is a separate step-up and channel-confirmation workflow.                                                                                                                                                      |
| Instrument         | `draft → reviewed → approved/published → superseded/withdrawn`                                       | Only a published, effective, exact-hash version can be presented or accepted. Incomplete party schedules or unapproved rendering leave publication inactive.                                                                                                                                                   |
| Receipt            | `absent → committed`; later action appends new receipt or withdrawal/supersession fact               | Account terms acceptance and privacy acknowledgement are separate, unchecked actions. Show the notice before requesting profile values; no success UI, active membership or durable profile write before the transaction commits both receipts and profile. Same idempotency key returns the original outcome. |
| Session            | `issued → active → expired/revoked`                                                                  | Patient maximum 30-minute idle/12-hour absolute. Sign-out, recovery, suspension, contact change and privileged intervention revoke server-side; a valid provider JWT alone is insufficient.                                                                                                                    |

Invitation and Auth-user creation may precede acceptance as a non-active identity stub. If provider
delivery succeeds but internal binding fails, do not report success: reconcile or revoke the
provider invitation. If the activation transaction fails at any point, keep membership invited and
return a safe retryable error; never leave a partially active account. Task 9.2 must decide the
atomic database command and its audit/idempotency constraints before schema changes are applied.

## Route and server-command policy

Paths below are the intended TanStack route contract for Tasks 9.3–9.8; implementation may group
UI steps without changing their access or command semantics. Existing public pages retain their
current route policy until separately approved.

| Surface                                   | Caller and action                                                                       | Server requirement                                                                                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start`                                  | Public discovery only                                                                   | Remains gated; never acts as public sign-up or stores prototype form data.                                                                                                  |
| `/account/verify`                         | Invited user enters email plus one-time code; no token-bearing URL                      | Rate-limited, generic responses; server binds approved invitation, contact, environment and action. GET is display-only, POST consumes code.                                |
| `/account/activate`                       | Verified invitee views exact published terms and privacy notice; enters minimum profile | Separate unchecked actions; server validates version/hash, invitation, identity, tenant and profile, then commits activation atomically. No placeholders may be acceptable. |
| `/account/sign-in` and `/account/recover` | Invited/active email holder requests OTP or recovery                                    | Generic anti-enumeration response; `shouldCreateUser: false` for sign-in; no public user creation. Recovery does not bypass membership state.                               |
| `/account/sign-out`                       | Authenticated session                                                                   | POST only; revoke local and provider session, expire host-only cookie.                                                                                                      |
| `/portal` and `/portal/profile`           | Active own-tenant patient session                                                       | Server checks subject, active tenant/membership, role, purpose, session and receipt state on every request; no-store response. Profile updates require expected version.    |
| `/portal/rights`                          | Authenticated own-tenant patient                                                        | Request-only correction/export/restriction/closure entry; high-risk actions require step-up and reviewed downstream processing. No sensitive payload by ordinary email.     |
| Staff invitation command                  | Assigned operations role with AAL2; not a public route                                  | Purpose/assignment/tenant checks, abuse limits, audit and idempotency. Administrative browser requests never carry a service-role key.                                      |

All mutating routes require same-origin/CSRF controls, bounded payloads, validated input and a
trusted server-side authorisation context. No arbitrary `redirect_to` or absolute return URL. No
receipt, profile or invitation data in query strings, analytics, payment metadata or generic logs.
Authenticated responses are private/no-store. Client route hiding is only presentation, not
authorisation. External provider, courier and release-admin roles have no routine profile read.

## Threat model and negative-path proof

| Threat                                              | Required control and test                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public or forged invite / email enumeration         | Public sign-up disabled; only authorised staff creates invite; unknown email receives indistinguishable response; expired/replayed/wrong-contact/tenant code denied.                                                                                                       |
| Email scanner, Brevo rewriting or token leak        | Prefer a code-entry email and first-party route with no secret in its URL. Confirm invite-template OTP type against installed SDK and hosted template before 9.4; no GET may consume a token. Verify tracking/rewrite settings and actual delivered message synthetically. |
| Provider account mistaken for application authority | Require mapped subject plus active tenant/membership and required receipts on each command; ignore browser role/tenant and `user_metadata`. Deny suspended tenant, revoked membership and absent profile.                                                                  |
| Cross-tenant/IDOR and overbroad staff read          | Private tables with explicit grants/RLS, server contextual policy, own-subject or assigned minimum projection; direct table/RPC tests for wrong tenant, role, assignment and purpose.                                                                                      |
| Stale session or privileged access                  | Recheck server session revocation and DR-007 deadlines; AAL2 for staff, step-up for high-risk patient actions; test replay after logout, recovery and suspension.                                                                                                          |
| False consent or document drift                     | Exact approved publication hash/version/locale required; distinct unchecked controls; reject missing, stale, unpublished or changed documents; commit receipt before success.                                                                                              |
| Duplicate activation, partial failure or audit loss | One transaction with unique idempotency and subject/tenant constraints; deterministic retry, rollback and audit tests, including provider-delivery failure.                                                                                                                |
| Sensitive data in transport or telemetry            | Secure HttpOnly host-only SameSite cookie; no tokens in browser storage, URLs or logs; no clinical data in Meneer; inspect redirects, network payloads and telemetry in browser tests.                                                                                     |

## Current implementation gaps and next-task gates

- Existing `identity_invitations`, `subjects`, `external_identities`, `subject_contacts`,
  `tenant_memberships` and `identity_sessions` provide a foundation. The Auth trigger can create an
  internal subject before verification; this must remain non-authorising until invitation and
  membership activation. No approved profile/publication/receipt tables or routed client portal
  exist yet. Task 9.2 adds them without rewriting the established provider mapping.
- Existing `verifyEmailOtp` uses `type: "email"`; Task 9.4 must prove the exact invite/confirmation
  OTP type and hosted template behaviour against the installed Supabase client before enabling it.
  Supabase documents both OTP entry and token-hash links; the latter must not place a usable token
  in a scanner-prefetched or tracked URL.
- The preserved `/start` flow contains browser-only account/password/consent steps. It is not
  implementation authority and remains unreachable. Its copy is not silently repurposed.
- DR-015's rendered party schedules and final cross-domain approvals remain publication gates.
  Task 9.6 may build fail-closed rendering and tests, but no real client acceptance is enabled
  until exact versions are reviewed and published. Hosted synthetic exercises require a separate
  explicit target guard; no real user data is authorised by this contract.

## Acceptance of Task 9.1

The contract is complete when Tasks 9.2–9.9 can implement against the field set, transition
guards, route permissions, threat cases and negative tests above without inventing a new business
or clinical decision. Any material change to field purpose, party, instrument meaning, role access
or activation sequence requires an updated decision and contract before implementation.

Source checks: repository identity/domain code and migrations, Sprint 08 evidence, DR-005/007/012/
014/015, and current Supabase [Auth email-template](https://supabase.com/docs/guides/auth/auth-email-templates),
[OTP verification](https://supabase.com/docs/reference/javascript/auth-verifyotp) and
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) guidance. The
[October 2026 changelog](https://supabase.com/changelog) was reviewed for relevant Auth/DB changes;
no new package or migration is introduced in this task.
