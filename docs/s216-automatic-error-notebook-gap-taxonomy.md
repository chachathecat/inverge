# S216 Automatic Error Notebook and Gap Taxonomy

- Status: implementation contract
- Linked roadmap item: `S216`
- Scope: metadata-only automatic error notebook entries and reusable gap taxonomy for 감정평가사 2차 learner recovery

S216 converts safe S206 rewrite/history metadata and S211/S212/S213 subject-review metadata into automatic error notebook entries. It is source-level only. It does not add provider calls, OCR calls, billing, auth, Supabase writes, migrations, workflows, learner UI, instructor UI, academy routes, production routes, environment changes, Next config changes, Vercel config changes, public archive UI, or reference-answer generation.

## Artifacts

- `lib/review-os/s216-error-notebook-gap-taxonomy.ts`
- `tests/s216-error-notebook-gap-taxonomy.test.mjs`
- `tests/fixtures/s216-error-notebook-gap-taxonomy/metadata-only-s216-inputs.json`
- `docs/s216-automatic-error-notebook-gap-taxonomy.md`
- `roadmap/active-program.yml`

Focused validation:

```text
npm.cmd run test -- tests/s216-error-notebook-gap-taxonomy.test.mjs --workers=1
```

## Contract

The contract version is:

```text
s216.error_notebook_gap_taxonomy.v1
```

Each automatic error notebook entry stores derived learning metadata only:

- one biggest gap and mapped gap taxonomy category;
- deduction candidate IDs and root-cause IDs;
- learner-answer evidence reference IDs only;
- review blockers and reference-release blocker codes;
- why-wrong metadata;
- correct-principle metadata;
- immediate-fix metadata;
- recurrence metadata from S206 comparison state;
- recovery metadata for rewrite or recalculation hooks;
- next-review metadata for Review Queue and Today Plan handoff.

No learner answer body, OCR body, official question body, official answer body, generated reference-answer prose, source excerpt, formula expression, extracted value, calculation trace, provider payload, instructor comment, academy material, PDF, HWP, image, or asset bytes are stored.

## Gap Taxonomy

The reusable taxonomy covers the three 감정평가사 2차 subjects:

- law: issue spotting, requirement decomposition, rule mapping, subsumption/application, conclusion quality;
- theory: definition quality, theory basis, comparison frame, application/evaluation, conclusion, compression/relevance;
- practice: assumptions, data selection, formula metadata, calculation trace, unit/rounding/time adjustment, cross-check, conclusion writing.

Shared fail-closed categories cover evidence confirmation, source or reference release blockers, unsupported practice calculation, and maintenance review. These categories fail closed until safe metadata is complete.

## Fail-Closed Rules

S216 emits a ready error notebook entry only when:

- S205 review metadata is present and ready;
- learner evidence references are present and learner-confirmed;
- source status and release status are verified;
- S206 rewrite/history metadata is valid and safe for S216;
- S211/S212/S213 subject-review metadata is present and passed for the matching subject;
- S215-style reference status is released as a learning reference with the required caveat;
- no blocking reference-release, source, calculation, or subject-review blocker remains.

If any gate is missing or unresolved, S216 emits a withheld entry. The withheld entry preserves safe reason codes, blocker codes, evidence reference IDs, and next action metadata, but it does not release a ready error note or contribute a Today Plan task.

## Learner/Instructor Separation

S216 is learner metadata only. It preserves learner/instructor separation, rejects instructor or academy invocation, and records:

- learner route only;
- instructor route separated;
- academy tenant data not accessed;
- instructor runtime route unchanged;
- learner and instructor data not merged.

Academy answer operations remain later S222 scope.

## Practice Recalculation Boundary

When the biggest gap requires recalculation, S216 preserves the fixed S213 calculator policy:

```text
casio_fx_9860giii
resetSafeHandKeyedRoutineOnly: true
storedProgramDependency: false
```

S216 does not store formulas, extracted values, hand-keyed sequences, expected displays, or calculation traces. The immediate fix points to the GIII routine metadata only.

## Product Guardrails

S216 does not produce or allow:

- official grading;
- confirmed score;
- official model answer;
- pass probability;
- pass/fail prediction;
- pass guarantee.

Error notebook output remains a recovery artifact. Score-like metadata from earlier review contracts stays secondary and is never the terminal learner state.

## Rollout

S216 is additive:

- source-level contract;
- reusable taxonomy;
- metadata-only fixture;
- focused tests;
- documentation;
- roadmap completion wiring;
- Agent Factory ready/example target originally moved to S217; S221 completion moves the active example target forward to S222.

No runtime, provider, OCR, billing, auth, Supabase, migration, workflow, production route, instructor, academy, environment, Next config, or Vercel change is part of this item.

## Rollback

Rollback is a focused revert of the S216 module, fixture, tests, docs, safe-key additions, runner wiring, roadmap status change, and ready-target text/test updates. S206, S211, S212, S213, S214, and S215 remain valid because S216 only consumes their metadata contracts.

## Remaining Risks

- Durable persistence of error notebook entries remains later work.
- S217 now converts safe S216 concept and recurrence metadata into personal concept graph recovery state.
- Real public release remains blocked until all three subjects pass source, reference, runtime, and quality gates.
