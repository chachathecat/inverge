# S212 Theory Answer Review and Grading Engine

- Status: implementation contract
- Linked roadmap item: `S212`
- Scope: metadata-safe appraiser second-round theory answer review

S212 implements the first source-level theory answer review engine on top of S205, S207, and S209. It does not add a runtime route, provider call, OCR adapter, auth change, billing behavior, Supabase migration, learner UI, instructor UI, or academy route.

## Artifacts

- `lib/review-os/theory-answer-review-engine.ts`
- `tests/theory-answer-review-engine.test.mjs`
- `docs/s212-theory-answer-review-engine.md`
- `roadmap/active-program.yml`

Focused validation:

```text
npm.cmd run test -- tests/theory-answer-review-engine.test.mjs --workers=1
```

## Theory Dimensions

The engine emits the S205 common rubric contract with six S212 theory dimensions:

- `definition_quality`
- `theory_basis`
- `comparison_frame`
- `application_evaluation`
- `conclusion`
- `compression_relevance`

Every evaluated deduction candidate must point to learner-owned evidence reference IDs. The engine does not embed learner answer text, OCR text, official question text, source excerpts, reference-answer text, provider payloads, or instructor comments.

## Fail-Closed Source Verification

S212 reads S207 reference-package metadata and S209 theory concept metadata. A ready review requires:

- released S207 theory package metadata with S212 downstream usage enabled;
- passing theory validation checks;
- S209 concept check with high-confidence S212 review allowed;
- verified or synthetic-fixture-only concept anchors in test fixtures;
- no open blocking concept blockers or unresolved consensus conflicts.

The committed real S209 corpus still contains candidate concepts that need official verification. For those records S212 withholds the score-like range, emits no deduction candidates, and returns a `withhold_until_verified` next action.

## Learner Evidence Requirement

S212 requires an `answerSubmissionId` and learner evidence references before it evaluates any theory dimension. Missing learner evidence or unconfirmed OCR fails closed with no score-like range and no deduction candidates.

## Authority and Data Boundaries

S212 output is derived learning metadata only. It preserves:

- no official grading claim;
- no official model-answer claim;
- no pass-probability or pass/fail claim;
- no confirmed score;
- score-like range secondary to one biggest gap and one next action;
- learner-only metadata with no instructor route or academy-surface dependency.

## Rollback

Rollback is a focused revert of the S212 engine, tests, docs, and roadmap status change. No external runtime, database, billing, OCR, auth, provider, or instructor rollback is required.

## Remaining Risks

- Real high-confidence theory review still depends on official verification of S209 concept sources.
- S214/S215 reference-answer pipeline and release gates remain required before public release.
- Runtime evidence is still required before any learner-facing production claim.
