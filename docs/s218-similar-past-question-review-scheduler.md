# S218 Similar Past Question Review and Rewrite Scheduler

- Status: implementation contract
- Linked roadmap item: `S218`
- Scope: metadata-only scheduler for appraiser second-round learner recovery

S218 consumes S203 canonical question metadata and S217 Personal Core Concept Graph recovery metadata. It emits safe review/rewrite task metadata for related historical-question practice, rewrite or recalculation due work, delayed recall, and spaced review. It is source-level only. It does not add provider calls, OCR calls, billing, auth, Supabase writes, migrations, workflows, learner UI, instructor UI, academy routes, production routes, environment changes, Next config changes, Vercel config changes, public archive UI, or reference-answer generation.

## Artifacts

- `lib/review-os/s218-similar-question-review-scheduler.ts`
- `tests/s218-similar-question-review-scheduler.test.mjs`
- `tests/fixtures/s218-similar-question-review-scheduler/metadata-only-s218-inputs.json`
- `docs/s218-similar-past-question-review-scheduler.md`
- `roadmap/active-program.yml`

Focused validation:

```text
npm.cmd run test -- tests/s218-similar-question-review-scheduler.test.mjs --workers=1
```

## Contract

The contract version is:

```text
s218.similar_past_question_review_scheduler.v1
```

Each scheduler output stores derived learning metadata only:

- scheduler ID and learner-owned graph ID;
- S203 canonical question IDs and source gate snapshots;
- S217 concept node IDs, concept state, learner evidence reference IDs, source entry IDs, and release/reference package IDs;
- related historical-question metadata: year, round, subject, question number, points, source ID, rights state, extraction state, and verification state;
- one biggest gap metadata;
- one next action metadata;
- concept transfer metadata;
- rewrite due metadata;
- delayed recall metadata;
- spaced review metadata;
- Today Plan max-three compatibility.

No learner answer body, OCR body, official question body, official answer body, generated reference-answer prose, source excerpt, formula expression, extracted value, calculation trace, provider payload, instructor comment, academy material, PDF, HWP, image, or asset bytes are stored.

## S203 Consumption

S218 may select related historical-question metadata only when the S203 question record is safe for scheduling:

- source ID exists;
- rights status is `redistribution_allowed`;
- display mode is `full_text`;
- extraction status is `extracted_private`;
- S203 metadata and problem-text gates are true;
- problem text status is `verified` or `synthetic_fixture`;
- canonical verification is `structure_verified` or `synthetic_fixture`;
- Evidence Review is eligible;
- learner publication metadata is allowed.

The scheduler still does not expose public archive UI or official material. It emits only metadata IDs and gate states.

## S217 Consumption

S218 uses S217 nodes only when actionable recovery state is present and safe:

- learner evidence references exist;
- source refs and reference package IDs are present;
- source release is ready;
- the learning-reference caveat is present;
- delayed recall metadata is internally consistent;
- learner/instructor and academy boundaries remain separated.

Seed-only `unknown` or `exposed` concepts are not scheduled unless later S217 metadata makes them actionable.

## Supported Due Metadata

S218 supports:

- related historical-question metadata for similar past question practice;
- concept transfer through direct concept matches or explicit safe transfer links;
- rewrite due metadata from S217 recovery action metadata;
- recalculation due metadata with reset-safe `casio_fx_9860giii` policy when applicable;
- delayed recall due metadata;
- spaced review metadata.

Every emitted task starts with one biggest gap and one next action. Score-like metadata is not terminal and no official grading, official model answer, confirmed score, pass probability, pass/fail prediction, or guarantee is allowed.

## Today Plan max three

S218 emits at most three primary scheduler tasks. Every task contributes at most one primary Today Plan candidate. The scheduler output includes a max-three compatibility summary and never surfaces more than three primary task IDs.

## Fail Closed

S218 emits ready tasks only when both the S203 question metadata and S217 concept graph metadata pass their gates. The contract fails closed when any of the following is missing or unresolved:

- S203 canonical question metadata;
- S203 question source, rights, extraction, problem-text, canonical verification, Evidence Review, or learner publication gates;
- S217 concept graph;
- S217 concept state for an actionable node;
- learner evidence references;
- source release status;
- reference release/caveat metadata;
- delayed recall metadata;
- concept transfer metadata;
- learner/instructor boundary;
- academy tenant boundary;
- metadata-only data boundary.

When S218 must fail closed, it emits no tasks and preserves safe gate snapshots and reason codes.

## Learner/Instructor Separation

S218 is learner metadata only. It records learner-route-only scope, instructor route separation, no academy tenant access, no instructor runtime route change, and no learner/instructor data merge. Academy scheduling and cohort analytics remain later S222 scope.

The learner/instructor separation is a release gate for this source-level contract.

## Product Guardrails

S218 does not produce or allow:

- official grading;
- confirmed score;
- official model answer;
- pass probability;
- pass/fail prediction;
- pass guarantee;
- public historical-question archive UI;
- passive answer browsing as a default.

The scheduler is a recovery artifact. Every ready task points to attempt, rewrite, recalculation, delayed recall, or spaced review.

## Rollout

S218 is additive:

- source-level contract;
- metadata-only fixture;
- focused tests;
- documentation;
- safe derived key additions;
- default runner wiring;
- roadmap completion wiring;
- Agent Factory ready/example target moves to S219 where the active roadmap now requires it.

No runtime, provider, OCR, billing, auth, Supabase, migration, workflow, production route, instructor, academy, environment, Next config, or Vercel change is part of this item.

## Rollback

Rollback is a focused revert of the S218 module, fixture, tests, docs, safe-key additions, runner wiring, roadmap status change, and ready-target text/test updates. S203 and S217 remain valid because S218 only consumes their metadata.

## Remaining Risks

- Durable persistence of S218 scheduler output remains later work.
- The committed S203 registry still has no real schedulable question records, so real corpus scheduling remains blocked until source, rights, extraction, canonical verification, and release gates advance.
- Paid runtime privacy, export/delete, billing, and cost guardrails remain later roadmap items.
- Public launch remains blocked until all three subjects pass source, reference, runtime, and quality gates.
