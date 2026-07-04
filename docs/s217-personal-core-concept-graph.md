# S217 Personal Core Concept Graph and Recovery State

- Status: implementation contract
- Linked roadmap item: `S217`
- Scope: metadata-only Personal Core Concept Graph and recovery-state contract for appraiser second-round learner recovery

S217 consumes safe S216 automatic error notebook metadata and emits a learner-owned concept-state graph. It is source-level only. It does not add provider calls, OCR calls, billing, auth, Supabase writes, migrations, workflows, learner UI, instructor UI, academy routes, production routes, environment changes, Next config changes, Vercel config changes, public archive UI, or reference-answer generation.

## Artifacts

- `lib/review-os/s217-personal-core-concept-graph.ts`
- `tests/s217-personal-core-concept-graph.test.mjs`
- `tests/fixtures/s217-personal-core-concept-graph/metadata-only-s217-inputs.json`
- `docs/s217-personal-core-concept-graph.md`
- `roadmap/active-program.yml`

Focused validation:

```text
npm.cmd run test -- tests/s217-personal-core-concept-graph.test.mjs --workers=1
```

## Contract

The contract version is:

```text
s217.personal_core_concept_graph.v1
```

Each graph stores derived learning metadata only:

- concept node IDs;
- subject and subject dimension IDs for law, theory, and practice;
- S216 entry IDs and source review IDs;
- learner evidence reference IDs only;
- source reference IDs and reference package IDs only;
- gap category, deduction candidate, and root-cause IDs;
- recurrence status and comparison IDs;
- rewrite/recalculation recovery status;
- delayed recall status;
- mastery status;
- forgetting risk status;
- exam impact metadata.

No learner answer body, OCR body, official question body, official answer body, generated reference-answer prose, source excerpt, formula expression, extracted value, calculation trace, provider payload, instructor comment, academy material, PDF, HWP, image, or asset bytes are stored.

## Concept States

S217 represents these concept states:

- `unknown`
- `exposed`
- `confused`
- `wrong`
- `recurring`
- `recovering`
- `stable`
- `at-risk`

State is derived from safe S216 metadata plus optional delayed-recall metadata. Score-like metadata is ignored for state derivation.

## Tracked Metadata

S217 tracks:

- exposure metadata;
- error metadata;
- recurrence metadata;
- successful rewrite and recalculation metadata;
- delayed recall metadata;
- mastery metadata;
- forgetting risk metadata;
- exam impact metadata.

Practice recovery preserves the fixed calculator policy when recalculation is involved:

```text
casio_fx_9860giii
resetSafeHandKeyedRoutineOnly: true
storedProgramDependency: false
```

S217 does not store formulas, extracted values, hand-keyed sequences, expected displays, or calculation traces.

## Fail Closed

S217 emits ready concept nodes only when every supplied S216 entry is ready and safe for S217. The contract must fail closed when any of the following is missing or unresolved:

- S216 metadata;
- learner evidence references;
- learner evidence confirmation;
- source review metadata;
- reference release status;
- required learning-reference caveat;
- subject-review metadata reflected through S216 withhold reasons;
- concept node IDs;
- learner/instructor boundary;
- academy tenant boundary;
- metadata-only data boundary;
- delayed recall metadata.

When S217 fails closed, it emits a withheld graph, preserves safe reason codes and source-gate snapshots, and emits no concept nodes or recovery-state updates.

## Learner/Instructor Separation

S217 is learner metadata only and preserves learner/instructor separation. It records:

- learner route only;
- instructor route separated;
- academy tenant data not accessed;
- instructor runtime route unchanged;
- learner and instructor data not merged.

Academy concept analytics remain later S222 scope and must stay tenant-scoped.

## Product Guardrails

S217 does not produce or allow:

- official grading;
- confirmed score;
- official model answer;
- pass probability;
- pass/fail prediction;
- pass guarantee.

The graph is a recovery artifact. Every recovery state remains oriented toward retry, rewrite, regrade, recalculation, or scheduled review.

## Rollout

S217 is additive:

- source-level contract;
- metadata-only fixture;
- focused tests;
- documentation;
- safe derived key additions;
- roadmap completion wiring;
- Agent Factory ready/example target has moved through S220 and now points to S221 where the active roadmap requires it.

No runtime, provider, OCR, billing, auth, Supabase, migration, workflow, production route, instructor, academy, environment, Next config, or Vercel change is part of this item.

## Rollback

Rollback is a focused revert of the S217 module, fixture, tests, docs, safe-key additions, runner wiring, roadmap status change, and ready-target text/test updates. S216 and earlier subject review contracts remain valid because S217 only consumes their metadata.

## Remaining Risks

- Durable persistence of the S217 graph remains later work.
- Durable S218 scheduler persistence and runtime integration remain later work.
- Paid runtime privacy, export/delete, billing, and cost guardrails remain later roadmap items.
- Public launch remains blocked until all three subjects pass source, reference, runtime, and quality gates.
