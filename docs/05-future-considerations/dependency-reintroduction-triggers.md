---
consideration_id: FC-003
title: Dependency Reintroduction Triggers
status: tracked
decision_due: feature-triggered
last_reviewed: 2026-08-07
owner: "@Muhns13G"
sensitivity: internal
source_task: phase-01-sprint-02-task-05
---

# Dependency Reintroduction Triggers

## Purpose

Record why Sprint 02 removed unused direct packages and define when they should return. Removal means
the current repository does not directly use the package; it is not a prohibition against future
use. Add a package only in the task that introduces its first supported import and verifies its
runtime, security, and maintenance impact.

## Feature-Triggered Reintroductions

| Package                   | Why removed                                                                                                 | Reintroduction trigger                                                                                                                   | Expected scope and validation                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zod`                     | Its only direct schemas belonged to the retired Lovable MCP tools.                                          | An active server boundary, intake, consent, API, or configuration path needs runtime schema validation.                                  | Add the approved current version to `dependencies`; define shared schemas, reject malformed input server-side, test success/failure cases, and verify bundle/runtime compatibility. |
| `@hookform/resolvers`     | No active or preserved component imports a resolver.                                                        | A rendered React Hook Form deliberately uses Zod or another supported schema library.                                                    | Add to `dependencies`; keep authoritative validation server-side, map accessible field errors, and test keyboard plus failed-submission behaviour.                                  |
| `@tanstack/react-query`   | No Query client, provider, hook, cache, mutation, or invalidation path exists.                              | Interactive client-side server state needs caching, retries, invalidation, optimistic updates, or background refresh.                    | Add to `dependencies`; document cache ownership, health-data restrictions, error/retry policy, hydration, and mutation reconciliation tests.                                        |
| `date-fns`                | Meneer does not directly import its API; `react-day-picker` owns the remaining transitive copy.             | Application code directly formats, compares, validates, or calculates dates.                                                             | Add to `dependencies`; centralize timezone and locale rules, test South African display and boundary cases, and avoid clinical or expiry decisions based only on browser time.      |
| `@tanstack/router-plugin` | TanStack Start already owns the required router generator/plugin transitively.                              | The repository introduces a standalone TanStack Router build configuration outside TanStack Start.                                       | Add to `devDependencies`; avoid duplicate plugin registration and verify generated routes, development startup, build, and deep links.                                              |
| `nitro`                   | It supported the retired Lovable/Nitro Cloudflare output; the supported Cloudflare Vite plugin now owns v1. | An approved TanStack deployment architecture explicitly selects a Nitro adapter and demonstrates a benefit over the current Worker path. | Add to `devDependencies`; record an architecture decision and verify SSR, assets, endpoints, preview, deployment, logs, and rollback. Next.js v2 does not by itself trigger Nitro.  |

## Reclassified, Not Removed

The following packages remain installed under `devDependencies` because repository code uses them
only while developing or building:

| Package                               | Current responsibility                                               |
| ------------------------------------- | -------------------------------------------------------------------- |
| `@cloudflare/vite-plugin`             | Builds and previews the TanStack application for Cloudflare Workers. |
| `@tailwindcss/vite` and `tailwindcss` | Compile the application stylesheet.                                  |
| `tw-animate-css`                      | Supplies build-time CSS imported by `src/styles.css`.                |
| `vite-tsconfig-paths`                 | Resolves TypeScript path aliases during Vite development and builds. |

Moving these packages back to `dependencies` requires evidence that the deployed application loads
them at runtime rather than merely using their generated output.

## Retired Vendor Packages

| Package                             | Disposition                                                                               | Reconsideration rule                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@lovable.dev/vite-tanstack-config` | Permanently retired from v1 after explicit Cloudflare/TanStack configuration replaced it. | Do not reintroduce to recover hidden defaults. Restore only through an explicit reversal of DIR-006 with migration and rollback evidence. |
| `@lovable.dev/mcp-js`               | Permanently retired from v1 with the public MCP surface.                                  | A future MCP use case must use an approved vendor-neutral boundary. Do not restore this SDK merely to reuse the removed public tools.     |

Future AI-assisted protocol or clinical-decision work does not trigger either Lovable package. It
requires a separately governed clinical service, authoritative protocols, authentication,
authorization, auditability, privacy/security review, human clinical oversight, and a versioned API.
MCP may later be evaluated as one controlled interface to that service, not as its clinical core.

## Reintroduction Checklist

Before adding a removed package:

1. Link the package to an approved feature, architecture decision, or verified defect.
2. Confirm repository code will import its public API directly.
3. Select `dependencies` only for deployed/runtime use; otherwise use `devDependencies`.
4. Check current maintenance status, licence, advisories, Worker compatibility, and alternatives.
5. Add it through a bounded Bun operation and keep `bun.lock` synchronized.
6. Run frozen install, TypeScript, lint, tests when available, production build, preview, route
   regression, dependency audits, and `git diff --check`.
7. Update this document if the trigger, scope, or disposition changes.

## Related Project Documents

- [Sprint 02 implementation plan](../02-implementation-plans/phase-01/sprint-02-lovable-exit-cloudflare-runtime.md)
- [Task 2.5 evidence](../02-implementation-plans/phase-01/annexures/sprint-02-5-telemetry-dependency-evidence.md)
- [Technical debt registry](../04-technical-debt/technical-debt-registry-v1.md)
- [Platform evolution](../RAG/03-platform-evolution.md)
- [Known limitations](../RAG/06-known-limitations.md)
