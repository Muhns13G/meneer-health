---
artifact_id: phase-01-sprint-01-8-safety-campaign-continuation-evidence
title: Sprint 01.8 Safety and Campaign Continuation Evidence
status: verified-local-implementation
verified: 2026-08-07
related_debt: [TD-008, TD-034]
td_008_status: verified-disabled-outcome
td_034_status: in-progress
owner: "@Muhns13G"
---

# Sprint 01.8 — Safety and Campaign Continuation Evidence

## Purpose and Boundary

This annexure records the post-closure implementation completed for TD-008 and TD-034. It proves a
safe local engineering boundary; it does not represent placeholder professional details as verified,
approve health-information collection, or certify the posters for physical distribution.

## Owner-Confirmed Inputs

- The canonical public origin is `https://meneerhealth.co.za`.
- Both Father's Day poster concepts may proceed to internal print-proof status.
- Stable campaign paths are `/go/dads` and `/go/thanks-dad`.
- Both campaigns redirect to `/start` with offline-poster UTM attribution.
- OCTOTHORP ZA, enterprise number `K2024185008`, is the provisional operator supplied by the owner.
- Peptides are the initial transactional cohort; other treatment information remains public.
- Precise Wellness is the intended questionnaire and dispensing partner, but its exact legal identity,
  Y-number, and responsible pharmacist are not yet evidenced.
- `support@meneerhealth.co.za` is general support, not an urgent clinical channel.

## Safety Boundary Implemented

`/start` now renders a universal entry boundary that:

- collects no health information;
- tells users not to continue with an online consultation during an emergency;
- provides South African mobile emergency (`112`) and ambulance (`10177`) telephone links;
- states that age, location, condition-specific exclusions, consent, and triage must pass before
  treatment or fulfilment;
- identifies peptides as the initial transactional cohort without describing them as coming soon;
- prevents general email support from being mistaken for urgent clinical care; and
- reports activation blockers derived from a centralized compliance profile.

The profile contains unmistakable development fixtures: `Dr John Doe`, `HPCSA-PLACEHOLDER`,
`Jane Doe`, and `Y-NUMBER-PLACEHOLDER`. These values are not rendered as registrations. Activation
remains fail-closed until verified clinician, pharmacy, and urgent-channel values replace them.

TD-008 is **Verified through a disabled-capability outcome**. No condition transaction is enabled,
so no user can bypass the safety boundary and enter routine consultation or fulfilment. This closes
the present unsafe-entry debt without approving activation. Before any condition flow is enabled,
replace the fixtures, obtain accountable clinical approval of its minimum-age, location, red-flag,
contraindication, exclusion, and escalation matrix, enforce those rules server-side, and repeat the
browser/server verification.

## Campaign Boundary Implemented

The repository now contains:

| Campaign   | Stable URL                                 | Attributed destination                                                | QR assets               |
| ---------- | ------------------------------------------ | --------------------------------------------------------------------- | ----------------------- |
| Dads       | `https://meneerhealth.co.za/go/dads`       | `/start?utm_source=offline&utm_medium=poster&utm_campaign=dads`       | SVG and 1200 x 1200 PNG |
| Thanks Dad | `https://meneerhealth.co.za/go/thanks-dad` | `/start?utm_source=offline&utm_medium=poster&utm_campaign=thanks_dad` | SVG and 1200 x 1200 PNG |

Both redirect routes return a temporary redirect and preserve attribution. Poster concepts use the
local brand mark, local QR assets, human-readable fallback URLs, `noindex, nofollow`, and an explicit
`Internal print proof · not for distribution` label. They remain behind
`VITE_CAMPAIGN_PRINT_PROOF=true`; the default build retains the inactive route gate.

TD-034 was initially **in progress** at this local boundary. On 7 August 2026,
`meneerhealth.co.za` was connected to the `itws-I-preview` Cloudflare deployment. Hosted checks
confirmed both stable routes return the approved attributed 307 redirects and both gated `/start`
destinations return HTTP 200. The owner confirmed successful QR scans and accepted the current
gated `/start` page as the campaign destination while that journey is improved in later sprints.
TD-034 is therefore **Verified**. Final A1 production/material QA remains mandatory before physical
distribution, but is a release checklist obligation rather than unresolved implementation debt.

## Local Verification

| Check                                                | Result                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| `bunx tsc --noEmit`                                  | Pass                                                              |
| Default `bun run build`                              | Pass; poster proofs remain disabled                               |
| `VITE_CAMPAIGN_PRINT_PROOF=true bun run build`       | Pass                                                              |
| Focused ESLint on changed TS/TSX                     | Pass                                                              |
| `/go/dads` and `/go/thanks-dad` browser redirects    | Pass; attributed `/start` URL preserved                           |
| `/start` at 390 x 844                                | Pass; no horizontal overflow; emergency and support links present |
| Both posters at 371 x 792, 390 x 844, and 1440 x 900 | Pass; local logo/QR load and no horizontal overflow               |
| Browser console                                      | No errors or warnings on verified routes                          |
| QR scan                                              | Pass; owner confirmed both codes resolve to the canonical routes  |
| Final A1 production/material QA                      | Required before distribution; tracked as a release checklist      |

## Hosted Campaign Closure Evidence — 2026-08-07

| Check                                      | Result                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `https://meneerhealth.co.za/go/dads`       | HTTP 307 to the approved attributed `/start` destination               |
| `https://meneerhealth.co.za/go/thanks-dad` | HTTP 307 to the approved attributed `/start` destination               |
| Both attributed `/start` destinations      | HTTP 200; the intentional non-transactional safety gate remains active |
| QR scan                                    | Owner-confirmed successful resolution and redirect                     |

### TD-008 closure retest — 2026-08-07

| Boundary                      | Result                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev server                    | `bun run dev` started successfully at `127.0.0.1:8080`; no runtime error was emitted during requests                                                                   |
| Homepage acquisition          | HTTP 200; eight `/start` links and two `/peptides` links converge on gated routes; no form or input exists                                                             |
| Direct `/start`               | HTTP 200; emergency, ambulance, general-support, restricted-cohort, and no-health-information guidance rendered                                                        |
| Campaign-attributed `/start`  | HTTP 200 with the same safety boundary                                                                                                                                 |
| `/peptides`                   | HTTP 200; explicit gated pathway; no form, input, select, or textarea exists                                                                                           |
| Preserved prototype isolation | No consent screen, confirmation state, or placeholder professional identity appears in rendered HTML                                                                   |
| Campaign entry                | Both `/go/...` routes return 307 to attributed `/start` destinations                                                                                                   |
| Browser layer                 | Existing Sprint 01.8 responsive/console evidence remains applicable; browser control was unavailable for this HTTP retest and no affected route code changed afterward |

There is no client-to-API, API-to-data, or data-to-response boundary for TD-008 because the active
experience is deliberately non-transactional. Reopening a transaction invalidates this disabled
outcome and requires the replacement controls above before release.

## Release Rule

Development placeholders may be committed because they are explicit, centralized, and fail closed.
They must be replaced with verified values and reviewed evidence before pilot activation. No code or
document may reinterpret this implementation as legal, clinical, pharmacy, or launch approval.
