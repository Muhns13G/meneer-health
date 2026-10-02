---
evidence_id: phase-02-sprint-08-1
title: Pilot Activation Baseline and Frozen Sequence
status: completed
task: 8.1
source_commit: 966d3627726d8935f5baafc3a18c0cd9918b0c82
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-006, TD-007, TD-009, TD-010, TD-037, TD-038, TD-043]
---

# Sprint 08.1 — Pilot Activation Baseline and Frozen Sequence

## Outcome

Phase 02 and Sprint 08 are ready to proceed from the exact repository and hosted baseline recorded
below. The sprint sequence, activation boundaries and non-goals are frozen without enabling any
customer, payment, clinical, partner or fulfilment capability. Tasks 8.2–8.8 must supply real
decisions and external evidence; Task 8.9 owns the authorised hosted reset and final pilot tenant
baseline.

## Authority and Scope

- DR-010 defines the minimum v1 pilot and transfers seven unresolved debts without weakening them.
- Phase 02 contains Sprints 08–13 and continues global numbering from Phase 01.
- Sprint 08 resolves product, party, commercial, data, consent, support and protocol-boundary inputs
  before dependent implementation begins.
- Repository implementation remains on TanStack Start and Cloudflare. No successor framework is
  selected or scheduled.

## Exact Repository Baseline

| Evidence                 | Result                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Branch                   | `itws-I`                                                                                  |
| Source commit            | `966d3627726d8935f5baafc3a18c0cd9918b0c82`                                                |
| Worktree before Task 8.1 | Clean                                                                                     |
| Latest commit scope      | Phase 02 plans and RAG/blueprint routing only; no application-code change                 |
| Supabase migrations      | 15 committed SQL migrations                                                               |
| Database test files      | 11 committed SQL test files                                                               |
| Active public boundary   | Informational and gated; no public registration, profile, payment or protocol integration |

The pre-Task 8.1 readiness audit on the same application baseline passed strict TypeScript,
portability and discovery checks, 324 Vitest tests, and 118 desktop/mobile Playwright and axe
checks. Configured local treatment-intent evidence also passed with an opaque secure cookie.

## Refreshed Hosted Baseline

Read-only checks used the ignored local server configuration and returned status/count evidence
only. No URL, credential, identifier or row content was recorded.

| Check                                                 | Result                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| Data API/OpenAPI                                      | Online; HTTP 200                                            |
| Exposed table resources                               | 33, matching the migration-derived inventory                |
| Exposed RPC resources                                 | 24, including the locked-down Supabase automatic-RLS helper |
| Auth admin boundary                                   | Online; HTTP 200                                            |
| Hosted Auth users                                     | 0                                                           |
| Public sign-up                                        | Disabled                                                    |
| Email autoconfirm                                     | Disabled; confirmation remains required                     |
| Anonymous tenant read                                 | Denied; HTTP 401                                            |
| Tenants                                               | 1 synthetic/bootstrap record                                |
| Subjects                                              | 3 synthetic, unlinked records                               |
| Contacts, memberships, invitations and sessions       | 0                                                           |
| Workflows, payment orders/events and fulfilment cases | 0                                                           |

The hosted project is online and non-operational. Existing synthetic tenant/subject records are not
pilot data. Task 8.9 must reset/reseed them under explicit authority, run current database/security
advisors, reconcile migrations and record the approved pilot tenant. Task 8.1 performs no mutation.

## Transferred Activation Gates

| Debt   | Baseline disposition                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| TD-006 | In progress; retained public claims still require evidence/approval or withdrawal.                                 |
| TD-007 | In progress; no product-specific peptide authority or complete pathway is verified.                                |
| TD-009 | In progress; named contracting, privacy, clinical, pharmacy and fulfilment particulars remain required.            |
| TD-010 | In progress; approved prices, tax/merchant treatment, transactional terms and activation evidence remain required. |
| TD-037 | Open; the eventual routed profile form requires live keyboard/assistive-technology review.                         |
| TD-038 | Open; the eventual stepped/asynchronous flow requires live focus/status review.                                    |
| TD-043 | Open; dedicated privacy, complaint and clinical/adverse-event routing remains unverified.                          |

No status changes in Task 8.1.

## Frozen Sprint 08 Sequence

1. **8.2 — Product/pathway decision:** prove an authorised route or remove affected products and
   transactional claims.
2. **8.3 — Responsibility model:** approve every named contracting, professional, privacy and
   fulfilment responsibility.
3. **8.4 — Commercial model:** approve prices, merchant/tax/invoice treatment and exception rules.
4. **8.5 — Minimum profile:** approve fields, purposes, classification, lifecycle and staff access.
5. **8.6 — Legal versions:** approve exact terms, privacy acknowledgement and required consent.
6. **8.7 — Support:** verify accountable privacy, complaint and clinical/adverse-event channels.
7. **8.8 — Protocol boundary:** perform an owner-assisted authenticated capability investigation;
   retain the manual bridge unless an integration is verified and separately approved.
8. **8.9 — Hosted baseline:** authorised reset/reseed, advisors, migration reconciliation and pilot
   tenant evidence.
9. **8.10 — Closure:** reconcile decisions, debt, RAG and the Sprint 08 completion report.

External evidence collection may proceed in parallel, but implementation must not consume an input
until its owning task records an approved result. An unresolved item remains an activation gate; it
is not silently deferred or replaced with a placeholder.

## Available Inputs

- Approved Phase 02 mission and six-sprint sequence.
- DR-001–DR-010 architecture, operating, commercial and provider boundaries.
- Supabase/Brevo/Cloudflare/Better Stack/Stripe test-mode provider selection.
- Canonical domain, monitored general-support mailbox and emergency contacts.
- Existing portable identity, authorisation, payment, workflow, fulfilment and audit foundations.
- Separate protocol portal URL and public professional-boundary observations.

## Inputs Still Required

- Product-specific peptide authority or an explicit scope-removal decision.
- Verified professional/pharmacy/partner identities and responsibility allocation.
- Contracting party, information-responsibility roles and approved cross-party hand-off.
- Pilot prices, merchant/tax/invoice treatment, terms and exception rules.
- Minimum profile field catalogue and legal/consent versions.
- Dedicated privacy, complaint and clinical/adverse-event channels with owners and fallbacks.
- Authenticated protocol-portal capability evidence.

## Frozen Non-Goals

- No account, profile, staff queue, checkout or protocol integration implementation in Sprint 08.
- No patient or health-data collection and no real payment, prescription, dispensing or delivery.
- No confidential evidence, production export, credential or personal data committed to Git.
- No placeholder identity, registration, price, party or support channel presented as real.
- No public sign-up, live Stripe mode, analytics activation or framework migration.
- No modification or deletion of hosted records before Task 8.9 authority and evidence exist.

## Validation and Rollback

- Read-only hosted schema, table, Auth and anonymous-denial checks passed.
- Phase 02 and Sprint 08 plans resolve from the RAG index and retain all seven gates.
- Documentation formatting, JSON parsing and `git diff --check` must pass before commit.
- Task 8.1 changes documentation only. Rollback is the ordinary revert of this task commit; no
  hosted rollback is required because no external state changed.
