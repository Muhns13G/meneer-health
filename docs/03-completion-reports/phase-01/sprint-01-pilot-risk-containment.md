---
report_id: phase-01-sprint-01-completion
title: Sprint 01 Pilot Risk Containment Completion Report
status: verified-completion
completed: 2026-08-07
implementation_baseline: c62b16d
permanent_boundary: b9997d8b50395fde62524f8777c0aa672acbb9fc
owner: "@Muhns13G"
---

# Sprint 01 — Pilot Risk Containment Completion Report

## Mission and Outcome

Sprint 01 aimed to make public and pilot-facing surfaces truthful and safe, define the controlled
pilot boundary, and prevent incomplete journeys from presenting false success. The sprint is
complete as a **verified engineering containment boundary**: active routes cannot create simulated
accounts, capture placeholder consent, submit empty questionnaires, claim durable completion, or
expose unfinished peptide and campaign transactions.

This outcome does **not** approve pilot activation, hosted release, health-information collection,
or public launch. The operating, clinical, legal/privacy, partner, safety, and release inputs needed
to activate real transactions remain open.

## Work Completed

| Task | Delivered outcome                                                                                                                                                   | Evidence / boundary                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 01.1 | Inventoried public CTAs, forms, routes, and hand-offs; approved a preserve-disable-replace disposition.                                                             | `2ca211d`; route-disposition annexure      |
| 01.2 | Added a reusable inactive-route gate to `/start`, `/peptides`, `/poster`, and `/poster-thanks`; preserved prototypes for controlled replacement.                    | `3c1ff01`; Sprint 01.2 evidence            |
| 01.3 | Verified that active routes expose no simulated password/account or placeholder-consent controls.                                                                   | `b8591b0`; Sprint 01.3 evidence            |
| 01.4 | Verified that active routes expose no empty questionnaire submission or local-only success state.                                                                   | `83ad1eb`; Sprint 01.4 evidence            |
| 01.5 | Corrected the support address, aligned MCP peptide positioning, created a claims/evidence register, and preserved established public wording and metadata.          | `308e175`; Sprint 01.5 evidence            |
| 01.6 | Replaced the broken Lovable logo dependency with an approved local placeholder, retained poster gates, and established an isolated draft-video review path.         | `b9997d8`; Sprint 01.6 evidence            |
| 01.7 | Re-ran closure validation, reconciled the plan, registry, RAG corpus, decisions, residual debt, and file inventory.                                                 | This report                                |
| 01.8 | Added a fail-closed safety-entry boundary, centralized compliance fixtures, stable attributed campaign redirects, real local QR assets, and internal poster proofs. | Sprint 01.8 evidence; uncommitted boundary |

## Decisions Recorded

- Public marketing remains open; transactional pilot access is restricted and must use real,
  durable operations rather than mocks.
- Peptides are the first intended rollout product. Their transaction remains gated pending verified
  Precise Wellness, product, questionnaire, data-transfer, dispensing, safety, and escalation evidence;
  this is not presented as “coming soon.”
- Established customer-facing messaging and metadata are retained unless demonstrably false, unsafe,
  or incompatible with the approved operating model. Evidence gaps belong in the claim register.
- `support@meneerhealth.co.za` is the intended general channel, but monitoring, ownership, service
  expectations, privacy handling, and escalation remain unverified.
- The company-approved archived mark is the v1 placeholder; the dark theme remains unchanged and
  final identity work is deferred under FC-002.
- The unapproved 6.7 MB video is allowed only as a labelled, non-transactional review asset on
  `itws-I-preview`; it remains outside permanent `itws-I` history.
- The earlier Vercel preference is reopened. Cloudflare versus Vercel must be decided before Sprint
  02, then that implementation plan must be refreshed.
- Sprint closure now requires this report structure plus synchronized plan, debt, RAG, and index
  updates for every future sprint.
- `meneerhealth.co.za` is the canonical campaign origin. Both Father's Day concepts use stable
  `/go/...` paths and offline-poster attribution before reaching `/start`.
- OCTOTHORP ZA (`K2024185008`) is the provisional operator supplied by the owner. John/Jane Doe and
  professional-registration strings are development fixtures only and keep activation blocked.
- General email is not an urgent clinical service. The interim entry boundary uses 112 and 10177;
  the monitored clinical telephone or WhatsApp channel remains to be verified.

## Deviations from the Implementation Plan

| Planned expectation                                                                         | Actual disposition and reason                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Define approved pilot participants, operations, measures, stop criteria, and exit criteria. | Inputs were not available. Transactional surfaces were safely disabled; TD-056 remains decision-required.                                                                                                              |
| Implement or approve safety entry, exclusion, and emergency routing for enabled flows.      | No clinical flow was enabled. Containment prevents unsafe collection, but TD-008 remains open before activation.                                                                                                       |
| Publish fully evidenced claims, policies, partners, and peptide pathway.                    | Customer wording was preserved and evidence gaps were registered after owner feedback showed broad rewrites would damage approved messaging. TD-005–TD-007 remain open.                                                |
| Supply final optimised brand and production-equivalent asset evidence.                      | An approved raster placeholder was used without redesigning the theme. Hosted verification and final identity remain under TD-032/FC-002.                                                                              |
| Hide media until final approval.                                                            | Owner approved a draft review presentation on an isolated preview branch. It is labelled non-transactional and still requires approval, poster, captions, transcript, manual playback, and hosted checks under TD-033. |
| Replace and print-test campaign QR destinations.                                            | Stable canonical routes, attributed redirects, QR assets, and internal print proofs are now implemented. Deployed-domain checks and physical A1 scan evidence remain under TD-034.                                     |
| Approve safety entry and emergency routing for enabled flows.                               | A universal fail-closed entry boundary is implemented. Condition-specific clinical rules and server enforcement remain under TD-008 because development fixtures cannot supply domain approval.                        |
| Verify on Vercel preview/production.                                                        | Hosting was deliberately deferred for a Cloudflare-versus-Vercel decision before Sprint 02. Sprint 01 closure uses local build and browser evidence only.                                                              |

## Validation Results

| Check                         | Result                  | Notes                                                                                                                 |
| ----------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `bunx tsc --noEmit`           | Pass                    | Re-run 2026-08-07.                                                                                                    |
| `bun run build`               | Pass                    | Client, SSR, and Cloudflare-oriented Nitro output built; known adapter/bundler warnings remain.                       |
| `bun run lint`                | Fail                    | 32 Prettier errors and 7 Fast Refresh warnings; retained as existing Sprint 04 repository-health debt.                |
| Desktop/mobile browser checks | Pass within local scope | Homepage, logo, gated routes, media review, responsive layout, console, and overflow checks completed.                |
| Draft video                   | Partial                 | Decode, first-frame, native-control, MIME, and response checks passed; manual playback and hosted checks remain open. |
| Automated tests / CI          | Not available           | No test runner or CI workflow is configured.                                                                          |
| Hosted preview/production     | Not run                 | Awaiting the pre-Sprint-02 hosting decision.                                                                          |

## Lessons Learned

- A disabled outcome can validly close containment work without pretending the underlying product
  capability exists.
- Browser and network evidence are necessary; source inspection alone cannot prove rendered asset,
  responsive, media, or false-submission behaviour.
- Public messaging is a governed product asset. Claims remediation should begin with an evidence
  register and targeted corrections, not broad copy replacement.
- Branch isolation is useful for temporary large or unapproved media, provided permanent and preview
  boundaries are documented explicitly.
- Engineering completion, pilot readiness, hosted verification, and domain approval are separate
  gates and must be reported separately.

## Technical Debt Reconciliation

No new numbered debt item was introduced by the final implementation. Sprint work refined evidence
and acceptance boundaries for existing items:

| Debt          | Closure position                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| TD-001–TD-004 | Verified through disabled-capability containment; durable replacement systems do not yet exist.                                           |
| TD-005–TD-007 | Open; policies/support operations, claims approvals, and peptide evidence remain required.                                                |
| TD-008        | In progress; universal emergency/entry containment exists, but verified parties, condition rules, and server enforcement remain required. |
| TD-032–TD-033 | Open; selected-host logo evidence and final accessible media remain required.                                                             |
| TD-034        | In progress; canonical QR/redirect/proof implementation exists, but deployed-domain and physical A1 scan evidence remain required.        |
| TD-056        | Decision required; the signed pilot scope, operating model, measures, incident path, and exit criteria do not exist.                      |

The raster placeholder/theme limitation is tracked in FC-002. The preview-only video binary and
approval/accessibility work remain contained by TD-033 rather than creating a duplicate ID. The
reopened hosting decision is now explicit in TD-052 and ARC-007.

## Existing Files Modified or Deleted

| File                                                                               | Change                                                                               |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `docs/00-blueprints/master-blueprint-v1.md`                                        | Reconciled the authoritative strategy with the reopened v1 hosting decision.         |
| `docs/02-implementation-plans/phase-01/README.md`                                  | Updated delivery rules, Sprint 02 direction, and recurring closure artefacts.        |
| `docs/02-implementation-plans/phase-01/sprint-01-pilot-risk-containment.md`        | Added evidence, owner decisions, completed tasks, and closure status.                |
| `docs/02-implementation-plans/phase-01/sprint-02-lovable-exit-vercel-migration.md` | Marked requires-refresh pending host selection.                                      |
| `docs/04-technical-debt/technical-debt-registry-v1.md`                             | Reconciled Sprint 01 statuses/evidence and reopened host-specific TD-052 acceptance. |
| `docs/RAG/00-governance.md`                                                        | Added the mandatory recurring sprint-closure protocol.                               |
| `docs/RAG/01-project-context.md`                                                   | Recorded Sprint 01 closure and open hosting decision.                                |
| `docs/RAG/02-current-state.md`                                                     | Replaced stale route/current-state descriptions with verified containment state.     |
| `docs/RAG/03-platform-evolution.md`                                                | Made v1 hosting provider-neutral pending decision.                                   |
| `docs/RAG/04-domain-glossary.md`                                                   | Added closure terminology and current v1 definition.                                 |
| `docs/RAG/05-decision-register.md`                                                 | Recorded messaging, asset, preview, hosting, and closure-protocol decisions.         |
| `docs/RAG/06-known-limitations.md`                                                 | Updated capability, platform, validation, and release limits.                        |
| `docs/RAG/07-index.json`                                                           | Added closure routing and synchronized document status metadata.                     |
| `src/assets/meneer-logo.png.asset.json`                                            | Deleted obsolete Lovable virtual-asset metadata after local replacement.             |
| `src/components/Footer.tsx`                                                        | Replaced the broken shared logo reference.                                           |
| `src/components/Nav.tsx`                                                           | Replaced the broken shared logo reference.                                           |
| `src/lib/mcp/tools/list-treatments.ts`                                             | Aligned peptides with the intended first-rollout position.                           |
| `src/routes/contact.tsx`                                                           | Corrected the general support address without claiming operational verification.     |
| `src/routes/peptides.tsx`                                                          | Gated the transaction and added the permanent media-review configuration boundary.   |
| `src/routes/poster-thanks.tsx`                                                     | Replaced false campaign completion with an inactive gate.                            |
| `src/routes/poster.tsx`                                                            | Replaced placeholder QR interaction with an inactive gate.                           |
| `src/routes/start.tsx`                                                             | Replaced simulated account/consent/intake submission with an inactive gate.          |
| `src/routeTree.gen.ts`                                                             | Regenerated route metadata for the two stable campaign redirects.                    |

## Files Created

| File                                                                                                   | Purpose                                                         |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `docs/02-implementation-plans/phase-01/annexures/sprint-01-pilot-route-disposition.md`                 | Approved route and hand-off disposition.                        |
| `docs/02-implementation-plans/phase-01/annexures/sprint-01-2-incomplete-journey-gate-evidence.md`      | Gate implementation/browser evidence.                           |
| `docs/02-implementation-plans/phase-01/annexures/sprint-01-3-account-consent-containment-evidence.md`  | Account and consent containment evidence.                       |
| `docs/02-implementation-plans/phase-01/annexures/sprint-01-4-false-success-containment-evidence.md`    | Submission and questionnaire containment evidence.              |
| `docs/02-implementation-plans/phase-01/annexures/sprint-01-5-claims-support-evidence.md`               | Claims, support, metadata, and peptide evidence register.       |
| `docs/02-implementation-plans/phase-01/annexures/sprint-01-6-acquisition-assets-evidence.md`           | Logo, media, poster, responsive, and branch evidence.           |
| `docs/03-completion-reports/phase-01/sprint-01-pilot-risk-containment.md`                              | Authoritative Sprint 01 closure record.                         |
| `docs/05-future-considerations/brand-identity-theme-evolution.md`                                      | Deferred final identity and theme considerations (FC-002).      |
| `src/assets/brand/meneer-mark.png`                                                                     | Company-approved v1 placeholder mark.                           |
| `src/components/PilotRouteGate.tsx`                                                                    | Reusable non-transactional route boundary.                      |
| `docs/02-implementation-plans/phase-01/annexures/sprint-01-8-safety-campaign-continuation-evidence.md` | Safety/campaign implementation and acceptance boundary.         |
| `public/campaigns/qr/dads.svg` and `dads.png`                                                          | Canonical Dads campaign QR assets.                              |
| `public/campaigns/qr/thanks-dad.svg` and `thanks-dad.png`                                              | Canonical Thanks Dad campaign QR assets.                        |
| `src/components/SafetyEntryGate.tsx`                                                                   | Fail-closed universal pilot entry and emergency boundary.       |
| `src/lib/campaigns.ts`                                                                                 | Canonical campaign URLs, destinations, and attribution.         |
| `src/lib/compliance/pilot-profile.ts`                                                                  | Centralized owner-confirmed and placeholder activation profile. |
| `src/routes/go/dads.tsx`                                                                               | Stable attributed Dads redirect.                                |
| `src/routes/go/thanks-dad.tsx`                                                                         | Stable attributed Thanks Dad redirect.                          |

### Preview-Only Branch Artefacts

| File                                                | Branch action                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `public/media/peptides/peptide-explainer-draft.mp4` | Created only on `itws-I-preview`; temporary 6.7 MB review binary.  |
| `src/routes/peptides.tsx`                           | Modified on `itws-I-preview` to bind the isolated draft video URL. |

## Final Release Statement

Sprint 01 is **closed**. The public marketing and local containment boundary is verified, but the
v1 pilot remains **not approved for activation**. Before Sprint 02 implementation, select the v1
host and refresh the platform-exit plan. Before any transactional pilot route is enabled, satisfy
the outstanding Sprint 01 debt and its domain approvals. The post-closure TD-008/TD-034 work is
implemented locally and acceptance-gated as recorded in the Sprint 01.8 annexure.
