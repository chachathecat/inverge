# E2E smoke test runbook

## Purpose
Playwright E2E is reintroduced as an **optional smoke lane**, not a required learner-loop PR gate.

- `npm run test:e2e:smoke` = public/local stabilization smoke
- `npm run test:e2e:staging` = authenticated `/app` capture-save-session loop smoke (staging only)

## Stabilization scope (v1)
Public smoke currently covers only:
- `/` opens
- `/exams` opens
- `/answer-review` opens
- `/answer-review` text-only flow (API response mocked)

This path does **not** require Supabase for local execution.

## Smoke modes

### 1) Local public smoke (optional)
Run manually while stabilizing.

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run test:e2e:smoke`

### 2) Staging smoke (`/app` loop, optional)
Used only when explicit staging E2E configuration exists.

- Workflow triggers: `push` to `main`, `workflow_dispatch`, or explicit env toggle (`ENABLE_E2E_SMOKE=true`)
- Required secrets:
  - `E2E_BASE_URL`
  - and one auth strategy:
    - `TEST_AUTH_STATE_PATH`, or
    - `TEST_USER_EMAIL` + `TEST_USER_PASSWORD`

If secrets are missing, the workflow skips without failing the pipeline.

## CI and gating policy
- E2E smoke is intentionally separate from required learner-loop PR checks.
- Keep E2E optional until the suite is stable.

## Debugging
- `npx playwright show-trace <path-to-trace.zip>`
- Check uploaded artifacts: `playwright-report`, `test-results`, traces, screenshots.
