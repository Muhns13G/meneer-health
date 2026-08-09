---
consideration_id: FC-003
title: Dependency Reintroduction Triggers
status: tracked
decision_due: feature-triggered
last_reviewed: 2026-08-10
owner: "@Muhns13G"
sensitivity: internal
source_tasks: [phase-01-sprint-02-task-05, phase-01-sprint-04-task-03, phase-01-sprint-05-task-02]
---

# Dependency Reintroduction Triggers

## Purpose

Record why Sprint 02 removed unused direct packages and define when they should return. Removal means
the current repository does not directly use the package; it is not a prohibition against future
use. Add a package only in the task that introduces its first supported import and verifies its
runtime, security, and maintenance impact.

Task 5.2 met the recorded `zod` trigger. Zod 4.4.3 is now a runtime dependency used directly by the
canonical contract boundary for strict envelope, catalogue, error, timestamp, identifier, and
version validation. Portable valid/invalid fixtures and tests verify the first use. This does not
trigger React Hook Form, resolvers, or any customer-facing form.

## Feature-Triggered Reintroductions

| Package                   | Why removed                                                                                                 | Reintroduction trigger                                                                                                                   | Expected scope and validation                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zod`                     | Its only direct schemas belonged to the retired Lovable MCP tools.                                          | An active server boundary, intake, consent, API, or configuration path needs runtime schema validation.                                  | Add the approved current version to `dependencies`; define shared schemas, reject malformed input server-side, test success/failure cases, and verify bundle/runtime compatibility. |
| `@hookform/resolvers`     | No active or preserved component imports a resolver.                                                        | A rendered React Hook Form deliberately uses Zod or another supported schema library.                                                    | Add to `dependencies`; keep authoritative validation server-side, map accessible field errors, and test keyboard plus failed-submission behaviour.                                  |
| `@tanstack/react-query`   | No Query client, provider, hook, cache, mutation, or invalidation path exists.                              | Interactive client-side server state needs caching, retries, invalidation, optimistic updates, or background refresh.                    | Add to `dependencies`; document cache ownership, health-data restrictions, error/retry policy, hydration, and mutation reconciliation tests.                                        |
| `date-fns`                | Meneer does not directly import its API or currently render a date-picker workflow.                         | Application code directly formats, compares, validates, or calculates dates.                                                             | Add to `dependencies`; centralize timezone and locale rules, test South African display and boundary cases, and avoid clinical or expiry decisions based only on browser time.      |
| `@tanstack/router-plugin` | TanStack Start already owns the required router generator/plugin transitively.                              | The repository introduces a standalone TanStack Router build configuration outside TanStack Start.                                       | Add to `devDependencies`; avoid duplicate plugin registration and verify generated routes, development startup, build, and deep links.                                              |
| `nitro`                   | It supported the retired Lovable/Nitro Cloudflare output; the supported Cloudflare Vite plugin now owns v1. | An approved TanStack deployment architecture explicitly selects a Nitro adapter and demonstrates a benefit over the current Worker path. | Add to `devDependencies`; record an architecture decision and verify SSR, assets, endpoints, preview, deployment, logs, and rollback. Next.js v2 does not by itself trigger Nitro.  |

## Removed UI and Design-System Surface

Sprint 04 Task 4.3 removed the unused shadcn scaffold, 46 primitives, and their 38 direct packages.
Reintroduce only the smallest package set required by an approved, rendered feature:

| Package family                                                                                      | Reintroduction trigger                                                                                                        | Required evidence                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The 26 former `@radix-ui/react-*` packages                                                          | A current feature needs that exact accessible primitive and native HTML cannot meet the interaction.                          | Add only the imported primitive; test keyboard, focus, screen-reader semantics, hydration, bundle impact, and Worker build.                                                               |
| `class-variance-authority`, `clsx`, `tailwind-merge`                                                | Two or more current components need shared variants or conflict-safe class composition.                                       | Introduce one intentional utility API with direct consumers and tests; do not restore the old bulk scaffold.                                                                              |
| `react-hook-form`, `react-day-picker`                                                               | An approved form or date-input journey is implemented and native controlled inputs are insufficient.                          | Pair with authoritative server validation, accessible errors, timezone rules, and success/failure tests. Add `zod` or `@hookform/resolvers` only when their separate triggers also apply. |
| `cmdk`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `recharts`, `sonner`, `vaul` | A shipped command palette, carousel, OTP flow, resizable workspace, chart, toast system, or drawer directly uses the package. | Record the user journey, accessibility behaviour, mobile layout, dependency audit, bundle delta, and fallback/rollback.                                                                   |

The Radix family above means exactly:

- `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`,
  `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, and
  `@radix-ui/react-collapsible`;
- `@radix-ui/react-context-menu`, `@radix-ui/react-dialog`,
  `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, and
  `@radix-ui/react-menubar`;
- `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`,
  `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, and `@radix-ui/react-select`;
- `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-slot`,
  `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`,
  `@radix-ui/react-toggle-group`, and `@radix-ui/react-tooltip`.

The shadcn `components.json` file may return only when the repository deliberately adopts the CLI
for an active component. Its aliases and output paths must match the then-current architecture.

## Replacement-Fit Audit and Sequencing

The 9 August 2026 follow-up audit compared the removed UI surface with active controls, preserved
prototypes, and the approved Sprint 05–06 requirements. It found no package that should be restored
before Task 4.3 is committed:

- The live `/start` route renders `SafetyEntryGate`; its account/intake flow remains an inaccessible
  prototype. The live peptide route renders its gate or video preview, not its preserved profile
  prototype.
- Current native buttons, links, and checkboxes do not require an external primitive. The old
  shadcn button/input defaults also do not express Meneer's established gold-pill visual language.
- The removed form wrapper supplies client-side wiring and ARIA helpers, but not authoritative
  server validation, consent persistence, authorisation, idempotency, audit events, or safe error
  transport. Restoring it would not satisfy Sprint 05.
- CTA styling is repeated enough to justify reviewing a small Meneer-specific abstraction later,
  but not enough to justify restoring the generic Lovable catalogue before the transactional and
  accessibility requirements are implemented.

| Delivery point                     | Expected decision                                                                                              | Trigger and boundary                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Sprint 05 contract foundation      | Task 5.2 reintroduced `zod` 4.4.3 as a runtime dependency.                                                     | Trigger met by strict canonical boundary schemas and portable contract fixtures/tests; active workflow payloads remain gated.   |
| Sprint 05–06 intake implementation | Decide whether `react-hook-form` and `@hookform/resolvers` materially improve the approved multi-step journey. | Reintroduce only after the real field model, server errors, consent versioning, recovery behaviour, and test cases are defined. |
| Sprint 06 UX/accessibility work    | Consider small brand-specific `Action`, `Field`, description, and error-message primitives.                    | Extract them from repeated current use while preserving Meneer's styling; they need not depend on shadcn or Radix.              |
| Sprint 06 complex interactions     | Evaluate individual Radix primitives against native HTML.                                                      | Add only the exact primitive needed for verified focus, keyboard, disclosure, selection, or modal requirements.                 |
| Later product features             | Evaluate date picker, OTP, toast, chart, carousel, command menu, drawer, or panel packages separately.         | A designed and approved user journey must directly import the package and satisfy the checklist below.                          |

This sequencing is a review checkpoint, not an instruction to install packages automatically at a
sprint boundary. The feature trigger and acceptance evidence remain authoritative.

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
- [Task 4.3 evidence](../02-implementation-plans/phase-01/annexures/sprint-04-3-ui-surface-reduction-evidence.md)
- [Task 5.2 evidence](../02-implementation-plans/phase-01/annexures/sprint-05-2-contract-foundation-evidence.md)
- [Technical debt registry](../04-technical-debt/technical-debt-registry-v1.md)
- [Platform evolution](../RAG/03-platform-evolution.md)
- [Known limitations](../RAG/06-known-limitations.md)
