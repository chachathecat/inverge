# First-stage Owner home validation

## Scope

- Lead issue: #921
- Goal: replace the stale first-stage kernel placeholder with a truthful Owner-only handoff across all five first-stage subjects.
- Base commit: `52de8ef8ee772bae02788f140d8ecff7f0bd37c1`
- Base tree: `75ba5d02b1f299bc985604b66756545c103cf945`
- Risk: medium; navigation and availability presentation change only.
- Non-goals: no reviewed-content installation, question generation, schema/API/environment change, remote data mutation, public activation, or completion claim for #883.

## Runtime contract

The page reads the six existing same-origin, no-store availability endpoints in a bounded request and renders metadata only. It exposes exactly one dominant next action:

1. the first subject with reviewed stock;
2. otherwise the existing Owner-local economics trial;
3. otherwise the existing second-stage Today mode.

Partial availability failures remain visible as retryable status failures. The page does not render question bodies, choices, answers, or explanations.

## Local evidence

- `npm run test -- tests/first-stage-common-mcq-kernel.test.mjs tests/first-stage-private-route.test.mjs tests/first-stage-economics-content.test.mjs tests/first-stage-accounting-content.test.mjs tests/first-stage-remaining-subjects.test.mjs tests/first-stage-final-release.test.mjs tests/s232f2-access-availability.test.mjs --workers=1`: 64/64 passed.
- `npm run test -- tests/first-stage-owner-home.test.mjs --workers=1 --test-name-pattern='Owner home keeps'`: 1/1 passed.
- `npx eslint components/review-os/first-stage-mcq-loop.tsx tests/first-stage-owner-home.test.mjs scripts/run-node-tests.mjs`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with the six pre-existing broad filesystem tracing warnings.
- `git diff --check`: passed.

The full new Playwright scenario is intentionally not recorded as a local pass. This workspace had no Chromium binary, and the Playwright CDN download failed with timeout/502 responses. Native CI installs Chromium before running the registered test and is the required exact-head browser evidence.

## Required exact-head evidence

- Native Fast CI and Full CI pass for the published candidate.
- The real-browser test passes at a 390 x 844 viewport for reviewed-subject, local-trial, and second-stage fallbacks.
- No external request, private question body, browser error, or duplicate primary action is observed.
- Independent exact-head review reports P0/P1/P2 = 0/0/0 and zero unresolved threads before integration.

## Rollback

Revert the component, test registration, and validation files from this slice. The five subject routes and their existing APIs remain unchanged.
