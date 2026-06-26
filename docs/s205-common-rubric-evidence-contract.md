# S205 Common Rubric Evidence and Practice Score Range Contract

- Status: implementation contract
- Linked roadmap item: `S205`
- Linked issue: `#444`
- Scope: common Evidence Review schema for 감정평가사 2차 learner answer review

S205 defines the subject-neutral contract used by later S211/S212/S213 engines. It does not implement law, theory, or practice grading engines. It does not generate reference answers, ingest questions, run OCR, implement billing, or change instructor routes.

## Contract Source

The source-level contract is:

```text
lib/review-os/rubric-evidence-contract.ts
```

The contract version is:

```text
s205.common_rubric_evidence.v1
```

The contract is derived learning metadata. It references learner-owned answer records by safe IDs only. It must not carry learner content, OCR content, official material bodies, provider payloads, instructor comments, or global reference writes.

## Required Result Order

Every learner-facing result built from this contract must preserve this order:

1. one biggest gap
2. one next action
3. Evidence Review / 답안 검토 리포트
4. rewrite or recalculation task
5. practice score range

The practice score range is secondary. It is a learning-support estimate, not a confirmed result, not a pass/fail signal, and never the terminal state. The terminal state must be rewrite, recalculation, or scheduled review.

## Evidence References

Learner answer evidence is represented by metadata-only references:

- `learner_answer_submission`
- `learner_confirmed_ocr_segment`
- `learner_rewrite_segment`
- `learner_calculation_step`

Each evidence reference must include:

- a safe evidence ID;
- a user-owned answer submission ID;
- authenticated request-user ownership binding;
- OCR confirmation state when relevant;
- confidence;
- `containsRawContent: false`.

Deduction candidates and primary gaps must point to these evidence IDs. They must not embed quoted learner content.

## Rubric Dimensions

Rubric dimensions are common rows that downstream subject engines can specialize. A dimension records:

- subject scope: `all`, `practice`, `theory`, or `law`;
- maximum points from verified exam-rule metadata;
- source status;
- evidence reference IDs;
- deduction candidate IDs;
- estimated point range only when evaluated;
- confidence and uncertainty reasons.

The common contract does not decide subject-specific criteria. S211, S212, and S213 must supply their own validators and quality evals.

## Deduction Candidates

A deduction candidate is not an official deduction. It is an evidence-linked learning hypothesis.

Required fields:

- dimension ID;
- root-cause ID;
- gap type;
- severity;
- learner evidence reference IDs;
- source reference IDs;
- confidence and uncertainty;
- learner-facing summary;
- immediate fix;
- `officialScoreDeduction: false`.

The validator rejects candidates without learner evidence references or candidates that point to unknown dimensions.

## Withhold States

The contract must withhold the practice range when evidence or source status is not sufficient. Supported non-ready states:

- `withheld_insufficient_evidence`
- `withheld_unconfirmed_ocr`
- `withheld_unverified_source`
- `withheld_unsupported_subject`
- `withheld_unsupported_calculation`

Withheld results still need one biggest gap and one next action. For example, an unconfirmed OCR result should point to `confirm_ocr` before any review estimate is shown.

## Practice Score Range

The practice range contract uses:

```text
learning_support_estimate_not_official_or_confirmed_score
```

Required flags:

- `secondaryToGapAndAction: true`
- `nonOfficial: true`
- `confirmedScore: false`
- `passProbability: false`
- `passGuarantee: false`
- `notFinalEndpoint: true`
- `officialPassThresholdUsed: false`

Estimated ranges must have non-zero width. A single-point value is rejected because it looks like a confirmed result.

## Rewrite And Recalculation Hooks

The next action links to one hook:

- `rewrite`
- `recalculation`
- `ocr_confirmation`
- `scheduled_review`
- `withheld`

When the hook is `recalculation`, the calculator policy is fixed:

```text
casio_fx_9860giii
resetSafeHandKeyedRoutineOnly: true
storedProgramDependency: false
```

This preserves the S200R rule that practice routines train only reset-safe, hand-keyed fx-9860GIII work.

## Source And Verification Status

S205 separates learner evidence from source verification:

- learner answer: confirmed, needs OCR confirmation, or missing;
- problem material: verified, needs verification, blocked, conflict, or not applicable;
- reference package: verified, needs verification, blocked, conflict, or not applicable;
- rubric: verified, needs verification, blocked, conflict, or not applicable;
- official rules: verified, needs verification, blocked, conflict, or not applicable;
- calculation: verified, needs verification, blocked, conflict, or not applicable.

If a blocking status is present, the range must be withheld.

## Downstream Usage

S211 law engine:

- populate law-specific dimensions and deduction candidates;
- validate law-version/source status separately;
- withhold when legal source status is unresolved.

S212 theory engine:

- populate theory concept and paragraph-production dimensions;
- validate concept/source confidence separately;
- withhold or lower confidence when source consensus is weak.

S213 practice engine:

- populate calculation, unit, rounding, and transfer dimensions;
- require independent recalculation and unit checks;
- use the GIII recalculation hook when the next action is calculation repair;
- withhold unsupported calculation types.

S205 is only the common container and validator. Subject engines remain responsible for domain correctness and eval evidence.

## Data Boundary

Allowed in S205:

- safe IDs;
- subject key and label;
- confidence;
- source status;
- rubric dimension metadata;
- deduction candidate metadata;
- one biggest gap metadata;
- one next action metadata;
- score-range lower/upper bounds when allowed.

Not allowed in S205:

- learner content;
- OCR content;
- official material bodies;
- reference answer body;
- third-party academy material;
- provider payloads;
- secrets;
- instructor comments;
- global reference writes from user-owned records.

## Rollout

S205 is additive: contract, validators, docs, and synthetic metadata-only tests. No database migration, provider change, billing change, OCR implementation, question ingestion, reference-answer generation, public archive UI, or instructor route change is part of this item.

## Rollback

Rollback is a focused revert of the S205 PR. Existing S204 learner answer-submission records remain readable because S205 does not change runtime persistence paths.

## Remaining Risks

- S211/S212/S213 must still prove subject-specific correctness.
- S207 must define verified reference-answer packages separately.
- S210 must define practice calculation support and tolerance separately.
- Runtime evidence is still required before claiming production readiness.
