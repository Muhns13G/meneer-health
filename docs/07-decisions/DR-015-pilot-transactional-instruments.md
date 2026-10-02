---
decision_id: DR-015
title: Pilot Transactional Terms, Privacy Acknowledgement and Consent Boundary
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA legal, privacy and technology owners
required_approvers: [business_owner, repository_owner]
effective_date: 2026-10-02
supersedes: null
related_debt: [TD-009, TD-010, TD-037, TD-038]
last_updated: 2026-10-02
---

# DR-015 — Pilot Transactional Terms, Privacy Acknowledgement and Consent Boundary

## Context and Scope

The website-only terms and privacy notice accurately describe the current non-transactional site;
they are not authority for an account, payment, order or external-provider hand-off. The pilot needs
separate, versioned instruments whose meaning remains stable across the current TanStack app and a
later framework.

This decision completes Task 8.6 at the product and instrument-contract level. It approves what a
client must see and affirm at each boundary. It does not publish the instruments, activate a route,
replace legal/privacy review, identify the external provider, or satisfy the channel and party gates
owned by Tasks 8.7 and 8.8.

## Approved Instrument Set

| Instrument                               | Version                           | Required boundary                          | Client action                      | Status                |
| ---------------------------------------- | --------------------------------- | ------------------------------------------ | ---------------------------------- | --------------------- |
| Pilot Account and Service Terms          | `pilot-account-terms/1.0`         | Before identity activation                 | Explicit acceptance                | Approved, inactive    |
| Pilot Transactional Privacy Notice       | `pilot-privacy-notice/1.0`        | Before profile collection                  | Separate acknowledgement           | Approved, inactive    |
| Order and Payment Terms                  | `pilot-order-terms/1.0`           | Before each R999 deposit or later purchase | Explicit order-specific acceptance | Approved, inactive    |
| Protocol-Provider Hand-off Authorisation | `pilot-handoff-authorisation/1.0` | Immediately before each external hand-off  | Separate explicit authorisation    | Approved, party-gated |

The approved clause contract and exact client-facing baseline are recorded in
[`sprint-08-6-transactional-instrument-set.md`](../02-implementation-plans/phase-02/annexures/sprint-08-6-transactional-instrument-set.md).
No instrument is a public website notice, marketing opt-in or clinical informed-consent form.

## Boundary Decisions

### Before identity activation

The client must be able to open, retain and reproduce the account terms and transactional privacy
notice. Account terms require an affirmative acceptance. The privacy notice requires a distinct
acknowledgement that proves delivery and version—not a representation that consent is the only
lawful basis for necessary account processing.

The interface must not preselect either control, combine them with marketing, or proceed before the
server durably commits both versioned actions. Refusal leaves the invitation unused and creates no
active profile.

### Before payment

Every checkout must display and snapshot the exact line items, total, currency, VAT treatment,
price version, delivery charge or quote, stage-aware cancellation/refund consequence, supplier and
order-terms version. The client accepts that specific transaction; an old account acceptance cannot
silently accept a later price or materially changed commercial term.

For the review deposit, the terms must state that R999 is credited in full to the first clinically
approved order; the approved DR-013 refund triggers; and the completed-review/voluntary-decline
boundary. No subscription, automatic renewal or stored-value membership may be implied.

### Before external hand-off

The hand-off screen must identify the verified recipient, its role, its own notice, the exact fields,
purpose, method and consequence of refusal. The client separately authorises one hand-off. The
authorisation covers only the approved minimum referral projection and expires if not used within
30 days, if the recipient/version changes, or if the client withdraws before delivery.

The authorisation does not cover questionnaire answers, blood results, diagnosis, protocol,
prescription or product selection in Meneer. The external provider obtains its own lawful clinical
and special-personal-information authority. A successful hand-off does not prove provider intake,
clinical acceptance or treatment approval.

### Consent that is not requested

- No marketing, research, profiling or analytics consent is bundled into the pilot.
- No consent is inferred from website use, an invitation, account creation, payment or silence.
- Operational email/WhatsApp preference permits service notifications only.
- No proxy clinical consent is collected for the external provider.
- If optional electronic marketing is introduced, it requires a separately approved, unselected,
  purpose/channel-specific control and withdrawal route compatible with POPIA section 69.

## Version and Evidence Contract

Each acceptance, acknowledgement or authorisation must record:

- opaque subject and tenant identifiers;
- instrument ID, semantic version, locale and SHA-256 content hash;
- publication/effective version reference and rendered document locator;
- action type, server timestamp and authenticated assurance level;
- workflow/order/hand-off reference where applicable;
- purpose and recipient reference for a hand-off;
- idempotency key, correlation reference and supersession/withdrawal state.

Do not store checkbox labels, full documents, IP addresses or device fingerprints in every receipt.
The immutable approved publication stores the text; the receipt stores its content hash and minimum
security evidence. The server—not browser state—controls success. Material wording, party, purpose,
field, price/refund or retention changes require a new version and fresh action at the affected
boundary. Editorial corrections that do not change meaning still create traceable publication
history.

## Presentation and Accessibility

- Use short plain-language summaries without hiding the complete instrument.
- Give each action its own descriptive label and unchecked control.
- Keep links keyboard accessible and expose version/effective date before action.
- Allow the client to download or print the exact version.
- Explain refusal consequences beside the action without coercive colour or urgency.
- Never display success until the durable receipt and governing command commit.
- Preserve the client-facing copy through implementation unless an approved version supersedes it.

## Publication and Activation Gates

The instrument contract is approved, but publication remains fail closed until all fields needed by
the applicable document are verified:

1. OCTOTHORP ZA business/physical address, telephone, legal-service address, office-bearer
   disclosure and any applicable accreditation/code particulars required for electronic supply.
2. DR-016's dedicated privacy and complaint aliases have verified synthetic delivery/receipt and a
   qualified response target; monitored routed handling, cancellation, failure and fallback remain
   Sprint 12 activation gates.
3. DR-017's verified external portal capability and manual hand-off method, plus the still-required
   exact provider juristic identity, privacy role, recipient notice, contract and clinical
   escalation boundary.
4. Verified pharmacy, custody, courier, delivery, return/recall and product-specific authority
   before any product order terms become active.
5. Final legal/privacy, commercial, operations, security, accessibility and release review of the
   rendered versions and complete transaction record.

No `[TBC]`, placeholder person, placeholder registration, hidden schedule or unresolved supplier
disclosure may appear in a client-acceptable version.

## Implementation and Verification

- Sprint 9 implements account terms/privacy acknowledgement receipts and accessible rendering.
- Sprint 10 implements recipient-specific hand-off authorisation using DR-017's manual bridge.
- Sprint 11 implements order-specific terms snapshots and Stripe sandbox evidence.
- Tests must prove distinct unchecked actions, wrong/missing/stale versions, content-hash mismatch,
  refusal, replay, withdrawal-before-hand-off, changed-recipient reauthorisation, durable success,
  secure reproduction and no marketing/clinical inference.
- The public `/terms` and `/privacy` pages remain website-only until a deliberate, reviewed
  transactional publication replaces or supplements them.

## Consequences and Residual Gates

Task 8.6 is complete at decision level. TD-009 remains In progress for parties, agreements,
channels, hand-off and implementation. TD-010 remains In progress for final supplier particulars,
catalogue/rates, rendered legal/domain approval, payment implementation and exception evidence.
TD-037 and TD-038 remain Open until the instruments are implemented and reviewed with live
assistive technology.

## Source Basis

- [Protection of Personal Information Act 4 of 2013](https://www.justice.gov.za/legislation/acts/2013-004.pdf), especially lawful processing, minimality, purpose, retention, notification, security and data-subject participation.
- [Information Regulator privacy-notice example](https://inforegulator.org.za/privacy-notice/) for notice, rights, retention and withdrawal distinctions.
- [Electronic Communications and Transactions Act 25 of 2002](https://www.gov.za/documents/electronic-communications-and-transactions-act), especially supplier disclosure and reproducible transaction terms.
- [Consumer Protection Act 68 of 2008](https://www.gov.za/documents/consumer-protection-act) for clear, fair terms, recorded transactions, cancellation and refund treatment.
- [Information Regulator direct-marketing guidance](https://inforegulator.org.za/guidance-notes/) for separate electronic-marketing consent and objection controls.

These sources inform an internal release boundary; this record is not external legal advice.

## Review Triggers

Review before changing a party, field, purpose, lawful basis, price/refund rule, recipient, delivery
model, retention period, marketing scope, instrument presentation or framework; and after a consent,
privacy, consumer, payment or hand-off incident.

## Affected Documents

- `docs/00-blueprints/master-blueprint-v1.md`
- `docs/02-implementation-plans/phase-02/README.md`
- `docs/02-implementation-plans/phase-02/sprint-08-pilot-activation-contract.md`
- `docs/02-implementation-plans/phase-02/sprint-09-identity-profile-consent.md`
- `docs/02-implementation-plans/phase-02/sprint-10-staff-queue-protocol-handoff.md`
- `docs/02-implementation-plans/phase-02/sprint-11-stripe-commercial-operations.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/07-decisions/DR-002-commercial-fulfilment-model.md`
- `docs/07-decisions/DR-005-data-tenancy-lifecycle-migration.md`
- `docs/07-decisions/DR-012-minimum-pilot-responsibility-allocation.md`
- `docs/07-decisions/DR-013-pilot-product-commercial-fulfilment-amendment.md`
- `docs/07-decisions/DR-014-minimum-client-profile-data-rights.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`

## Approval

| Approver role    | Evidence/reference                  | Decision                       | Date       |
| ---------------- | ----------------------------------- | ------------------------------ | ---------- |
| Business owner   | Instruction to implement Task 2.8.6 | Approved within recorded scope | 2026-10-02 |
| Repository owner | Instruction to implement Task 2.8.6 | Approved within recorded scope | 2026-10-02 |

Legal/privacy and other applicable domain review remains mandatory before transactional publication.
