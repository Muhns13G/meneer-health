---
artifact_id: phase-01-sprint-01-9-policy-support-evidence
title: Sprint 01.9 Policy and Support Containment Evidence
status: verified
prepared: 2026-08-07
related_debt: [TD-005]
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Sprint 01.9 — Policy and Support Containment Evidence

## Purpose

Replace misleading placeholder policies with narrow, versioned notices for the website that
actually exists, and define how the general support address may be used while all health-data and
transactional journeys remain disabled.

The notices are an engineering containment boundary informed by POPIA and South African electronic
communications requirements. They are not a legal opinion, transactional telehealth terms, clinical
consent, or approval to collect health information.

## Public Policy Boundary

/privacy now identifies OCTOTHORP ZA (K2024185008) as the provisional website operator and
publishes a versioned website-only notice covering:

- the current informational and non-transactional boundary;
- limited technical request data and voluntarily emailed general enquiries;
- the absence of application-configured analytics or advertising trackers;
- purpose limitation, minimisation, sharing, retention, and no sale of personal information;
- access, correction, deletion, objection, and Information Regulator complaint channels; and
- the mandatory replacement notice, consent, roles, retention, and vendor disclosures before health
  information or a transaction is enabled.

/terms now publishes versioned website-only terms covering the operator, current service boundary,
medical/emergency limitation, acceptable use, content, third-party links, availability, lawful
liability boundary, South African law, and the requirement for separate transactional terms.

Neither page claims that the current website provides consultation, prescription, payment, order,
delivery, or approved health-data processing.

## General Support Procedure

support@meneerhealth.co.za is limited to general enquiries, partnerships, press, website support,
and privacy requests. It is not a clinical, emergency, prescribing, pharmacy, payment-card, or
medical-record channel.

### Required handling

1. The mailbox must have a named OCTOTHORP ZA owner, MFA, least-privilege access, and a documented
   business-day monitoring schedule before it is represented as operational pilot support.
2. Public pages instruct users not to email symptoms, medical records, identity documents,
   prescriptions, payment details, or other sensitive information.
3. If sensitive information is received unexpectedly, do not copy it into Git, RAG, analytics,
   tickets, ordinary chat, or payment systems. Restrict access, record a minimal privacy-safe
   incident reference, and route it through the approved privacy/clinical process.
4. Emergency or urgent clinical messages must receive no diagnosis or treatment advice from general
   support. Direct the sender to 112/10177 or the approved urgent clinical channel and escalate the
   operational incident.
5. Privacy-rights requests must be acknowledged, identity-verified through an approved secure
   process, and routed to the appointed Information Officer/privacy owner.
6. No public response-time promise may be made until staffing, hours, escalation, leave coverage,
   and evidence support it.

## TD-005 Closure Position

The repository owner approved the website-only policy boundary and publication of the policy/support
pages as version 1.0 on 7 August 2026. The owner also confirmed that
support@meneerhealth.co.za exists, is personally monitored every day, and has the required MFA and
least-privilege security controls. TD-005 is Verified through containment for the current
non-transactional website.

Later evidence supersedes the mailbox portion of this closure: a 12 August 2026 Brevo delivery
exercise hard-bounced because the recipient account did not exist, and a post-alias retry was
blocked by Brevo's stale suppression. The owner then proved external inbox delivery, the suppression
was removed, and a final Supabase/Brevo invitation reached Delivered with Auth users returned to
zero. TD-005 is therefore Verified. See the Task 5.20 hosted evidence.

Before any health-data or transactional journey is enabled, replace this boundary with
domain-approved transactional privacy, terms, consent, operator/responsible-party, retention,
vendor, secure-support, incident, and data-subject-rights procedures.

## Verification Evidence

| Check                | Result           | Evidence                                                                                                                                                  |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript           | Pass             | `bunx tsc --noEmit` completed without errors.                                                                                                             |
| Focused lint         | Pass             | ESLint passed for `privacy.tsx`, `terms.tsx`, and `contact.tsx`.                                                                                          |
| Production build     | Pass             | `bun run build` produced client, SSR, and Nitro output; known adapter warnings remain.                                                                    |
| Rendered routes      | Pass             | An isolated local server returned HTTP 200 for `/privacy`, `/terms`, and `/contact`.                                                                      |
| Content assertions   | Pass             | Version/operator/support links rendered; contact emergency links rendered; no form controls, pending-content markers, or placeholder identities rendered. |
| Full repository lint | Existing failure | 30 unrelated Prettier errors and 7 Fast Refresh warnings remain under repository-health debt; none are in the three changed routes.                       |

## Source Basis

- Protection of Personal Information Act 4 of 2013: accountability, lawfulness, minimality,
  notification, security safeguards, data-subject participation, and complaints.
- Information Regulator POPIA guidance and complaint/forms channels.
- Electronic Communications and Transactions Act 25 of 2002: electronic communications and
  supplier-disclosure requirements where electronic transactions are offered.
