# S211 Law Answer Review and Grading Engine

- Status: implementation contract
- Linked roadmap item: `S211`
- Scope: metadata-only appraiser second-round law answer review

S211 implements the first law-specific learner answer review engine on top of the S205 common Evidence Review contract, the S207 verified learning-reference package metadata, and the S208 exam-date law-source version gate.

It is source-level only. It does not add provider calls, OCR, billing, Supabase writes, auth changes, learner routes, instructor routes, workflow automation, reference-answer generation, or public archive behavior.

## Engine Source

The source-level engine is:

```text
lib/review-os/s211-law-answer-review-engine.ts
```

The engine version is:

```text
s211.law_answer_review_engine.v1
```

## Review Dimensions

S211 evaluates only metadata-linked law review findings:

- issue spotting
- requirement decomposition
- legal rule mapping
- subsumption/application structure
- conclusion quality

Every evaluated finding must point to learner-answer evidence references from S205. The engine rejects review input that has no learner-owned evidence reference or a finding without evidence IDs.

## Fail-Closed Source Gates

S211 emits a ready review only when:

- S207 law reference package metadata is released as a learning reference and is enabled for S211;
- the package keeps official-answer, official-grading, score-prediction, and pass-probability guardrails disabled;
- S208 exam-date law-source status is verified or synthetic fixture-only;
- S208 allows high-confidence S211 review for the linked exam-date law version;
- the S208 S205 evidence-review link is verified and high confidence;
- no open blocking legal-source or reference-package blocker remains.

When any gate is unresolved, S211 returns an S205 `withheld_unverified_source` result, withholds the secondary score range, and points the next action to source verification. This is a fail-closed path.

## Learner Evidence and OCR

Learner answer evidence remains user-owned service data. S211 stores and emits only safe IDs and metadata:

- evidence reference ID
- answer submission ID
- OCR confirmation state
- learner confirmation flag
- confidence
- `containsRawContent: false`

If OCR still needs learner confirmation, S211 returns `withheld_unconfirmed_ocr`, emits no deduction candidates, withholds the secondary score range, and sets the next action to OCR confirmation.

## Learner/Instructor Separation

This is the S211 learner/instructor separation boundary.

S211 is a learner engine. It rejects instructor or academy surface invocation. The result metadata records:

- learner route only
- instructor route separated
- academy tenant data not accessed
- instructor runtime route unchanged
- instructor final-grade approval remains outside this learner engine

Academy answer operations remain a later S222 scope.

## Product Guardrails

S211 does not produce or allow:

- official grading
- confirmed score
- official model answer
- pass probability
- pass guarantee
- final pass/fail judgment

The score-like output remains the S205 secondary learning-support range. It is never the terminal state; the terminal state is rewrite, OCR confirmation, withheld verification, or scheduled review.

## Data Boundary

Committed S211 fixtures and output are metadata-only. They must not contain learner answer bodies, OCR bodies, official question bodies, source excerpts, reference-answer prose, provider payloads, instructor comments, academy material, PDFs, HWPs, images, or asset bytes.

The engine also scans input and output for raw-content fields and prohibited authority claims before returning a result.

## Rollout

S211 is additive:

- engine contract
- metadata-only fixture
- focused tests
- documentation
- roadmap completion wiring

No runtime, provider, OCR, billing, auth, Supabase, instructor, academy, or workflow change is part of this item.

## Rollback

Rollback is a focused revert of the S211 engine, fixture, tests, documentation, and roadmap status change. Existing S205, S207, and S208 artifacts remain valid because S211 only reads their metadata contracts.

## Remaining Risks

- Real law review cannot be high confidence until official exam-date law-source verification is complete.
- Real reference packages remain blocked until S214/S215 generation, critic consensus, and release gates run.
- S216 still needs to convert S211 gap metadata into automatic error notes.
