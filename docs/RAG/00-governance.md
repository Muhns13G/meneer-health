---
rag_id: meneer-rag-governance
title: Meneer RAG Governance
status: active
authority: governing
last_updated: 2026-08-07
audience: internal
sensitivity: internal
---

# Meneer RAG Governance

## Purpose

This directory is the retrieval foundation for contributors and coding agents working on Meneer. It routes questions to evidence, decisions, plans, and unresolved debt without presenting proposed healthcare capabilities as implemented or approved.

This is an **internal engineering corpus**. It is not approved for patient support, clinical guidance, marketing claims, diagnosis, treatment recommendations, or ingestion of patient information.

## Corpus Stage

The corpus is currently a **foundation**, not a comprehensive production knowledge base. It may describe the audited v1 repository and confirmed product direction. It must expand through architecture decisions, implementation plans, completion reports, tests, runbooks, and approved content as technical debt is resolved.

## Evidence Labels

- **Observed:** directly verified in source, history, build output, or runtime checks.
- **Owner confirmed:** product direction supplied by the repository owner; not necessarily implemented.
- **Approved:** a named accountable owner has accepted a decision or artefact.
- **Proposed:** a recommendation awaiting approval.
- **Open:** unresolved and unsafe to treat as fact.
- **Superseded:** retained for traceability but no longer current.

Every new RAG document must declare its status, authority, last-updated date, audience, and sensitivity. Claims about implemented behaviour require repository or completion evidence. Clinical, legal, privacy, pricing, or provider claims require explicit domain approval.

## Source Precedence

Use the narrowest authoritative source for the question:

1. Approved policies, clinical protocols, architecture decisions, schemas, and release records.
2. Verified completion reports and current automated test evidence.
3. Current source code and deployable configuration for implemented behaviour.
4. The technical-debt registry for unresolved obligations and acceptance criteria.
5. The master blueprint for intended direction and product principles.
6. The dated audit for evidence at its recorded baseline.
7. RAG summaries for routing and synthesis only.

A newer document does not automatically outrank a domain-approved source. When sources conflict, report the conflict, prefer verified implementation for “what exists,” and prefer approved governance for “what is allowed.” Never silently reconcile discrepancies.

## Retrieval Safety Rules

- Do not infer that a planned capability exists.
- Do not convert marketing copy into clinical fact.
- Do not describe placeholder consent, accounts, questionnaires, or confirmations as operational.
- Do not treat website-only privacy/terms as transactional policy, telehealth consent, or authority
  to collect health information.
- Do not expose secrets, credentials, tokens, patient data, health submissions, or private operational records.
- Do not use internal debt, incidents, or deliberations in a public response.
- Do not recommend `LOVABLE_API_KEY`; it is not a Meneer runtime requirement.
- MCP is absent from v1. Require a named use case and a separately approved, vendor-neutral,
  public-information-only boundary before reintroducing it.
- Cite the source path and its date/status when an answer affects safety, compliance, architecture, or release readiness.

## Internal and Public Collections

Keep internal engineering knowledge physically or logically separate from any future public or clinical corpus. A future patient-facing corpus may contain only versioned, approved material with named clinical/legal ownership, effective dates, review dates, withdrawal procedures, and channel permissions.

## Update Triggers

Update this corpus when a debt item is verified, an architecture or operating-model decision is approved, a release gate changes, a framework migration begins, a source document is superseded, or implementation evidence materially changes. Update the relevant document and `07-index.json` in the same change.

Do not overwrite historical evidence. Mark obsolete summaries as superseded and point to their replacement. Never ingest generated build output, dependency directories, secrets, local environment files, or real patient data.

## Sprint Closure Protocol

Every completed sprint must have a completion report under `docs/03-completion-reports/<phase>/`.
The report must record the sprint mission and outcome, delivered work and decisions, deviations from
the implementation plan, lessons learned, newly introduced or discovered technical debt, residual
risk, validation evidence, and the release implication. It must also separate existing files that
were modified or deleted from files created during the sprint; branch-only artefacts must be
identified explicitly.

Close the sprint plan, reconcile the technical-debt registry, update affected RAG summaries and
`07-index.json`, and validate links and structured files in the same documentation boundary. A
closed engineering sprint is not automatically approval for pilot activation, production release,
public launch, or collection of health information.
