# S206 Rewrite Regrade and Answer History Foundation

- Status: implementation contract
- Linked roadmap item: `S206`
- Linked issue: `#447`
- Scope: metadata-only foundation for learner rewrite, recalculation, re-review request, answer-history lineage, before/after comparison metadata, and safe derived signals

S206 defines source-level contracts for the loop segment after S204 answer save and S205 Evidence Review:

```text
learner answer submission
→ Evidence Review
→ one biggest gap
→ one next action
→ rewrite or recalculation attempt
→ re-review request
→ answer-history comparison
→ derived improvement metadata
```

It does not implement law, theory, or practice grading engines. It does not generate reference answers, call providers, change persistence, add billing, expose public archive UI, or change instructor routes.

## Contract Source

The source-level contract is:

```text
lib/review-os/rewrite-regrade-history-contract.ts
```

The contract version is:

```text
s206.rewrite_regrade_history.v1
```

The contract is derived learning metadata. It references user-owned records by safe IDs and private storage references only.

## Data Boundary

Allowed in S206:

- safe answer submission IDs;
- private storage reference IDs;
- attempt IDs, version numbers, parent attempt IDs, and latest attempt IDs;
- S205 `evidenceRefIds`, `deductionCandidateIds`, `primaryGapId`, and `nextActionId`;
- re-review request metadata;
- before/after comparison status;
- improvement status;
- safe S216/S217 signal metadata.

Not allowed in S206:

- learner answer text;
- OCR text;
- rewrite text;
- calculation values or formulas;
- official question or answer bodies;
- generated reference-answer bodies;
- source excerpts;
- third-party academy content;
- instructor comments;
- provider payloads;
- secrets.

Raw learner answers, OCR, rewrites, and recalculation work remain user-owned service data. S206 history rows may only point to those records through private storage references.

## Attempt Lineage

Every history contract must include exactly one `root_submission` attempt at version `1`. Later attempts must be contiguous versions:

- `rewrite`
- `recalculation`

Each later attempt links back to the root `answerSubmissionId`, a parent attempt, a private user-owned storage reference, and the S205 review metadata that created the action.

## Re-review Requests

Re-review request metadata uses the same S205 rubric/evidence anchors that created the learner action. It records whether the request is ready or queued for downstream subject engines, but S206 itself starts no provider call.

Required guardrails:

- same rubric blueprint;
- retry review allowed;
- provider call not started in S206;
- official grading false;
- confirmed score false;
- pass probability false;
- pass guarantee false;
- result must start with one biggest gap and one next action.

## Recalculation Hooks

Practice recalculation attempts carry only metadata and the fixed calculator policy:

```text
casio_fx_9860giii
resetSafeHandKeyedRoutineOnly: true
storedProgramDependency: false
```

S206 does not store formulas, extracted values, hand-keyed sequences, or expected displays in the derived contract. S210/S213 must validate calculation support, units, rounding, and tolerance before release.

## Improvement Status Taxonomy

S206 defines metadata-only improvement states:

- `not_reviewed_yet`
- `improved_evidence_supported`
- `partially_improved_evidence_supported`
- `unchanged_evidence_supported`
- `regressed_evidence_supported`
- `mixed_evidence_supported`
- `withheld_insufficient_evidence`
- `withheld_unconfirmed_ocr`
- `withheld_unverified_source`
- `withheld_unsupported_calculation`

Score-like deltas, when present, are secondary comparison metadata only. They are not official grading, confirmed score, pass probability, pass guarantee, or the terminal learner state.

## Downstream Usage

S211 law engine:

- create law-specific re-review results from the linked S205 evidence IDs;
- preserve exam-date legal source validation separately;
- emit S206 comparison metadata only when legal source blockers are resolved.

S212 theory engine:

- compare rewritten paragraphs through metadata references;
- preserve concept/source uncertainty;
- emit concept-node signals for S216/S217 only from evidence-supported gaps.

S213 practice engine:

- consume `recalculation` attempts and the GIII policy;
- validate units, rounding, formula support, independent recalculation, and answer-sheet transfer separately;
- withhold unsupported calculation comparisons.

S216 automatic error notebook:

- consume safe improvement status, primary gap, deduction candidate IDs, evidence reference IDs, and concept node IDs;
- never consume raw learner text or OCR text from this contract.

S217 personal concept graph:

- consume safe concept-node IDs and improvement status;
- update concept state only after downstream subject validation supplies enough evidence.

## Rollout

S206 is additive: contract, validators, docs, safe metadata keys, and synthetic metadata-only tests. No database migration, runtime route, UI, provider, billing, usage ledger, reference-answer generation, public archive UI, or instructor workflow change is part of this item.

## Rollback

Rollback is a focused revert of the S206 PR. Existing S204/S205/S207 records remain readable because S206 does not change runtime persistence paths or reference corpus schemas.

## Remaining Risks

- S211/S212/S213 still need subject-specific engines, validators, and quality eval evidence.
- S216/S217 still need durable error-note and concept-state writes.
- S210/S213 still need practice calculation support and tolerance policies.
- Runtime privacy export/delete and paid cost guardrails remain later paid-launch work.
