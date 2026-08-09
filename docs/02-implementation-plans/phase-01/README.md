---
plan_id: phase-01-technical-debt-stabilisation
title: Phase 01 Technical Debt Stabilisation
status: planned
last_updated: 2026-08-08
owner: unassigned
---

# Phase 01 — Technical Debt Stabilisation

## Mission

Convert the Lovable-generated TanStack prototype into an honest, governed, testable, real-transaction
v1 pilot baseline on an approved host. Public marketing remains open, while the transactional pilot journey is
restricted to the enrolled cohort. Phase 01 covers every item in Technical Debt Registry v1. An item
may be resolved by implementing, removing, or explicitly deferring a capability when the registry's
acceptance evidence permits it; framework migration alone does not close debt.

“Phase 01” is the delivery phase. Registry priorities `P0`, `P1`, `P2`, and `P3` describe urgency and must not be confused with the phase number.

## Source Baseline

- [Master blueprint](../../00-blueprints/master-blueprint-v1.md)
- [Project and codebase audit](../../01-audits/project-codebase-audit-2026-08-05.md)
- [Pre-Phase 1 runtime investigation](../../01-audits/runtime-investigation-2026-08-06.md)
- [Technical debt registry](../../04-technical-debt/technical-debt-registry-v1.md)
- [Internal RAG governance](../../RAG/00-governance.md)
- [RAG index](../../RAG/07-index.json)

Plans must be refreshed if these sources materially change. Repository evidence takes precedence for what exists; approved decision records govern what is allowed.

## Sprint Sequence

| Sprint | Mission                                                                             | Primary debt                                  | Depends on                                         |
| ------ | ----------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| 01     | Contain misleading or unsafe pilot surfaces and define the pilot gate.              | TD-001–TD-008, TD-032–TD-034, TD-056          | None                                               |
| 02     | Remove Lovable coupling and explicitly own and verify the Cloudflare v1 runtime.    | TD-025, TD-027, TD-041, TD-049, TD-051–TD-053 | Sprint 01 containment; approved Cloudflare host    |
| 03     | Approve the operating model, ownership, portable architecture, and data boundaries. | TD-009–TD-013, TD-016, TD-050, TD-054         | Sprint 01 pilot scope; Sprint 02 runtime direction |
| 04     | Restore reproducible engineering, dependency, test, CI, and repository controls.    | TD-021–TD-024, TD-026, TD-028–TD-031          | Sprint 02 dependency/runtime changes               |
| 05     | Implement the approved data, security, audit, and operational foundations.          | TD-014, TD-015, TD-017–TD-020, TD-055         | Sprints 03 and 04                                  |
| 06     | Correct journeys, accessibility, navigation, discovery, and support surfaces.       | TD-035–TD-039, TD-042–TD-044                  | Sprints 01, 03, and 04                             |
| 07     | Establish canonical content, privacy-safe measurement, and the final MCP boundary.  | TD-040, TD-045–TD-048                         | Sprints 02, 03, 05, and 06                         |

Sprint 02 closed on 8 August 2026 after Tasks 2.1–2.8. TD-025, TD-027, TD-041, TD-049, and
TD-051–TD-053 are Verified.

Sprint 03 closed on 8 August 2026 after Tasks 3.1–3.9. TD-011, TD-012, TD-050, and TD-054 are
Verified. TD-009 and TD-010 retain named operating/commercial gates; TD-013 and TD-016 retain the
Sprint 05 implementation evidence required by their acceptance criteria.

Sprint 04 closed on 9 August 2026 after Tasks 4.1–4.12. The clean-clone matrix, hosted passing run,
rendered contributor templates, protected `main` and `develop` branches, and closed unmerged PR #10
prove that required `Repository validation` succeeds for the approved baseline and blocks a
controlled failure. TD-021–TD-024, TD-026, and TD-028–TD-031 are Verified.

External decision preparation may begin early, but a sprint cannot claim completion until its prerequisites and acceptance evidence are satisfied.

## Coverage Matrix

| Registry range | Owning sprint |
| -------------- | ------------- |
| TD-001–TD-008  | Sprint 01     |
| TD-009–TD-013  | Sprint 03     |
| TD-014–TD-015  | Sprint 05     |
| TD-016         | Sprint 03     |
| TD-017–TD-020  | Sprint 05     |
| TD-021–TD-024  | Sprint 04     |
| TD-025         | Sprint 02     |
| TD-026         | Sprint 04     |
| TD-027         | Sprint 02     |
| TD-028–TD-031  | Sprint 04     |
| TD-032–TD-034  | Sprint 01     |
| TD-035–TD-039  | Sprint 06     |
| TD-040         | Sprint 07     |
| TD-041         | Sprint 02     |
| TD-042–TD-044  | Sprint 06     |
| TD-045–TD-048  | Sprint 07     |
| TD-049         | Sprint 02     |
| TD-050         | Sprint 03     |
| TD-051–TD-053  | Sprint 02     |
| TD-054         | Sprint 03     |
| TD-055         | Sprint 05     |
| TD-056         | Sprint 01     |

Every TD identifier has one primary sprint. A plan may depend on work from another sprint without taking ownership of that debt item.

## Delivery Rules

1. Keep changes small and traceable to a task and TD identifier.
2. Do not collect health information until the relevant pilot, consent, security, data, and operating-model gates pass.
3. Preserve generated-file ownership; regenerate rather than hand-edit generated routes.
4. Use Bun and keep `bun.lock` synchronised.
5. Never commit secrets, patient information, production exports, `.dev.vars`, or `*.local` files.
6. Do not provision `LOVABLE_API_KEY` or introduce replacement telemetry without privacy approval.
7. The repository owner performs GitHub pushes and external production actions.
8. Record decisions before code when options materially change clinical, privacy, data, vendor, or migration outcomes.
9. Update affected RAG documents and the RAG index in the same change as authoritative new evidence.
10. Commit by small, reviewable outcome rather than by whole sprint or arbitrary file count. Keep
    directly related tests and documentation with the change, preserve a buildable intermediate state
    where practical, and do not split changes when doing so would create misleading or broken behaviour.
11. Use concise imperative commit messages and include the relevant sprint task or TD identifiers in
    the commit body when the relationship is not obvious from the change.
12. Disable unsafe or incomplete behaviour at the user boundary while preserving its implementation
    until a verified replacement is ready. Delete or permanently retire it only after documented
    cutover, regression checks, rollback evidence, and repository-owner approval.

## Required Sprint Artefacts

Each sprint must produce:

- Task-level change references mapped to its primary TD IDs.
- Decision records for material choices.
- Validation logs and manual/browser evidence appropriate to the risk.
- Migration and rollback instructions for stateful or platform changes.
- A completion report recording the mission/outcome, delivered work and decisions, deviations,
  lessons learned, newly introduced or discovered debt, validation, residual risk, and release
  implication. It must separately tabulate existing files modified/deleted and files created,
  including any branch-only artefacts.
- Updated registry entries only after acceptance evidence is independently checked.

Completion reports should be stored under `docs/03-completion-reports/phase-01/` using the matching sprint number and slug.

## Phase Completion Gate

Phase 01 completes only when:

- TD-001 through TD-056 are each `Verified`, including approved disable/defer outcomes where appropriate.
- The approved v1 pilot scope and operating model are recorded.
- Preview and production paths on the selected host are verified without unintended Lovable or obsolete platform dependencies.
- Frozen install, lint, typecheck, automated tests, build, dependency policy, and critical browser checks pass.
- Enabled submissions have durable monitored destinations and cannot report false success.
- Security, privacy, support, incident, rollback, and data-lifecycle procedures exist for the enabled pilot scope.
- The internal RAG corpus reflects the completed implementation and clearly separates remaining public-launch work.

Phase completion does not automatically authorise public launch. The blueprint's separate public-launch gate remains controlling.
