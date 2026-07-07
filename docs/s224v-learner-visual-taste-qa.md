# S224V Learner Visual Taste QA

Date: 2026-07-07

Scope: learner-facing second-round operating surfaces only.

This QA records visual-taste evidence for S224V. It does not approve S225 public paid launch readiness.

## Screenshot Commands

Production screenshot command after `npm.cmd run build` and `npm.cmd run start`:

```powershell
npm.cmd run build
$env:PORT="3000"; npm.cmd run start
node scripts/s224v-capture-screenshots.mjs --base-url=http://127.0.0.1:3000 --out-dir=.agent-factory/s224v-visual-taste-screenshots
```

Expected local artifacts:

- `.agent-factory/s224v-visual-taste-screenshots/app-desktop.png`
- `.agent-factory/s224v-visual-taste-screenshots/app-mobile.png`
- `.agent-factory/s224v-visual-taste-screenshots/capture-desktop.png`
- `.agent-factory/s224v-visual-taste-screenshots/capture-mobile.png`
- `.agent-factory/s224v-visual-taste-screenshots/answer-review-desktop.png`
- `.agent-factory/s224v-visual-taste-screenshots/answer-review-mobile.png`
- `.agent-factory/s224v-visual-taste-screenshots/review-desktop.png`
- `.agent-factory/s224v-visual-taste-screenshots/review-mobile.png`
- `.agent-factory/s224v-visual-taste-screenshots/notes-desktop.png`
- `.agent-factory/s224v-visual-taste-screenshots/notes-mobile.png`
- `.agent-factory/s224v-visual-taste-screenshots/manifest.json`

## Runtime Status

Final local production screenshot run: PASS.

- Captured at: `2026-07-07T03:38:23.852Z`
- Base URL: `http://127.0.0.1:3001` (`3000` was already occupied locally)
- Command: `node scripts/s224v-capture-screenshots.mjs --base-url=http://127.0.0.1:3001 --out-dir=.agent-factory/s224v-visual-taste-screenshots`
- Browser evidence: Playwright Chromium via the committed capture helper. `agent-browser` CLI was not installed in this environment.
- Artifact count: 10 screenshots plus `manifest.json`
- Route status: all required desktop and mobile captures returned `200`
- Marker status: all required captures reported `markerPresent: true`
- Console/page errors: none recorded in the final manifest
- Data boundary: screenshots used the local auth-disabled demo path and the manifest stores route metadata only, not learner submission content, extraction bodies, problem bodies, source passages, payment payloads, credentials, or private keys.

Final captured artifacts:

| Surface | Viewport | Status | Marker | Console errors | Page errors | Artifact |
|---|---:|---:|---:|---:|---:|---|
| `/app?mode=second` | 1280x900 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/app-desktop.png` |
| `/app?mode=second` | 390x844 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/app-mobile.png` |
| `/app/capture?mode=second` | 1280x900 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/capture-desktop.png` |
| `/app/capture?mode=second` | 390x844 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/capture-mobile.png` |
| `/answer-review?mode=second` | 1280x900 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/answer-review-desktop.png` |
| `/answer-review?mode=second` | 390x844 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/answer-review-mobile.png` |
| `/app/review?mode=second` | 1280x900 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/review-desktop.png` |
| `/app/review?mode=second` | 390x844 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/review-mobile.png` |
| `/app/notes?mode=second` | 1280x900 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/notes-desktop.png` |
| `/app/notes?mode=second` | 390x844 | 200 | yes | 0 | 0 | `.agent-factory/s224v-visual-taste-screenshots/notes-mobile.png` |

## Visual Density Audit

| Surface | Route captured | Auth status | Primary CTA above fold | Trust layer count | Visible primary work items | Secondary diagnostics | Equal-weight card grid | Repeated warning copy | S225 block? |
|---|---|---:|---:|---:|---:|---|---|---|---|
| Home | `/app?mode=second` | auth-disabled local demo or authenticated learner | 1 | 0 | max 3 | quiet disclosure | absent | absent | No, visual QA passed but does not approve S225. |
| Capture | `/app/capture?mode=second` | auth-disabled local demo or authenticated learner | 1 | 1 per stage | 1 | quiet disclosure | absent | absent | No, visual QA passed but does not approve S225. |
| Answer Review | `/answer-review?mode=second` | unauthenticated trial-capable route | 1 | 1 | 1 | quiet disclosure | absent | absent | No, visual QA passed but does not approve S225. |
| Review | `/app/review?mode=second` | auth-disabled local demo or authenticated learner | 1 | 0 | 1 due item | quiet disclosure | absent | absent | No, visual QA passed but does not approve S225. |
| Notes | `/app/notes?mode=second` | auth-disabled local demo or authenticated learner | 1 when empty; otherwise latest-note continuation | 0 | max 3 | quiet disclosure | absent | absent | No, visual QA passed but does not approve S225. |

## Desktop Checklist

| Surface | What was visually checked | Remaining unverified |
|---|---|---|
| Home | Warm ivory canvas, one dominant Today action, visible reason/time/continuation, max-three Today Plan, secondary diagnostics collapsed. | Real invited-account data density with many historic notes. |
| Capture | Compact stage indicator, current stage visibility, secondary input choices, singular trust layer, optional fields collapsed, save destination visible. | Real camera/PDF capture quality and handwritten extraction behavior. |
| Answer Review | Input methods no longer compete as primary CTAs, result block leads with biggest gap/next action/10-second check/continuation, diagnostics collapsed. | Live model-backed result variability and long legal-answer text wrapping. |
| Review | One due item is primary, why-due and next-action are visible, candidate items are folded, self-rating remains after retrieval. | Real queue with many overdue records. |
| Notes | Recent learner record context appears before records, latest three records visible, older records folded, notes do not read as an archive dump. | Real account with long titles and many derived learning signals. |

## Mobile Checklist

| Surface | What was visually checked | Remaining unverified |
|---|---|---|
| Home | Primary action appears before diagnostics, Today Plan remains max-three, secondary routes are under disclosure, touch targets use 44px minimum. | Real mobile Safari safe-area behavior. |
| Capture | Save action remains reachable, input methods are secondary, trust layer is compact, optional fields are below primary input. | Native camera permission UX and low-light capture. |
| Answer Review | Primary answer input and start action precede diagnostics, result continuation appears before secondary details. | Long uploaded-file names on small screens. |
| Review | First recall action is before candidate list, candidate list is collapsed, self-rating choices remain tappable. | Large queue completion behavior on real account. |
| Notes | Empty state or latest notes remain task-oriented, older records are folded, no dense table/archive layout appears. | Deep note detail page visuals. |

## Source Markers Checked

The PR adds `data-s224v-*` markers for:

- surface identity;
- primary CTA count above the fold;
- visible trust-layer count;
- visible primary work-item cap;
- quiet secondary diagnostics;
- equal-weight card-grid absence;
- repeated-warning-copy absence.

## Limitations

- The visual QA is local runtime evidence plus source-level density checks, not a paid-launch gate.
- S225 must not resume solely from this PR. S225 may resume only after its own release acceptance issue confirms all launch gates.
- Real invited-account screenshots may still reveal data-density issues not present in auth-disabled local demo mode.

## PR Contract Refresh

The PR body was updated to match the repository PR Contract risk line and merge recommendation format before final review.
