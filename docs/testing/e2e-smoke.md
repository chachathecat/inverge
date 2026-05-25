# E2E smoke test runbook

## Purpose
`npm run test:e2e:smoke` verifies the learner core loop for 감정평가사 1차/2차 with deterministic manual-input flows.

Covered paths:
- 1차: capture → save → session completion
- 2차: writing flow → save → rewrite → completion
- learner guardrails: no instructor links, no grading/pass-fail/payment claims

## Smoke modes

### 1) Local deterministic smoke (`e2e-local-smoke`)
Used for pull requests to keep the core learner loop stable in CI.

- Trigger: `pull_request`
- Base URL: local Next dev server via Playwright `webServer`
- Auth mode: `DEV_SMOKE_AUTH=true`
- Input mode: deterministic manual text inputs (no OCR dependency)
- Expectation: required PR gate

Run locally:
1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `DEV_SMOKE_AUTH=true npm run test:e2e:smoke`

### 2) Staging/preview smoke (`e2e-staging-smoke`)
Used on deployed behavior in main/manual execution.

- Triggers: `push` to `main`, `workflow_dispatch`
- Base URL: `E2E_BASE_URL` from GitHub Actions secrets
- Auth options:
  - `TEST_AUTH_STATE_PATH`, or
  - `TEST_USER_EMAIL` + `TEST_USER_PASSWORD`
- `DEV_SMOKE_AUTH` is intentionally **not** enabled for staging smoke.

If required staging secrets are missing, the job exits with an explicit skip message and does not fail the workflow.

## Secrets and environment variables

### Local deterministic smoke
- Required: `DEV_SMOKE_AUTH=true`
- Optional (real-auth mode instead of dev smoke auth):
  - `TEST_AUTH_STATE_PATH`, or
  - `TEST_USER_EMAIL` + `TEST_USER_PASSWORD`

### Staging/preview smoke
- Required:
  - `E2E_BASE_URL`
  - and one auth strategy:
    - `TEST_AUTH_STATE_PATH`, or
    - `TEST_USER_EMAIL` + `TEST_USER_PASSWORD`

## Artifacts and debugging
Both smoke jobs upload Playwright artifacts (with `if: always()`):
- `playwright-report`
- `test-results`
- traces (`**/trace.zip`)
- screenshots (`**/*.png`)

Debugging tips:
- Open traces with `npx playwright show-trace <path-to-trace.zip>`
- Review screenshots for UI state around failures
- Use `test-results` + Playwright report timing to identify flaky steps

## How to rerun failed smoke
- GitHub UI:
  - Rerun failed jobs from the workflow run page, or
  - use `Run workflow` for `workflow_dispatch` to retry staging smoke.
- Local repro:
  - `DEV_SMOKE_AUTH=true npm run test:e2e:smoke`
- Narrow rerun for a specific test name:
  - `npx playwright test tests/e2e/closed-beta-smoke.spec.ts --grep "<test name fragment>"`

## CI fallback behavior
- CI installs JS dependencies with `npm ci` and browser binary with `npx playwright install --with-deps chromium`.
- Local PR smoke can fall back to deterministic cookie session in localhost dev mode when Supabase/external auth is unavailable.
- No real OCR/API integration is required for this smoke path.
