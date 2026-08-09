---
rag_id: meneer-current-state
title: Meneer v1 Verified Current State
status: current
authority: observed-summary
last_updated: 2026-08-09
audience: internal
sensitivity: internal
source_baseline: 6bf6200
runtime_baseline: 0838c2d
sources:
  - docs/01-audits/project-codebase-audit-2026-08-05.md
  - docs/01-audits/runtime-investigation-2026-08-06.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-2-incomplete-journey-gate-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-01-8-safety-campaign-continuation-evidence.md
  - docs/03-completion-reports/phase-01/sprint-01-pilot-risk-containment.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-3-cloudflare-runtime-ownership-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-4-mcp-removal-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-5-telemetry-dependency-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-6-meneer-metadata-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-7-cloudflare-release-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-02-8-verification-and-closure-evidence.md
  - docs/03-completion-reports/phase-01/sprint-02-lovable-exit-cloudflare-runtime.md
  - docs/06-operations/cloudflare-environments-release-runbook.md
  - docs/07-decisions/DR-003-platform-boundaries-authoritative-state.md
  - docs/07-decisions/DR-005-data-tenancy-lifecycle-migration.md
  - docs/07-decisions/DR-006-vendor-evaluation-criteria.md
  - docs/07-decisions/DR-007-identity-authorisation-architecture.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-03-8-architecture-validation-evidence.md
  - docs/03-completion-reports/phase-01/sprint-03-operating-model-architecture.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-1-repository-health-baseline-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-2-bun-package-contract-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-3-ui-surface-reduction-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-7-browser-accessibility-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-8-production-advisory-remediation-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-9-tooling-advisory-remediation-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-10-ci-policy-evidence.md
  - docs/02-implementation-plans/phase-01/annexures/sprint-04-11-contributor-operations-evidence.md
  - docs/06-operations/testing-ci-guide.md
---

# Meneer v1 Verified Current State

## Classification

The repository is a responsive acquisition site with inactive, preserved workflow prototypes. It is
not yet a production healthcare application. Active routes do not persist or transmit account,
consent, questionnaire, appointment, clinical, prescription, payment, pharmacy, delivery, or
support records.

DR-003 now approves the target platform boundaries and authoritative-state ownership. That is a
design decision, not a current capability: no application/API boundary, modular domain core,
datastore, identity service, clinical/operations workspace, or transactional adapter exists in the
repository yet.

DR-005 and DR-006 now approve the target PostgreSQL/object-storage, tenancy, lifecycle, migration,
backup/restore, and vendor-evaluation architecture. They do not change the observed runtime: no
provider, database, bucket, schema, migration, tenant policy, backup, or restore workflow exists.

DR-007 approves the target identity and authorisation architecture. No identity provider, account,
verification, MFA, session, recovery, role, permission, break-glass, service identity, or access
policy exists in the current runtime.

Task 3.8 confirms the Sprint 03 design is internally consistent and adds lifecycle/recovery targets.
This is documentation evidence only: no scenario was executed against a transactional backend, and
TD-013/TD-016 remain In progress pending Sprint 05 access, restore, and data-subject tests.

Task 3.9 closes Sprint 03 after reconciling the approved records, blueprint, registry, completion
report, and RAG corpus. The closure changes documentation authority, not runtime capability.

## Technology

- The private package is named `meneer-health`. Bun 1.3.x manages the authoritative `bun.lock`; the
  package-manager pin is 1.3.14, and a version-aligned frozen install passes without changes.
- Node 22.x build tooling is supported and Cloudflare Builds is pinned through `.node-version`;
  deployed code runs on `workerd` with `nodejs_compat`, not a general Node.js process.
- React 19, TypeScript strict mode, TanStack Start 1.167.65, TanStack Router, Vite 7.3.6, Tailwind
  CSS, and Cloudflare Workers.
- Explicit Cloudflare Vite, TanStack Start, React, Tailwind, and TypeScript-path configuration.
- Cloudflare is the approved v1 host. The Lovable Vite wrapper and MCP package have been removed.
- Five intentional runtime dependencies: TanStack Start/Router, React/ReactDOM, and Lucide.
- Vitest, jsdom, React Testing Library, user-event, jest-dom, and V8 coverage are test-only
  development tooling; the production dependency declarations remain unchanged.
- Playwright 1.62.1 and axe-core provide a controlled desktop/mobile Chromium browser matrix. The
  managed browser cache is local tooling and is not committed to the repository.
- A read-only GitHub Actions workflow now declares the frozen install, quality, tests, dual audit,
  build, generated-route, Cloudflare dry-run, and browser gates. Hosted enforcement remains
  unverified until Task 4.12 runs the committed workflow.

Task 4.2 adds the repository-wide, non-writing `bun run format:check` command. Task 4.4 clears its
tracked formatting backlog without changing public wording or behaviour. The check now passes;
Task 4.10 declares it in CI, with hosted enforcement proof remaining Task 4.12.

## Route Behaviour

| Route or surface                 | Verified state                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                              | Public responsive marketing homepage with established dark/gold messaging and a local placeholder mark.                              |
| `/start`                         | Explicit non-transactional gate; preserved account, consent, and intake prototype is not rendered.                                   |
| `/peptides`                      | Peptides-first marketing plus a non-transactional gate on `itws-I`; no questionnaire or partner submission is active.                |
| `/poster`, `/poster-thanks`      | Explicit inactive campaign gates; no QR or confirmation action is exposed.                                                           |
| `/privacy`, `/terms`, `/contact` | Website-only policies are owner-approved; the support mailbox exists, is owner-monitored daily, and has confirmed security controls. |
| `/mcp`, `/.mcp/*`                | Removed; local development and production preview return the ordinary HTML `404`.                                                    |
| OAuth metadata                   | Removed; `/.well-known/oauth-protected-resource` returns the ordinary HTML `404`.                                                    |

## Verified Validation Snapshot

At the 2026-08-05 audit baseline:

- Production build passed.
- TypeScript `--noEmit` passed.
- Lint failed with 62 errors and 7 warnings.
- `bun audit` reported 40 advisories: 19 high, 17 moderate, and 4 low.
- `bun audit --prod` reported 33 advisories: 13 high, 16 moderate, and 4 low.
- Desktop/mobile rendering and declared route responses generally passed.
- MCP tool listing and invocation passed.

These are dated audit results, not permanently current facts. Re-run validation after dependency, platform, or source changes.

## Sprint 01 Closure Snapshot

At permanent implementation boundary `b9997d8` and documentation closure on 2026-08-07:

- Sprint 01 is complete as an engineering containment boundary; it is not pilot activation or
  public-launch approval.
- `bunx tsc --noEmit` and `bun run build` pass.
- `bun run lint` fails with 30 Prettier errors and 7 Fast Refresh warnings.
- Local desktop/mobile browser evidence confirms the homepage, shared logo, gated routes, and
  preview-only draft video render without console errors or horizontal overflow.
- TD-033 is Verified through containment: the preview-only 6.7 MB video remains isolated on
  `itws-I-preview` and is not part of `itws-I`.
- The `itws-I-preview` deployment is served at `meneerhealth.co.za`. Hosted checks verify the
  homepage, `/peptides`, hashed logo, campaign redirects, and attributed `/start` destinations.
- No automated test framework or CI workflow exists.

## Pre-Phase 1 Runtime Refresh

The 2026-08-06 browser investigation reproduced the registry's key runtime findings at commit
`aaab9d1`: the intake and peptide profiles send no requests, intake confirmation is local-only, the
shared logo and poster QR codes are broken/placeholders, legal content is unfinished, and non-home
hash navigation has no target. Desktop and mobile routes remained visually usable, TypeScript and
the production build passed, lint retained its known 62 errors and 7 warnings, and the public MCP
list, invocation, and protocol initialization checks passed. See the runtime investigation for the
full route, network, accessibility, and endpoint evidence.

## Sprint 1.2 Containment Update

At the verified working-tree boundary after `f1e45c7`, `/start`, `/peptides`, `/poster`, and
`/poster-thanks` render explicit non-transactional gates. The active routes expose no forms, inputs,
passwords, consent, questionnaires, videos, QR placeholders, external partner links, or success
states. Their previous prototype functions remain in source for replacement comparison but are not
rendered or exported by the active routes. TypeScript and the production build pass; browser checks
at desktop and mobile sizes found no gate-page error overlay, console warning/error, or horizontal
overflow. See the Sprint 01.2 evidence artefact for the complete verification matrix.

## Sprint 1.6 Asset Update

The permanent boundary replaces the Lovable virtual logo metadata with a
company-approved local placeholder imported by the shared navigation and footer. `/peptides` remains
gated unless an explicit video URL enables a non-transactional draft-review layout; neither mode
exposes the preserved profile, acknowledgement, or questionnaire prototype. The empty video source
has been removed. Local desktop/mobile browser verification confirms the shared logo renders in the
header and footer, the preview-branch MP4 decodes and renders its first frame and native controls
without a media error, and both campaign routes remain inactive without QR or transactional
surfaces. Sprint 01.6 is closed as a verified local engineering boundary. TD-033 is Verified through
isolated-preview containment; final accessible media remains a public-use reactivation requirement.
Subsequent canonical-domain checks verified the placeholder logo, closing TD-032. Final identity
quality remains tracked under FC-002.

## Sprint 1.8 Safety and Campaign Continuation

`/start` is now a fail-closed universal pilot boundary rather than the generic inactive-route gate.
It collects no health information, directs emergencies to 112/10177, separates general support from
urgent care, and states the peptide-first cohort boundary. Activation blockers are derived from a
central profile: the owner-confirmed provisional operator is OCTOTHORP ZA (`K2024185008`), while the
clinician, HPCSA number, pharmacy legal identity, Y-number, responsible pharmacist, and urgent
clinical channel remain explicit development fixtures. Those fixtures are not rendered as verified
registrations.

The approved poster concepts now have local SVG and 1200 x 1200 PNG QR assets for
`meneerhealth.co.za/go/dads` and `/go/thanks-dad`. Both stable routes redirect to `/start` with
offline-poster UTM attribution. Poster proofs use the local mark and human-readable fallback URL,
are labelled as internal/not for distribution, and require `VITE_CAMPAIGN_PRINT_PROOF=true`; the
default build remains gated.

Local TypeScript, focused lint, default/proof builds, redirect, responsive, asset-load, overflow, and
console checks passed. A subsequent dev-server retest confirmed all acquisition entries terminate at
gated routes with no form controls, placeholder identities, API transaction, or fulfilment path.
TD-008 is therefore Verified through a disabled-capability outcome; its clinical, accountable-party,
and server-enforcement requirements apply before any transaction is enabled. On 7 August 2026,
hosted checks confirmed both canonical 307 redirects and HTTP 200 attributed `/start` destinations,
and the owner confirmed successful QR scans. TD-034 is Verified. Final A1 production/material QA
remains a mandatory pre-distribution release check.

## Sprint 1.9 Pilot Scope, Policy, and Support Update

The placeholder privacy and terms pages have been replaced with versioned notices limited to the
current informational website. They identify the provisional OCTOTHORP ZA operator, describe limited
technical request and voluntary general-email information, expose POPIA rights/complaint routing,
and prohibit treating the notices as health-data, consultation, payment, prescription, or order
authority. Contact now instructs users not to email sensitive information and repeats 112/10177
emergency routing.

An owner-approved controlled-pilot charter defines a 30-day invite-only adult South African cohort,
peptide-only transactions, gated non-peptide journeys, operating roles, data boundaries, success
measures, stop criteria, activation prerequisites, exit review, and a separate public-launch gate.
The repository owner confirms that the general mailbox exists, is personally monitored every day,
and has the required security controls. TD-005 and TD-056 are Verified.

## Sprint 1.10 Claims and Peptide Close-out Audit

The repository owner approved proceeding with TD-006 and TD-007 without broadly rewriting the
established messaging. A product/channel inventory and authoritative-source review confirmed that
owner direction does not establish the missing clinician registration, pharmacy authority,
product-specific SAHPRA basis, clinical/questionnaire approval, production security, commercial
rules, or measured operational performance. An exact evidence-and-approver pack now exists. Both
items are in progress, public wording is unchanged, and the transactional gates remain mandatory.

The initial TD-007 candidate pairing is BPC-157 plus TB-500, commonly called the “Wolverine stack.”
SAHPRA's public peptide notice names both among illegally marketed peptides. Neither may enter the
pilot unless product-specific registration or valid Section 21 authority and the full partner,
clinical, data, dispensing, safety, and fulfilment pathway are evidenced.

## Lovable and Cloudflare Coupling

- The former `@lovable.dev/vite-tanstack-config` wrapper and its hidden defaults have been removed.
  `vite.config.ts` now explicitly owns the supported Cloudflare, TanStack Start, React, Tailwind,
  TypeScript-path, alias, import-protection, deduplication, and development-server configuration.
- The former `@lovable.dev/mcp-js` package, Vite plugin, server/tool definitions, generated routes,
  OAuth metadata route, and `.lovable/mcp/manifest.json` have been removed.
- The shared logo uses a local placeholder; the removed virtual-asset proxy is no longer required.
- Root, author, Open Graph, and Twitter fallback metadata now identify the application as Meneer;
  route-specific metadata and established page copy remain unchanged.
- `@cloudflare/vite-plugin`, `wrangler.jsonc`, and Cloudflare compatibility configuration remain.
  The current `itws-I-preview` build is deployed at `meneerhealth.co.za`; Sprint 02 retains and
  explicitly owns this Cloudflare runtime while removing Lovable coupling.
- `LOVABLE_API_KEY` must not be provisioned. Its former MCP telemetry implementation is absent from
  current source, packages, lockfile, built output, hosted browser network, and persisted logs.

### Sprint 02 pre-exit baseline — 7 August 2026

- An isolated frozen install and TypeScript check pass. The production Cloudflare-module build
  passes with known TanStack/Rollup and Wrangler override warnings.
- `bun run preview` is not a valid production preview at this baseline: it returns 500 while looking
  for `dist/server/server.js`. The generated Worker runs successfully through Wrangler from
  `.output/` and matches the canonical route matrix.
- Lint has 30 existing Prettier errors and 7 Fast Refresh warnings. `bun audit` reports 41 findings
  across application-server, build, MCP, and development dependency paths.
- The compiled Worker retains the Lovable MCP SDK, Model Context Protocol SDK, Zod, AJV, and Lovable
  environment/telemetry logic. Without `LOVABLE_API_KEY`, telemetry is disabled but the code path is
  still present.
- The committed `itws-I` source has no draft video; both current hosted origins serve the known
  `itws-I-preview` video variant. This is an intentional branch/deployment distinction.

Evidence: [`sprint-02-2-pre-exit-baseline-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-2-pre-exit-baseline-evidence.md).

### Sprint 02 explicit Cloudflare runtime — 7 August 2026

- The Lovable Vite wrapper is absent from Vite runtime configuration, declared dependencies, and
  the lockfile. Its then-inert `bunfig.toml` package-age exception was subsequently removed in Task
  2.5.
- The supported Cloudflare Vite plugin now produces `dist/client` and `dist/server/index.js`;
  `bun run preview`, development SSR, production build, and Wrangler dry-run all pass.
- Retained routes, redirects, assets, and error outcomes match the Task 2.2 baseline.
- The earlier TanStack, Rollup, directive, and Wrangler-override warnings are gone. A bounded
  upstream Node `punycode` deprecation remains in current Cloudflare tooling.
- MCP removal is Task 2.4; Lovable telemetry proof, dependency classification, and root Lovable
  metadata were assigned to Tasks 2.5–2.6. Task 2.8 subsequently verified hosted logs, environment
  roles, promotion, and rollback availability.

Evidence: [`sprint-02-3-cloudflare-runtime-ownership-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-3-cloudflare-runtime-ownership-evidence.md).

### Sprint 02 MCP removal — 7 August 2026

- The Lovable MCP SDK, Vite plugin, three tool definitions, protocol routes, OAuth metadata route,
  manifest, Model Context Protocol SDK dependency, and associated built output are absent.
- TanStack regenerated the route tree through supported build tooling. Development and production
  preview return ordinary HTML 404 responses for every removed MCP/OAuth path while retained routes,
  redirects, and assets preserve their established outcomes.
- The resolved install reduced from 575 installs across 724 packages to 490 across 643. The
  Wrangler dry-run upload reduced from 1,930.40 KiB to 912.65 KiB.
- TD-047 and TD-048 are Verified through removal of the duplicated claims surface and the approved
  gate requiring a new threat model and vendor-neutral boundary before any future MCP.
- Local telemetry/environment proof completed in Task 2.5; Task 2.8 subsequently verified hosted
  removal and no-telemetry evidence.

Evidence: [`sprint-02-4-mcp-removal-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-4-mcp-removal-evidence.md).

### Sprint 02 telemetry and dependency normalization — 7 August 2026

- Task 2.5 removed Lovable package-install exceptions, environment references, the SDK, telemetry
  URL, and virtual-asset references. Task 2.6 subsequently removed three overlooked historical
  package-cache URLs from the lockfile.
- Build-only Cloudflare, Tailwind, and Vite-path tooling is classified under `devDependencies`; six
  unused direct declarations were removed without broad version updates.
- Frozen install, TypeScript, build, and Wrangler dry-run pass with 456 installs across 566 packages.
- The full audit reduced from 41 to 31 findings. The production-filtered audit reports 24 findings;
  remaining coordinated remediation belongs to Sprint 04.
- TD-025, TD-027, and TD-049 are Verified.

Evidence: [`sprint-02-5-telemetry-dependency-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-5-telemetry-dependency-evidence.md).

### Sprint 02 Meneer metadata — 7 August 2026

- Root fallback metadata now uses approved Meneer identity and established “Back to your best”
  language. The unowned Lovable author and social-account values are removed.
- Existing page titles, descriptions, Open Graph overrides, canonicals, `noindex` directives, and
  visible error/not-found wording are preserved.
- Local rendered-head checks cover the homepage, peptides, gated journeys, policy routes, and an
  unknown route. Static source/build checks find no active Lovable application or author identity.
- Three historical Lovable package-cache source URLs were removed from `bun.lock` without changing
  package versions or integrity records; the frozen install passes.
- TD-041 is Verified. TD-042 retains the broader favicon, absolute canonical, social-image,
  robots, and sitemap work.

Evidence: [`sprint-02-6-meneer-metadata-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-6-meneer-metadata-evidence.md).

### Sprint 02 Cloudflare release boundary — 8 August 2026

- Repository configuration now names Worker `meneer-health`, pins Bun/Node expectations, enables
  public version previews and persisted invocation logs, and defines a secret-free environment
  contract.
- An owner-only runbook covers local/review/canonical environments, the temporary preview-video
  merge path, permanent `itws-I` handoff, post-deploy checks, logs, and immutable-version rollback.
- Cloudflare successfully rebuilt both branches with Bun 1.3.14 and Node 22.23.2. Production uses
  `bunx wrangler deploy` and serves version `ee3a151d-e25b-47b8-a036-c041a9225d13` at 100%.
  Non-production uses `bunx wrangler versions upload` and produced aliased version
  `641f728e-b460-4cd9-bbea-4448f98f7fba`.
- The canonical and workers.dev deployments serve approved Meneer metadata, retained routes and
  redirects, and ordinary HTML 404 responses for the removed MCP/OAuth paths.
- Canonical desktop/mobile browser, hydration, assets, routes, redirects, logs, cold-start smoke,
  and rollback availability pass. Cloudflare Fonts and automatic Web Analytics are disabled.
- TD-049, TD-052, and TD-053 are Verified. All seven Sprint 02 primary debt items are closed.

Evidence: [`sprint-02-8-verification-and-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-02-8-verification-and-closure-evidence.md).

### Sprint 04.1 repository-health baseline — 8 August 2026

- Frozen install confirms 456 installs across 566 packages without changing the lockfile.
- TypeScript, production build, and Wrangler dry-run pass. Lint fails with 21 formatting errors and
  reports 7 Fast Refresh warnings.
- The current full dependency audit reports 33 findings (17 high, 12 moderate, 4 low); the
  production-filtered audit reports 26 (11 high, 11 moderate, 4 low). Nine affected package
  families and their initial paths/reachability are inventoried for bounded Tasks 4.8–4.9.
- All 46 tracked `src/components/ui/` files have no product-source importer. Their 38 candidate
  direct dependencies and two support-only source files remain present until Task 4.3 removal and
  regression evidence.
- No test framework, test script, test file, or CI workflow exists. The root README, test/CI guide,
  vulnerability routing, contribution guide, and PR template remain missing; the decision index,
  environment template, `CODEOWNERS`, and Cloudflare runbook already exist.
- `bun.lock` and `src/routeTree.gen.ts` are the tracked generated artefacts. The latter still needs
  an explicit formatter/generation consistency policy.

Evidence: [`sprint-04-1-repository-health-baseline-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-1-repository-health-baseline-evidence.md).

### Sprint 04.3 UI-surface reduction — 8 August 2026

- All 46 unreachable UI primitives, two support-only files, stale shadcn configuration, and 38
  direct packages are removed. No product source or public wording changed.
- Frozen installation now checks 319 installs across 442 packages, down from 456 across 566.
- Generated CSS falls from 85.95 kB to 35.04 kB; product JavaScript and Worker modules remain
  unchanged because the removed packages were not bundled into reachable application code.
- Typecheck, production build, Wrangler dry-run, all active route responses, campaign redirects,
  retired MCP/OAuth 404s, and approved-message signatures pass.
- Rendered desktop checks across eight active pages show correct titles/headings, no horizontal
  overflow, no broken images, and no console warnings or errors.
- Lint retains the 21 formatting errors assigned to Task 4.4 but drops from 7 warnings to the single
  `src/router.tsx` warning assigned to Task 4.5. Audit counts remain 33 full and 26
  production-filtered findings for Tasks 4.8–4.9.

Evidence: [`sprint-04-3-ui-surface-reduction-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-3-ui-surface-reduction-evidence.md).

### Sprint 04.4 formatting baseline — 9 August 2026

- Prettier mechanically formats nine live source/style files and one historical audit document.
- Public strings, JSX structure, routes, runtime configuration, dependencies, lockfile, and
  generated route output are unchanged. CSS edits are formatting plus equivalent decimal spelling.
- `bun run format:check`, `bun run lint`, typecheck, production build, and Wrangler dry-run pass.
  Lint retains one non-blocking `src/router.tsx` Fast Refresh warning for Task 4.5.
- The generated client CSS, main client JavaScript, Worker entry, module count, and asset count match
  the Task 4.3 baseline, supporting the no-behaviour-change boundary.

Evidence: [`sprint-04-4-formatting-baseline-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-4-formatting-baseline-evidence.md).

### Sprint 04.5 lint and unused-code baseline — 9 August 2026

- The default error component moves from `src/router.tsx` into a component-only module, clearing the
  final Fast Refresh warning without changing its markup, wording, retry, or home actions.
- TypeScript now rejects unused locals and parameters. ESLint treats unused variables as errors and
  excludes only the generated route tree at configuration level.
- `StartFlow` and `PeptidesPage` remain preserved, unreachable prototypes behind the active gates;
  their declarations carry narrow compiler and linter exceptions explaining that boundary.
- One unused derived activation flag is removed. The compliance profile and canonical campaign
  origin remain used internally but are no longer exported without consumers.
- Frozen install, formatting, lint, typecheck, production build, Wrangler dry-run, active routes,
  campaign redirects, retired/unknown 404s, and approved-message signatures pass.

Evidence: [`sprint-04-5-lint-unused-code-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-5-lint-unused-code-evidence.md).

### Sprint 04.6 test foundation — 9 August 2026

- A dedicated Vitest 4/jsdom configuration avoids loading the Cloudflare Worker plugin during unit
  tests while retaining React and TypeScript-path handling.
- `bun run test`, `test:watch`, and `test:coverage` are available. Six files contain 11 passing
  unit/component/integration tests with automatic DOM cleanup and no console noise.
- Tests cover campaign configuration and 307 attribution redirects, activation blockers,
  non-transactional/no-false-success gates, emergency links, mobile-menu state, and error recovery.
- Test fixtures use synthetic content and a reserved `.invalid` origin; coverage output is ignored.
  Risk-based expectations are recorded without treating a global percentage as a release signal.
- Frozen install now checks 418 installs across 538 package records. Full and
  production-filtered audit totals remain 33 and 26; test-only Vite/Undici paths are recorded for
  Tasks 4.8–4.9.
- Formatting, lint, typecheck, tests, coverage execution, production build, and Wrangler dry-run
  pass. The generated route tree and production bundle topology remain unchanged.

Evidence: [`sprint-04-6-test-foundation-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-6-test-foundation-evidence.md).

### Sprint 04.7 browser and accessibility baseline — 9 August 2026

- Playwright owns an isolated local server and managed Chromium profiles for 1440 x 900 desktop and
  Pixel 7 mobile verification. Failure-only artifacts are ignored and browser video is disabled.
- Forty-eight checks pass across eight active routes, four ordinary 404 boundaries, two exact 307
  campaign redirects, inactive gates, responsive navigation, rendering health, and automated WCAG
  A/AA axe rules.
- Task 4.7 corrected four repeated accessibility findings without changing public wording: inline
  legal/support links are always underlined, and the gated support button uses the existing
  contrast-safe foreground token.
- Frozen install now checks 424 installs across 544 package records. Full and production-filtered
  audit totals remain 33 and 26; Playwright and axe are test-only additions.
- Automated accessibility checks supplement rather than replace manual keyboard and
  assistive-technology review. Task 4.10 declares the suite in CI; hosted proof remains Task 4.12.

Evidence: [`sprint-04-7-browser-accessibility-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-7-browser-accessibility-evidence.md).

### Sprint 04.8 production advisory remediation — 9 August 2026

- Bounded compatible updates and exact reviewed security overrides clear all 26 findings from
  `bun audit --prod`; the full audit falls from 33 findings to seven.
- TanStack Start is pinned to 1.167.65, its server core resolves to 1.167.30, and Vite is unified on
  7.3.6. Affected PostCSS, nanoid, Undici, Babel, esbuild, js-yaml, and optional tsx versions are
  upgraded or eliminated without adding or removing a direct package.
- The remaining six high and one moderate findings are all `brace-expansion@5.0.5` through the
  lint-only TypeScript-ESLint path. They are absent from the production-filtered audit and remain
  assigned to Task 4.9.
- Frozen install checks 482 installs across 524 packages. Format, lint, typecheck, 11 Vitest tests,
  production build, Wrangler dry-run, and all 48 Playwright/axe checks pass.
- Application source, public wording, and the generated route tree are unchanged. Tasks 4.9–4.10
  subsequently clear the tooling path and declare CI policy; hosted proof remains Task 4.12.

Evidence: [`sprint-04-8-production-advisory-remediation-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-8-production-advisory-remediation-evidence.md).

### Sprint 04.9 tooling advisory remediation — 9 August 2026

- The final seven full-audit findings are removed by refreshing the two existing
  `brace-expansion` lockfile branches within their parents' declared ranges: 1.1.14 to 1.1.18 for
  `minimatch@3`, and 5.0.5 to 5.0.9 for `minimatch@10`.
- Full and production-filtered `bun audit` now report no vulnerabilities. No security exception,
  parent-tool upgrade, broad update command, or manifest override is required.
- A global 5.x override was rejected during review because it would have forced the legacy
  `minimatch@3` path outside `^1.1.7`; that incompatible intermediate state is not retained.
- Frozen install, format, lint, typecheck, 11 Vitest tests, production build, Wrangler dry-run, and
  all 48 Playwright/axe checks pass. Application source, public wording, direct dependencies, and
  the generated route tree are unchanged.
- Task 4.10 subsequently declares both clean audit gates in CI; hosted proof remains Task 4.12.

Evidence: [`sprint-04-9-tooling-advisory-remediation-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-9-tooling-advisory-remediation-evidence.md).

### Sprint 04.10 CI policy — 9 August 2026

- `.github/workflows/ci.yml` adds one read-only validation job for pull requests, manual dispatch,
  and pushes to `main`, `itws-I`, and `itws-I-preview`; it contains no deploy or promotion action.
- Node follows `.node-version`, Bun is pinned to 1.3.14, installation is frozen, and local package
  scripts own format, lint, typecheck, test, full/production audit, build, generated-route, dry-run,
  and browser commands.
- CI installs only Chromium plus its Linux dependencies, keeps one worker, and uploads ignored
  synthetic Playwright evidence only on failure for seven days.
- Workflow YAML parsing and the complete command sequence pass locally, including 11 Vitest tests,
  both zero-finding audits, unchanged generated routes, Cloudflare dry-run, and 48 CI-mode
  Playwright/axe checks.
- Hosted success, controlled failure, and repository required-check/merge-control evidence remain
  Task 4.12; related debt therefore remains In progress.

Evidence: [`sprint-04-10-ci-policy-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-10-ci-policy-evidence.md).

### Sprint 04.11 contributor operations — 9 August 2026

- Root README, contribution, and security documents now state the actual non-transactional product
  boundary and route contributors to the blueprint, current state, debt registry, approved
  decisions, environment contract, CI, and Cloudflare release runbook.
- The testing/CI guide defines command ownership, sequential build use, safe synthetic fixtures,
  ignored/failure-only artifacts, hosted workflow behaviour, and failure triage.
- The PR template requires outcome, plan/debt evidence, sensitive-domain review, dependency/config/
  migration/generated/runtime effects, exact validation, rollback, and visual evidence.
- A structured bug form requires synthetic reproduction and no-PHI/no-secret confirmation while
  directing vulnerability reports to the private security process.
- Formatting, YAML/schema parsing, local-link checks, the full quality/test/build/dry-run/browser
  matrix, both audits, and generated-route consistency pass without application or runtime changes.
- TD-030 and TD-031 remain In progress until Task 4.12 proves clean-checkout usability and hosted
  template rendering.

Evidence: [`sprint-04-11-contributor-operations-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-11-contributor-operations-evidence.md).

### Sprint 04.12 local closure proof — 9 August 2026

- A no-hard-link clone of committed HEAD `8b23428` installs deterministically with Bun 1.3.14 and
  passes format, lint, typecheck, 11 Vitest tests, both zero-finding audits, build, generated-route
  consistency, Cloudflare dry-run, and all 48 CI-mode Playwright/axe checks.
- The checkout remains clean after validation. A synthetic TypeScript stdin fixture is rejected by
  the configured unused-variable rule with exit code 1, proving the local gate detects a controlled
  failure without adding a repository file.
- Hosted `itws-I` now matches local commit `b6331bd`. GitHub run `31324807644` completed
  `Repository validation` successfully in 2m29s with no artifact; the overall run took 2m33s.
- The stale `main` branch remains the GitHub default.
- GitHub activates issue and pull-request templates only from the default branch. An `itws-I` push
  alone can trigger its CI workflow but cannot complete template-rendering acceptance.
- Task 4.12 and Sprint 04 therefore remain open for hosted controlled-failure rejection,
  default/source-branch alignment or equivalent merge, rendered templates, and required-check proof.

Evidence: [`sprint-04-12-closure-evidence.md`](../02-implementation-plans/phase-01/annexures/sprint-04-12-closure-evidence.md).

## Highest-Risk Gaps

- Durable account, consent, questionnaire, and completion capabilities are absent; their former
  false-success paths are contained behind inactive routes.
- Transactional policies, consent, secure support, and incident procedures remain activation work.
- Unresolved peptide offering and contradictory positioning.
- The operating model and logical backend/state boundaries are approved, but no backend, identity,
  database, authorisation, audit, retention, observability, or incident process is implemented.
- Final media/branding, campaign print-production QA, navigation defects, and accessibility gaps.
- Unit/component/integration and controlled browser/accessibility tests pass from a clean clone and
  in hosted CI. The workflow has not yet been deliberately failed or required on GitHub.

Use the technical-debt registry for the complete IDs, priorities, and acceptance evidence. Do not infer that a gap has closed until its registry item is marked `Verified` with linked evidence.
