# E2E smoke test runbook

## Purpose
`npm run test:e2e:smoke` verifies the learner core loop for 감정평가사 1차/2차 with deterministic manual-input flows.

Covered paths:
- 1차: capture → save → session completion
- 2차: writing flow → save → rewrite → completion
- learner guardrails: no instructor links, no grading/pass-fail/payment claims

## Local run
1. Install dependencies
   - `npm ci`
2. Install Playwright Chromium
   - `npx playwright install --with-deps chromium`
3. Run smoke (deterministic local auth mode)
   - `DEV_SMOKE_AUTH=true npm run test:e2e:smoke`

## Required environment variables
- `DEV_SMOKE_AUTH=true` (recommended for local + CI deterministic run)
- Optional credential path (if you want real login instead of dev smoke auth):
  - `TEST_AUTH_STATE_PATH` OR
  - `TEST_USER_EMAIL` + `TEST_USER_PASSWORD`

## CI behavior and fallback
- CI installs the Playwright package via `npm ci` and browser binary via `npx playwright install --with-deps chromium`.
- When Supabase/external auth services are unavailable, smoke auth falls back to a local deterministic cookie session in non-production localhost dev mode, so core learner loop tests still execute.
- No real OCR/API integration is required for this smoke path.
