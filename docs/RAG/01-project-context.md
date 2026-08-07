---
rag_id: meneer-project-context
title: Meneer Project Context
status: current
authority: derived
last_updated: 2026-08-07
audience: internal
sensitivity: internal
sources:
  - docs/00-blueprints/master-blueprint-v1.md
  - docs/01-audits/project-codebase-audit-2026-08-05.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-8-safety-campaign-continuation-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-controlled-pilot-charter-v1.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-9-policy-support-evidence.md
  - docs/03-completion-reports/phase-01/sprint-01-pilot-risk-containment.md
---

# Meneer Project Context

## Product Intent

Meneer is intended to become a South African direct-to-consumer men's health service. Its proposed experience combines discreet condition-led discovery, structured intake, consultation with an authorised clinician, prescribing where appropriate, pharmacy fulfilment, neutral delivery, and ongoing support.

The product is intended to reduce embarrassment and practical friction without becoming a medication storefront or allowing conversion objectives to override clinical judgement. Hims and Ro are breadth and convenience references; AndroLab is a relevant South African competitor. Their content, claims, pricing, and clinical pathways are not automatically valid for Meneer.

## Current Product Stage

The repository is v1: a Lovable-generated TanStack Start MVP intended for a controlled one-month,
real-transaction pilot after stabilisation and deployment to an approved host. Marketing is public, while the
transactional journey is restricted to the enrolled cohort. The intended pilot collects real
information and supports Stripe payments, approved orders, Precise Wellness supply, Meneer-hub
dispatch, delivery, and support. The audited implementation remains a workflow prototype and does
not yet implement any of those durable capabilities.

Sprint 01 is closed as a verified containment boundary: incomplete account, consent, intake,
peptide-transaction, and campaign journeys are not active customer transactions. This does not
approve pilot activation. The current `itws-I-preview` build is deployed through Cloudflare at
`meneerhealth.co.za`; the longer-term Cloudflare-versus-Vercel direction remains a Sprint 02
decision.

Post-closure work has implemented a fail-closed safety entry and canonical campaign/QR boundary.
The provisional operator is owner-confirmed as OCTOTHORP ZA (`K2024185008`). Professional,
pharmacy, and urgent-channel values remain explicit development fixtures and block activation;
they are not evidence of verified registrations or partner approval.

An owner-approved controlled-pilot charter now defines the 30-day invite-only, peptide-only transactional
scope, operating roles, measures, stop criteria, activation gate, exit review, and distinct
public-launch threshold. Versioned website-only privacy and terms notices replace the earlier
placeholders and are approved for publication as version 1.0. The support mailbox exists, is
owner-monitored daily, and has owner-confirmed security controls. TD-005 and TD-056 are Verified.
Hosted canonical-domain checks and owner-confirmed QR scans also close TD-032 and TD-034. TD-006
and TD-007 are the only original Sprint 01 debts carried forward for external claim and peptide
pathway evidence.

Pilot approval and public-launch approval are separate. Cohort access does not justify removing the
transactional gate or exposing the same scope as an unrestricted public launch.

## Intended Users and Operators

- Adult South African men seeking support for hair loss, erectile dysfunction, weight management, testosterone concerns, and possibly peptides.
- Clinicians reviewing structured information and making independent clinical decisions.
- Operations and support staff coordinating non-clinical workflows and exceptions.
- Approved pharmacy, laboratory, courier, messaging, payment, or consultation partners.

The final responsible-provider model, information-responsibility roles, verified professional and
pharmacy registrations, approved partners, and treatment launch scope remain open decisions.

## Product Principles

1. Clinical safety before conversion.
2. Privacy and data minimisation by design.
3. No false completion without a durable successful transaction.
4. Plain, respectful, locally appropriate language.
5. One governed source for treatment, journey, pricing, policy, and claim content.
6. Human accountability and accessible support.
7. Later versions absorb validated behaviour and evidence from earlier versions.
8. Core rules and records remain portable across hosting and frameworks.

## Intended Capability Boundaries

- **Public acquisition:** marketing pages, condition education, campaigns, SEO, approved claims, public policies, and optional public MCP information.
- **Patient application:** identity, consent, intake, appointments, messages, orders, documents, delivery status, and account rights.
- **Clinical workspace:** review queues, consultation records, decisions, prescriptions, follow-up, and clinical audit events.
- **Operations workspace:** support, scheduling, payment exceptions, pharmacy hand-off, delivery, refunds, and escalation.
- **Integration layer:** controlled adapters for identity, messaging, video, laboratories, payments, pharmacy, courier, and observability.

Only the public presentation and read-only Lovable MCP currently exist in recognisable form. The other boundaries describe intended future capabilities.

## Authoritative References

- Target direction and delivery gates: [`master-blueprint-v1.md`](../00-blueprints/master-blueprint-v1.md)
- Dated implementation evidence: [`project-codebase-audit-2026-08-05.md`](../01-audits/project-codebase-audit-2026-08-05.md)
- Remediation obligations: [`technical-debt-registry-v1.md`](../04-technical-debt/technical-debt-registry-v1.md)
- Claims and peptide close-out pack: [`sprint-01-10-claims-peptide-closeout-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-01-10-claims-peptide-closeout-evidence.md)
