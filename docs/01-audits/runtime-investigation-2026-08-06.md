# Meneer Pre-Phase 1 Runtime Investigation

## Investigation Record

- **Date:** 2026-08-06
- **Source baseline:** `aaab9d1b31bf31f062a0b2d336cbcbde13e46911`
- **Environment:** Bun 1.3.14, local Vite development server, isolated Chrome engine, and a
  second visible user-Chrome session
- **Viewports:** 1440×900 desktop, 390×844 mobile, and 794×1123 poster review
- **Scope:** Routes, navigation, intake and peptide journeys, responsive rendering, browser
  console/network activity, MCP endpoints, typecheck, lint, and production build
- **Safety:** Only synthetic `.invalid` data was entered. No external questionnaire was opened,
  and no source code, remote, deployment, or third-party system was changed.

## Executive Result

The application starts and renders reliably, its homepage is visually credible, and its public MCP
transport responds correctly. However, the runtime investigation reproduces the stop-ship findings
already recorded in the technical-debt registry. The current build is suitable as a design and
workflow prototype only; it must not be presented as a functioning patient or clinical system.

No unplanned debt category was discovered. This investigation strengthens the evidence for the
existing Phase 1 sequence, particularly Sprint 01 — Pilot Risk Containment.

## Visible Chrome Reverification

A second pass was completed in the repository owner's visible Chrome window after the initial
isolated-browser audit. Native clicks and keyboard interaction were used to operate the application;
the same synthetic `.invalid` details were used, and the browser viewport was temporarily reduced to
390×844 for responsive checks before being reset.

- Every declared page route was visited again: `/`, `/start`, `/peptides`, both poster routes, all
  three legal/support routes, and an unknown route.
- `/start` was completed from condition selection through confirmation. Chrome network events
  captured immediately around Submit contained **no requests**; reload returned to Step 1.
- The peptide profile was completed through its acknowledgement screen. Advancing the profile also
  produced **no requests**. The external `.example.com` placeholder was not opened.
- Mobile navigation opened without overflow, but Escape did not close it and the trigger still had
  no `aria-expanded` or `aria-controls` state.
- Browser and server logs both reproduced the empty video `src` warning. Server logs contained no
  form receipt, account creation, submission, database, email, or webhook activity.
- Direct visible navigation to `/.mcp/list-tools` was blocked by a locally installed client filter
  (`ERR_BLOCKED_BY_CLIENT`). Same-origin requests from the application still returned the expected
  `200`, `406`, `404`, and `200` results, proving that the server endpoints remained operational.

The visible Chrome profile also injected `bis_*` attributes before React hydration, producing
hydration-mismatch warnings attributed to a browser-extension context. This did not occur in the
isolated browser and is not classified as an application defect. During one interrupted attempt the
development server stopped, leaving a cached unstyled page and `ERR_CONNECTION_REFUSED`; restarting
the server and reloading restored normal styling and interaction.

## Route and Surface Results

| Surface                          | Runtime result                                                                                                                                                 | Related debt          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `/`                              | Renders without overlay or horizontal mobile overflow. Header/footer logo requests return `404`; favicon also returns `404`.                                   | TD-032, TD-042        |
| `/start`                         | Completes a five-state visual journey, but Submit produces no fetch/XHR and immediately shows “You're in.” Reload resets the journey.                          | TD-001–TD-004, TD-008 |
| `/peptides`                      | Profile remains browser-only. The video has no source, emits a React warning, and exposes disabled controls. Compliance copy and destination are placeholders. | TD-007, TD-033        |
| `/poster`, `/poster-thanks`      | Render cleanly at poster proportions, but both show a styled box containing `QR`, not a scannable code.                                                        | TD-034                |
| `/privacy`, `/terms`, `/contact` | Render, but explicitly state that final content or channels are pending. The displayed email is not a link.                                                    | TD-005, TD-043        |
| Unknown route                    | Correct 404 content renders, but the document title is `Lovable App`.                                                                                          | TD-041                |

Shared `#treatments` and `#how` links work only on the homepage. From `/privacy`, for example,
“Hair Loss” changes the URL to `/privacy#treatments`, where no target exists and no scrolling occurs
(TD-035).

## Journey Evidence

### Intake

The condition, consent, profile, empty questionnaire, and confirmation states all render. Synthetic
profile data remains in React memory only. Network capture was cleared immediately before Submit;
the result was **zero requests** and an immediate success screen. Refresh returned to Step 1. The
profile inputs have no IDs, names, autocomplete decisions, or programmatically associated labels,
and focus falls back to the document body after completion (TD-037, TD-038).

### Peptides

Required browser validation exists for four profile fields, but advancing the profile sends no
request. The next screen asks the user to accept wording explicitly marked pending final compliance
sign-off. Its enabled action would navigate to
`https://precisewellness.example.com/questionnaire`; the investigation deliberately stopped before
that external navigation. The route therefore cannot be enabled for the pilot in its present form.

## Responsive and Accessibility Observations

The homepage and first intake step fit a 390-pixel viewport without horizontal overflow. The mobile
menu opens and exposes its links, but its button has neither `aria-expanded` nor `aria-controls`.
Escape does not close the open menu. The broken logo is prominent on both desktop and mobile. No
application error overlay appeared.

## MCP Runtime Verification

| Request                                     | Result                                                     |
| ------------------------------------------- | ---------------------------------------------------------- |
| `GET /.mcp/list-tools`                      | `200`; three read-only tools returned                      |
| `POST /.mcp/invoke-tool/about_meneer`       | `200`; text and structured content returned                |
| MCP `initialize` on `/mcp`                  | `200`; protocol `2025-06-18` over `text/event-stream`      |
| Ordinary `GET /mcp`                         | Expected `406` because event-stream negotiation was absent |
| `GET /.well-known/oauth-protected-resource` | `404`; authentication remains disabled                     |

Responses allow wildcard CORS. Server logs showed the Lovable metrics path attempting to inspect a
Cloudflare environment, then disabling itself because `LOVABLE_API_KEY` was absent. No key should be
added; Sprint 02 already owns removal or replacement of this coupling (TD-049, TD-052, TD-053).

## Engineering Validation

| Check               | Result                                                 |
| ------------------- | ------------------------------------------------------ |
| `bunx tsc --noEmit` | Pass                                                   |
| `bun run build`     | Pass; existing Nitro/Rollup/Cloudflare warnings remain |
| `bun run lint`      | Fail: 62 Prettier errors and 7 Fast Refresh warnings   |

The dependency audit was not repeated because this was a runtime-focused refresh; the dated results
in the primary project audit remain the current recorded baseline until Sprint 04 reruns them.

## Phase 1 Recommendation

Proceed to Phase 1 only through the planned Sprint 01 gate. Before implementation begins, obtain the
owner decisions listed in that sprint: pilot scope and access, whether any health information will be
captured, route dispositions, support and urgent-care wording, claims approvers, peptide disposition,
and owned logo/campaign assets. Where approval is unavailable, gate or remove the relevant journey.

This report is runtime evidence, not closure evidence. All referenced debt remains open until the
registry acceptance criteria are implemented and independently verified.
