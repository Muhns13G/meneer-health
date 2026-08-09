---
artifact_id: phase-01-sprint-01-2-gate-evidence
title: Sprint 01.2 Incomplete Journey Gate Evidence
status: verified-task-evidence
authority: observed
last_updated: 2026-08-06
source_parent: f1e45c7
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Sprint 01.2 Incomplete Journey Gate Evidence

## Outcome

The incomplete `/start`, `/peptides`, `/poster`, and `/poster-thanks` experiences are no longer
customer-operable. Each route renders an explicit non-transactional gate with a home recovery link.
The previous prototypes remain in their original source files for replacement comparison and future
cutover; they are not exported or rendered by the active routes.

No account, consent, profile, password, questionnaire, payment, order, external partner redirect,
campaign scan, or success state is available from the gated pages.

## Implementation

- `src/components/PilotRouteGate.tsx` provides the shared accessible gate presentation.
- `src/routes/start.tsx` renders the restricted-pilot gate and preserves `StartFlow`.
- `src/routes/peptides.tsx` renders the no-data peptide gate and preserves `PeptidesPage`.
- Both poster routes render inactive-campaign gates and preserve their printable concepts.
- All four routes publish `noindex, nofollow` metadata and truthful route-specific titles and
  descriptions.

The production build produced small active chunks for the gated routes, showing that the preserved
prototype bodies are not shipped as the active customer experience.

## Automated Validation

| Check                    | Result                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `bunx tsc --noEmit`      | Pass                                                                                            |
| `bun run build`          | Pass; previously recorded Nitro/Rollup/Cloudflare warnings remain                               |
| `bun run lint`           | Known baseline failure: 33 Prettier errors and 7 Fast Refresh warnings outside the edited files |
| Prettier on edited files | Pass                                                                                            |
| `git diff --check`       | Pass                                                                                            |

No changed file produced a lint error or warning. This task does not claim to close the repository's
lint debt; Sprint 04 retains that responsibility.

## Browser Evidence

The local Vite server was checked in the visible in-app browser at 1440×900 and 390×844.

| Route            | Heading                                         | Forms/inputs/buttons | Disallowed surface                                                           | Result |
| ---------------- | ----------------------------------------------- | -------------------- | ---------------------------------------------------------------------------- | ------ |
| `/start`         | “Private pilot access is currently restricted.” | `0 / 0 / 0`          | No consent, account, questionnaire, payment, order, or confirmation          | Pass   |
| `/peptides`      | “Peptide access is currently gated.”            | `0 / 0 / 0`          | No profile, password, acknowledgement, video, or external questionnaire link | Pass   |
| `/poster`        | “This campaign is not currently active.”        | `0 / 0 / 0`          | No QR placeholder, attribution, registration, or submission                  | Pass   |
| `/poster-thanks` | “This campaign is not currently active.”        | `0 / 0 / 0`          | No QR placeholder, attribution, registration, or submission                  | Pass   |

All routes contained meaningful content, had no Vite error overlay, emitted no browser error or
warning logs, exposed no external links, and included `noindex, nofollow`. `/start` had no horizontal
overflow at either viewport, and its `Back to home` action returned to `/` successfully.

## Residual Boundaries

- This task implements a closed gate, not cohort authentication or a real patient journey.
- Public homepage, legal/support, claims, navigation, logo, media, and MCP remediation remain in
  their assigned Sprint 1 or later boundaries.
- The gated routes must not be activated by a flag or route-component switch alone. Activation still
  requires the approved data, identity, clinical/legal, support, operational, monitoring, and
  incident controls documented in the route disposition.
- Technical-debt items remain open until their complete acceptance evidence is independently checked.
