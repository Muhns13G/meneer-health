---
evidence_id: phase-01-sprint-02-task-06
title: Sprint 02 Task 2.6 Meneer Metadata Evidence
status: verified-local
date: 2026-08-07
source_commit: 629159b
owner: "@Muhns13G"
---

# Sprint 02 Task 2.6 — Meneer Metadata Evidence

## Purpose and Boundary

This task replaces the remaining Lovable application identity with approved Meneer fallback
metadata and verifies how route-specific metadata composes with it. It preserves established page
copy, route behaviour, indexing directives, and existing canonical decisions. The repository owner
retains commit, push, and deployment actions.

## Implementation

- Replaced `Lovable App`, `Lovable Generated Project`, author `Lovable`, and `@Lovable` in the root
  metadata with `Meneer` and established “Back to your best” homepage language.
- Added `application-name`, Twitter title, and Twitter description fallbacks. No unconfirmed social
  account was invented.
- Kept route-specific titles, descriptions, Open Graph values, canonicals, and `noindex` directives
  intact. Existing error and not-found bodies were already neutral and remain unchanged.
- Normalized three ordinary package records in `bun.lock` that still named Lovable's historical
  package-cache host. Package versions, dependency metadata, and integrity hashes are unchanged.

No public or client-facing body copy was edited.

## Rendered-Head Verification

| Surface                               | Verified result                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/`                                   | Existing homepage title, description, Open Graph title/description, and Meneer author/application identity render.        |
| `/peptides`                           | Existing peptide title, description, Open Graph values, and `noindex, nofollow` render with Meneer fallbacks.             |
| `/start`, `/poster`, `/poster-thanks` | Existing route-specific title, description, and `noindex, nofollow` render with Meneer fallbacks.                         |
| `/contact`, `/privacy`, `/terms`      | Existing route metadata and relative canonical values remain unchanged; Meneer fallbacks render.                          |
| Unknown route                         | HTTP 404 renders the existing “Page not found” recovery body with Meneer root and social metadata.                        |
| Error fallback                        | Structural inspection confirms the root head remains the fallback; the neutral error body declares no competing metadata. |

Comprehensive absolute canonicals, favicon, social image, robots policy, and sitemap remain the
separate TD-042 scope; they were not improvised in this identity task.

## Validation

| Check                                | Result                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`      | Pass; 456 installs across 566 packages, no changes                                                             |
| `bunx tsc --noEmit`                  | Pass                                                                                                           |
| `bun run build`                      | Pass                                                                                                           |
| Local production-preview head matrix | Pass across root, route-specific, gated, policy, and unknown routes                                            |
| Static identity search               | Pass; no active source, configuration, lockfile, or built output presents Lovable as the application or author |
| `bun run lint`                       | Known baseline: 21 unrelated Prettier errors and 7 Fast Refresh warnings; no finding in the changed route      |
| Wrangler deployment dry-run          | Pass without deployment                                                                                        |

## Debt Disposition

- **TD-041 — Verified:** rendered root, route, error-fallback, and not-found metadata use approved
  Meneer values, while established route-specific metadata is preserved.
- **TD-042 — Open:** the broader discovery and indexing package remains assigned to Sprint 06.

Task 2.7 must still confirm the owner-deployed Cloudflare boundary and hosted route behaviour; this
task performs no deployment.
