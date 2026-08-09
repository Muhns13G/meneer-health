---
evidence_id: phase-01-sprint-04-task-03
title: Sprint 04.3 UI Surface Reduction Evidence
status: verified-task-evidence
date: 2026-08-08
source_baseline: 93c6ff7
owner: "@Muhns13G"
related_debt: [TD-022, TD-026]
---

# Sprint 04.3 — UI Surface Reduction Evidence

## Purpose and Boundary

Task 4.3 removes the verified-unreachable shadcn/Radix surface in one reversible commit-sized
change. It removes no product component, route, approved prototype, public wording, asset, runtime
configuration, test, or hosted resource.

## Repeated Reachability Proof

Immediately before removal, the repository contained 46 tracked `src/components/ui/*.tsx` files.
Searches outside that directory found no static alias/relative import, dynamic import, glob import,
lazy import, generated-route reference, or package import into the candidate surface.

The only support-file consumers were internal:

- `src/hooks/use-mobile.tsx` was imported only by `sidebar.tsx`;
- `src/lib/utils.ts` was imported only by UI primitives; and
- `components.json` was an unused shadcn CLI scaffold pointing to those UI and utility paths.

All 38 candidate direct packages had no reference outside the removable files, `package.json`, the
lockfile, historical documentation, and archived records.

## Removed Surface

| Surface             |  Removed | Detail                                                                                |
| ------------------- | -------: | ------------------------------------------------------------------------------------- |
| UI primitives       | 46 files | All files under `src/components/ui/`; no intentional product primitive remained.      |
| Support-only source |  2 files | `src/hooks/use-mobile.tsx` and `src/lib/utils.ts`.                                    |
| Stale scaffold      |   1 file | `components.json`; retaining it would advertise deleted aliases and output paths.     |
| Direct dependencies |       38 | 26 Radix packages, 10 specialised/composition packages, `clsx`, and `tailwind-merge`. |

The 26 Radix packages covered accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible,
context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress,
radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toggle, toggle-group, and
tooltip.

The other removed packages were `class-variance-authority`, `cmdk`, `embla-carousel-react`,
`input-otp`, `react-day-picker`, `react-hook-form`, `react-resizable-panels`, `recharts`, `sonner`,
and `vaul`, plus support-only `clsx` and `tailwind-merge`.

Five runtime dependencies remain: `@tanstack/react-router`, `@tanstack/react-start`,
`lucide-react`, `react`, and `react-dom`. No package version was upgraded or downgraded.

## Dependency and Bundle Comparison

| Measure                |             Before Task 4.3 |              After Task 4.3 | Result                                            |
| ---------------------- | --------------------------: | --------------------------: | ------------------------------------------------- |
| Frozen-install checks  | 456 installs / 566 packages | 319 installs / 442 packages | 137 fewer installs and 124 fewer package records. |
| Runtime declarations   |                          43 |                           5 | 38 unused direct declarations removed.            |
| Generated client CSS   |    85.95 kB / 14.29 kB gzip |     35.04 kB / 6.80 kB gzip | 50.91 kB raw and 7.49 kB gzip removed.            |
| Main client JavaScript |  330.91 kB / 104.99 kB gzip |                   Unchanged | Confirms UI packages were not in reachable JS.    |
| Worker entry           |                   756.67 kB |                   Unchanged | Server runtime surface is unchanged.              |
| Worker modules/assets  |                     17 / 28 |                     17 / 28 | Route and asset topology is unchanged.            |

The CSS reduction is expected: Tailwind no longer scans unused primitive class strings. Product
source classes remain discoverable and rendered-browser checks show no layout or asset regression.

## Validation

| Check                                        | Result                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`              | Pass; 319 installs across 442 packages with no changes.                                 |
| `bun run typecheck`                          | Pass.                                                                                   |
| `bun run build` and `bun run deploy:dry-run` | Pass; no deployment or binding mutation.                                                |
| Generated route tree                         | No diff.                                                                                |
| `bun audit` / `bun audit --prod`             | Unchanged at 33 and 26 findings; removed packages owned none of the current advisories. |
| `bun run lint`                               | Expected red: same 21 formatting errors, but warnings fall from 7 to 1.                 |

Local HTTP checks returned 200 for `/`, `/peptides`, `/start`, `/contact`, `/privacy`, `/terms`,
`/poster`, and `/poster-thanks`. `/go/dads` and `/go/thanks-dad` retained 307 redirects to `/start`
with their approved attribution. `/mcp`, `/.mcp/list-tools`, the retired OAuth path, and an unknown
route returned ordinary HTML 404 responses.

Approved signatures remained rendered: “Back to your best,” “Start your private consult,” and
“Peptides — Meneer.” No public source file was edited.

The in-app browser rendered all eight active pages at the standard desktop viewport. Every page had
the expected title and primary heading, no horizontal overflow, no incomplete image, and no console
warning or error. The homepage was visually inspected after the CSS reduction and retained its
dark/gold layout, navigation, hero, imagery, and calls to action.

The known upstream `punycode` warning and sandbox-only Wrangler log-write messages remain unchanged
and non-fatal.

## Debt Disposition

Task 4.3 and TD-026 are **Verified**. TD-022 remains Open: deletion removed six irrelevant UI
warnings, but Task 4.4 still owns 21 formatting errors and Task 4.5 owns the remaining router Fast
Refresh warning. Any future design-system package must follow the feature-triggered reintroduction
criteria rather than restoring speculative scaffolding.
