---
decision_id: DR-010
title: Phase 01 Closure and Minimum Pilot Boundary
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA technology and operations owner
required_approvers: [business_owner, repository_owner]
effective_date: 2026-10-02
supersedes: null
related_debt: [TD-006, TD-007, TD-009, TD-010, TD-037, TD-038, TD-043]
---

# DR-010 — Phase 01 Closure and Minimum Pilot Boundary

## Context

Phase 01 completed seven engineering sprints that stabilised the Lovable-origin TanStack
application, removed obsolete platform coupling, established governed content and portable
contracts, and proved deliberately inactive identity, payment, workflow, audit, recovery and
measurement foundations. Forty-nine of the original 56 technical-debt items are Verified.

Seven items still require external evidence or an enabled journey: TD-006, TD-007, TD-009,
TD-010, TD-037, TD-038 and TD-043. Treating unavailable clinical, regulatory, commercial,
accessibility or support evidence as verified would be false. Keeping the engineering phase open
indefinitely would also obscure that its planned implementation work is complete.

Stakeholder direction on 2 October 2026 narrowed v1 to the minimum system needed for an invite-only
pilot. The eventual rebuild may move directly to Laravel/React rather than pass through Next.js;
no destination framework is approved by this record.

The separately hosted protocol portal is an external professional system. Publicly observable
pages show a provider login, protected patient-intake route, structured intake, protocol-reference
generation and practitioner-review boundary. No API, webhook, authenticated workflow or data-
processing agreement has been verified for Meneer. Phase 01 therefore assumes no integration.

## Decision

1. Close Phase 01 as the **completed secure inactive foundation** on 2 October 2026.
2. Do not mark the seven unresolved debt items Verified. Transfer them unchanged into the next
   pilot-enablement plan as mandatory activation gates.
3. Phase 01 closure does not authorise the pilot, public transactions, health-data collection,
   unsupported public claims, peptide availability or a framework migration.
4. The minimum v1 pilot target is limited to:
   - invite-only client onboarding;
   - verified identity and a minimal non-clinical client profile;
   - versioned terms/privacy acknowledgement and required consent;
   - approved one-time Stripe Checkout and signed webhook reconciliation;
   - a least-privilege staff operations queue;
   - manual, auditable hand-off to the protocol portal;
   - opaque external references and manual workflow statuses; and
   - support notifications, audit history, refund/exception handling and end-to-end evidence.
5. Meneer must not duplicate protocol or medical data merely to bridge systems. Until a reviewed
   integration exists, health intake and protocol content remain in the protocol system; Meneer
   stores only the minimum identity, contact, consent, payment and operational data required for
   the pilot.
6. A manual bridge is acceptable for the restricted pilot only when each hand-off has an owner,
   timestamp, opaque reference, acknowledgement, exception path and audit record. It must never use
   payment metadata, URLs or ordinary email to transport health information.
7. Next.js is no longer a committed intermediate generation. A later implementation plan must
   compare continued TanStack delivery, direct Laravel/React migration and any other candidate
   against the existing portability, reconciliation and rollback gates before selecting one.

## Transferred Activation Gates

| Debt   | Required before the corresponding capability activates                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| TD-006 | Evidence and named approvals for every retained claim, or withdrawal from every governed channel.               |
| TD-007 | Product-specific lawful authority and a verified peptide pathway, or removal from transactional scope.          |
| TD-009 | Named contracting, privacy, clinical, pharmacy, urgent-support and fulfilment responsibilities.                 |
| TD-010 | Approved prices, merchant/tax treatment, terms, Stripe configuration, cancellation/refund and fulfilment rules. |
| TD-037 | Live keyboard and assistive-technology verification of the approved routed form.                                |
| TD-038 | Live focus, progress, pending, success and failure-announcement verification of the approved stepped flow.      |
| TD-043 | Approved and tested privacy, complaint and clinical/adverse-event channels, owners, hours and fallbacks.        |

## Consequences

- Phase 01 can be reported complete without claiming pilot readiness.
- The next plan starts from a stable inactive foundation rather than reopening completed sprints.
- The seven items retain their existing statuses and acceptance criteria until real evidence exists.
- Hosted Stripe checkout remains disabled; the preserved profile form remains non-durable and
  unrouted; there is no staff queue or protocol integration today.
- The protocol portal's intake-link and integration capabilities must be confirmed with its owner
  before Meneer builds duplicate intake or manual re-entry around an incorrect assumption.
- Framework-specific implementation remains subordinate to the portable contracts, migrations,
  fixtures and behavioural evidence already established.

## Review Triggers

Review this decision before approving the pilot-enablement implementation plan, enabling any public
mutation or payment route, accepting health information, changing the manual protocol hand-off,
or selecting the post-v1 framework.

## Affected Documents

- `docs/00-blueprints/master-blueprint-v1.md`
- `docs/02-implementation-plans/phase-01/README.md`
- `docs/03-completion-reports/phase-01/phase-01-technical-debt-stabilisation.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/RAG/01-project-context.md`
- `docs/RAG/02-current-state.md`
- `docs/RAG/03-platform-evolution.md`
- `docs/RAG/04-domain-glossary.md`
- `docs/RAG/05-decision-register.md`
- `docs/RAG/06-known-limitations.md`
- `docs/RAG/07-index.json`
