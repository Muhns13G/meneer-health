---
decision_id: DR-008
title: Governance Ownership and Approval Workflow
status: approved
accountable_owner: Meneer business owner
implementation_owner: Octothorp ZA technology owner
required_approvers: [business_owner, release_owner]
effective_date: 2026-08-08
supersedes: null
related_debt: [TD-050]
last_updated: 2026-08-08
---

# DR-008 — Governance Ownership and Approval Workflow

## Context and Scope

Sensitive decisions need one accountable role, applicable domain approval, repository review, and
traceable evidence. Private role-holder particulars may remain outside Git, but the responsibility,
approval path, and release gate must be explicit in the repository.

### Confirmed Facts

- `@Muhns13G` is the repository owner and controls commits, pushes, merges, Cloudflare releases,
  promotions, and rollbacks.
- OCTOTHORP ZA owns the technology, marketing, and operations-coordination layer.
- Clinical and pharmacy authority remains independent of product, marketing, and implementation
  authority.
- The repository does not currently have a multi-person approval roster or GitHub CODEOWNERS file.

### Explicit Unknowns

- `[TBC — owner: BUSINESS OWNER — gate: pilot activation]`: private role holders for clinical,
  pharmacy, legal/privacy, security, data, content, commercial, operations, support, and release
  approvals.
- `[TBC — owner: REPOSITORY OWNER — gate: contributor access]`: GitHub branch-protection settings
  that enforce CODEOWNERS approval once additional collaborators receive write access.

## Options Considered

| Option                                                          | Benefits                                                | Costs and risks                                           | Disposition |
| --------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| Informal owner review                                           | Fast for a small team                                   | Decisions and domain approval can be lost or conflated    | Rejected    |
| Publish every role holder in Git                                | Direct visibility                                       | Unnecessary personal exposure and frequent document churn | Rejected    |
| Role-based approval with private roster and repository evidence | Clear accountability without publishing private details | Requires disciplined roster and evidence maintenance      | Approved    |

## Decision

Use role-based governance. The business owner maintains a private, current mapping from each role to
an authorised person or partner. Repository records name the accountable role, approval path,
minimum evidence, and review trigger. No individual is treated as appointed merely because a role
exists in this document.

The repository owner remains CODEOWNER for all files while the team is small. Applicable domain
approval is mandatory before repository approval for sensitive meaning changes. CODEOWNER approval
checks authorship, evidence, consistency, validation, and release readiness; it cannot substitute
for clinical, pharmacy, legal/privacy, or other specialist authority.

## Accountable Domain Matrix

| Domain                    | Accountable role                            | Approval responsibility                                                              | Escalation/stop authority          |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------- |
| Business and product      | Meneer business owner                       | Scope, priorities, operating model, investment, partner direction                    | Stop or narrow any capability      |
| Clinical and safety       | Clinical lead                               | Protocols, eligibility, exclusions, claims, decisions, escalation and follow-up      | Stop clinical journey or treatment |
| Pharmacy and dispensing   | Pharmacy lead/responsible pharmacist        | Pharmacy authority, product release, dispensing, records, supply and recalls         | Stop dispensing or supply          |
| Legal and privacy         | Legal/privacy owner and Information Officer | Contracts, notices, consent, data roles, rights, transfers and regulatory response   | Stop processing or publication     |
| Security                  | Security owner                              | Threat model, access, secrets, controls, incidents and security acceptance           | Isolate systems or revoke access   |
| Data                      | Data owner                                  | Data model, classification, quality, retention, migration, export and reconciliation | Freeze write/migration activity    |
| Commercial                | Commercial owner                            | Pricing, merchant model, tax, payment, refunds, disputes and reconciliation          | Stop charges or refunds workflow   |
| Operations and fulfilment | Operations owner                            | Support, inventory, custody, courier, exceptions, capacity and reconciliation        | Stop dispatch or fulfilment        |
| Content and claims        | Content owner                               | Canonical wording, channel consistency, evidence tracking and publication workflow   | Unpublish or revert content        |
| Technology                | Octothorp ZA technology owner               | Architecture, implementation, testing, vendors and technical recovery                | Disable or roll back capability    |
| General support           | Support owner                               | Monitoring, case ownership, privacy-safe escalation, hours and service evidence      | Suspend channel or escalate case   |
| Release                   | Release owner                               | Gate evidence, go/no-go, deployment, monitoring, rollback and closure record         | Stop, roll back, or narrow release |
| Repository                | `@Muhns13G`                                 | Commits, pushes, merges, CODEOWNERS review and record integrity                      | Reject or revert repository change |

## Approval Matrix

`A` is required approval and `C` is required consultation. More than one approval may be required;
the release owner remains accountable for the final go/no-go decision.

| Change class                                                   | Business | Clinical        | Pharmacy        | Legal/privacy        | Security/data | Operations | Content | Release |
| -------------------------------------------------------------- | -------- | --------------- | --------------- | -------------------- | ------------- | ---------- | ------- | ------- |
| Clinical pathway, questionnaire, eligibility or safety wording | C        | A               | C               | C                    | C             | I          | C       | A       |
| Medicine, dispensing, pharmacy or supply representation        | C        | C               | A               | C                    | C             | C          | C       | A       |
| Privacy, consent, data role, retention or subject rights       | C        | C               | C               | A                    | A             | C          | C       | A       |
| Authentication, authorisation, security or secrets             | I        | C               | C               | C                    | A             | C          | I       | A       |
| Pricing, payment, tax, cancellation or refund                  | A        | C               | C               | C                    | C             | C          | C       | A       |
| Fulfilment, courier, support or service-level promise          | C        | C               | C               | C                    | C             | A          | C       | A       |
| Public claim or material patient-facing meaning                | C        | A when clinical | A when pharmacy | A when legal/privacy | C             | C          | A       | A       |
| Architecture, vendor, schema or framework migration            | C        | C               | C               | C                    | A             | C          | I       | A       |
| Routine code change with no sensitive meaning                  | I        | I               | I               | I                    | C             | I          | I       | A       |
| Pilot activation, expansion, stop or public launch             | A        | A               | A               | A                    | A             | A          | C       | A       |

An `A` cannot be waived by silence. A role that is unfilled or lacks evidence keeps the affected
capability gated.

## Review Workflow

1. Identify the change class, affected debt/decision IDs, accountable role, and required approvers.
2. Prepare the narrowest record or implementation change with evidence and explicit unknowns.
3. Obtain required domain decisions outside or inside Git and record the minimum safe reference.
4. Obtain CODEOWNER review; confirm source, RAG, debt, plans, tests, migration, and rollback remain
   synchronized.
5. The repository owner commits and pushes the approved boundary.
6. The release owner separately records go/no-go after deployment evidence. Merge or commit status
   alone never authorises activation.

Emergency containment may disable or roll back a capability immediately. It must not broaden access
or authority. Record the action, owner, reason, impact, follow-up approval, and superseding decision
as soon as safely possible.

## CODEOWNERS Boundary

`.github/CODEOWNERS` assigns `@Muhns13G` to the repository and highlights governance, policy,
decision, infrastructure, compliance, and sensitive-route paths. Before another user receives write
access, the repository owner must enable protected-branch review rules appropriate to the branch
model and verify that required CODEOWNERS review cannot be bypassed silently.

## Rationale

Role-based ownership creates stable accountability across personnel and framework changes without
placing unnecessary private information in Git. Separate domain and repository approval prevents a
technical merge from being mistaken for clinical, legal, privacy, pharmacy, or release authority.

## Consequences and Risks

- The private role-holder roster becomes operationally essential and must be current before pilot
  activation.
- A missing required approver blocks the affected change or release.
- One repository CODEOWNER is a current concentration risk; add reviewed team ownership and branch
  protection when contributor access expands.
- Emergency action remains auditable and cannot be used to bypass later review.

## Domain Implications

| Domain                             | Required treatment or approval                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Clinical and safety                | Clinical lead retains independent approval and stop authority                   |
| Legal and privacy                  | Private role holder and Information Officer must be appointed before processing |
| Security and access                | Security/data approval and CODEOWNER review are separate gates                  |
| Commercial and tax                 | Commercial model requires business, domain, and release approval                |
| Operations and support             | Operations/support roles own evidence and escalation, not clinical decisions    |
| Data and migration                 | Data owner approves lifecycle and reconciliation evidence                       |
| Content and patient representation | Content owner coordinates but cannot self-approve specialist claims             |

## Implementation and Verification

- Implementation owner: Octothorp ZA technology owner.
- Affected systems and contracts: repository reviews, decision records, policies, claims, clinical
  content, platform/data/security changes, fulfilment, and releases.
- Acceptance evidence: `.github/CODEOWNERS`, this matrix, decision-index synchronization, and Task
  3.2 evidence.
- Migration/rollback effect: preserve approval roles and evidence links across frameworks; a change
  requires a superseding decision.
- Dependencies and blockers: private role-holder appointments and enforceable branch settings before
  contributor access or pilot activation.

## Affected Documents

- `.github/CODEOWNERS`
- `AGENTS.md`
- `docs/02-implementation-plans/phase-01/README.md`
- `docs/02-implementation-plans/phase-01/sprint-03-operating-model-architecture.md`
- `docs/04-technical-debt/technical-debt-registry-v1.md`
- `docs/RAG/05-decision-register.md`

## Approval

| Approver role            | Evidence/reference                                                                             | Decision | Date       |
| ------------------------ | ---------------------------------------------------------------------------------------------- | -------- | ---------- |
| Business owner           | Owner established company-layer responsibilities and approved explicit pre-launch placeholders | Approved | 2026-08-08 |
| Release/repository owner | Existing owner-only commit, push, deployment, promotion, and rollback rule                     | Approved | 2026-08-08 |

This approval establishes governance roles and paths. It does not appoint or evidence the private
holder of any still-unfilled domain role.

## Review Trigger

Review when contributor access changes, a role holder or partner changes, branch rules change, a
required approval fails, a material incident occurs, or before pilot activation, public launch, or
framework migration.
