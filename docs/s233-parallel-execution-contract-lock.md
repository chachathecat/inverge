# S233-LOCK Parallel Execution Contract

Status: frozen shared contract
Contract: `s233.parallel_execution_contract.v1`
Starting main: `36015ecf9658571dfef123d24fbeced0dbf2bde2`

## Purpose and non-goals

S233-LOCK freezes the smallest shared identity, evidence, evaluation, and file-ownership boundary needed for two later Works to run in parallel:

- Lane A: AI answer-review runtime, rewrite verification, and durable learner persistence.
- Lane B: official second-round source acquisition, law versions, and Golden 9 reference content.

This lock implements no learner feature, source acquisition, Golden content, scheduler, timer, human grading, OCR/LLM call, or visual redesign. It adds no route, workflow, migration, production setting, or production data.

The executable contract is `lib/review-os/s233-parallel-execution-contract.ts`. Focused hostile acceptance lives in `tests/s233-parallel-execution-contract.test.mjs`.

## Product truth

The personal Inverge product is AI-first. Human approval is not part of the personal learner request path for Answer Review, rewrite, retrieval, transfer, Today, Review Queue, or timed practice.

Human review may exist only as optional learner-uploaded evidence, future offline/internal calibration, or a separate future Academy feature. None may become a personal learner-loop dependency.

Every S233 identity keeps the following authority claims false:

- official grading;
- expert verification without actual expert-approval evidence;
- pass probability;
- validated digital twin;
- causal intervention selection; and
- optimal intervention selection.

An `official` finding provenance identifies official source evidence. It does not convert AI evaluation into official grading.

## Reused contracts

S233 pins these existing versions without importing their mutable implementation constants:

| Existing contract | Frozen version |
| --- | --- |
| S205 rubric/evidence | `s205.common_rubric_evidence.v1` |
| S206 rewrite/regrade | `s206.rewrite_regrade_history.v1` |
| S211 law review | `s211.law_answer_review_engine.v1` |
| S212 theory review | `s212.theory_answer_review.v1` |
| S213 practice review | `s213.practice_answer_review.v1` |
| S214 answer pipeline | `s214.reference_answer_candidate_pipeline.v1` |
| S215 release gate | `s215.reference_answer_critic_consensus_release_gate.v1` |
| S216 error taxonomy | `s216.error_notebook_gap_taxonomy.v1` |
| S217 concept graph | `s217.personal_core_concept_graph.v1` |
| S218 review scheduler | `s218.similar_past_question_review_scheduler.v1` |

Their implementation and contract-test files are frozen shared files. Lane implementations must compose them through new lane adapters rather than editing them. The canonical Review OS service/repository plus `personal_concept_nodes` and existing atomic event/idempotency lineage remain the learner persistence base.

## Frozen identities

### 1. Versioned scoring skill

Each immutable identity has `skillId`, ontology version, subject, versioned task archetype, parent/prerequisite IDs, evidence requirements, severity, critical flag, a non-overlap/double-deduction group, and remediation action type.

Critical skills use major severity. Parent and prerequisite sets cannot contain the skill or overlap. Deduction groups require `nonOverlap: true` and `doubleDeductionAllowed: false`.

### 2. Scoring finding

The only statuses are `met`, `partial`, `missing`, `incorrect`, and `not_assessable`. Findings carry a versioned learner-evidence locator when evidence exists, source/rubric anchors, confidence and uncertainty, `official`/`instructor`/`ai_inferred` provenance, and an abstention reason only when not assessable.

`validateS233ScoringFinding` checks the closed structural schema. Each assessed finding maps every required scoring-skill requirement to explicit evidence-reference IDs; optional bindings, when supplied, are validated just as strictly, unknown requirement IDs are rejected, and one reference cannot satisfy two requirements. A precise segment/calculation locator is required unless a `missing` finding deliberately locates the whole submitted answer. `validateS233ScoringFindingBundle` is mandatory at an evaluation boundary: it compares the complete skill identity—not merely its ID—to its canonical ontology record, resolves parent/prerequisite lineage, checks every supplied evidence binding, binds the exact answer submission/input version, and binds source, S205 rubric, and evaluator provenance records.

At terminal persistence, `validateS233TrustedScoringContext` requires canonical-ontology and S205-rubric adapter versions plus a repository snapshot receipt. The evaluation-context validator resolves every bundled skill and rubric anchor through that independent trusted context, every source anchor through the exact Answer Pack snapshot/source record, and every AI-inferred provenance record through the primary cascade trace/model/prompt that actually ran.

### 3. Answer Pack 2.0

Answer Pack 2.0 freezes:

- immutable `packId`, version, and content SHA-256;
- `verified_learning_reference`, `source_grounded_study_answer`, or `expert_unreviewed_ai_draft` status;
- `L1_recall_outline`, `L2_exam_length_answer`, and `L3_annotated_reasoning` levels;
- a metadata-only shared claim/source graph with a supporting edge for every claim;
- a source/law/rights snapshot;
- closed, timestamped transformation provenance; and
- an absolute learner-content prohibition.

Grounded law packs require a verified law snapshot and resolved rights. `verified_learning_reference` additionally requires deterministic validation, critic consensus, release-gate provenance, and exact released S214/S215 proof with no unresolved blocker. It does not claim expert approval. AI drafts require explicit model/prompt provenance and are named `expert_unreviewed_ai_draft`.

`validateS233AnswerPackRegistryContext` is mandatory before release or consumption. It accepts typed records from trusted registry adapters, not caller-declared ID membership. It requires the exact source/law/rights registry versions, binds claim anchors and law/rights decisions to the pack's same-subject snapshot sources, and matches the pack ID, version, content hash, subject, pipeline relationship, `ready_for_s215_consensus` result, `released` gate result, and empty blockers against the actual S214/S215 records.

### 4. Learner Answer Review

Each learner-owned review binds the exact review-record/attempt/input versions; pack, ontology, rubric, source, subject-engine, model, prompt, cascade, event, finding, and rewrite/regrade versions; reveal/exposure history; S206 root/predecessor lineage; owner-namespaced idempotency with an input SHA-256; monotonic partial-stage state; and Queue/Today IDs.

The frozen fingerprint scope is `s233.owner_submission_input_digest_pack_ontology_rubric_source_evaluator_schema_exposure.v1`. Its canonical preimage fields are exported as `S233_INPUT_FINGERPRINT_FIELDS`: learner owner; root answer-submission ID; input-version ID; SHA-256 of normalized learner input computed before raw input is discarded from this metadata contract; exact pack ID/version/schema; ontology, rubric, subject-engine and source versions; configured primary/critic model and prompt versions; cascade and finding schemas; and the exact reveal event named by `fingerprintedRevealEventId`. Later reveal entries are append-only history and deliberately remain outside the immutable request fingerprint.

`validateS233LearnerReviewRequestContext` is mandatory on every learner request. Structural `ownerBinding` is insufficient by itself: the validator compares the persisted owner, idempotency key, and computed input digest with authenticated request context.

Completed, abstained, partial, pending, and retryable-failure stage tuples are closed and monotonic: deterministic checks precede the primary grader, which precedes a conditionally applicable critic, which precedes persistence. The configured critic model/prompt are pinned before evaluation even when the trace later proves the critic was `not_required`, so the ordinary no-critic path does not mutate frozen versions. Every write increments `reviewRecordVersion` and compare-and-swaps `expectedPreviousReviewRecordVersion`; `validateS233LearnerReviewTransition` rejects stale writes, changed frozen identity/version/S206 lineage/fingerprinted exposure, rewritten reveal history, regression of any individual stage, and any mutation after terminal persistence.

`validateS233LearnerReviewEvaluationContext` is mandatory before terminal persistence. Its single closed context binds the authenticated learner owner, review ID, root submission, input version and fingerprint; exact pack ID/version/schema and source snapshot; review subject; cascade trace; primary/critic model and prompt versions; final disposition; and every persisted stage. Its typed Answer Pack registry and trusted scoring contexts must validate, and its finding bundles must exactly equal and cover the cascade's findings and skills while grounding them to the review submission/input, canonical ontology, S205 rubric, Answer Pack snapshot, and actual evaluator provenance.

### 5. Evidence state

S233 evidence state is separate from S217 concept state. Do not rename or automatically map an S217 state to S233.

Lane A may emit only `detected`, `corrected`, and `uncertain`. The later states `retained`, `near_transferred`, `far_transferred`, and `timed_stable` require actual later evidence and cannot be inferred.

The standalone `validateS233EvidenceStateRecord` accepts only structurally provable `detected` and `uncertain` records. Lane A must use `validateS233LaneAEvidenceProofBundle` at its emission boundary; that validator rejects every later state even if a caller changes the emitter claim. A `corrected` record and every later state must pass `validateS233EvidenceProofBundle`, which binds:

- authenticated learner owner, review, and concept node;
- the actual predecessor state and allowed transition;
- a strictly later controller event;
- outcome, assistance, answer exposure, variant, elapsed-time, and event lineage; and
- immutable, owner/review/concept/event/outcome/variant/timestamp-bound outcome-proof records read from the canonical learner repository; and
- distinct current/predecessor persistence receipts, with proof IDs resolving exactly through those receipts.

Correction requires a distinct correct observed outcome. Later states require a distinct correct later outcome. Retention/transfer/timed stability must be unassisted and observed before answer exposure; transfer distance and timed elapsed time are enforced.

### 6. Future controller event

The closed metadata-only event includes elapsed time, confidence, assistance level, answer exposure, input modality, variant family/distance, session position, source/evaluator uncertainty, correct/partial/incorrect/abstained outcome, outcome-proof IDs, and predecessor/successor lineage. Its idempotency key is learner-owner namespaced.

### 7. AI-only cascade

The personal cascade is fixed:

1. deterministic checks;
2. one primary subject grader;
3. a conditional critic for critical findings, uncertainty, or deterministic/grader disagreement; and
4. abstention when unresolved.

Passed deterministic checks cannot retain blockers. Completed grading must emit at least one finding. Primary/critic abstention requires unresolved codes. A required critic cannot be skipped.

`validateS233AiEvaluationCascadeBundle` is mandatory before persistence. Its trace also binds learner owner, review, submission, input version and fingerprint, Answer Pack ID/version, and source snapshot. It derives finding IDs, critical findings, and uncertainty from the actual bundled findings and canonical skill identities. Deterministic/grader disagreement is derived by comparing typed immutable deterministic check results—each bound to a check that ran, a finding, and a persistence receipt—with the primary finding status; there is no caller-supplied disagreement flag list. The personal cascade has no human approval stage.

## Closed schemas and privacy

All public validators accept `unknown`, reject malformed input without throwing, reject unknown keys recursively, and restrict identity/code fields to bounded opaque tokens. Raw learner prose, OCR, rewrites, uploads, provider payloads, and innocently named extra fields do not belong in these shared identities or telemetry. Learner material remains in authenticated learner-owned storage and is forbidden in global Answer Pack/reference data.

## API and file ownership

`S233_LANE_FILE_OWNERSHIP` and `S233_FROZEN_SHARED_FILES` are authoritative. Broad app, Review OS, corpus, and script prefixes are intentionally absent.

### Lane A

Lane A may change only:

- `app/answer-review/**` and `app/api/answer-review/**`;
- new `components/review-os/s233a-*`, `lib/review-os/s233a-*`, `tests/s233a-*`, and `docs/s233a-*` files;
- the enumerated answer-review scoring, reference-grounding, rewrite, canonical Review OS service, repository, and type files; and
- at most one proven additive migration under the exact timestamped direct-child `*_s233a_*.sql` rule.

First-round, admin/instructor, generic model/OCR, scheduler/timer, broad Queue/Today, visual/trust, source/law/content, billing, settings, workflow, and production-data surfaces are excluded.

### Lane B

Lane B may change only:

- new `scripts/s233b-*`, `lib/review-os/s233b-*`, `tests/s233b-*`, and `docs/s233b-*` files;
- second-round-only legal, practice, theory, question-archive, and reference-answer corpus directories; and
- the three enumerated official-material `second_round_*` registry/report files.

Mixed first/second-round Q-Net ingestion, production-writing legal ingestion, app/learner APIs, learner persistence/migrations, and reused S205–S218 or prior registry contracts are excluded. Lane B must extend through S233B adapters and validators.

### Git-derived enforcement

Every later Work must call `validateS233LaneChangeManifest` against the exact S233 merge SHA and trusted Git-derived base/head, merge-base, ancestor result, status, regular-file mode, content SHA-256, and base-blob SHA-256 evidence. The validator requires `mergeBaseSha` to equal the S233 SHA and `baseIsAncestor: true`; matching caller strings alone are insufficient. The manifest rejects deletions/renames, paths outside the lane, and any frozen shared file.

A migration must be newly added and absent at base, mode `100644`, a direct child matching the S233A naming rule, and bound by review ID and content hash to a separately supplied trusted `s233.additive_migration_review.v1` record from `trusted_sql_additivity_validator`, proving `additive_only` with no destructive operation. A verdict embedded only in the caller manifest, a hand-authored filename list, or a boolean is insufficient.

Lane A and Lane B may not change this shared contract independently after merge. If a lane requires a shared-field, frozen-file, or ownership change, it must remain read-only for that change and report the exact reason and consumer impact for a coordinated contract revision.

Because ownership is disjoint and both manifests anchor the same merge SHA, the two lane prompts may be started in parallel.

## Focused acceptance

Acceptance is limited to TypeScript type checking and focused schema/validator tests, including hostile privacy, fabricated verification, owner forgery, evidence forgery, cascade bypass, file overlap, and migration-manifest cases. It uses no browser, live OCR/LLM, full suite, new workflow, or Figma work.
