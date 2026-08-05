---
rag_id: meneer-project-context
title: Meneer Project Context
status: current
authority: derived
last_updated: 2026-08-06
audience: internal
sensitivity: internal
sources:
  - docs/00-blueprints/master-blueprint-v1.md
  - docs/01-audits/project-codebase-audit-2026-08-05.md
---

# Meneer Project Context

## Product Intent

Meneer is intended to become a South African direct-to-consumer men's health service. Its proposed experience combines discreet condition-led discovery, structured intake, consultation with an authorised clinician, prescribing where appropriate, pharmacy fulfilment, neutral delivery, and ongoing support.

The product is intended to reduce embarrassment and practical friction without becoming a medication storefront or allowing conversion objectives to override clinical judgement. Hims and Ro are breadth and convenience references; AndroLab is a relevant South African competitor. Their content, claims, pricing, and clinical pathways are not automatically valid for Meneer.

## Current Product Stage

The repository is v1: a Lovable-generated TanStack Start MVP intended for a controlled one-month pilot after stabilisation and deployment to Vercel. The audited implementation is a marketing and workflow prototype. It does not yet provide a patient backend, secure accounts, durable consent, clinical intake, clinician operations, prescriptions, payments, pharmacy integration, delivery, or follow-up.

Pilot approval and public-launch approval are separate. A private test group does not justify exposing the same scope publicly.

## Intended Users and Operators

- Adult South African men seeking support for hair loss, erectile dysfunction, weight management, testosterone concerns, and possibly peptides.
- Clinicians reviewing structured information and making independent clinical decisions.
- Operations and support staff coordinating non-clinical workflows and exceptions.
- Approved pharmacy, laboratory, courier, messaging, payment, or consultation partners.

The responsible provider, contracting entity, information-responsibility roles, approved partners, and treatment launch scope remain open decisions.

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
