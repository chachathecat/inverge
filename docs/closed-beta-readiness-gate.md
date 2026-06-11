# Closed Beta Readiness Gate

PR #363 adds a deterministic local readiness gate for the learner closed-beta baseline accepted after PR #359, PR #360, PR #361, and PR #362.

Golden flow protected by this gate:

Capture -> Save -> Notes -> Review -> Today -> refresh durability

## Scope

This gate is docs/scripts/tests only. It does not change runtime learner behavior, persistence logic, instructor grading, Supabase requirements, or Q-Net/local official material handling.

The gate protects:

- canonical learner routes: `/app`, `/app/capture`, `/app/input`, `/app/entry`, `/app/notes`, `/app/review`
- `/app/input` and `/app/entry` aliases redirecting to `/app/capture` while preserving `mode` and `subject`
- primary closed-beta capture copy such as `오늘 한 것 올리기`
- local beta browser fallback disclosure on Notes, Review, and Today
- metadata-safe local beta note storage with `metadataOnly: true` and `safeUse: "closed_beta_local_note"`
- persistence status separation for `durable_saved`, `local_fallback_saved`, and `save_failed`
- learner runtime copy guardrails
- tracked-file boundary checks for unsafe raw official/Q-Net/local material patterns

## Prohibited Learner Copy

The readiness gate scans learner runtime sources, not docs/tests, for prohibited learner-facing claims or surfaces:

- official grading/model-answer/score/pass-fail copy
- payment copy
- public archive or problem-bank positioning
- instructor-console exposure

These terms may appear in documentation and tests as guardrails, but they must not appear in learner runtime surfaces.

## Local Beta Persistence

Closed beta browser fallback is a safety net for local/no-Supabase QA. It may show browser-local reflection records in Notes, Review, and Today, but it must not imply durable account persistence.

Durable server save and browser-local fallback save must stay visibly distinct:

- `durable_saved`: account/durable save succeeded
- `local_fallback_saved`: server save was unavailable, but this browser has a temporary closed-beta record
- `save_failed`: neither path completed and the learner should retry

## Official Material Boundary

The gate must not ingest, commit, or validate against raw official materials. It checks tracked file paths for high-risk local/Q-Net/raw material patterns such as `qnet_manifest.json`, local official material directories, raw OCR/answer dumps, and official binary material extensions in likely unsafe paths.

Metadata-only reference code and tests remain separate from learner-facing runtime copy.

## Running The Gate

Run the full local gate before marking a closed-beta readiness PR ready:

```powershell
npm.cmd run check:closed-beta-readiness
```

This command first runs direct static checks, then delegates to the existing official-source verification, learner-loop verification, route/source checks, data-boundary tests, question-reference tests, and build.

PR #363 validation additionally runs:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
node scripts/check-staging-learner-routes.mjs
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```

## Release Interpretation

Passing this gate means the local closed-beta learner golden flow remains metadata-safe, route-stable, copy-safe, and consistent with the owner QA evidence from PR #359.

It is not a replacement for manual browser QA when runtime product behavior changes.
