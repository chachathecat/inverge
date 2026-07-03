# S213 Practice Answer Review Calculation and Grading Engine

- Status: implementation contract
- Linked roadmap item: `S213`
- Scope: metadata-safe appraiser second-round practice answer review

S213 implements the first practice-specific learner answer review engine on top of S205, S207, and S210. It does not add OCR runtime calls, provider calls, billing, auth, Supabase writes, migrations, learner UI, instructor UI, academy routes, workflow changes, production routes, environment changes, Next config changes, or Vercel config changes.

## Artifacts

- `lib/review-os/practice-answer-review-engine.ts`
- `tests/practice-answer-review-engine.test.mjs`
- `tests/fixtures/s213-practice-answer-review/ready-practice-review-input.json`
- `docs/s213-practice-answer-review-engine.md`
- `roadmap/active-program.yml`

Focused validation:

```text
npm.cmd run test -- tests/practice-answer-review-engine.test.mjs --workers=1
```

## Practice Dimensions

The engine emits the S205 common Evidence Review contract with seven S213 practice dimensions:

- `practice_assumptions`
- `practice_data_selection`
- `practice_formula_metadata`
- `practice_calculation_trace`
- `practice_unit_rounding_time_adjustment`
- `practice_cross_check`
- `practice_conclusion_writing`

These dimensions cover assumptions, data selection, formula metadata, calculation trace, unit, rounding, and time-adjustment metadata, cross-check metadata, and conclusion writing.

Every evaluated dimension and deduction candidate must point to learner-owned evidence reference IDs. The engine does not embed learner answers, OCR text, official question text, reference-answer prose, source excerpts, formula expressions, extracted values, calculation traces, provider payloads, or instructor comments.

## Fail-Closed Calculation Gates

S213 emits a ready review only when these fail-closed gates pass:

- learner answer evidence is present and confirmed;
- S207 practice reference-package metadata is released, non-synthetic, enabled for S213, and keeps official-answer, official-grading, score-prediction, pass-probability, and guarantee guardrails disabled;
- S207 practice validation checks are passed, not synthetic-only;
- S210 calculation unit metadata is supported, second-round practice scoped, source-rights ready, and uses `casio_fx_9860giii`;
- the GIII routine is reset-safe and hand-keyed, with stored-program dependency disabled;
- S213 calculation review metadata verifies assumptions, data selection, formula metadata, calculation trace, unit check, rounding check, time adjustment, cross-check, conclusion writing, and independent recalculation;
- every score-like range and deduction candidate has linked learner-answer evidence.

Unsupported, ambiguous, unverified, source-rights-unready, or synthetic-only calculation cases return a withheld S205 result. They emit no deduction candidates, withhold the secondary score range, and point the next action to verification rather than review completion.

## GIII Routine Boundary

S213 keeps the calculator policy fixed:

```text
casio_fx_9860giii
resetSafeHandKeyedRoutineOnly: true
storedProgramDependency: false
```

When the primary gap is calculation-related, the next action is `recalculate` and the hook declares the fixed GIII policy. Stored-program dependency is never taught as an exam strategy.

## Learner/Instructor Separation

This is the S213 learner/instructor separation boundary. S213 is a learner engine. It rejects instructor or academy invocation and records:

- learner route only;
- instructor route separated;
- academy tenant data not accessed;
- instructor runtime route unchanged;
- instructor final-grade approval remains outside this learner engine.

Academy answer operations remain later S222 scope.

## Product Guardrails

S213 does not produce or allow:

- official grading;
- confirmed score;
- official model answer;
- pass probability;
- pass/fail prediction;
- pass guarantee.

The score-like output remains the S205 secondary learning-support range. It is never the terminal state; the terminal state is rewrite, recalculation, OCR confirmation, withheld verification, or scheduled review.

## Data Boundary

Committed S213 fixtures are metadata-only. They contain safe IDs, statuses, confidence, and source anchors only. They must not contain learner answer bodies, OCR bodies, official question bodies, official answer bodies, source excerpts, formula expressions, extracted values, calculation traces, reference-answer prose, provider payloads, billing data, credentials, instructor comments, academy content, PDFs, HWPs, images, or asset bytes.

## Rollout

S213 is additive:

- engine contract;
- metadata-only fixture;
- focused tests;
- documentation;
- roadmap completion wiring;
- Agent Factory ready target update where the completed roadmap state requires it.

No runtime, provider, OCR, billing, auth, Supabase, instructor, academy, workflow, production route, environment, Next config, or Vercel change is part of this item.

## Rollback

Rollback is a focused revert of the S213 engine, fixture, tests, documentation, roadmap status change, and Agent Factory ready-target text/test update. Existing S205, S207, and S210 artifacts remain valid because S213 only reads their metadata contracts.

## Remaining Risks

- Real high-confidence practice review still depends on verified real S207 packages and S210 calculation unit coverage.
- The committed S207 registry remains empty for real packages, so default real runs fail closed until S214/S215 reference work completes.
- Runtime evidence is still required before any learner-facing production claim.
- S216 still needs to convert S213 gap metadata into automatic error notes.
