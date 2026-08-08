---
rag_id: meneer-current-state
title: Meneer v1 Verified Current State
status: current
authority: observed-summary
last_updated: 2026-08-08
audience: internal
sensitivity: internal
source_baseline: ce2bcdf2010e226149c95779f2ea71bc393521f0
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

## Technology

- Bun 1.3.x package management with `bun.lock`; the current package-manager pin is 1.3.14.
- Node 22.x build tooling is supported and Cloudflare Builds is pinned through `.node-version`;
  deployed code runs on `workerd` with `nodejs_compat`, not a general Node.js process.
- React 19, TypeScript strict mode, TanStack Start/Router, Vite, Tailwind CSS, and Cloudflare
  Workers.
- Explicit Cloudflare Vite, TanStack Start, React, Tailwind, and TypeScript-path configuration.
- Cloudflare is the approved v1 host. The Lovable Vite wrapper and MCP package have been removed.
- Radix/shadcn-style primitives, most of which are unused by product routes.

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

## Highest-Risk Gaps

- Durable account, consent, questionnaire, and completion capabilities are absent; their former
  false-success paths are contained behind inactive routes.
- Transactional policies, consent, secure support, and incident procedures remain activation work.
- Unresolved peptide offering and contradictory positioning.
- The operating model and logical backend/state boundaries are approved, but no backend, identity,
  database, authorisation, audit, retention, observability, or incident process is implemented.
- Final media/branding, campaign print-production QA, navigation defects, and accessibility gaps.
- No automated tests or CI; lint and dependency gates fail.

Use the technical-debt registry for the complete IDs, priorities, and acceptance evidence. Do not infer that a gap has closed until its registry item is marked `Verified` with linked evidence.
