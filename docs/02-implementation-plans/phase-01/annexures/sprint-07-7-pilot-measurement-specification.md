---
task: 7.7
status: completed
date: 2026-08-13
related_debt: [TD-045]
debt_status: in-progress
authority: owner-approved-with-privacy-activation-gate
source_baseline: 9192fb2
---

# Sprint 07.7 — Pilot Measurement Specification

## Outcome

The repository owner approves a tiered, first-party data strategy that seeks useful commercial,
operational and longitudinal evidence without turning health journeys into unrestricted analytics.
This task defines the purpose, questions, minimum event contract, prohibited data, consent/access,
retention and deletion boundary. It enables no collection; Tasks 7.8–7.9 implement and prove the
default-off boundary before any real pilot measurement may begin.

## Measurement Questions

The v1 pilot may answer only these product-measurement questions:

1. How many allowlisted offline campaign arrivals reach the approved start boundary?
2. How many consenting visitors begin, progress through and complete the generic journey?
3. At which generic step number does abandonment occur?
4. Do approved provider hand-offs succeed, fail or require recovery?
5. Are coarse technical failures or duration bands materially obstructing completion?
6. What aggregate consultation, eligibility, payment, fulfilment, cancellation, support and
   retention outcomes indicate about pilot operations and unit economics?

Clinical safety, care decisions and identifiable patient outcomes remain governed clinical or
operational records. Analytics is never their source of truth.

## Success Measures

The first pilot establishes a baseline rather than inventing commercial pass/fail targets before a
real cohort exists. Approved measures are campaign-to-start rate, opt-in rate, journey-start rate,
step-to-step and overall completion, generic abandonment by step number, hand-off success/recovery,
coarse duration distribution and authorised aggregate operational/unit-economic outcomes. The
owner reviews the baseline after the pilot and must approve a new specification version before a
later cohort receives numeric commercial targets.

The implementation itself has non-negotiable success criteria: every accepted event matches the
allowlist/schema, no prohibited-data canary is transmitted or retained, opt-out stops collection,
withdrawal-linked deletion meets seven days, scheduled retention succeeds, and access/export proof
matches the approved roles. Any miss fails Task 7.9 and keeps measurement disabled.

## Approved Data Tiers

| Tier                                | Purpose                                                                                                                                                 | Boundary                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Service and clinical records        | Deliver safe care, identity, consent, consultation, clinical decision, payment, fulfilment, support and escalation.                                     | Collect only through the separately approved authoritative workflow; never copy raw records into product analytics.                                    |
| Operational and funnel intelligence | Measure acquisition, generic progression, reliability, hand-off, timing bands and aggregate unit economics.                                             | First-party, strict-schema and pseudonymous or aggregated; Task 7.8's initial implementation scope.                                                    |
| Consented longitudinal intelligence | Structured goals, patient-reported outcomes, adherence, satisfaction, adverse-event rates, discontinuation, reorder, retention and referral.            | Requires a separately versioned purpose/notice, approved structured fields, clinical/privacy ownership and consent where applicable before activation. |
| Prohibited surveillance             | Cross-site tracking, vulnerability profiling, unrestricted secondary use, health-form replay, advertising pixels and speculative indefinite collection. | Rejected for v1.                                                                                                                                       |

## Minimal Event Contract

The initial event allowlist is:

- `measurement_consent_granted`
- `measurement_consent_withdrawn`
- `campaign_arrived`
- `journey_started`
- `journey_step_completed`
- `journey_completed`
- `handoff_attempted`
- `handoff_succeeded`
- `handoff_failed`

An event may contain only its contract/schema version, random event ID, server timestamp, build and
environment identifiers, a short-lived pseudonymous measurement-flow reference, consent-receipt
reference, generic step number, allowlisted non-clinical campaign ID, coarse outcome, coarse
duration band and synthetic-test marker. Every property is a bounded enum or validated identifier;
no arbitrary metadata or free-text extension is allowed.

The measurement-flow reference must rotate after 30 minutes, remain independent from Supabase Auth,
the encrypted treatment-intent cookie, patient/tenant/payment/provider identifiers and authoritative
workflow records, and be treated as personal information until deletion or irreversible aggregation.

## Prohibited Data and Leakage

Product-measurement payloads, URLs, query strings, referrers, logs and third parties must not receive:

- names, email addresses, telephone numbers, precise addresses or stored IP addresses;
- full user agents, fingerprints, credentials, authentication/session IDs, cookies, secrets or tokens;
- treatment selections, symptoms, diagnoses, questionnaire answers, prescriptions, clinical
  decisions, test results, adverse-event narratives or other health information;
- payment instruments, provider payloads, raw prices/orders or contact/support content;
- free text, keystrokes, DOM/session replay, full URLs, query strings or referrers; or
- identifiers that join measurement to identity, clinical, payment or fulfilment records.

The two existing poster campaign IDs remain the only approved initial attribution values. New
campaign dimensions require the same non-clinical allowlist review and cannot encode treatment,
condition, demographic or vulnerability information.

## Purpose, Consent and Transparency

- Existing payload-free security, availability and recovery telemetry remains a separate essential
  operational control and must not be repurposed as customer behaviour analytics.
- Product/funnel measurement is default-off and begins only after a distinct, explicit opt-in. It
  must not be bundled with telehealth, health-processing, account or marketing consent.
- Withdrawal stops new product measurement, expires the flow reference and queues deletion of its
  identifiable raw events. Service delivery cannot be made conditional on analytics consent.
- Longitudinal quality/research measurement requires a separate approved notice and consent or
  other documented justification appropriate to its exact use; Task 7.7 does not approve fields or
  collection for that tier.
- The final notice, responsible-party/operator allocation and legal/privacy justification remain a
  pre-activation approval, not an assumption made by this engineering decision.

## Provider, Access and Storage

Task 7.8 should implement a provider-neutral server boundary using the existing Cloudflare Worker
and a private Supabase PostgreSQL schema. No browser writes directly to Supabase; no analytics SDK,
advertising platform or session-replay provider is approved.

- Aggregated pilot reports: named operations/product owner on a minimum-access basis.
- Raw pseudonymous events and consent evidence: named privacy/security owner only, with audited
  purpose-bound access and no routine developer access.
- Developers and automated tests: synthetic records only.
- The measurement schema remains outside the exposed Data API, browser roles receive no grants,
  RLS applies as defence in depth and server credentials remain secret.

## Retention, Deletion and Export

- Raw pseudonymous events: rolling 30 days.
- Measurement consent/withdrawal evidence: 12 months, then review or delete.
- Irreversibly de-identified daily aggregates: maximum 12 months, then review or delete.
- Withdrawal-linked raw records: queued immediately and deleted within seven days; collection stops
  immediately even if deletion/reconciliation is pending.
- A scheduled purge, export inventory and synthetic deletion/reconciliation exercise are mandatory
  in Task 7.9. Legal hold cannot be silently applied to analytics and requires a separately governed
  record and justification.

## Competitive Data Boundary

Meneer's intended data advantage is longitudinal outcome quality, safe conversion, reliable service
delivery and better unit economics—not maximum raw surveillance. Rich service and clinical data may
be collected where necessary and governed in its authoritative system; analytics receives only the
minimum approved derivative. New questions require an amended versioned specification before new
fields, identifiers, providers or purposes are introduced.

## Decision and Debt Boundary

The owner approved this specification on 13 August 2026. Task 7.7 is **Completed** and TD-045 moves
to **In progress**. TD-045 remains open until Task 7.8 implements the default-off boundary and Task
7.9 proves payload minimisation, consent/withdrawal, leakage prevention, access, retention, export,
deletion and hosted network behaviour with synthetic evidence and final privacy/security approval.

This decision does not enable analytics, modify public copy, approve a legal basis, activate intake,
or authorise identifiable clinical-outcome research.

## Authoritative References

- South African Department of Justice,
  [_Protection of Personal Information Act 4 of 2013_](https://www.justice.gov.za/legislation/acts/2013-004.pdf).
- Information Regulator,
  [POPIA conditions for lawful processing](https://inforegulator.org.za/knowledge-base/category/popia/chapter-3-conditions-for-lawful-processing/)
  and
  [special-personal-information guidance](https://inforegulator.org.za/popia/).
- Supabase,
  [_Securing your API_](https://supabase.com/docs/guides/api/securing-your-api): grants, RLS and
  private/unexposed schema boundaries.
