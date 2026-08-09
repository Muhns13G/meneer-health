---
evidence_id: phase-01-sprint-04-task-11
title: Sprint 04.11 Contributor Operations Evidence
status: verified-task-evidence
date: 2026-08-09
source_baseline: 6bf6200
owner: "@Muhns13G"
related_debt: [TD-030, TD-031]
---

# Sprint 04.11 Contributor Operations Evidence

## Boundary and outcome

Task 4.11 adds repository orientation, contribution rules, testing/CI operations, private security
routing, and structured GitHub change intake. It does not change application source, public website
wording, dependencies, runtime configuration, generated routes, or deployment state.

## Contributor entry points

| File                                     | Purpose                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `README.md`                              | Current product boundary, quick start, repository map, validation, authority, release, and security routing |
| `CONTRIBUTING.md`                        | Scope selection, sensitive-domain rules, validation, evidence, and owner-only release authority             |
| `SECURITY.md`                            | Private vulnerability reporting and minimum-data rules                                                      |
| `docs/06-operations/testing-ci-guide.md` | Test layers, local/CI parity, artifacts, safe fixtures, and failure triage                                  |
| `.github/PULL_REQUEST_TEMPLATE.md`       | Outcome, evidence, risk, approvals, effects, validation, rollback, and visual-proof prompts                 |
| `.github/ISSUE_TEMPLATE/bug-report.yml`  | Structured public defect reports with mandatory no-PHI/no-secret confirmation                               |
| `AGENTS.md`                              | Updated audit/generated commands and links to the contribution process                                      |

The root documents route readers to the master blueprint, verified current state, technical-debt
registry, approved decision index, environment template, CI workflow, and Cloudflare release
runbook. They do not copy those sources into a competing policy.

## Safety and ownership controls

- The repository is described truthfully as a non-transactional acquisition site with inactive
  workflow prototypes.
- Public issue and browser-artifact guidance prohibits patient data, credentials, private source
  documents, and production logs.
- Vulnerabilities route privately to the existing monitored support mailbox.
- Sensitive content and workflow changes require applicable domain review; unknown approvals or
  operating particulars must not be invented.
- `itws-I` remains the permanent source boundary, the preview video remains isolated, and only the
  repository owner may push, merge, deploy, promote, or roll back.
- Broad/forced dependency updates and manual route-tree edits remain prohibited.

## Verification

| Check                                            | Result                          |
| ------------------------------------------------ | ------------------------------- |
| Markdown and YAML formatting                     | Pass                            |
| Issue-form YAML parse and required schema fields | Pass                            |
| Local Markdown links                             | Pass                            |
| `bun run format:check`                           | Pass                            |
| `bun run lint`                                   | Pass                            |
| `bun run typecheck`                              | Pass                            |
| `bun run test`                                   | Pass — 6 files, 11 tests        |
| `bun run build`                                  | Pass                            |
| `bun run check:generated`                        | Pass — route tree unchanged     |
| `bun run deploy:dry-run`                         | Pass — no deployment            |
| `bun run test:e2e`                               | Pass — 48 desktop/mobile checks |
| `bun audit`, `bun audit --prod`                  | Pass — no vulnerabilities found |

## Residual acceptance gate

Task 4.12 must follow the committed documentation from a clean checkout without chat context and
confirm the templates appear on GitHub. TD-030 and TD-031 remain In progress until that evidence is
recorded.

## Task disposition

Task 4.11 is complete and ready for an owner commit. Task 4.12 owns clean-checkout and hosted
template verification.
