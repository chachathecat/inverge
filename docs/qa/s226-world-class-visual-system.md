# S226 World-Class Visual System QA Evidence

Date: 2026-07-09

## Scope

Routes requiring visual evidence:

- `/`
- `/login`
- `/app?mode=second`
- `/app/capture?mode=second`
- `/app/capture?mode=second` after text input
- saved/result state if feasible

Required viewports:

- 390px
- 768px
- 1440px

## Browser Evidence Status

Real browser screenshots were generated against a local production server:

- Server: `next start` at `http://127.0.0.1:3000`
- Browser: Chromium through Playwright
- Auth mode: local auth-disabled demo mode, because no Supabase auth environment was configured
- Screenshot directory: `docs/qa/s226-world-class-visual-system/screenshots/`
- Manifest: `docs/qa/s226-world-class-visual-system/screenshots/manifest.json`
- Capture count: 18 screenshots
- Page errors: 0
- Console errors: 3 expected errors from the saved/result state only, caused by an intentional in-browser `503` for `/api/os/items` so the UI used local fallback and did not write the synthetic sample into repository data

The text-input and saved/result states used only the approved synthetic Korean sample inside the browser context. The sample body is intentionally not repeated in this document or the manifest.

## Screenshot Matrix

| Route/state | 390px | 768px | 1440px |
| --- | --- | --- | --- |
| `/` | `screenshots/landing-390.png` | `screenshots/landing-768.png` | `screenshots/landing-1440.png` |
| `/login` | `screenshots/login-390.png` | `screenshots/login-768.png` | `screenshots/login-1440.png` |
| `/app?mode=second` | `screenshots/app-second-390.png` | `screenshots/app-second-768.png` | `screenshots/app-second-1440.png` |
| `/app/capture?mode=second` | `screenshots/capture-empty-390.png` | `screenshots/capture-empty-768.png` | `screenshots/capture-empty-1440.png` |
| capture after text input | `screenshots/capture-text-input-390.png` | `screenshots/capture-text-input-768.png` | `screenshots/capture-text-input-1440.png` |
| saved/result state | `screenshots/capture-saved-result-390.png` | `screenshots/capture-saved-result-768.png` | `screenshots/capture-saved-result-1440.png` |

## Routes Not Captured

None from the requested route and viewport matrix.

## Blocker Patch Follow-up

- Landing hero framing was patched after the screenshot review so the 1440px first viewport no longer starts with an accidental blank vertical band before the hero.
- The saved/result confirmation copy was patched to show learner-facing Korean task labels instead of internal task keys.
- The affected screenshots were regenerated after the patch; screenshot evidence remains real-browser local production evidence, not a claim that visual QA is complete.

## Important Evidence Notes

- `/app?mode=second` and `/app/capture?mode=second` were not auth-blocked in this local run because Supabase auth was not configured, so the app used demo mode.
- The saved/result screenshots prove the local fallback confirmation state, not a durable account-backed save.
- The saved/result screenshots intentionally force `/api/os/items` to fail in the browser context. This protects the data boundary for the synthetic sample but leaves account-backed persistence evidence out of scope.
- Screenshots are viewport screenshots, not full-page captures.

## Source-Level Checks Still Covered

- S226 palette tokens are defined in `app/globals.css`.
- Landing has one S226 primary CTA marker and shows the answer to evidence to gap to rewrite to review transformation in learner-facing Korean copy.
- Authenticated shell stays second-round 답안길 only and does not show public login/start CTAs.
- `/app` starts with one Today Mission surface.
- Capture starts with answer input actions before subject/metadata confirmation.
- Trust Evidence Bar exists and distinguishes source, confidence, learner confirmation, official grading status, and editability.
- Forbidden official grading/model-answer/pass-probability/pass-guarantee claims remain blocked by tests.

## Remaining Visual Risks

- `/app?mode=second` still shows secondary local-beta reflection and disclosure surfaces below the mission; the primary action remains dominant, but the page can still read as dashboard-like if those sections accumulate real data.
- This run used local auth-disabled demo mode, not a real Supabase invited account, so invited-account data density remains unproved.
- The saved/result screenshots prove the local fallback confirmation state, not a durable Supabase write.
- This run did not include pixel-diff comparison against a golden baseline.
