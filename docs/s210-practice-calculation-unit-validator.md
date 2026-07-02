# S210 Practice Calculation Unit Validator

## Goal

S210 adds a source-level, metadata-only validator for second-round practice calculation units.

It is scoped to target issue #509 and roadmap item S210. The implementation PR body uses the separate closing reference `Closes #509`; the registry keeps that PR metadata separate from the roadmap item id.

## What It Validates

- The registry is appraiser second-round practice only.
- Each calculation unit uses a supported calculation type.
- OCR is represented only as a confidence-gate policy and field schema.
- Runtime OCR is not called and OCR output is not stored.
- Formula metadata exists without storing the formula expression.
- Unit checks, rounding checks, and independent recalculation metadata are required.
- The calculator model is fixed to `casio_fx_9860giii`.
- GIII routines must be reset-safe, hand-keyed metadata only.
- Stored-program dependency is rejected.
- Release remains blocked at the source-level validator stage.

## Data Boundary

The registry and report must not contain learner answers, OCR output, problem bodies, answer bodies, provider payloads, billing records, private user content, credentials, or secret-like values.

The deterministic report contains counts, ids, and policy status only. It is not runtime evidence and does not release a reference answer.

## Non-Goals

- No workflow changes.
- No API route changes.
- No auth, billing, payment, provider, OCR adapter, learner runtime, instructor, academy, Supabase, migration, environment, Next config, or Vercel changes.
- No provider calls.
- No runtime OCR calls.
- No automatic merge or publication path.

## Validation

Primary command:

```powershell
npm.cmd run check:practice-calculation-units
```

Focused test:

```powershell
npm.cmd test -- tests/practice-calculation-unit-registry.test.mjs
```

Broader checks:

```powershell
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

## Rollout And Rollback

Rollout is limited to merging the source-level registry, validator script, docs, and tests after required checks pass.

Rollback is a focused revert of the S210 files and the narrow package script/test-runner wiring. No runtime data or external service state is mutated by this change.

## Remaining Risk

The committed unit is synthetic metadata. Real historical practice units still require source-rights confirmation, runtime OCR evidence, independent recalculation evidence, and human review before any release gate can move forward.
