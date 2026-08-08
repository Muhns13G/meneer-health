---
evidence_id: sprint-03-7-identity-authorisation
sprint: 03
task: 3.7
status: verified-local
date: 2026-08-08
primary_debt: [TD-013]
---

# Sprint 03 Task 3.7 — Identity and Authorisation Evidence

## Mission

Approve provider-neutral patient, workforce, privileged, and service-identity requirements with
server-enforced roles, permissions, sessions, recovery, audit, and negative-test boundaries.

## Observed Starting State

The repository has no authentication provider, session handling, server permissions, role model,
MFA, recovery workflow, break-glass mechanism, or service identities. The inaccessible prototype is
not suitable for reactivation. DR-006 leaves the exact identity provider unselected.

## Approved Outcome

[`DR-007`](../../../07-decisions/DR-007-identity-authorisation-architecture.md) approves:

- managed authentication with stable internal subject identifiers and server-side authority;
- patient verification and step-up plus mandatory MFA for all workforce/privileged users;
- maximum patient, workforce, administrator, and service-token session durations;
- governed recovery, contact change, revocation, role grant/removal, and separation processes;
- RBAC plus tenant, resource relationship, assignment, purpose, state, and assurance checks;
- an action/resource matrix for patients, clinicians, pharmacy, operations, support, auditors,
  administrators, and service identities;
- narrowly constrained, time-limited, notified, and reviewed break-glass access;
- separate least-privilege service identities and verified/replay-safe callbacks; and
- an identity/access threat model and required Sprint 05 test suite.

## Debt Disposition

TD-013 moves from **Decision required** to **In progress**. Its architecture-decision portion is
complete, but the registry requires server-side enforcement and horizontal/vertical access tests.
Sprint 05 owns that implementation evidence; Task 3.7 does not mark the debt Verified.

## Validation

- DR-007 is indexed as Approved and Task 3.7 is Completed.
- Every DR-001 operating role and DR-003 channel/module has an explicit identity/access treatment.
- Tenant scope follows DR-005; commands, errors and audit facts follow DR-004.
- Exact provider selection remains governed by DR-006 and FC-001.
- Technical-debt and RAG sources distinguish approved architecture from absent runtime capability.
- Markdown/JSON formatting, relative links, matrix/section coverage, and diff checks pass.

## Files in Scope

No source code, dependency, identity account, secret, environment variable, route, public wording,
or runtime behaviour was changed by Task 3.7.
