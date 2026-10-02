---
evidence_id: phase-02-sprint-08-3
title: Minimum Pilot Responsibility and Party Allocation
status: completed
task: 8.3
source_commit: 4f1ab127f7691c9ebb02777a4e0c6bce8469349c
completed: 2026-10-02
owner: "@Muhns13G"
related_debt: [TD-009, TD-043]
---

# Sprint 08.3 — Minimum Pilot Responsibility and Party Allocation

> DR-013 subsequently assigns an intended Precise-Wellness-to-Meneer dispensing/custody route and
> Meneer-arranged courier direction. This task remains valid for all other responsibility and data
> boundaries; the new product roles are activation gates pending verification.

## Outcome

[DR-012](../../../07-decisions/DR-012-minimum-pilot-responsibility-allocation.md) narrows DR-001 to
the product-neutral minimum pilot and approves the accountable entity/role for every in-scope
responsibility. It does not publish private role holders or treat development placeholders as
appointments.

OCTOTHORP ZA owns the Meneer-controlled non-clinical service, technology, operations, general
support and information-responsibility boundary. An independently authorised external provider
must contract separately for protocol/clinical activity and retain its own professional and record
authority. Pharmacy, hub, courier and product fulfilment have no assigned party because DR-011
removes them from the minimum pilot.

## Approved In-Scope Allocation

| Boundary                         | Approved accountable entity/role                                        |
| -------------------------------- | ----------------------------------------------------------------------- |
| Meneer working brand             | Business owner; no separate juristic or professional authority          |
| Website/application operator     | OCTOTHORP ZA                                                            |
| Non-clinical pilot counterparty  | OCTOTHORP ZA, subject to Tasks 8.4 and 8.6                              |
| Meneer data purposes and rights  | OCTOTHORP ZA legal/privacy owner and private Information Officer roster |
| Technology/provider operations   | OCTOTHORP ZA technology/security/data owners under DR-009               |
| General account support          | OCTOTHORP ZA via the monitored general-support mailbox                  |
| Protocol/clinical responsibility | Separately contracting verified external provider                       |
| Pilot release                    | Release owner after all required domain approvals                       |

## Explicit Out-of-Scope Allocation

No pharmacy, responsible pharmacist, dispensing, hub, courier, custody, product supply, delivery,
return or adverse-product role is appointed for the minimum pilot. The `Dr John Doe`, `Jane Doe`,
HPCSA and Y-number development placeholders remain blockers only; they are not evidence, public
representations or operational assignments.

## Retained Activation Gates

| Input                                                                     | Owning task | Effect while absent                             |
| ------------------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| External protocol provider legal identity, authority, contract and portal | 8.8         | Manual hand-off disabled                        |
| Transactional privacy/data-transfer instruments                           | 8.5–8.6     | Identity/profile/consent activation disabled    |
| Dedicated privacy and complaint routes                                    | 8.7         | Rights/complaint processing activation disabled |
| External clinical/protocol escalation channel, hours and fallback         | 8.7–8.8     | Protocol hand-off disabled                      |
| Merchant, invoice and tax allocation                                      | 8.4         | Checkout disabled                               |

TD-009 remains In progress because these real external and transactional particulars have not yet
been evidenced. TD-043 remains Open until Task 8.7 verifies the dedicated channels. Task 8.3 is
complete because the responsibility model and the exact fail-closed ownership of every unresolved
input are now approved; it does not falsely close either debt item.

## Provider/Data Reconciliation

- DR-009 remains the provider/data-map authority for Supabase, Cloudflare, Brevo, Better Stack, R2
  and Stripe.
- The selected providers do not determine Meneer's purposes or acquire clinical authority.
- The external protocol party receives no database access and no questionnaire/protocol payload is
  copied into Meneer.
- General support remains non-sensitive and non-urgent.
- Payment, hand-off and release remain separately approved states.

## Verification and Change Scope

The current website accurately names OCTOTHORP ZA as the pre-transactional operator and the
general-support mailbox as non-clinical. `/start` and `/peptides` remain gated; no provider,
pharmacy, delivery or urgent-channel placeholder is rendered as verified. No application,
migration, provider configuration, hosted record or customer-facing wording changed in Task 8.3.

This documentation-only task can be reverted ordinarily. Enabling a retained boundary requires its
own later task evidence and cannot be achieved by reverting DR-012.
