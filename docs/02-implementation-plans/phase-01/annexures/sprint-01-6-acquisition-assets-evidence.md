---
artifact_id: phase-01-sprint-01-6-acquisition-assets-evidence
title: Sprint 01.6 Acquisition Assets Evidence
status: verified-task-evidence
authority: repository-observed-and-owner-confirmed
last_updated: 2026-08-06
owner: "@Muhns13G"
audience: internal
sensitivity: internal
---

# Sprint 01.6 — Acquisition Assets Evidence

## Approved Boundary

The company-approved placeholder mark from `.archive/images/MHealth Logo.png` may be used for v1
while final brand development remains future work. The current dark theme remains unchanged. Logo
contrast, light/dark variants, vector masters, and a broader identity system are tracked separately
and do not authorise an unreviewed redesign in this sprint.

The archived peptide explainer is owner-approved for pilot review but is not final public-launch
media. Its binary belongs only on `itws-I-preview`; it must not be merged into permanent history.
The permanent branch provides a configurable review layout without bundling the draft video.

## Completed Implementation

- Copied the approved placeholder mark to `src/assets/brand/meneer-mark.png` without altering it.
- Updated `Nav` and `Footer` to import the local bundled asset.
- Removed the Lovable `meneer-logo.png.asset.json` reference and metadata file.
- Removed the empty `src=""`/`poster=""` video element from the preserved peptide prototype.
- Kept `/peptides` gated by default.
- Added a non-transactional media-review layout enabled only by
  `VITE_PEPTIDE_VIDEO_URL`; optional `VITE_PEPTIDE_VIDEO_POSTER_URL` supplies its poster.
- Kept the preserved profile, acknowledgement, and questionnaire prototype inaccessible in both
  default and media-review modes.
- Left poster routes gated and undistributed; no QR destination or campaign asset was invented.

## Preview-Branch Contract

After the permanent Sprint 01.6 commit is incorporated into `itws-I-preview`, the preview branch may
add the draft MP4 under `public/media/peptides/` and set `VITE_PEPTIDE_VIDEO_URL` to that file. The
binary commit must remain isolated and must never be merged or cherry-picked into `itws-I`. A final
approved video can later use the same configuration boundary with an approved CDN/object-storage
URL.

## Preview-Branch Implementation

On `itws-I-preview`, the archived MP4 is stored at
`public/media/peptides/peptide-explainer-draft.mp4`. The branch supplies that public path as its
preview-only fallback, while `VITE_PEPTIDE_VIDEO_URL` can still override it. The copied file matches
the archive source SHA-256:
`af239fe600e047909999d3ece886a7ed3e6a723a5d0d1fc17a9038b3f268e511`.

This fallback and binary are branch-specific review assets. Neither may be merged or cherry-picked
into `itws-I`.

## Verification

- Source and archive logo SHA-256 values match:
  `2f484c098200d59104502fac34f33620a7c6fb761f57b19eddd4cf790d61696b`.
- `bunx tsc --noEmit`: passed.
- `bun run build`: passed and emitted `meneer-mark-C6Yk0xuZ.png` as a 107.45 KB hashed asset; known
  Cloudflare/Nitro warnings remain assigned to Sprint 02.
- A second production build with
  `VITE_PEPTIDE_VIDEO_URL=/media/peptides/peptide-explainer-draft.mp4` passed and emitted the draft
  review layout and configured URL into the peptide client and SSR chunks without adding an MP4.
- On `itws-I-preview`, the production build passed, preserved the MP4 checksum in
  `.output/public/media/peptides/`, and served both `/peptides` and the fallback video with HTTP 200.
  The media response reported `video/mp4` and the expected 6,703,712-byte content length.
- Focused ESLint for `src/routes/peptides.tsx`: passed.
- Full `bun run lint`: existing baseline remains 32 errors and 7 warnings; no new peptide-route
  violation was introduced. The shared Nav/Footer formatting findings predate this task.
- No empty video source or Lovable virtual logo reference remains in active source.
- Before the preview-only binary commit, the local development server returned HTTP 200 for `/`
  and the permanent branch's default gated `/peptides` route. A temporary media URL also verified
  the review state without copying the archive binary into permanent history.
- In-app browser verification passed at 1440 x 900 and 390 x 844. The homepage retained its
  established title and messaging, including `Back to your best.`; header and footer logos loaded
  without broken-image or horizontal-overflow findings. The source image reported intrinsic
  dimensions of 550 x 370 and rendered at 54 x 36 in the header and 42 x 28 in the footer.
- On `itws-I-preview`, `/peptides` rendered the approved review boundary with `noindex, nofollow`,
  no form, input, password field, questionnaire link, or horizontal overflow. The MP4 reached
  `readyState=4`, reported 1280 x 720 dimensions, a 137.009-second duration, and no media error. Its
  first frame and native controls rendered at both tested widths. Browser-native play/pause could
  not be toggled through automation and remains a manual/hosted verification item under TD-033.
- Mobile navigation opened successfully, the footer rendered with the local mark, and return
  navigation restored the homepage content and metadata. No browser console warning or error was
  recorded during the checked journeys.
- `/poster` and `/poster-thanks` both remained non-transactional gates with no form, input, QR
  image, registration, submission, or success state. Server output showed no runtime error during
  the verification pass.

## Open Technical Debt After This Boundary

- TD-032's local visual requirement is verified. Hosted preview/production rendering and final
  brand quality remain open for the selected hosting sprint and FC-002.
- TD-033's local draft-rendering and decode path is verified. Final approval, an approved poster,
  captions, transcript, manual playback, loading behaviour, and hosted browser evidence remain
  open.
- TD-034 remains open until approved campaign URLs, attributed QR assets, representative device
  scans, and A1 print tests exist; local browser evidence confirms the inactive gates expose none
  of those unapproved surfaces.

Sprint 01.6 is closed as a verified local engineering boundary. It replaces broken dependencies
and provides safe containment, but does not represent draft media, final branding, or campaign
concepts as production-approved assets.
