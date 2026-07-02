# S214 Multi-Candidate Historical Reference Answer Pipeline

S214 adds a metadata-only foundation for historical second-round reference-answer candidate work. It does not generate answer prose, call a provider, call OCR, publish a learner UI, expose a public archive, or release reference answers.

The output is a candidate handoff contract for S215 consensus/release work. Generated references remain learning references, not official answers, official grading criteria, confirmed scores, pass-probability outputs, or guarantees.

## Scope

- Subject scope: appraiser second-round law, theory, and practice only.
- Runtime scope: source-level metadata validation only.
- Candidate minimum: at least three independent candidate slots per pipeline.
- Candidate storage: metadata strategies, source/evidence anchors, validation state, and conflict metadata only.
- Fixture policy: metadata-only synthetic fixtures; no official question text, generated answer text, learner answer, OCR text, source excerpts, provider payloads, credentials, PDFs, images, or asset bytes.

## Pipeline Contract

`lib/review-os/s214-reference-answer-pipeline.ts` defines:

- `S214SourcePackMetadata`: source-pack metadata with S207 package identity, official-source status, rights/display/extraction status, and a problem requirement decomposition.
- `S214ProblemRequirementDecomposition`: per-requirement metadata slots with point values, requirement kind, anchor IDs, and candidate strategy IDs. It stores descriptor keys only; raw requirement text is not stored.
- `S214CandidateSlot`: independent metadata-only candidate slots. Each slot records the subject strategy, independence group, source/evidence anchors, candidate evidence status, and validation state. Generated prose is explicitly not stored.
- `S214ReleasePrerequisites`: S207 package readiness plus the subject-specific S208/S209/S210 gate.
- `S214UnresolvedConflictState`: unresolved conflict IDs are preserved for S215 without being resolved or hidden in S214.

## Subject Strategies

Law requires:

- `law_issue_rule_application_candidate`
- `exam_date_law_version_candidate`
- `deduction_risk_counterexample_candidate`

Theory requires:

- `concept_definition_logic_chain_candidate`
- `comparison_alternative_view_candidate`
- `application_paragraph_candidate`

Practice requires:

- `calculation_formula_unit_candidate`
- `independent_recalculation_candidate`
- `giii_hand_keyed_routine_candidate`

The practice strategy preserves the CASIO fx-9860GIII reset-safe hand-keyed routine rule and forbids stored-program dependency.

## Release Prerequisites

S214 never releases a learner-facing reference answer. It only decides whether a candidate package is safe to hand to S215.

- S207 must allow S214 generation input and S215 release-gate input.
- Law candidates require S208 exam-date law grounding, `s214GenerationAllowed`, and `s215ReleaseGateAllowed`.
- Theory candidates require S209 concept/source grounding, `s214GenerationAllowed`, and `s215ReleaseGateAllowed`.
- Practice candidates require S210 practice validation plus human-reviewed runtime evidence before reference-answer release can be allowed.

Because S210 is currently source-level only and S213 is not completed in the active roadmap, practice candidate pipelines fail closed until the missing runtime/recalculation evidence exists. This is intentional and must not be bypassed in S214.

## Fail-Closed Behavior

The pipeline blocks S215 handoff when any of these are missing or blocked:

- source pack metadata
- problem requirement decomposition
- candidate evidence anchors
- candidate validation state
- S207 reference-package readiness
- S208 law grounding
- S209 theory grounding
- S210 practice validation and runtime evidence

Unresolved conflicts are not treated as released answers. They are preserved in `S214UnresolvedConflictState` for S215 critic consensus and release-gate handling.

## Data Boundary

S214 stores derived metadata only:

- no raw official question or answer text
- no generated answer prose
- no learner answer or OCR text
- no raw source excerpt
- no provider payload
- no billing, auth, Supabase, migrations, workflows, learner UI, public archive UI, instructor UI, or academy routes

Learner and instructor surfaces remain separated. The S214 result records that no learner runtime, instructor runtime route, academy tenant data access, or learner/instructor data merge occurred.

## Validation

Focused validation is covered by `tests/s214-reference-answer-pipeline.test.mjs` and the metadata-only fixture at `tests/fixtures/s214-reference-answer-pipeline/metadata-only-pipeline-registry.json`.

S214 completion does not imply S215 completion. S215 still owns critic consensus and release gating, and S213 remains a dependency risk until the practice answer review engine is merged.
